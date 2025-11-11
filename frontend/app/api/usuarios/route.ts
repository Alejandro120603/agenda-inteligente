import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { createUser, db, getUserByEmail } from "@/lib/db";

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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const nombre =
      typeof body?.nombre === "string" ? body.nombre.trim() : "";
    const correoRaw =
      typeof body?.correo === "string" ? body.correo.trim() : "";
    const password =
      typeof body?.password === "string" ? body.password : "";
    const zonaHoraria =
      typeof body?.zonaHoraria === "string" && body.zonaHoraria.trim()
        ? body.zonaHoraria.trim()
        : null;

    if (!nombre || !correoRaw || !password) {
      return NextResponse.json(
        {
          error:
            "Nombre, correo electrónico y contraseña son obligatorios.",
        },
        { status: 400 }
      );
    }

    const correo = correoRaw.toLowerCase();

    const existing = await getUserByEmail(correo);
    if (existing) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 409 }
      );
    }

    const user = await createUser(nombre, correo, password, zonaHoraria);

    return NextResponse.json(
      {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        zonaHoraria: user.zona_horaria ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/usuarios]", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "SQLITE_CONSTRAINT"
    ) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo crear el usuario" },
      { status: 500 }
    );
  }
}
