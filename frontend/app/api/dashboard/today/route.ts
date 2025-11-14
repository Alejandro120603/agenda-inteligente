import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { allQuery, getQuery } from "@/lib/db";

type TipoTareaNormalizada = "tarea_personal" | "tarea_grupal";

type TareaDinamicaRow = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  fecha?: string | null;
  id_equipo?: number | null;
  es_grupal?: number | boolean | null;
  tipo_registro?: string | null;
  completada?: number | boolean | null;
  equipo_nombre?: string | null;
};

type EstadoInvitacion = "pendiente" | "aceptado" | "rechazado";

type EventoInternoRow = {
  id: number;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  ubicacion: string | null;
  tipo: "personal" | "equipo" | "otro";
  equipo_nombre: string | null;
  estado_asistencia: EstadoInvitacion | null;
  es_organizador: 0 | 1;
  invitacion_id: number | null;
  creador_nombre: string | null;
};

type DashboardEvento = {
  id: number;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  tipo: "personal" | "equipo" | "otro";
  equipoNombre: string | null;
  estadoInvitacion: EstadoInvitacion | null;
  creadorNombre: string | null;
  esOrganizador: boolean;
  invitacionId: number | null;
};

type DashboardInvitacionPendiente = {
  eventoId: number;
  invitacionId: number | null;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  equipoNombre: string | null;
  creadorNombre: string | null;
  estadoInvitacion: Extract<EstadoInvitacion, "pendiente">;
};

type DashboardTarea = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string | null;
  tipo: TipoTareaNormalizada;
  equipoNombre: string | null;
  completada: boolean;
};

type DashboardTodayResponse = {
  nombre: string;
  fechaIso: string;
  fechaLegible: string;
  totalEventos: number;
  totalTareas: number;
  eventos: DashboardEvento[];
  tareas: DashboardTarea[];
  invitacionesPendientes: DashboardInvitacionPendiente[];
};

interface PragmaTableInfoRow {
  name: string;
}

function inferirTipoTarea(tarea: TareaDinamicaRow): TipoTareaNormalizada {
  const { es_grupal, tipo_registro, id_equipo } = tarea;

  if (typeof es_grupal === "number") {
    return es_grupal !== 0 ? "tarea_grupal" : "tarea_personal";
  }

  if (typeof es_grupal === "boolean") {
    return es_grupal ? "tarea_grupal" : "tarea_personal";
  }

  if (typeof tipo_registro === "string") {
    const valorNormalizado = tipo_registro.trim().toLowerCase();
    if (["grupal", "equipo", "team", "colaborativa", "grupo"].includes(valorNormalizado)) {
      return "tarea_grupal";
    }
  }

  if (typeof id_equipo === "number" && Number.isFinite(id_equipo)) {
    return "tarea_grupal";
  }

  return "tarea_personal";
}

function normalizarBandera(valor: unknown): boolean {
  if (typeof valor === "boolean") {
    return valor;
  }

  if (typeof valor === "number") {
    return valor !== 0;
  }

  if (typeof valor === "string") {
    const limpio = valor.trim().toLowerCase();
    if (["1", "true", "si", "sí"].includes(limpio)) {
      return true;
    }
  }

  return false;
}

function obtenerFechaIso(fecha: string | null | undefined): string | null {
  if (!fecha) {
    return null;
  }

  const trimmed = fecha.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function obtenerTareasParaHoy(userId: number, hoyIso: string): Promise<DashboardTarea[]> {
  try {
    const tablaTareas = await getQuery<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tareas'"
    );

    if (!tablaTareas) {
      return [];
    }

    const columnas = await allQuery<PragmaTableInfoRow>("PRAGMA table_info('tareas')");
    const nombresColumnas = new Set(columnas.map((columna) => columna.name));

    if (!nombresColumnas.has("id") || !nombresColumnas.has("titulo")) {
      return [];
    }

    const fechaColumna = nombresColumnas.has("fecha")
      ? "fecha"
      : nombresColumnas.has("fecha_limite")
        ? "fecha_limite"
        : nombresColumnas.has("vencimiento")
          ? "vencimiento"
          : null;

    if (!fechaColumna) {
      return [];
    }

    const campos: string[] = [
      "t.id AS id",
      "t.titulo AS titulo",
      `t.${fechaColumna} AS fecha`,
    ];

    if (nombresColumnas.has("descripcion")) {
      campos.push("t.descripcion AS descripcion");
    }

    if (nombresColumnas.has("id_equipo")) {
      campos.push("t.id_equipo AS id_equipo");
    }

    if (nombresColumnas.has("es_grupal")) {
      campos.push("t.es_grupal AS es_grupal");
    }

    if (nombresColumnas.has("tipo")) {
      campos.push("t.tipo AS tipo_registro");
    }

    if (nombresColumnas.has("completada")) {
      campos.push("t.completada AS completada");
    }

    let joins = "";
    let membershipJoin = "";

    if (nombresColumnas.has("id_equipo")) {
      joins += " LEFT JOIN equipos eq ON eq.id = t.id_equipo";
      campos.push("eq.nombre AS equipo_nombre");

      membershipJoin =
        " LEFT JOIN miembros_equipo me ON me.id_equipo = t.id_equipo AND me.id_usuario = ? AND me.estado = 'aceptado'";
      joins += membershipJoin;
    }

    const condiciones: string[] = [];
    const filtrosAnd: string[] = [];
    const parametros: unknown[] = [];

    if (membershipJoin) {
      parametros.push(userId);
    }

    if (nombresColumnas.has("id_usuario")) {
      if (membershipJoin) {
        condiciones.push("(t.id_usuario = ? OR me.id IS NOT NULL)");
      } else {
        condiciones.push("t.id_usuario = ?");
      }
      parametros.push(userId);
    } else if (membershipJoin) {
      condiciones.push("me.id IS NOT NULL");
    }

    if (nombresColumnas.has("completada")) {
      filtrosAnd.push("(t.completada IS NULL OR t.completada = 0)");
    }

    const condicionesTotales: string[] = [];
    if (condiciones.length > 0) {
      if (condiciones.length === 1) {
        condicionesTotales.push(condiciones[0]);
      } else {
        condicionesTotales.push(`(${condiciones.join(" OR ")})`);
      }
    }

    if (filtrosAnd.length > 0) {
      condicionesTotales.push(filtrosAnd.join(" AND "));
    }

    const whereClause = condicionesTotales.length > 0 ? ` WHERE ${condicionesTotales.join(" AND ")}` : "";

    const query = `SELECT ${campos.join(", ")} FROM tareas t${joins}${whereClause}`;
    const tareas = await allQuery<TareaDinamicaRow>(query, parametros);

    return tareas
      .filter((tarea) => {
        const fechaIso = obtenerFechaIso(tarea.fecha ?? null);
        return fechaIso === hoyIso;
      })
      .map((tarea) => {
        const tipo = inferirTipoTarea(tarea);
        const completada = normalizarBandera(tarea.completada);

        return {
          id: tarea.id,
          titulo: tarea.titulo,
          descripcion: tarea.descripcion ?? null,
          fecha: tarea.fecha ?? null,
          tipo,
          equipoNombre: tarea.equipo_nombre ?? null,
          completada,
        } satisfies DashboardTarea;
      });
  } catch (error) {
    console.warn("[GET /api/dashboard/today] No se pudieron obtener las tareas", error);
    return [];
  }
}

