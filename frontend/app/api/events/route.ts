import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { allQuery, getQuery, runQuery } from "@/lib/db";

interface EventoInternoRow {
  id: number;
  id_usuario: number;
  id_equipo: number | null;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  ubicacion: string | null;
  tipo: "personal" | "equipo" | "otro";
  recordatorio: number;
  creado_en: string;
  equipo_nombre: string | null;
  es_organizador: 0 | 1;
  es_participante: 0 | 1;
  estado_asistencia: "pendiente" | "aceptado" | "rechazado" | null;
}

interface PragmaTableInfoRow {
  name: string;
}

interface TareaDinamicaRow {
  id: number;
  titulo: string;
  descripcion?: string | null;
  fecha?: string | null;
  id_equipo?: number | null;
  es_grupal?: number | boolean | null;
  tipo_registro?: string | null;
  completada?: number | boolean | null;
  equipo_nombre?: string | null;
}

type TipoUnificado = "evento" | "tarea" | "tarea_grupal";

interface EventoUnificado {
  id: string;
  source: "evento_interno" | "tarea";
  sourceId: number;
  tipo: TipoUnificado;
  titulo: string;
  descripcion: string | null;
  inicio: string | null;
  fin: string | null;
  fecha: string | null;
  ubicacion: string | null;
  equipo_nombre: string | null;
  es_organizador: boolean;
  es_participante: boolean;
  estado_asistencia: "pendiente" | "aceptado" | "rechazado" | null;
}

async function obtenerUsuarioAutenticado(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("user_id");

  if (!cookie?.value) {
    return null;
  }

  const userId = Number(cookie.value);
  if (!Number.isFinite(userId)) {
    return null;
  }

  return userId;
}

function inferirTipoTarea(tarea: TareaDinamicaRow): TipoUnificado {
  const { es_grupal, tipo_registro, id_equipo } = tarea;

  if (typeof es_grupal === "number") {
    return es_grupal !== 0 ? "tarea_grupal" : "tarea";
  }

  if (typeof es_grupal === "boolean") {
    return es_grupal ? "tarea_grupal" : "tarea";
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

  return "tarea";
}

function obtenerFechaComparable(evento: EventoUnificado): string | null {
  if (evento.tipo === "evento") {
    return evento.inicio ?? evento.fin;
  }

  return evento.fecha ? `${evento.fecha}T00:00:00` : null;
}

async function obtenerTareasUnificadas(userId: number): Promise<EventoUnificado[]> {
  try {
    const tablaTareas = await getQuery<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tareas'"
    );

    if (!tablaTareas) {
      return [];
    }

    const columnas = await allQuery<PragmaTableInfoRow>(
      "PRAGMA table_info('tareas')"
    );

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

    const selectCampos: string[] = [
      "t.id AS id",
      "t.titulo AS titulo",
      `t.${fechaColumna} AS fecha`,
    ];

    if (nombresColumnas.has("descripcion")) {
      selectCampos.push("t.descripcion AS descripcion");
    }

    if (nombresColumnas.has("id_equipo")) {
      selectCampos.push("t.id_equipo AS id_equipo");
    }

    if (nombresColumnas.has("es_grupal")) {
      selectCampos.push("t.es_grupal AS es_grupal");
    }

    if (nombresColumnas.has("tipo")) {
      selectCampos.push("t.tipo AS tipo_registro");
    }

    if (nombresColumnas.has("completada")) {
      selectCampos.push("t.completada AS completada");
    }

    let joins = "";

    if (nombresColumnas.has("id_equipo")) {
      joins += " LEFT JOIN equipos eq ON eq.id = t.id_equipo";
      selectCampos.push("eq.nombre AS equipo_nombre");
    }

    let membershipJoin = "";
    if (nombresColumnas.has("id_equipo")) {
      membershipJoin =
        " LEFT JOIN miembros_equipo me ON me.id_equipo = t.id_equipo AND me.id_usuario = ? AND me.estado = 'aceptado'";
      joins += membershipJoin;
    }

    const condiciones: string[] = [];
    const parametros: unknown[] = [];

    if (membershipJoin) {
      parametros.push(userId);
    }

    if (nombresColumnas.has("id_usuario")) {
      if (membershipJoin) {
        condiciones.push(`t.id_usuario = ? OR me.id IS NOT NULL`);
      } else {
        condiciones.push(`t.id_usuario = ?`);
      }
      parametros.push(userId);
    } else if (membershipJoin) {
      condiciones.push("me.id IS NOT NULL");
    }

    const whereClause = condiciones.length > 0 ? ` WHERE ${condiciones.join(" OR ")}` : "";

    const query = `SELECT ${selectCampos.join(", ")} FROM tareas t${joins}${whereClause}`;

    const tareas = await allQuery<TareaDinamicaRow>(query, parametros);

    return tareas
      .filter((tarea) => typeof tarea.fecha === "string" && tarea.fecha.trim().length > 0)
      .map((tarea) => {
        const tipoUnificado = inferirTipoTarea(tarea);

        return {
          id: `tarea-${tarea.id}`,
          source: "tarea" as const,
          sourceId: tarea.id,
          tipo: tipoUnificado,
          titulo: tarea.titulo,
          descripcion: tarea.descripcion ?? null,
          inicio: null,
          fin: null,
          fecha: tarea.fecha ?? null,
          ubicacion: null,
          equipo_nombre: tarea.equipo_nombre ?? null,
          es_organizador: false,
          es_participante: tipoUnificado === "tarea_grupal",
          estado_asistencia: null,
        } satisfies EventoUnificado;
      });
  } catch (error) {
    console.warn("[GET /api/events] No se pudieron cargar las tareas", error);
    return [];
  }
}

