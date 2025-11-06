import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = cookies();
    const userIdCookie = cookieStore.get("user_id");

    if (!userIdCookie?.value) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const userId = Number.parseInt(userIdCookie.value, 10);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      zona_horaria: user.zona_horaria ?? null,
    });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
