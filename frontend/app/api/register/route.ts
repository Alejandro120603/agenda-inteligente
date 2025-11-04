import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nombre: string | undefined = body?.nombre;
    const correo: string | undefined = body?.correo;
    const contrasena: string | undefined = body?.contraseña;

    if (!nombre || !correo || !contrasena) {
      return NextResponse.json(
        {
          ok: false,
          message: "Todos los campos son obligatorios",
        },
        { status: 400 }
      );
    }

    const existingUser = getUserByEmail(correo);

    if (existingUser) {
      return NextResponse.json(
        {
          ok: false,
          message: "El correo ya se encuentra registrado",
        },
        { status: 400 }
      );
    }

    const user = await createUser(nombre, correo, contrasena);

    return NextResponse.json(
      {
        ok: true,
        usuario: user,
      },
      { status: 201 }
    );
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
