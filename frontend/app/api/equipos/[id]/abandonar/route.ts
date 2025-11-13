import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RolMiembro = "administrador" | "miembro";
type EstadoMiembro = "pendiente" | "aceptado" | "rechazado";

interface RelacionMiembroRow {
  id: number;
  rol: RolMiembro;
  estado: EstadoMiembro;
}

function parseId(raw: string) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function obtenerRelacionMiembro(equipoId: number, usuarioId: number) {
  return db.get<RelacionMiembroRow>(
    `SELECT id, rol, estado
       FROM miembros_equipo
      WHERE id_equipo = ? AND id_usuario = ?`,
    [equipoId, usuarioId]
  );
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = await context.params;
    const equipoId = parseId(params.id);
    if (!equipoId) {
      return NextResponse.json({ error: "Equipo inválido" }, { status: 400 });
    }

    const relacion = await obtenerRelacionMiembro(equipoId, user.id);
    if (!relacion || relacion.estado !== "aceptado") {
      return NextResponse.json(
        { error: "No perteneces a este equipo" },
        { status: 404 }
      );
    }

    if (relacion.rol === "administrador") {
      return NextResponse.json(
        { error: "El administrador no puede abandonar el equipo" },
        { status: 400 }
      );
    }

    const eliminacion = await db.run(
      "DELETE FROM miembros_equipo WHERE id = ?",
      [relacion.id]
    );

    if (!eliminacion.changes) {
      return NextResponse.json(
        { error: "No se pudo abandonar el equipo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Has abandonado el equipo",
    });
  } catch (error) {
    console.error("[POST /api/equipos/:id/abandonar]", error);
    return NextResponse.json(
      { error: "No se pudo abandonar el equipo" },
      { status: 500 }
    );
  }
}
