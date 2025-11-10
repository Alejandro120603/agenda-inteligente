import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getQuery, runQuery } from "@/lib/db";

interface EventoInternoRow {
  id: number;
  id_usuario: number;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  ubicacion: string | null;
  tipo: "personal" | "equipo" | "otro";
  recordatorio: number;
  creado_en: string;
}

async function obtenerUsuarioAutenticado(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("user_id");

  if (!cookie?.value) return null;

  const userId = Number(cookie.value);
  if (!Number.isFinite(userId)) return null;

  return userId;
}

async function obtenerEventoDelUsuario(
  id: number,
  userId: number
): Promise<EventoInternoRow | null> {
  const evento = await getQuery<EventoInternoRow>(
    "SELECT id, id_usuario, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio, creado_en FROM eventos_internos WHERE id = ? AND id_usuario = ?",
    [id, userId]
  );

  return evento ?? null;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await obtenerUsuarioAutenticado();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const eventId = Number(id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json(
        { error: "Identificador de evento inválido" },
        { status: 400 }
      );
    }

    const evento = await obtenerEventoDelUsuario(eventId, userId);
    if (!evento) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const titulo =
      typeof body.titulo === "string" && body.titulo.trim()
        ? body.titulo.trim()
        : evento.titulo;
    const descripcion =
      typeof body.descripcion === "string"
        ? body.descripcion
        : evento.descripcion;
    const inicio = body.inicio ?? evento.inicio;
    const fin = body.fin ?? evento.fin;
    const ubicacion =
      typeof body.ubicacion === "string"
        ? body.ubicacion
        : evento.ubicacion;

    const tiposPermitidos = new Set(["personal", "equipo", "otro"]);
    const tipo = tiposPermitidos.has(body.tipo) ? body.tipo : evento.tipo;

    const recordatorio = Number.isFinite(Number(body.recordatorio))
      ? Number(body.recordatorio)
      : evento.recordatorio;

    if (!inicio || !fin) {
      return NextResponse.json(
        { error: "Las fechas de inicio y fin son obligatorias" },
        { status: 400 }
      );
    }

    await runQuery(
      "UPDATE eventos_internos SET titulo = ?, descripcion = ?, inicio = ?, fin = ?, ubicacion = ?, tipo = ?, recordatorio = ? WHERE id = ? AND id_usuario = ?",
      [
        titulo,
        descripcion,
        inicio,
        fin,
        ubicacion,
        tipo,
        recordatorio,
        eventId,
        userId,
      ]
    );

    return NextResponse.json({ message: "Evento actualizado correctamente" });
  } catch (error) {
    console.error("[PUT /api/events/:id]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await obtenerUsuarioAutenticado();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const eventId = Number(id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json(
        { error: "Identificador de evento inválido" },
        { status: 400 }
      );
    }

    const evento = await obtenerEventoDelUsuario(eventId, userId);
    if (!evento) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    await runQuery(
      "DELETE FROM eventos_internos WHERE id = ? AND id_usuario = ?",
      [eventId, userId]
    );

    return NextResponse.json({ message: "Evento eliminado correctamente" });
  } catch (error) {
    console.error("[DELETE /api/events/:id]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

