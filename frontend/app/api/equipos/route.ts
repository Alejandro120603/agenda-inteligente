import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface EquipoRow {
  id: number;
  nombre: string;
  creado_en: string;
  creado_por: number;
  creador_nombre: string | null;
  miembros: number;
}

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const equipos = await db.all<EquipoRow>(
      `SELECT
        e.id,
        e.nombre,
        e.creado_en,
        e.creado_por,
        c.nombre AS creador_nombre,
        (
          SELECT COUNT(*)
          FROM miembros_equipo me2
          WHERE me2.id_equipo = e.id
            AND me2.estado = 'aceptado'
        ) AS miembros
      FROM equipos e
      INNER JOIN miembros_equipo me ON me.id_equipo = e.id
      LEFT JOIN usuarios c ON c.id = e.creado_por
      WHERE me.id_usuario = ? AND me.estado = 'aceptado'
      ORDER BY datetime(e.creado_en) DESC`,
      [user.id]
    );

    return NextResponse.json({ equipos });
  } catch (error) {
    console.error("[GET /api/equipos]", error);
    return NextResponse.json(
      { error: "Error al obtener los equipos" },
      { status: 500 }
    );
  }
}

interface CrearEquipoBody {
  nombre?: string;
  invitados?: number[];
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body: CrearEquipoBody = await request.json();
    const nombre = body.nombre?.trim();
    const invitados = Array.isArray(body.invitados)
      ? body.invitados.filter((id) => Number.isInteger(id) && id !== user.id)
      : [];

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del equipo es obligatorio" },
        { status: 400 }
      );
    }

    await db.run("BEGIN TRANSACTION");
    try {
      const insertEquipo = await db.run(
        "INSERT INTO equipos (nombre, creado_por) VALUES (?, ?)",
        [nombre, user.id]
      );

      if (!insertEquipo.lastID) {
        throw new Error("No se pudo obtener el identificador del equipo");
      }

      const equipoId = Number(insertEquipo.lastID);

      await db.run(
        `INSERT INTO miembros_equipo (id_equipo, id_usuario, rol, estado, invitado_por, respondido_en)
         VALUES (?, ?, 'administrador', 'aceptado', NULL, CURRENT_TIMESTAMP)`,
        [equipoId, user.id]
      );

      for (const invitadoId of invitados) {
        await db.run(
          `INSERT OR IGNORE INTO miembros_equipo
            (id_equipo, id_usuario, rol, estado, invitado_por)
           VALUES (?, ?, 'miembro', 'pendiente', ?)`,
          [equipoId, invitadoId, user.id]
        );
      }

      await db.run("COMMIT");

      return NextResponse.json(
        { id: equipoId, message: "Equipo creado correctamente" },
        { status: 201 }
      );
    } catch (innerError) {
      await db.run("ROLLBACK");
      throw innerError;
    }
  } catch (error) {
    console.error("[POST /api/equipos]", error);
    return NextResponse.json(
      { error: "No se pudo crear el equipo" },
      { status: 500 }
    );
  }
}
