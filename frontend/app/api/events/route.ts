import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { allQuery, getQuery, runQuery } from "@/lib/db";

const MINUTE_IN_MS = 60 * 1000;

type Alcance = "personal" | "equipo";
type TipoRegistro = "evento" | "tarea";
type TipoUnificado = "evento" | "tarea_personal" | "tarea_grupal";

interface EventoInternoRow {
  id: number;
  id_usuario: number;
  id_equipo: number | null;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  tipo: string;
  equipo_nombre: string | null;
  estado_asistencia: "pendiente" | "aceptado" | "rechazado" | null;
  es_organizador: 0 | 1;
}

interface TareaRow {
  id: number;
  id_usuario: number;
  id_equipo: number | null;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  es_grupal: number;
  tipo: string | null;
  equipo_nombre: string | null;
}

interface ParticipanteRow {
  id_usuario: number;
  nombre: string | null;
  estado_asistencia: "pendiente" | "aceptado" | "rechazado" | null;
}

interface ParticipanteRespuesta {
  id: number;
  nombre: string | null;
  estado: "pendiente" | "aceptado" | "rechazado";
}

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
  idEquipo: number | null;
  alcance: Alcance;
  equipoNombre: string | null;
  estadoAsistencia: "pendiente" | "aceptado" | "rechazado" | null;
  esOrganizador: boolean;
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

function formatDateTimeLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function parseDateTimeInput(value: unknown): { iso: string; date: Date } | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, year, month, day, hour, minute, second = "00"] = match;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return { date, iso: formatDateTimeLocal(date) };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return { date: parsed, iso: formatDateTimeLocal(parsed) };
}

