import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface InvitacionRow {
  id: number;
  id_usuario: number;
  estado: string;
}

async function responderInvitacion(
  context: { params: Promise<{ id: string }> },
  nuevoEstado: "aceptado"
) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = await context.params;
    const invitacionId = Number(params.id);
    if (!Number.isInteger(invitacionId) || invitacionId <= 0) {
      return NextResponse.json({ error: "Invitación inválida" }, { status: 400 });
    }

    const invitacion = await db.get<InvitacionRow>(
      `SELECT id, id_usuario, estado
       FROM miembros_equipo
       WHERE id = ?`,
      [invitacionId]
    );

    if (!invitacion) {
      return NextResponse.json(
        { error: "Invitación no encontrada" },
        { status: 404 }
      );
    }

    if (invitacion.id_usuario !== user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para responder esta invitación" },
        { status: 403 }
      );
    }

    if (invitacion.estado !== "pendiente") {
      return NextResponse.json(
        { error: "La invitación ya fue respondida" },
        { status: 400 }
      );
    }

    const update = await db.run(
      `UPDATE miembros_equipo
       SET estado = ?, respondido_en = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nuevoEstado, invitacionId]
    );

    if (!update.changes) {
      return NextResponse.json(
        { error: "No se pudo actualizar la invitación" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Invitación aceptada" });
  } catch (error) {
    console.error("[/api/invitaciones/:id/aceptar]", error);
    return NextResponse.json(
      { error: "No se pudo aceptar la invitación" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return responderInvitacion(context, "aceptado");
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return responderInvitacion(context, "aceptado");
}
