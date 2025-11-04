import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const correo: string | undefined =
      typeof body?.correo === "string" ? body.correo.trim().toLowerCase() : undefined;
    const contrasena: string | undefined =
      typeof body?.contraseña === "string" ? body.contraseña : undefined;

    if (!correo || !contrasena) {
      return NextResponse.json(
        {
          ok: false,
          message: "Correo y contraseña son requeridos",
        },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(correo);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "Credenciales inválidas",
        },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(contrasena, user.contraseña_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          ok: false,
          message: "Credenciales inválidas",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
      },
    });
  } catch (error) {
    console.error("Error en el inicio de sesión", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