export async function GET() {
  try {
    const userId = await obtenerUsuarioAutenticado();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const eventosInternos = await allQuery<EventoInternoRow>(
      `SELECT
        e.id,
        e.id_usuario,
        e.id_equipo,
        e.titulo,
        e.descripcion,
        e.inicio,
        e.fin,
        e.ubicacion,
        e.tipo,
        e.recordatorio,
        e.creado_en,
        eq.nombre AS equipo_nombre,
        CASE WHEN e.id_usuario = ? THEN 1 ELSE 0 END AS es_organizador,
        CASE WHEN pei.id IS NULL THEN 0 ELSE 1 END AS es_participante,
        pei.estado_asistencia
      FROM eventos_internos e
      LEFT JOIN participantes_evento_interno pei
        ON pei.id_evento = e.id AND pei.id_usuario = ?
      LEFT JOIN equipos eq ON eq.id = e.id_equipo
      WHERE e.id_usuario = ? OR pei.id IS NOT NULL
      ORDER BY datetime(e.inicio) ASC`,
      [userId, userId, userId]
    );

    const eventosUnificados: EventoUnificado[] = eventosInternos.map((evento) => ({
      id: `evento-${evento.id}`,
      source: "evento_interno",
      sourceId: evento.id,
      tipo: "evento",
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      inicio: evento.inicio,
      fin: evento.fin,
      fecha: null,
      ubicacion: evento.ubicacion,
      equipo_nombre: evento.equipo_nombre,
      es_organizador: Boolean(evento.es_organizador),
      es_participante: Boolean(evento.es_participante),
      estado_asistencia: evento.estado_asistencia ?? null,
    }));

    const tareasUnificadas = await obtenerTareasUnificadas(userId);

    const combinados = [...eventosUnificados, ...tareasUnificadas].sort((a, b) => {
      const fechaA = obtenerFechaComparable(a);
      const fechaB = obtenerFechaComparable(b);

      if (!fechaA && !fechaB) return 0;
      if (!fechaA) return 1;
      if (!fechaB) return -1;

      return new Date(fechaA).getTime() - new Date(fechaB).getTime();
    });

    return NextResponse.json(combinados);
  } catch (error) {
    console.error("[GET /api/events]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await obtenerUsuarioAutenticado();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      titulo,
      descripcion = null,
      inicio,
      fin,
      ubicacion = null,
      tipo = "personal",
      recordatorio = 0,
      id_equipo: idEquipoPayload = null,
    } = body ?? {};

    if (!titulo || typeof titulo !== "string") {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    if (!inicio || !fin) {
      return NextResponse.json(
        { error: "Las fechas de inicio y fin son obligatorias" },
        { status: 400 }
      );
    }

    const tiposPermitidos = new Set(["personal", "equipo", "otro"]);
    const tipoEvento =
      tipo === "equipo" ? "equipo" : tiposPermitidos.has(tipo) ? tipo : "personal";

    const recordatorioValor = Number.isFinite(Number(recordatorio))
      ? Number(recordatorio)
      : 0;

    const descripcionNormalizada =
      typeof descripcion === "string" && descripcion.trim().length > 0
        ? descripcion
        : null;
    const ubicacionNormalizada =
      typeof ubicacion === "string" && ubicacion.trim().length > 0
        ? ubicacion
        : null;

    if (tipoEvento === "equipo") {
      const equipoId = Number(idEquipoPayload);
      if (!Number.isInteger(equipoId)) {
        return NextResponse.json(
          { error: "Debes seleccionar un equipo válido" },
          { status: 400 }
        );
      }

      const pertenencia = await getQuery<{ id: number }>(
        `SELECT me.id
         FROM miembros_equipo me
         WHERE me.id_equipo = ? AND me.id_usuario = ? AND me.estado = 'aceptado'`,
        [equipoId, userId]
      );

      if (!pertenencia) {
        return NextResponse.json(
          { error: "No perteneces al equipo seleccionado" },
          { status: 403 }
        );
      }

      const miembros = await allQuery<{ id_usuario: number }>(
        `SELECT id_usuario
         FROM miembros_equipo
         WHERE id_equipo = ? AND estado = 'aceptado'`,
        [equipoId]
      );

      if (miembros.length === 0) {
        return NextResponse.json(
          { error: "El equipo no tiene miembros activos" },
          { status: 400 }
        );
      }

      await runQuery("BEGIN TRANSACTION");
      try {
        const insertResult = await runQuery(
          `INSERT INTO eventos_internos
            (id_usuario, id_equipo, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            equipoId,
            titulo.trim(),
            descripcionNormalizada,
            inicio,
            fin,
            ubicacionNormalizada,
            tipoEvento,
            recordatorioValor,
          ]
        );

        const id = Number(insertResult.lastID);
        const fechaRespuesta = new Date().toISOString();

        for (const miembro of miembros) {
          const participanteId = miembro.id_usuario;
          const estadoAsistencia =
            participanteId === userId ? "aceptado" : "pendiente";
          const respondidoEn =
            participanteId === userId ? fechaRespuesta : null;

          await runQuery(
            `INSERT OR IGNORE INTO participantes_evento_interno
              (id_evento, id_usuario, estado_asistencia, respondido_en)
             VALUES (?, ?, ?, ?)`,
            [id, participanteId, estadoAsistencia, respondidoEn]
          );
        }

        await runQuery("COMMIT");

        return NextResponse.json({ id, message: "Evento creado correctamente" });
      } catch (transactionError) {
        await runQuery("ROLLBACK");
        throw transactionError;
      }
    }

    const insertResult = await runQuery(
      `INSERT INTO eventos_internos
        (id_usuario, id_equipo, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        titulo.trim(),
        descripcionNormalizada,
        inicio,
        fin,
        ubicacionNormalizada,
        tipoEvento,
        recordatorioValor,
      ]
    );

    const id = Number(insertResult.lastID);

    return NextResponse.json({ id, message: "Evento creado correctamente" });
  } catch (error) {
    console.error("[POST /api/events]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