type EventosHoyResultado = {
  confirmados: DashboardEvento[];
  pendientes: DashboardInvitacionPendiente[];
};

async function obtenerEventosParaHoy(
  userId: number,
  hoyIso: string,
): Promise<EventosHoyResultado> {
  const eventos = await allQuery<EventoInternoRow>(
    `SELECT
      e.id,
      e.titulo,
      e.descripcion,
      e.inicio,
      e.fin,
      e.ubicacion,
      e.tipo,
      eq.nombre AS equipo_nombre,
      pei.estado_asistencia,
      CASE WHEN e.id_usuario = ? THEN 1 ELSE 0 END AS es_organizador,
      pei.id AS invitacion_id,
      creador.nombre AS creador_nombre
    FROM eventos_internos e
    LEFT JOIN participantes_evento_interno pei
      ON pei.id_evento = e.id AND pei.id_usuario = ?
    LEFT JOIN equipos eq ON eq.id = e.id_equipo
    LEFT JOIN usuarios creador ON creador.id = e.id_usuario
    WHERE e.id_usuario = ? OR pei.id IS NOT NULL`,
    [userId, userId, userId]
  );

  const confirmados: DashboardEvento[] = [];
  const pendientes: DashboardInvitacionPendiente[] = [];

  eventos.forEach((evento) => {
    const inicioIso = obtenerFechaIso(evento.inicio);
    const finIso = obtenerFechaIso(evento.fin);

    let coincideConHoy = false;

    if (inicioIso && finIso) {
      coincideConHoy = inicioIso <= hoyIso && finIso >= hoyIso;
    } else if (inicioIso) {
      coincideConHoy = inicioIso === hoyIso;
    } else if (finIso) {
      coincideConHoy = finIso === hoyIso;
    }

    if (!coincideConHoy) {
      return;
    }

    const estadoActual =
      evento.estado_asistencia ?? (evento.es_organizador ? "aceptado" : null);

    if (estadoActual === "pendiente" && evento.es_organizador === 0) {
      pendientes.push({
        eventoId: evento.id,
        invitacionId: evento.invitacion_id,
        titulo: evento.titulo,
        descripcion: evento.descripcion,
        inicio: evento.inicio,
        fin: evento.fin,
        equipoNombre: evento.equipo_nombre,
        creadorNombre: evento.creador_nombre,
        estadoInvitacion: "pendiente",
      });
      return;
    }

    confirmados.push({
      id: evento.id,
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      inicio: evento.inicio,
      fin: evento.fin,
      tipo: evento.tipo,
      equipoNombre: evento.equipo_nombre,
      estadoInvitacion: estadoActual,
      creadorNombre: evento.creador_nombre,
      esOrganizador: evento.es_organizador === 1,
      invitacionId: evento.invitacion_id,
    });
  });

  return { confirmados, pendientes };
}

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const ahora = new Date();
    const hoyIso = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;

    const formatoLegible = new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(ahora);

    const [{ confirmados, pendientes }, tareas] = await Promise.all([
      obtenerEventosParaHoy(user.id, hoyIso),
      obtenerTareasParaHoy(user.id, hoyIso),
    ]);

    const tareasPendientes = tareas.filter((tarea) => !tarea.completada);

    const payload: DashboardTodayResponse = {
      nombre: user.nombre,
      fechaIso: hoyIso,
      fechaLegible: formatoLegible,
      totalEventos: confirmados.length + pendientes.length,
      totalTareas: tareasPendientes.length,
      eventos: confirmados,
      tareas: tareasPendientes,
      invitacionesPendientes: pendientes,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/dashboard/today]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
