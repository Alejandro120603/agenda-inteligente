import { db } from "./db";

const MINUTE_IN_MS = 60 * 1000;
export interface TeamMember {
  id: number;
  nombre: string;
  zona_horaria: string | null;
}

export interface BusyInterval {
  start: number;
  end: number;
  source: "evento";
}

interface EventoIntervalRow {
  inicio: string;
  fin: string | null;
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
  const rangeStart = new Date(startIso);
  const rangeEnd = new Date(endIso);
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();
  const clampToRange = !Number.isNaN(rangeStartMs) && !Number.isNaN(rangeEndMs);

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

  const intervals: BusyInterval[] = [];

  for (const evento of eventos) {
    const inicio = new Date(evento.inicio);
    const inicioMs = inicio.getTime();

    if (Number.isNaN(inicioMs)) {
      continue;
    }

    const finMs = evento.fin ? new Date(evento.fin).getTime() : null;
    const positiveEnd = ensurePositiveEnd(inicioMs, finMs);
    const normalizedStart = Math.floor(inicioMs / MINUTE_IN_MS) * MINUTE_IN_MS;
    const normalizedEnd = Math.ceil(positiveEnd / MINUTE_IN_MS) * MINUTE_IN_MS;

    let intervalStart = normalizedStart;
    let intervalEnd = Math.max(normalizedEnd, intervalStart + MINUTE_IN_MS);

    if (clampToRange) {
      intervalStart = Math.max(intervalStart, rangeStartMs);
      intervalEnd = Math.min(intervalEnd, rangeEndMs);
    }

    if (intervalEnd <= intervalStart) {
      continue;
    }

    intervals.push({
      start: intervalStart,
      end: intervalEnd,
      source: "evento",
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
  const STEP_MINUTES = 30;
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const durationMs = durationMinutes * MINUTE_IN_MS;

  if (
    Number.isNaN(startMs) ||
    Number.isNaN(endMs) ||
    durationMs <= 0 ||
    startMs >= endMs
  ) {
    return [];
  }

  const normalizedStart = new Date(startMs);
  normalizedStart.setSeconds(0, 0);

  const minutesFromMidnight = normalizedStart.getHours() * 60 + normalizedStart.getMinutes();
  const remainder = minutesFromMidnight % STEP_MINUTES;
  if (remainder !== 0) {
    normalizedStart.setMinutes(normalizedStart.getMinutes() + (STEP_MINUTES - remainder));
  }

  let cursor = normalizedStart.getTime();
  const stepMs = STEP_MINUTES * MINUTE_IN_MS;

  while (cursor < startMs) {
    cursor += stepMs;
  }

  const slots: string[] = [];

  for (let current = cursor; current + durationMs <= endMs; current += stepMs) {
    const slotDate = new Date(current);
    slotDate.setSeconds(0, 0);
    slotDate.setMilliseconds(0);
    slots.push(formatLocalDateTime(slotDate));
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
