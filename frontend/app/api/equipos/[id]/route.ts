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

interface EquipoDetalleRow {
  id: number;
  nombre: string;
  creado_en: string;
  creado_por: number;
  creador_nombre: string | null;
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

async function obtenerRelacionMiembro(equipoId: number, usuarioId: number) {
  return db.get<RelacionMiembroRow>(
    `SELECT id, rol, estado
       FROM miembros_equipo
      WHERE id_equipo = ? AND id_usuario = ?`,
    [equipoId, usuarioId]
  );
}

async function obtenerEquipo(equipoId: number) {
  return db.get<EquipoDetalleRow>(
    `SELECT e.id, e.nombre, e.creado_en, e.creado_por, c.nombre AS creador_nombre
       FROM equipos e
       LEFT JOIN usuarios c ON c.id = e.creado_por
      WHERE e.id = ?`,
    [equipoId]
  );
}

async function obtenerMiembros(equipoId: number) {
  return db.all<MiembroDetalleRow>(
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
      WHERE me.id_equipo = ?
        AND me.estado IN ('aceptado', 'pendiente')
      ORDER BY CASE WHEN me.rol = 'administrador' THEN 0 ELSE 1 END,
               u.nombre COLLATE NOCASE`,
    [equipoId]
  );
}

function parseId(raw: string) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(
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
        { error: "No se encontró el equipo" },
        { status: 404 }
      );
    }

    if (relacion.rol !== "administrador") {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar este equipo" },
        { status: 403 }
      );
    }

    const equipo = await obtenerEquipo(equipoId);
    if (!equipo) {
      return NextResponse.json(
        { error: "Equipo no encontrado" },
        { status: 404 }
      );
    }

    const miembros = await obtenerMiembros(equipoId);

    return NextResponse.json({ equipo, miembros });
  } catch (error) {
    console.error("[GET /api/equipos/:id]", error);
    return NextResponse.json(
      { error: "Error al obtener la información del equipo" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
        { error: "No tienes permisos para editar este equipo" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const nombre =
      typeof body?.nombre === "string" ? body.nombre.trim() : "";

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del equipo es obligatorio" },
        { status: 400 }
      );
    }

    await db.run("UPDATE equipos SET nombre = ? WHERE id = ?", [
      nombre,
      equipoId,
    ]);

    const equipoActualizado = await obtenerEquipo(equipoId);
    if (!equipoActualizado) {
      return NextResponse.json(
        { error: "Equipo no encontrado tras la actualización" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      equipo: equipoActualizado,
      message: "Equipo actualizado correctamente",
    });
  } catch (error) {
    console.error("[PATCH /api/equipos/:id]", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el equipo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { error: "No se encontró el equipo" },
        { status: 404 }
      );
    }

    if (relacion.rol !== "administrador") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este equipo" },
        { status: 403 }
      );
    }

    const eliminacion = await db.run("DELETE FROM equipos WHERE id = ?", [
      equipoId,
    ]);

    if (!eliminacion.changes) {
      return NextResponse.json(
        { error: "No se pudo eliminar el equipo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Equipo eliminado correctamente",
    });
  } catch (error) {
    console.error("[DELETE /api/equipos/:id]", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el equipo" },
      { status: 500 }
    );
  }
}
