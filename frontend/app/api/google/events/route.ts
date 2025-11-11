import { NextResponse } from "next/server";
import { google } from "googleapis";
import {
  construirCredencialesDesdeFila,
  crearClienteOAuth,
  guardarEventoSincronizado,
  guardarTokens,
  obtenerTokensPorUsuario,
  tokenExpirado,
} from "@/lib/google";

const USER_ID = 1;

/**
 * Descarga los próximos eventos del calendario principal y los guarda en SQLite.
 */
export async function GET() {
  try {
    const tokenRow = await obtenerTokensPorUsuario(USER_ID);

    if (!tokenRow) {
      return NextResponse.json(
        {
          error:
            "No se encontraron tokens almacenados. Conecta tu cuenta de Google desde /api/google/auth.",
        },
        { status: 404 }
      );
    }

    let credentials = construirCredencialesDesdeFila(tokenRow);
    const oauthClient = crearClienteOAuth({ tokens: credentials });

    if (tokenExpirado(tokenRow) || !credentials?.access_token) {
      if (!tokenRow.refresh_token) {
        return NextResponse.json(
          {
            error:
              "El token expiró y no hay refresh_token disponible. Repite el proceso de autenticación.",
          },
          { status: 401 }
        );
      }

      const refreshed = await oauthClient.refreshToken(tokenRow.refresh_token);
      credentials = refreshed.credentials;

      await guardarTokens(USER_ID, credentials);
      oauthClient.setCredentials(credentials);
      console.log("ℹ️ Token de acceso renovado correctamente.");
    }

    const calendar = google.calendar({ version: "v3", auth: oauthClient });
    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: new Date().toISOString(),
    });

    const items = response.data.items ?? [];
    let synchronized = 0;

    for (const event of items) {
      const googleId = event.id;
      if (!googleId) {
        continue;
      }

      const start = event.start?.dateTime ?? event.start?.date ?? null;
      const end = event.end?.dateTime ?? event.end?.date ?? start;
      const title = event.summary ?? "(Sin título)";
      const description = event.description ?? null;

      await guardarEventoSincronizado({
        userId: USER_ID,
        googleId,
        title,
        description,
        start,
        end,
      });

      synchronized += 1;
    }

    console.log(`✅ Eventos sincronizados: ${synchronized}`);

    return NextResponse.json({ ok: true, events: synchronized });
  } catch (error) {
    console.error("[GET /api/google/events]", error);
    return NextResponse.json(
      {
        error:
          "Ocurrió un problema al sincronizar los eventos de Google Calendar.",
      },
      { status: 500 }
    );
  }
}
