import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nombre: string | undefined =
      typeof body?.nombre === "string" ? body.nombre.trim() : undefined;
    const correo: string | undefined =
      typeof body?.correo === "string" ? body.correo.trim().toLowerCase() : undefined;
    const contrasena: string | undefined =
      typeof body?.contraseña === "string" ? body.contraseña : undefined;

    if (!nombre || !correo || !contrasena) {
      return NextResponse.json(
        {
          ok: false,
          message: "Todos los campos son obligatorios",
        },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(correo);

    if (existingUser) {
      return NextResponse.json(
        {
          ok: false,
          message: "El correo ya se encuentra registrado",
        },
        { status: 400 }
      );
    }

    try {
      const user = await createUser(nombre, correo, contrasena);

      return NextResponse.json(
        {
          ok: true,
          usuario: user,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error al crear usuario", error);

      const isUniqueConstraint =
        error instanceof Error && /UNIQUE|constraint/i.test(error.message);
      const message = isUniqueConstraint
        ? "El correo ya se encuentra registrado"
        : "No fue posible registrar al usuario";
      const status = isUniqueConstraint ? 409 : 500;

      return NextResponse.json(
        {
          ok: false,
          message,
        },
        { status }
      );
    }
  } catch (error) {
    console.error("Error al registrar usuario", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
