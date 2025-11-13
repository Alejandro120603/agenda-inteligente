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

interface MiembroDetalleRow {
  id: number;
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: RolMiembro;
  estado: EstadoMiembro;
  invitado_en: string;
  respondido_en: string | null;
}

interface MiembroExistenteRow {
  id: number;
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

async function obtenerMiembroDetalle(miembroId: number) {
  return db.get<MiembroDetalleRow>(
    `SELECT me.id,
            me.id_usuario,
            u.nombre,
            u.correo,
            me.rol,
            me.estado,
            me.invitado_en,
            me.respondido_en
       FROM miembros_equipo me
       INNER JOIN usuarios u ON u.id = me.id_usuario
      WHERE me.id = ?`,
    [miembroId]
  );
}

export async function POST(
  request: Request,
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
        { error: "No se encontró el equipo" },
        { status: 404 }
      );
    }

    if (relacion.rol !== "administrador") {
      return NextResponse.json(
        { error: "No tienes permisos para invitar miembros" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const usuarioId =
      typeof body?.usuarioId === "number" ? body.usuarioId : null;

    if (!usuarioId) {
      return NextResponse.json(
        { error: "Debes indicar un usuario válido" },
        { status: 400 }
      );
    }

    if (usuarioId === user.id) {
      return NextResponse.json(
        { error: "No puedes invitarte a ti mismo" },
        { status: 400 }
      );
    }

    const invitado = await db.get<{ id: number }>(
      "SELECT id FROM usuarios WHERE id = ?",
      [usuarioId]
    );

    if (!invitado) {
      return NextResponse.json(
        { error: "El usuario indicado no existe" },
        { status: 404 }
      );
    }

    const existente = await db.get<MiembroExistenteRow>(
      `SELECT id, estado
         FROM miembros_equipo
        WHERE id_equipo = ? AND id_usuario = ?`,
      [equipoId, usuarioId]
    );

    let miembroId: number;

    if (existente) {
      if (existente.estado === "aceptado") {
        return NextResponse.json(
          { error: "El usuario ya es miembro del equipo" },
          { status: 400 }
        );
      }

      if (existente.estado === "pendiente") {
        return NextResponse.json(
          { error: "El usuario ya tiene una invitación pendiente" },
          { status: 400 }
        );
      }

      const reinvitacion = await db.run(
        `UPDATE miembros_equipo
            SET estado = 'pendiente',
                rol = 'miembro',
                invitado_por = ?,
                invitado_en = CURRENT_TIMESTAMP,
                respondido_en = NULL
          WHERE id = ?`,
        [user.id, existente.id]
      );

      if (!reinvitacion.changes) {
        return NextResponse.json(
          { error: "No se pudo actualizar la invitación" },
          { status: 500 }
        );
      }

      miembroId = existente.id;
    } else {
      const insercion = await db.run(
        `INSERT INTO miembros_equipo (
            id_equipo,
            id_usuario,
            rol,
            estado,
            invitado_por,
            respondido_en
          ) VALUES (?, ?, 'miembro', 'pendiente', ?, NULL)`,
        [equipoId, usuarioId, user.id]
      );

      if (!insercion.lastID) {
        return NextResponse.json(
          { error: "No se pudo crear la invitación" },
          { status: 500 }
        );
      }

      miembroId = Number(insercion.lastID);
    }

    const miembro = await obtenerMiembroDetalle(miembroId);

    return NextResponse.json({
      success: true,
      miembro,
      message: "Invitación enviada correctamente",
    });
  } catch (error) {
    console.error("[POST /api/equipos/:id/miembros]", error);
    return NextResponse.json(
      { error: "No se pudo agregar al miembro" },
      { status: 500 }
    );
  }
}
