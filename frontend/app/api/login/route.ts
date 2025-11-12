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

    // Éxito: crear cookie de sesión y devolver información pública del usuario
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.nombre,
        email: user.correo,
      },
    });

    response.cookies.set("user_id", String(user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    // Indicamos al navegador que borre cualquier almacenamiento previo del dominio
    // (por ejemplo, restos de la versión anterior que usaba localStorage).
    response.headers.set("Clear-Site-Data", '"storage"');

    return response;
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);

    return NextResponse.json(
      { ok: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
