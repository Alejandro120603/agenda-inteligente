import { NextResponse } from "next/server";

/**
 * Placeholder para la integración con OAuth de Google.
 * Devuelve 501 hasta que se conecte con el flujo real de OAuth.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "La integración con Google estará disponible próximamente. Mantente atento a las próximas versiones.",
    },
    { status: 501 }
  );
}

export async function POST() {
  return GET();
}
