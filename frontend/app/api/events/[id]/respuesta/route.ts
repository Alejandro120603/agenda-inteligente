import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getQuery, runQuery } from "@/lib/db";

type EstadoAsistencia = "pendiente" | "aceptado" | "rechazado";

const ESTADOS_VALIDOS = new Set<EstadoAsistencia>(["pendiente", "aceptado", "rechazado"]);

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

async function actualizarEstadoAsistencia(
  eventId: number,
  userId: number,
  estado: EstadoAsistencia,
) {
  const evento = await getQuery<{ id: number; tipo: string }>(
    `SELECT id, tipo
     FROM eventos_internos
     WHERE id = ?`,
    [eventId],
  );

  if (!evento) {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 },
    );
  }

  if (evento.tipo !== "equipo") {
    return NextResponse.json(
      { error: "Este evento no admite confirmación de asistencia" },
      { status: 400 },
    );
  }

  const participante = await getQuery<{ id: number }>(
    `SELECT id
     FROM participantes_evento_interno
     WHERE id_evento = ? AND id_usuario = ?`,
    [eventId, userId],
  );

  if (!participante) {
    return NextResponse.json(
      { error: "No estás invitado a este evento" },
      { status: 403 },
    );
  }

  const respondidoEn = estado === "pendiente" ? null : new Date().toISOString();

  await runQuery(
    `UPDATE participantes_evento_interno
     SET estado_asistencia = ?, respondido_en = ?
     WHERE id_evento = ? AND id_usuario = ?`,
    [estado, respondidoEn, eventId, userId],
  );

  return NextResponse.json({ message: "Asistencia actualizada", estado });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await obtenerUsuarioAutenticado();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const eventId = Number(id);
    if (!Number.isInteger(eventId)) {
      return NextResponse.json(
        { error: "Identificador de evento inválido" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const estado = body?.estado as EstadoAsistencia | undefined;

    if (!estado || !ESTADOS_VALIDOS.has(estado)) {
      return NextResponse.json(
        { error: "Estado de asistencia inválido" },
        { status: 400 },
      );
    }

    return actualizarEstadoAsistencia(eventId, userId, estado);
  } catch (error) {
    console.error("[PATCH /api/events/:id/respuesta]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await obtenerUsuarioAutenticado();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const eventId = Number(id);
    if (!Number.isInteger(eventId)) {
      return NextResponse.json(
        { error: "Identificador de evento inválido" },
        { status: 400 },
      );
    }

    const estadoParam = request.nextUrl.searchParams.get("estado");
    const estado = estadoParam && ESTADOS_VALIDOS.has(estadoParam as EstadoAsistencia)
      ? (estadoParam as EstadoAsistencia)
      : null;

    if (!estado) {
      return NextResponse.json(
        { error: "Estado de asistencia inválido" },
        { status: 400 },
      );
    }

    return actualizarEstadoAsistencia(eventId, userId, estado);
  } catch (error) {
    console.error("[POST /api/events/:id/respuesta]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
