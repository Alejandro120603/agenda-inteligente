import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const name =
      typeof body?.name === "string" ? body.name.trim() : "";
    const emailRaw =
      typeof body?.email === "string" ? body.email.trim() : "";
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!name || !emailRaw || !password) {
      return NextResponse.json(
        { error: "Nombre, correo electrónico y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    const email = emailRaw.toLowerCase();

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 409 }
      );
    }

    const user = await createUser(name, email, password);

    return NextResponse.json(
      {
        id: user.id,
        name: user.nombre,
        email: user.correo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register] Error al crear usuario", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
