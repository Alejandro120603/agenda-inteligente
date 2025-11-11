import { NextResponse } from "next/server";
import { crearClienteOAuth, obtenerScopes } from "@/lib/google";

export const runtime = "nodejs";

/**
 * Maneja la redirección inicial hacia Google para iniciar el flujo OAuth2.
 */
export async function GET() {
  try {
    const client = crearClienteOAuth();
    const scopes = obtenerScopes();
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });
    console.log("[GoogleAuth] URL generada:", url);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[GoogleAuth Error]", error);
    return NextResponse.json(
      {
        error: "Fallo en /api/google/auth",
        detalle: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
