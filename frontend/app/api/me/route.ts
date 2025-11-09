// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth"; // función que lee la cookie o token

export async function GET() {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  return NextResponse.json({ id: user.id, name: user.nombre, email: user.correo });
}
