import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface UsuarioLigero {
  id: number;
  nombre: string;
  correo: string;
}

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const usuarios = await db.all<UsuarioLigero>(
      "SELECT id, nombre, correo FROM usuarios WHERE id != ? ORDER BY nombre",
      [user.id]
    );

    return NextResponse.json({ usuarios });
  } catch (error) {
    console.error("[GET /api/usuarios]", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los usuarios" },
      { status: 500 }
    );
  }
}
