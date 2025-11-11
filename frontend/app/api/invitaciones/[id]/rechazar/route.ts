import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface InvitacionRow {
  id: number;
  estado: string;
}

export async function POST(
  _: Request,
  context: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const invitacionId = Number(context.params.id);
    if (!Number.isInteger(invitacionId) || invitacionId <= 0) {
      return NextResponse.json({ error: "Invitación inválida" }, { status: 400 });
    }

    const invitacion = await db.get<InvitacionRow>(
      `SELECT id, estado
       FROM miembros_equipo
       WHERE id = ? AND id_usuario = ?`,
      [invitacionId, user.id]
    );

    if (!invitacion) {
      return NextResponse.json(
        { error: "Invitación no encontrada" },
        { status: 404 }
      );
    }

    if (invitacion.estado !== "pendiente") {
      return NextResponse.json(
        { error: "La invitación ya fue respondida" },
        { status: 409 }
      );
    }

    const update = await db.run(
      `UPDATE miembros_equipo
       SET estado = 'rechazado', respondido_en = CURRENT_TIMESTAMP
       WHERE id = ? AND id_usuario = ?`,
      [invitacionId, user.id]
    );

    if (!update.changes) {
      return NextResponse.json(
        { error: "No se pudo actualizar la invitación" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Invitación rechazada" });
  } catch (error) {
    console.error("[POST /api/invitaciones/:id/rechazar]", error);
    return NextResponse.json(
      { error: "No se pudo rechazar la invitación" },
      { status: 500 }
    );
  }
}
