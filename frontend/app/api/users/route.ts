import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";

export async function GET() {
  try {
    const headerList = headers();
    const cookieHeader = headerList.get("cookie") ?? "";

    const userIdCookie = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("user_id="));

    if (!userIdCookie) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const userIdValue = userIdCookie.substring("user_id=".length);
    const userId = Number.parseInt(userIdValue, 10);

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
    });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
