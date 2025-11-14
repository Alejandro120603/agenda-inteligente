import { db } from "./db";

const MINUTE_IN_MS = 60 * 1000;
const DAY_IN_MS = 24 * 60 * MINUTE_IN_MS;

export interface TeamMember {
  id: number;
  nombre: string;
  zona_horaria: string | null;
}

export interface BusyInterval {
  start: number;
  end: number;
  source: "evento" | "tarea";
}

interface EventoIntervalRow {
  inicio: string;
  fin: string | null;
}

interface TareaIntervalRow {
  fecha: string | null;
  es_grupal: number | null;
  id_equipo: number | null;
}

export interface AvailabilityScore {
  slot: string;
  available: number;
  total: number;
  busyUserIds: number[];
}

export function formatLocalDateTime(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function ensurePositiveEnd(start: number, end: number | null, fallbackMinutes = 30): number {
  if (typeof end === "number" && Number.isFinite(end) && end > start) {
    return end;
  }

  return start + fallbackMinutes * MINUTE_IN_MS;
}

export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  const members = await db.all<TeamMember>(
    `SELECT u.id, u.nombre, u.zona_horaria
       FROM miembros_equipo me
       INNER JOIN usuarios u ON u.id = me.id_usuario
      WHERE me.id_equipo = ? AND me.estado = 'aceptado'
      ORDER BY u.nombre ASC`,
    [teamId]
  );

  return members;
}

export async function getEventsForUserInRange(
  userId: number,
  startIso: string,
  endIso: string
): Promise<BusyInterval[]> {
  const eventos = await db.all<EventoIntervalRow>(
    `SELECT e.inicio AS inicio, e.fin AS fin
       FROM eventos_internos e
       LEFT JOIN participantes_evento_interno pei
         ON pei.id_evento = e.id AND pei.id_usuario = ?
      WHERE (e.id_usuario = ? OR (pei.id IS NOT NULL AND COALESCE(pei.estado_asistencia, 'pendiente') != 'rechazado'))
        AND datetime(e.inicio) < datetime(?)
        AND datetime(COALESCE(e.fin, e.inicio)) > datetime(?)`,
    [userId, userId, endIso, startIso]
  );

  const tareas = await db.all<TareaIntervalRow>(
    `SELECT t.fecha AS fecha, t.es_grupal AS es_grupal, t.id_equipo AS id_equipo
       FROM tareas t
       LEFT JOIN miembros_equipo me
         ON me.id_equipo = t.id_equipo AND me.id_usuario = ? AND me.estado = 'aceptado'
      WHERE (t.id_usuario = ? OR (t.es_grupal = 1 AND me.id IS NOT NULL))
        AND date(t.fecha) BETWEEN date(?) AND date(?)`,
    [userId, userId, startIso, endIso]
  );

  const intervals: BusyInterval[] = [];

  for (const evento of eventos) {
    const inicio = new Date(evento.inicio);
    const inicioMs = inicio.getTime();

    if (Number.isNaN(inicioMs)) {
      continue;
    }

    const finMs = evento.fin ? new Date(evento.fin).getTime() : null;
    const endMs = ensurePositiveEnd(inicioMs, finMs);

    intervals.push({
      start: inicioMs,
      end: endMs,
      source: "evento",
    });
  }

  for (const tarea of tareas) {
    if (!tarea.fecha) {
      continue;
    }

    const inicio = new Date(`${tarea.fecha}T00:00:00`);
    const inicioMs = inicio.getTime();

    if (Number.isNaN(inicioMs)) {
      continue;
    }

    intervals.push({
      start: inicioMs,
      end: inicioMs + DAY_IN_MS,
      source: "tarea",
    });
  }

  intervals.sort((a, b) => a.start - b.start);

  return intervals;
}

export function generateTimeSlots(
  startIso: string,
  endIso: string,
  durationMinutes: number
): string[] {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const durationMs = durationMinutes * MINUTE_IN_MS;

  if (
    Number.isNaN(startMs) ||
    Number.isNaN(endMs) ||
    durationMs <= 0 ||
    startMs >= endMs ||
    durationMs > endMs - startMs + 1
  ) {
    return [];
  }

  const slots: string[] = [];

  for (let cursor = startMs; cursor + durationMs <= endMs; cursor += durationMs) {
    slots.push(formatLocalDateTime(new Date(cursor)));
  }

  return slots;
}

export function computeAvailabilityMatrix(
  members: TeamMember[],
  eventsByUser: Map<number, BusyInterval[]>,
  timeSlots: string[],
  durationMinutes: number
): AvailabilityScore[] {
  const durationMs = durationMinutes * MINUTE_IN_MS;
  const total = members.length;
  const scores: AvailabilityScore[] = [];

  for (const slot of timeSlots) {
    const slotDate = new Date(slot);
    const slotStart = slotDate.getTime();

    if (Number.isNaN(slotStart)) {
      scores.push({ slot, available: 0, total, busyUserIds: members.map((m) => m.id) });
      continue;
    }

    const slotEnd = slotStart + durationMs;
    const busyUserIds: number[] = [];

    for (const member of members) {
      const intervals = eventsByUser.get(member.id) ?? [];
      const isBusy = intervals.some((interval) => {
        return slotStart < interval.end && slotEnd > interval.start;
      });

      if (isBusy) {
        busyUserIds.push(member.id);
      }
    }

    scores.push({
      slot,
      available: total - busyUserIds.length,
      total,
      busyUserIds,
    });
  }

  return scores;
}
