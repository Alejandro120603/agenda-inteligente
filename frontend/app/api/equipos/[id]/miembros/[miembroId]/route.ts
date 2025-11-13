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

interface MiembroRow {
  id: number;
  id_usuario: number;
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; miembroId: string }> }
) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = await context.params;
    const equipoId = parseId(params.id);
    const miembroId = parseId(params.miembroId);

    if (!equipoId || !miembroId) {
      return NextResponse.json({ error: "Identificadores inválidos" }, { status: 400 });
    }

    const relacion = await obtenerRelacionMiembro(equipoId, user.id);
    if (!relacion || relacion.estado !== "aceptado") {
      return NextResponse.json(
        { error: "No se encontró el equipo" },
        { status: 404 }
      );
    }

    if (relacion.rol !== "administrador") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar miembros" },
        { status: 403 }
      );
    }

    const miembro = await db.get<MiembroRow>(
      `SELECT id, id_usuario, rol, estado
         FROM miembros_equipo
        WHERE id = ? AND id_equipo = ?`,
      [miembroId, equipoId]
    );

    if (!miembro) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    if (miembro.rol === "administrador") {
      return NextResponse.json(
        { error: "No se puede eliminar al administrador del equipo" },
        { status: 400 }
      );
    }

    if (miembro.id_usuario === user.id) {
      return NextResponse.json(
        { error: "Utiliza la opción de abandonar para salir del equipo" },
        { status: 400 }
      );
    }

    const eliminacion = await db.run(
      "DELETE FROM miembros_equipo WHERE id = ?",
      [miembroId]
    );

    if (!eliminacion.changes) {
      return NextResponse.json(
        { error: "No se pudo eliminar al miembro" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Miembro eliminado del equipo",
    });
  } catch (error) {
    console.error("[DELETE /api/equipos/:id/miembros/:miembroId]", error);
    return NextResponse.json(
      { error: "No se pudo eliminar al miembro" },
      { status: 500 }
    );
  }
}
