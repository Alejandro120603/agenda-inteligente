import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id, nombre, correo } = user;
    return NextResponse.json({ id, nombre, correo });
  } catch (error) {
    console.error("[GET /api/user]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
