import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set("user_id", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  response.headers.set("Clear-Site-Data", '"storage"');

  return response;
}

export async function GET() {
  // Permitimos también GET para facilidad de integración con enlaces simples.
  return POST();
}
