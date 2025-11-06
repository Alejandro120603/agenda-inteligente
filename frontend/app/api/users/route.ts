import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";

export async function GET() {
  try {
    // ✅ Obtener encabezados de la petición
    const headerList = headers();

    // 🧠 Leer la cookie "user_id" manualmente
    const cookieHeader = headerList.get("cookie");
    const match = cookieHeader?.match(/user_id=([^;]+)/);
    const userId = match ? Number(match[1]) : null;

    if (!userId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Devolver solo lo necesario
    return NextResponse.json({
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
    });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
