import { NextResponse } from "next/server";

export const runtime = "nodejs";

const esCadenaValida = (valor: unknown): valor is string =>
  typeof valor === "string" && valor.trim() !== "";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const runtimeActual =
    typeof process.env.NEXT_RUNTIME === "string"
      ? process.env.NEXT_RUNTIME
      : "nodejs";

  return NextResponse.json({
    GOOGLE_CLIENT_ID: esCadenaValida(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: esCadenaValida(process.env.GOOGLE_CLIENT_SECRET),
    GOOGLE_REDIRECT_URI: esCadenaValida(process.env.GOOGLE_REDIRECT_URI),
    runtime: runtimeActual,
  });
}
