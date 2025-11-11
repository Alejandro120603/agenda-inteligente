import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface Params {
  params: {
    id: string;
  };
}

export async function POST(_: Request, { params }: Params) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const invitacionId = Number(params.id);
    if (!Number.isInteger(invitacionId)) {
      return NextResponse.json({ error: "Invitación inválida" }, { status: 400 });
    }

    const update = await db.run(
      `UPDATE miembros_equipo
       SET estado = 'rechazado', respondido_en = CURRENT_TIMESTAMP
       WHERE id = ? AND id_usuario = ? AND estado = 'pendiente'`,
      [invitacionId, user.id]
    );

    if (!update.changes) {
      return NextResponse.json(
        { error: "Invitación no encontrada o ya respondida" },
        { status: 404 }
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
