import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Normalizamos los datos del cuerpo
    const correo: string | undefined =
      typeof body?.correo === "string" ? body.correo.trim().toLowerCase() : undefined;
    const password: string | undefined =
      typeof body?.password === "string" ? body.password : undefined;

    // Validación de campos requeridos
    if (!correo || !password) {
      return NextResponse.json(
        { ok: false, message: "Correo y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Buscar usuario por correo
    const user = await getUserByEmail(correo);

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Verificar contraseña (comparar hash)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { ok: false, message: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Éxito: devolver información pública del usuario
    return NextResponse.json({
      ok: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
      },
    });
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);

    return NextResponse.json(
      { ok: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
