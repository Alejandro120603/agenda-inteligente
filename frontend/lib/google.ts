import fs from "node:fs";
import path from "node:path";

import type { Credentials } from "google-auth-library";
import { OAuth2Client } from "google-auth-library";
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

const DEFAULT_REDIRECT_URI = "http://localhost:3000/api/google/callback";

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
];

const CREDENTIALS_PATH = path.join(
  process.cwd(),
  "credentials",
  "google_oauth.json",
);

let tablaGoogleTokensCreada = false;
let tablaEventosCreada = false;
let configuracionOAuthMemorizada: ConfiguracionOAuth | null = null;

export interface CrearClienteOAuthOptions {
  tokens?: Credentials | null;
  redirectUri?: string;
}

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
export function obtenerCredencialesDesdeEntorno(): ConfiguracionOAuth | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUriEnv = process.env.GOOGLE_REDIRECT_URI;
  const redirectUri = redirectUriEnv ?? DEFAULT_REDIRECT_URI;

  const esCadenaValida = (valor: unknown): valor is string =>
    typeof valor === "string" && valor.trim() !== "";

  const disponibles = {
    GOOGLE_CLIENT_ID: esCadenaValida(clientId),
    GOOGLE_CLIENT_SECRET: esCadenaValida(clientSecret),
    GOOGLE_REDIRECT_URI: esCadenaValida(redirectUriEnv),
  };

  if (!disponibles.GOOGLE_CLIENT_ID || !disponibles.GOOGLE_CLIENT_SECRET) {
    console.warn(
      "[google.ts] Variables de entorno incompletas para Google OAuth.",
      disponibles,
    );
    return null;
  }

  if (!disponibles.GOOGLE_REDIRECT_URI) {
    console.warn(
      `[google.ts] GOOGLE_REDIRECT_URI no está definida. Se utilizará el valor por defecto ${DEFAULT_REDIRECT_URI}.`,
    );
  }

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
  };
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
  if (process.env.NEXT_RUNTIME === "edge") {
    console.warn(
      "[google.ts] No se pueden leer credenciales desde archivo en Edge Runtime."
    );
    return null;
  }

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

  const desdeEntorno = obtenerCredencialesDesdeEntorno();
  if (desdeEntorno) {
    console.log(
      "[google.ts] Credenciales de Google obtenidas desde variables de entorno.",
    );
    configuracionOAuthMemorizada = {
      ...desdeEntorno,
      redirectUri: desdeEntorno.redirectUri.trim(),
    };
    return configuracionOAuthMemorizada;
  }

  console.warn(
    "[google.ts] No se pudieron obtener credenciales desde variables de entorno. Se intentará leer credentials/google_oauth.json.",
  );

  const desdeArchivo = leerCredencialesDesdeArchivo();
  if (desdeArchivo) {
    console.log(
      "[google.ts] Credenciales de Google cargadas desde credentials/google_oauth.json.",
    );
    configuracionOAuthMemorizada = {
      ...desdeArchivo,
      redirectUri: desdeArchivo.redirectUri.trim(),
    };
    return configuracionOAuthMemorizada;
  }

  const mensajeError =
    "Faltan credenciales de Google. Verifica GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI o configura credentials/google_oauth.json.";
  console.error("[google.ts]", mensajeError);
  throw new Error(mensajeError);
}

function normalizarRedirectUri(uri: string): string {
  const trimmed = uri.trim();

  if (!trimmed) {
    console.warn(
      `[Google OAuth] URI de redirección vacía. Se utilizará ${DEFAULT_REDIRECT_URI}.`,
    );
    return DEFAULT_REDIRECT_URI;
  }

  let sanitizada = trimmed;

  if (sanitizada.endsWith("/")) {
    const sinBarra = sanitizada.replace(/\/+$/, "");
    console.warn(
      `[Google OAuth] La URI de redirección terminaba con '/'. Se ajustó a ${sinBarra}.`,
    );
    sanitizada = sinBarra;
  }

  if (!sanitizada.startsWith("http://") && !sanitizada.startsWith("https://")) {
    console.warn(
      `[Google OAuth] La URI de redirección (${sanitizada}) no contiene un esquema válido. Se usará ${DEFAULT_REDIRECT_URI}.`,
    );
    return DEFAULT_REDIRECT_URI;
  }

  if (sanitizada !== DEFAULT_REDIRECT_URI) {
    console.warn(
      `[Google OAuth] La URI de redirección configurada (${sanitizada}) no coincide con la recomendada (${DEFAULT_REDIRECT_URI}). Verifica GOOGLE_REDIRECT_URI en .env.local.`,
    );
  }

  return sanitizada;
}

function ajustarRedirectUriConOrigen(
  redirectUri: string,
  origin?: string,
): string {
  if (!origin) {
    return redirectUri;
  }

  try {
    const redirectUrl = new URL(redirectUri);
    const originUrl = new URL(origin);

    const redirectHostname = redirectUrl.hostname.toLowerCase();

    const esHostLocal = ["localhost", "127.0.0.1"].includes(redirectHostname);

    if (!esHostLocal) {
      if (
        redirectUrl.hostname !== originUrl.hostname ||
        redirectUrl.port !== originUrl.port ||
        redirectUrl.protocol !== originUrl.protocol
      ) {
        console.warn(
          `[Google OAuth] El origen de la petición (${originUrl.origin}) no coincide con la redirect_uri configurada (${redirectUrl.toString()}). Asegúrate de registrar ambos en Google Cloud Console.`,
        );
      }

      return redirectUrl.toString();
    }

    const requiereAjuste =
      redirectUrl.hostname !== originUrl.hostname ||
      redirectUrl.port !== originUrl.port ||
      redirectUrl.protocol !== originUrl.protocol;

    if (!requiereAjuste) {
      return redirectUrl.toString();
    }

    redirectUrl.hostname = originUrl.hostname;
    redirectUrl.port = originUrl.port;
    redirectUrl.protocol = originUrl.protocol;

    const ajustada = redirectUrl.toString();
    console.warn(
      `[Google OAuth] La redirect_uri se ajustó automáticamente a ${ajustada} para coincidir con la URL de la solicitud entrante (${originUrl.origin}).`,
    );

    return ajustada;
  } catch (error) {
    console.error(
      `[Google OAuth] No se pudo analizar la redirect_uri (${redirectUri}) u origen (${origin}).`,
      error,
    );
    return redirectUri;
  }
}

export function obtenerRedirectUriEfectiva(origin?: string): string {
  const { redirectUri } = obtenerConfiguracionOAuth();
  const normalizada = normalizarRedirectUri(redirectUri);
  return ajustarRedirectUriConOrigen(normalizada, origin);
}

/**
 * Construye un cliente OAuth2 listo para usarse en la integración de Google Calendar.
 */
export function crearClienteOAuth(
  options: CrearClienteOAuthOptions = {},
): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = obtenerConfiguracionOAuth();
  const redirectUriNormalizada = normalizarRedirectUri(
    options.redirectUri ?? redirectUri,
  );

  if (configuracionOAuthMemorizada) {
    configuracionOAuthMemorizada = {
      ...configuracionOAuthMemorizada,
      redirectUri: redirectUriNormalizada,
    };
  }

  const client = new OAuth2Client(
    clientId,
    clientSecret,
    redirectUriNormalizada,
  );

  console.log("[Google OAuth] URI usada:", redirectUriNormalizada);

  if (options.tokens) {
    client.setCredentials(options.tokens);
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
