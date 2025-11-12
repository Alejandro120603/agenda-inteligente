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

type TipoUnificado = "evento" | "tarea_personal" | "tarea_grupal";

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

type TipoCreacion = "evento" | "tarea_personal" | "tarea_grupal";

const TIPOS_CREACION = new Set<TipoCreacion>([
  "evento",
  "tarea_personal",
  "tarea_grupal",
]);

function normalizarTextoOpcional(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

function normalizarFecha(fecha: unknown): string | null {
  if (typeof fecha !== "string") {
    return null;
  }

  const trimmed = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
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

function normalizarHora(hora: unknown): string | null {
  if (typeof hora !== "string") {
    return null;
  }

  const trimmed = hora.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function combinarFechaHoraStrings(fecha: string, hora: string): string {
  const horaNormalizada = hora.length === 5 ? `${hora}:00` : hora;
  return `${fecha}T${horaNormalizada}`;
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
    return ["1", "true", "si", "sí", "on"].includes(limpio);
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await obtenerUsuarioAutenticado();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();

    const tituloValor =
      typeof body.titulo === "string" ? body.titulo.trim() : "";
    if (!tituloValor) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const descripcionNormalizada = normalizarTextoOpcional(body.descripcion);
    const fechaInicio = normalizarFecha(body.fecha_inicio);
    const fechaFin = normalizarFecha(body.fecha_fin);
    const horaInicio = normalizarHora(body.hora_inicio);
    const horaFin = normalizarHora(body.hora_fin);

    if (!fechaInicio || !fechaFin || !horaInicio || !horaFin) {
      return NextResponse.json(
        { error: "Debes indicar una fecha y hora de inicio y fin" },
        { status: 400 }
      );
    }

    const inicioIso = combinarFechaHoraStrings(fechaInicio, horaInicio);
    const finIso = combinarFechaHoraStrings(fechaFin, horaFin);

    const inicioDate = new Date(inicioIso);
    const finDate = new Date(finIso);

    if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(finDate.getTime())) {
      return NextResponse.json(
        { error: "Las fechas proporcionadas no son válidas" },
        { status: 400 }
      );
    }

    if (finDate.getTime() <= inicioDate.getTime()) {
      return NextResponse.json(
        { error: "La fecha de fin debe ser posterior a la de inicio" },
        { status: 400 }
      );
    }

    const tipoRaw = typeof body.tipo === "string" ? body.tipo.trim() : "";
    if (!TIPOS_CREACION.has(tipoRaw as TipoCreacion)) {
      return NextResponse.json(
        { error: "Tipo de registro inválido" },
        { status: 400 }
      );
    }

    const esEquipo = normalizarBandera(body.es_equipo);
    let tipoSolicitud = tipoRaw as TipoCreacion;

    if (tipoSolicitud === "tarea_grupal" && !esEquipo) {
      return NextResponse.json(
        { error: "Las tareas grupales requieren un equipo" },
        { status: 400 }
      );
    }

    if (esEquipo && tipoSolicitud === "evento") {
      tipoSolicitud = "tarea_grupal";
    }

    const tipoFinal: TipoCreacion = esEquipo ? "tarea_grupal" : tipoSolicitud;
    const requiereEquipo = tipoFinal === "tarea_grupal";
    const equipoId = requiereEquipo ? Number(body.equipo_id) : null;

    if (requiereEquipo) {
      if (!Number.isInteger(equipoId) || (equipoId ?? 0) <= 0) {
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
    }

    if (tipoFinal === "evento") {
      const insertResult = await runQuery(
        `INSERT INTO eventos_internos
          (id_usuario, id_equipo, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio)
         VALUES (?, NULL, ?, ?, ?, ?, NULL, ?, 0)`,
        [
          userId,
          tituloValor,
          descripcionNormalizada,
          inicioIso,
          finIso,
          "personal",
        ]
      );

      const id = Number(insertResult.lastID);
      return NextResponse.json(
        { id, tipo: tipoFinal, message: "Evento creado correctamente" },
        { status: 201 }
      );
    }

    const insertResult = await runQuery(
      `INSERT INTO tareas
        (id_usuario, id_equipo, titulo, descripcion, fecha, es_grupal, tipo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        requiereEquipo ? equipoId : null,
        tituloValor,
        descripcionNormalizada,
        fechaInicio,
        requiereEquipo ? 1 : 0,
        tipoFinal,
      ]
    );

    const id = Number(insertResult.lastID);
    return NextResponse.json(
      { id, tipo: tipoFinal, message: "Tarea registrada correctamente" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/events]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