function parseDateOnly(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
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

function normalizarTextoOpcional(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

function esAlcance(valor: unknown): valor is Alcance {
  return valor === "personal" || valor === "equipo";
}

function esTipoRegistro(valor: unknown): valor is TipoRegistro {
  return valor === "evento" || valor === "tarea";
}

async function verificarPertenencia(equipoId: number, userId: number): Promise<boolean> {
  const pertenencia = await getQuery<{ id: number }>(
    `SELECT me.id
       FROM miembros_equipo me
      WHERE me.id_equipo = ? AND me.id_usuario = ? AND me.estado = 'aceptado'`,
    [equipoId, userId]
  );

  return Boolean(pertenencia);
}

async function registrarParticipantesEvento(
  eventoId: number,
  equipoId: number,
  creadorId: number
): Promise<ParticipanteRespuesta[]> {
  const miembros = await allQuery<{ id_usuario: number }>(
    `SELECT me.id_usuario
       FROM miembros_equipo me
      WHERE me.id_equipo = ? AND me.estado = 'aceptado'`,
    [equipoId]
  );

  const participantes = new Set<number>(miembros.map((miembro) => miembro.id_usuario));
  participantes.add(creadorId);

  for (const participanteId of participantes) {
    const estado = participanteId === creadorId ? "aceptado" : "pendiente";
    await runQuery(
      `INSERT OR IGNORE INTO participantes_evento_interno (id_evento, id_usuario, estado_asistencia)
       VALUES (?, ?, ?)`,
      [eventoId, participanteId, estado]
    );
  }

  const filas = await allQuery<ParticipanteRow>(
    `SELECT pei.id_usuario, u.nombre, pei.estado_asistencia
       FROM participantes_evento_interno pei
       LEFT JOIN usuarios u ON u.id = pei.id_usuario
      WHERE pei.id_evento = ?
      ORDER BY CASE WHEN pei.id_usuario = ? THEN 0 ELSE 1 END, u.nombre COLLATE NOCASE`,
    [eventoId, creadorId]
  );

  return filas.map((fila) => ({
    id: fila.id_usuario,
    nombre: fila.nombre,
    estado: fila.estado_asistencia ?? "pendiente",
  }));
}

function determinarTipoTarea(tarea: TareaRow): TipoUnificado {
  if (tarea.es_grupal !== 0) {
    return "tarea_grupal";
  }

  if (typeof tarea.tipo === "string") {
    const normalizado = tarea.tipo.trim().toLowerCase();
    if (normalizado === "tarea_grupal" || normalizado === "tarea de equipo") {
      return "tarea_grupal";
    }
  }

  return "tarea_personal";
}

function obtenerFechaOrden(evento: EventoUnificado): number {
  if (evento.inicio) {
    const inicio = new Date(evento.inicio).getTime();
    if (!Number.isNaN(inicio)) {
      return inicio;
    }
  }

  if (evento.fecha) {
    const fecha = new Date(`${evento.fecha}T00:00:00`).getTime();
    if (!Number.isNaN(fecha)) {
      return fecha;
    }
  }

  return Number.POSITIVE_INFINITY;
}

export async function GET() {
  try {
    const userId = await obtenerUsuarioAutenticado();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const eventos = await allQuery<EventoInternoRow>(
      `SELECT
         e.id,
         e.id_usuario,
         e.id_equipo,
         e.titulo,
         e.descripcion,
         e.inicio,
         e.fin,
         e.tipo,
         eq.nombre AS equipo_nombre,
         pei.estado_asistencia,
         CASE WHEN e.id_usuario = ? THEN 1 ELSE 0 END AS es_organizador
       FROM eventos_internos e
       LEFT JOIN participantes_evento_interno pei
         ON pei.id_evento = e.id AND pei.id_usuario = ?
       LEFT JOIN equipos eq ON eq.id = e.id_equipo
      WHERE e.id_usuario = ? OR pei.id IS NOT NULL
      ORDER BY datetime(e.inicio) ASC`,
      [userId, userId, userId]
    );

    const eventosUnificados: EventoUnificado[] = eventos.map((evento) => ({
      id: `evento-${evento.id}`,
      source: "evento_interno",
      sourceId: evento.id,
      tipo: "evento",
      titulo: evento.titulo,
      descripcion: evento.descripcion ?? null,
      inicio: evento.inicio,
      fin: evento.fin,
      fecha: null,
      idEquipo: evento.id_equipo,
      alcance: evento.id_equipo ? "equipo" : "personal",
      equipoNombre: evento.equipo_nombre ?? null,
      estadoAsistencia:
        evento.es_organizador === 1
          ? "aceptado"
          : evento.estado_asistencia ?? "pendiente",
      esOrganizador: evento.es_organizador === 1,
    }));

    const tareas = await allQuery<TareaRow>(
      `SELECT
         t.id,
         t.id_usuario,
         t.id_equipo,
         t.titulo,
         t.descripcion,
         t.fecha,
         t.es_grupal,
         t.tipo,
         eq.nombre AS equipo_nombre
       FROM tareas t
       LEFT JOIN equipos eq ON eq.id = t.id_equipo
       LEFT JOIN miembros_equipo me
         ON me.id_equipo = t.id_equipo
        AND me.id_usuario = ?
        AND me.estado = 'aceptado'
      WHERE t.id_usuario = ? OR me.id IS NOT NULL
      ORDER BY date(t.fecha) ASC`,
      [userId, userId]
    );

    const tareasUnificadas: EventoUnificado[] = tareas.map((tarea) => {
      const tipo = determinarTipoTarea(tarea);
      const alcance: Alcance = tipo === "tarea_grupal" ? "equipo" : "personal";

      return {
        id: `tarea-${tarea.id}`,
        source: "tarea",
        sourceId: tarea.id,
        tipo,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion ?? null,
        inicio: null,
        fin: null,
        fecha: tarea.fecha,
        idEquipo: tarea.id_equipo,
        alcance,
        equipoNombre: tarea.equipo_nombre ?? null,
        estadoAsistencia: null,
        esOrganizador: tarea.id_usuario === userId,
      };
    });

    const combinados = [...eventosUnificados, ...tareasUnificadas].sort(
      (a, b) => obtenerFechaOrden(a) - obtenerFechaOrden(b)
    );

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

    const tituloValor = typeof body.titulo === "string" ? body.titulo.trim() : "";
    if (!tituloValor) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    if (!esTipoRegistro(body.tipoRegistro)) {
      return NextResponse.json(
        { error: "Tipo de registro inválido" },
        { status: 400 }
      );
    }

    if (!esAlcance(body.alcance)) {
      return NextResponse.json(
        { error: "Alcance inválido" },
        { status: 400 }
      );
    }

    const descripcion = normalizarTextoOpcional(body.descripcion);
    const esEquipo = body.alcance === "equipo";
    let equipoId: number | null = null;

    if (esEquipo) {
      equipoId = Number(body.idEquipo);
      if (!Number.isInteger(equipoId) || equipoId <= 0) {
        return NextResponse.json(
          { error: "Debes seleccionar un equipo válido" },
          { status: 400 }
        );
      }

      const pertenece = await verificarPertenencia(equipoId, userId);
      if (!pertenece) {
        return NextResponse.json(
          { error: "No perteneces al equipo seleccionado" },
          { status: 403 }
        );
      }
    }

    if (body.tipoRegistro === "evento") {
      const inicio = parseDateTimeInput(body.inicio);
      if (!inicio) {
        return NextResponse.json(
          { error: "La fecha y hora de inicio es obligatoria" },
          { status: 400 }
        );
      }

      let fin = parseDateTimeInput(body.fin);
      const duracionMinutos = Number(body.duracionMinutos);

      if (!fin && Number.isFinite(duracionMinutos) && duracionMinutos > 0) {
        const finCalculado = new Date(inicio.date.getTime() + duracionMinutos * MINUTE_IN_MS);
        fin = { date: finCalculado, iso: formatDateTimeLocal(finCalculado) };
      }

      if (!fin) {
        return NextResponse.json(
          { error: "La fecha y hora de fin es obligatoria" },
          { status: 400 }
        );
      }

      if (fin.date.getTime() <= inicio.date.getTime()) {
        return NextResponse.json(
          { error: "La fecha de fin debe ser posterior a la de inicio" },
          { status: 400 }
        );
      }

      const tipoEvento = esEquipo ? "equipo" : "personal";

      const insert = await runQuery(
        `INSERT INTO eventos_internos
          (id_usuario, id_equipo, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0)`,
        [userId, equipoId, tituloValor, descripcion, inicio.iso, fin.iso, tipoEvento]
      );

      const eventoId = Number(insert.lastID);
      const duracionCalculada = Math.round((fin.date.getTime() - inicio.date.getTime()) / MINUTE_IN_MS);

      let participantes: ParticipanteRespuesta[];

      if (esEquipo && equipoId) {
        participantes = await registrarParticipantesEvento(eventoId, equipoId, userId);
      } else {
        participantes = [
          {
            id: userId,
            nombre: null,
            estado: "aceptado",
          },
        ];
      }

      return NextResponse.json(
        {
          message: esEquipo
            ? "Evento de equipo creado correctamente"
            : "Evento creado correctamente",
          registro: {
            id: eventoId,
            tipoRegistro: "evento" as const,
            alcance: body.alcance,
            titulo: tituloValor,
            descripcion,
            inicio: inicio.iso,
            fin: fin.iso,
            fecha: null,
            idEquipo: equipoId,
            duracionMinutos: duracionCalculada,
            participantes,
          },
        },
        { status: 201 }
      );
    }

    const fecha = parseDateOnly(body.fecha ?? body.inicio);
    if (!fecha) {
      return NextResponse.json(
        { error: "La fecha de la tarea es obligatoria" },
        { status: 400 }
      );
    }

    const tipoTarea: TipoUnificado = esEquipo ? "tarea_grupal" : "tarea_personal";

    const insert = await runQuery(
      `INSERT INTO tareas
        (id_usuario, id_equipo, titulo, descripcion, fecha, es_grupal, tipo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        equipoId,
        tituloValor,
        descripcion,
        fecha,
        esEquipo ? 1 : 0,
        tipoTarea,
      ]
    );

    const tareaId = Number(insert.lastID);

    return NextResponse.json(
      {
        message: esEquipo
          ? "Tarea grupal creada correctamente"
          : "Tarea registrada correctamente",
        registro: {
          id: tareaId,
          tipoRegistro: "tarea" as const,
          alcance: body.alcance,
          titulo: tituloValor,
          descripcion,
          inicio: null,
          fin: null,
          fecha,
          idEquipo: equipoId,
          tipo: tipoTarea,
        },
      },
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
