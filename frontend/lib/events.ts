import { allQuery } from "./db";

export interface EventRecord {
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

interface FetchEventOptions {
  /** Fecha en formato ISO (YYYY-MM-DD) para filtrar eventos por día. */
  date?: string;
}

const BASE_EVENT_QUERY = `SELECT
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
  WHERE (e.id_usuario = ? OR pei.id IS NOT NULL)`;

export async function getEventsForUser(
  userId: number,
  options: FetchEventOptions = {}
): Promise<EventRecord[]> {
  const filters: string[] = [];
  const params: (number | string)[] = [userId, userId, userId];

  if (options.date) {
    filters.push("date(e.inicio) = date(?)");
    params.push(options.date);
  }

  const query = [
    BASE_EVENT_QUERY,
    filters.length ? `AND ${filters.join(" AND ")}` : "",
    "ORDER BY datetime(e.inicio) ASC",
  ]
    .filter(Boolean)
    .join(" ");

  return allQuery<EventRecord>(query, params);
}
