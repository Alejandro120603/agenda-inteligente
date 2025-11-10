import { NextResponse } from "next/server";
import { crearClienteOAuth, obtenerScopes } from "@/lib/google";

export const runtime = "nodejs";

/**
 * Maneja la redirección inicial hacia Google para iniciar el flujo OAuth2.
 */
export async function GET() {
  try {
    const oauthClient = crearClienteOAuth();
    const scopes = obtenerScopes();

    const authUrl = oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      include_granted_scopes: true,
    });

    return NextResponse.redirect(authUrl, 302);
  } catch (error) {
    console.error("[GET /api/google/auth]", error);
    return NextResponse.json(
      {
        error:
          "No fue posible iniciar la autenticación con Google. Verifica la configuración del servidor.",
      },
      { status: 500 }
    );
  }
}
