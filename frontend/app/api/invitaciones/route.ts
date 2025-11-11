import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface InvitacionRow {
  id: number;
  equipo_nombre: string;
  invitado_por_nombre: string | null;
  invitado_en: string;
}

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const invitaciones = await db.all<InvitacionRow>(
      `SELECT
        me.id,
        e.nombre AS equipo_nombre,
        invitador.nombre AS invitado_por_nombre,
        me.invitado_en
      FROM miembros_equipo me
      INNER JOIN equipos e ON e.id = me.id_equipo
      LEFT JOIN usuarios invitador ON invitador.id = me.invitado_por
      WHERE me.id_usuario = ? AND me.estado = 'pendiente'
      ORDER BY datetime(me.invitado_en) DESC`,
      [user.id]
    );

    return NextResponse.json({ invitaciones });
  } catch (error) {
    console.error("[GET /api/invitaciones]", error);
    return NextResponse.json(
      { error: "Error al obtener las invitaciones" },
      { status: 500 }
    );
  }
}
