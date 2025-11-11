import { NextRequest, NextResponse } from "next/server";
import {
  crearClienteOAuth,
  guardarTokens,
  obtenerRedirectUriEfectiva,
} from "@/lib/google";

export const runtime = "nodejs";

const USER_ID = 1;

/**
 * Gestiona la respuesta de Google, intercambiando el código por tokens y almacenándolos.
 */
export async function GET(request: NextRequest) {
  const errorParam = request.nextUrl.searchParams.get("error");

  if (errorParam) {
    console.error(
      "[GoogleCallback] Google devolvió un error en la respuesta OAuth:",
      errorParam,
    );
    return NextResponse.json(
      {
        error:
          "Google rechazó la autenticación. Inténtalo nuevamente o revisa los permisos concedidos.",
        detalle: errorParam,
      },
      { status: 400 },
    );
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "No se recibió el código de autorización de Google" },
      { status: 400 }
    );
  }

  try {
    const redirectUri = obtenerRedirectUriEfectiva(request.nextUrl.origin);
    const oauthClient = crearClienteOAuth({ redirectUri });
    const { tokens } = await oauthClient.getToken({
      code,
      redirect_uri: redirectUri,
    });

    oauthClient.setCredentials(tokens);
    await guardarTokens(USER_ID, tokens);

    console.log("[GoogleCallback] Token obtenido correctamente.");

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
