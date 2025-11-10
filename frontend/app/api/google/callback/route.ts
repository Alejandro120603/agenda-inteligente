import { NextRequest, NextResponse } from "next/server";
import { crearClienteOAuth, guardarTokens } from "@/lib/google";

export const runtime = "nodejs";

const USER_ID = 1;

/**
 * Gestiona la respuesta de Google, intercambiando el código por tokens y almacenándolos.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "No se recibió el código de autorización de Google" },
      { status: 400 }
    );
  }

  try {
    const oauthClient = crearClienteOAuth();
    const { tokens } = await oauthClient.getToken(code);

    oauthClient.setCredentials(tokens);
    await guardarTokens(USER_ID, tokens);

    console.log("✅ Tokens guardados correctamente.");

    const maskedToken = tokens.access_token
      ? `${tokens.access_token.slice(0, 4)}...`
      : "sin-token";
    console.log(
      `ℹ️ Tokens de Google almacenados para el usuario ${USER_ID} (${maskedToken}).`,
    );

    const redirectUrl = new URL("/eventos", request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[GET /api/google/callback]", error);
    return NextResponse.json(
      {
        error:
          "Ocurrió un problema al procesar la respuesta de Google. Intenta nuevamente en unos minutos.",
      },
      { status: 500 }
    );
  }
}
