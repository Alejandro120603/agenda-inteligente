import fs from "node:fs";
import path from "node:path";

import { google } from "googleapis";
import type { Credentials, OAuth2Client } from "google-auth-library";
import { getQuery, runQuery } from "@/lib/db";

/**
 * Describe la forma de la fila almacenada en la tabla `google_tokens`.
 */
export interface GoogleTokenRow {
  id: number;
  user_id: number;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  scope: string | null;
}

/**
 * Describe la forma necesaria para inicializar el cliente OAuth2.
 */
export interface ConfiguracionOAuth {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
];

const CREDENTIALS_PATH = path.join(
  process.cwd(),
  "credentials",
  "google_oauth.json",
);

let tablaGoogleTokensCreada = false;
let tablaEventosCreada = false;
let configuracionOAuthMemorizada: ConfiguracionOAuth | null = null;

/**
 * Obtiene los alcances solicitados a Google a partir de las variables de entorno.
 */
export function obtenerScopes(): string[] {
  const scopes = process.env.GOOGLE_SCOPES;

  if (!scopes) {
    return DEFAULT_SCOPES;
  }

  return scopes
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

/**
 * Valida la existencia de las variables requeridas para el cliente OAuth.
 */
export function obtenerCredencialesDesdeEntorno(): ConfiguracionOAuth {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error(
      "[google.ts] Faltan variables de entorno para Google OAuth. Verifica GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI.",
    );
    throw new Error(
      "Faltan credenciales de Google. Revisa GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI."
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Extrae los valores necesarios desde el contenido del archivo de credenciales.
 */
export function extraerConfiguracionDesdeObjeto(
  objeto: unknown,
): ConfiguracionOAuth | null {
  if (!objeto || typeof objeto !== "object") {
    return null;
  }

  const posibleDirecta = objeto as Partial<
    ConfiguracionOAuth & { redirect_uris?: string[] }
  >;

  if (posibleDirecta.clientId && posibleDirecta.clientSecret) {
    const redirectUri =
      posibleDirecta.redirectUri ?? posibleDirecta.redirect_uris?.[0];

    if (redirectUri) {
      return {
        clientId: posibleDirecta.clientId,
        clientSecret: posibleDirecta.clientSecret,
        redirectUri,
      };
    }
  }

  const posiblesClaves = ["web", "installed"] as const;

  for (const clave of posiblesClaves) {
    const seccion = (objeto as Record<string, unknown>)[clave];
    if (!seccion || typeof seccion !== "object") {
      continue;
    }

    const datos = seccion as Partial<
      ConfiguracionOAuth & {
        redirect_uris?: string[];
        client_id?: string;
        client_secret?: string;
        redirect_uri?: string;
      }
    >;

    const clientId = datos.clientId ?? datos.client_id;
    const clientSecret = datos.clientSecret ?? datos.client_secret;
    const redirectUri =
      datos.redirectUri ?? datos.redirect_uris?.[0] ?? datos.redirect_uri;

    if (clientId && clientSecret && redirectUri) {
      return { clientId, clientSecret, redirectUri };
    }
  }

  return null;
}

/**
 * Lee el archivo local de credenciales si existe y devuelve su configuración.
 */
export function leerCredencialesDesdeArchivo(): ConfiguracionOAuth | null {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return null;
  }

  try {
    const contenido = fs.readFileSync(CREDENTIALS_PATH, "utf8");
    if (!contenido.trim()) {
      console.warn(
        "[google.ts] El archivo credentials/google_oauth.json está vacío. Se utilizarán las variables de entorno.",
      );
      return null;
    }

    const datos = JSON.parse(contenido) as unknown;
    const configuracion = extraerConfiguracionDesdeObjeto(datos);

    if (!configuracion) {
      console.error(
        "[google.ts] No se pudieron extraer client_id, client_secret y redirect_uri del archivo credentials/google_oauth.json. Se utilizarán las variables de entorno.",
      );
      return null;
    }

    return configuracion;
  } catch (error) {
    console.error(
      "[google.ts] Error al leer credentials/google_oauth.json. Se utilizarán las variables de entorno.",
      error,
    );
    return null;
  }
}

/**
 * Obtiene la configuración del cliente priorizando el archivo local y luego el entorno.
 */
export function obtenerConfiguracionOAuth(): ConfiguracionOAuth {
  if (configuracionOAuthMemorizada) {
    return configuracionOAuthMemorizada;
  }

  const desdeArchivo = leerCredencialesDesdeArchivo();
  if (desdeArchivo) {
    console.log(
      "[google.ts] Credenciales de Google cargadas desde credentials/google_oauth.json.",
    );
    configuracionOAuthMemorizada = desdeArchivo;
    return desdeArchivo;
  }

  console.log(
    "[google.ts] Se utilizarán las variables de entorno para configurar Google OAuth.",
  );
  const desdeEntorno = obtenerCredencialesDesdeEntorno();
  configuracionOAuthMemorizada = desdeEntorno;
  return desdeEntorno;
}

/**
 * Construye un cliente OAuth2 listo para usarse en la integración de Google Calendar.
 */
export function crearClienteOAuth(tokens?: Credentials): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = obtenerConfiguracionOAuth();

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (tokens) {
    client.setCredentials(tokens);
  }

  return client;
}

/**
 * Garantiza que la tabla `google_tokens` exista antes de realizar operaciones.
 */
export async function asegurarTablaGoogleTokens(): Promise<void> {
  if (tablaGoogleTokensCreada) {
    return;
  }

  await runQuery(
    `CREATE TABLE IF NOT EXISTS google_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry DATETIME,
      scope TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  tablaGoogleTokensCreada = true;
}

/**
 * Garantiza que exista la tabla `events` utilizada para almacenar los eventos sincronizados.
 */
export async function asegurarTablaEventos(): Promise<void> {
  if (tablaEventosCreada) {
    return;
  }

  await runQuery(
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      google_id TEXT UNIQUE,
      title TEXT,
      description TEXT,
      start_time DATETIME,
      end_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`
  );

  tablaEventosCreada = true;
}

/**
 * Recupera los tokens almacenados para un usuario determinado.
 */
export async function obtenerTokensPorUsuario(
  userId: number
): Promise<GoogleTokenRow | null> {
  await asegurarTablaGoogleTokens();

  const token = await getQuery<GoogleTokenRow>(
    "SELECT id, user_id, access_token, refresh_token, token_expiry, scope FROM google_tokens WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    [userId]
  );

  return token ?? null;
}

/**
 * Convierte la fecha de expiración en milisegundos a un ISO string.
 */
export function formatearExpiracion(expiryDate?: number | null): string | null {
  if (!expiryDate) {
    return null;
  }

  return new Date(expiryDate).toISOString();
}

/**
 * Guarda o actualiza los tokens recibidos desde Google.
 */
export async function guardarTokens(
  userId: number,
  tokens: Credentials
): Promise<void> {
  await asegurarTablaGoogleTokens();

  const existente = await obtenerTokensPorUsuario(userId);
  const tokenExpiry = formatearExpiracion(tokens.expiry_date ?? null);
  const scope = Array.isArray(tokens.scope)
    ? tokens.scope.join(" ")
    : tokens.scope ?? obtenerScopes().join(" ");

  const refreshToken = tokens.refresh_token ?? existente?.refresh_token ?? null;
  const accessToken = tokens.access_token ?? existente?.access_token ?? null;

  if (existente) {
    await runQuery(
      "UPDATE google_tokens SET access_token = ?, refresh_token = ?, token_expiry = ?, scope = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [accessToken, refreshToken, tokenExpiry, scope, existente.id]
    );
  } else {
    await runQuery(
      "INSERT INTO google_tokens (user_id, access_token, refresh_token, token_expiry, scope) VALUES (?, ?, ?, ?, ?)",
      [userId, accessToken, refreshToken, tokenExpiry, scope]
    );
  }
}

/**
 * Verifica si el token guardado ya expiró en base a la fecha almacenada.
 */
export function tokenExpirado(token: GoogleTokenRow | null): boolean {
  if (!token?.token_expiry) {
    return false;
  }

  const expiracion = new Date(token.token_expiry).getTime();
  if (Number.isNaN(expiracion)) {
    return false;
  }

  return expiracion <= Date.now();
}

/**
 * Transforma los tokens guardados en credenciales para el cliente OAuth.
 */
export function construirCredencialesDesdeFila(
  fila: GoogleTokenRow | null
): Credentials | undefined {
  if (!fila) {
    return undefined;
  }

  const expiry = fila.token_expiry ? new Date(fila.token_expiry).getTime() : undefined;

  return {
    access_token: fila.access_token ?? undefined,
    refresh_token: fila.refresh_token ?? undefined,
    expiry_date: expiry,
    scope: fila.scope ?? undefined,
  };
}

/**
 * Inserta o reemplaza un evento en la tabla local `events`.
 */
export async function guardarEventoSincronizado(options: {
  userId: number;
  googleId: string;
  title: string | null;
  description: string | null;
  start: string | null;
  end: string | null;
}): Promise<void> {
  await asegurarTablaEventos();

  await runQuery(
    `INSERT OR REPLACE INTO events (google_id, user_id, title, description, start_time, end_time, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      options.googleId,
      options.userId,
      options.title,
      options.description,
      options.start,
      options.end,
    ]
  );
}
