import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { allQuery, runQuery } from "@/lib/db";

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

  if (!cookie?.value) {
    return null;
  }

  const userId = Number(cookie.value);
  if (!Number.isFinite(userId)) {
    return null;
  }

  return userId;
}

export async function GET() {
  try {
    const userId = await obtenerUsuarioAutenticado();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const eventos = await allQuery<EventoInternoRow>(
      "SELECT id, id_usuario, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio, creado_en FROM eventos_internos WHERE id_usuario = ? ORDER BY inicio ASC",
      [userId]
    );

    return NextResponse.json({ eventos });
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
    const tipoEvento = tiposPermitidos.has(tipo) ? tipo : "personal";

    const recordatorioValor = Number(recordatorio) || 0;

    const insertResult = await runQuery(
      "INSERT INTO eventos_internos (id_usuario, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        titulo.trim(),
        descripcion,
        inicio,
        fin,
        ubicacion,
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

