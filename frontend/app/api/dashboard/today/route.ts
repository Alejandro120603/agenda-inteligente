import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEventsForUser } from "@/lib/events";
import { getTasksForUser } from "@/lib/tasks";

interface InvitationSummary {
  id: number;
  equipo_nombre: string;
  invitado_por_nombre: string | null;
  invitado_en: string;
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET() {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const today = new Date();
    const todayDate = formatDateOnly(today);

    const [tareas, eventos, invitaciones] = await Promise.all([
      getTasksForUser(user.id, { date: todayDate, includeCompleted: false }),
      getEventsForUser(user.id, { date: todayDate }),
      db.all<InvitationSummary>(
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
      ),
    ]);

    return NextResponse.json({
      date: todayDate,
      user,
      tareas,
      eventos,
      invitaciones,
    });
  } catch (error) {
    console.error("[GET /api/dashboard/today]", error);
    return NextResponse.json(
      { error: "Error al obtener el resumen diario" },
      { status: 500 }
    );
  }
}
