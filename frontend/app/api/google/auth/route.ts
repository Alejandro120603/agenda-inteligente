import { NextRequest, NextResponse } from "next/server";
import {
  crearClienteOAuth,
  obtenerRedirectUriEfectiva,
  obtenerScopes,
} from "@/lib/google";

export const runtime = "nodejs";

/**
 * Maneja la redirección inicial hacia Google para iniciar el flujo OAuth2.
 */
export async function GET(request: NextRequest) {
  try {
    const redirectUri = obtenerRedirectUriEfectiva(request.nextUrl.origin);
    const client = crearClienteOAuth({ redirectUri });
    const scopes = obtenerScopes();
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      include_granted_scopes: true,
      response_type: "code",
      redirect_uri: redirectUri,
    });
    console.log("[GoogleAuth] URL generada:", url);
    return NextResponse.json({ url, redirectUri });
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
