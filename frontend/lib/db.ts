import bcrypt from "bcryptjs";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

//
// --- CONFIGURACIÓN DE RUTA ---
// Forzamos la base de datos local del proyecto, evitando rutas absolutas erróneas.
// Subimos un nivel porque el backend corre desde "frontend/" y la base está en "../data/app.db"
const dbPath = path.join(process.cwd(), "..", "data", "app.db");

//
// --- CONFIGURACIÓN GLOBAL ---
const sqlite = sqlite3.verbose();
type SqliteDatabase = InstanceType<typeof sqlite3.Database>; // ✅ Tipado correcto

declare global {
  // eslint-disable-next-line no-var
  var __agendaDb: SqliteDatabase | undefined;
}

//
// --- CONEXIÓN ---
function ensureDatabase(): SqliteDatabase {
  if (!globalThis.__agendaDb) {
    if (!fs.existsSync(dbPath)) {
      throw new Error(
        `[DB] No se encontró el archivo de base de datos en ${dbPath}. ` +
          "Asegúrate de que exista y que la carpeta 'data' contenga 'app.db'."
      );
    }

    globalThis.__agendaDb = new sqlite.Database(
      dbPath,
      sqlite3.OPEN_READWRITE,
      (error) => {
        if (error) throw error;
      }
    );

    globalThis.__agendaDb.run("PRAGMA foreign_keys = ON");
    console.log(`[DB] Conectado a la base de datos SQLite en: ${dbPath}`);
  }

  return globalThis.__agendaDb;
}

//
// --- FUNCIONES DE CONSULTA ---
export function runQuery(sql: string, params: unknown[] = []): Promise<any> {
  const db = ensureDatabase();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: any, err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export function getQuery<T>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const db = ensureDatabase();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row: T | undefined) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

//
// --- INTERFACES ---
export interface UsuarioRow {
  id: number;
  nombre: string;
  correo: string;
  password_hash: string; // ✅ columna actualizada
  zona_horaria?: string | null;
  creado_en?: string;
}

export interface PublicUser {
  id: number;
  nombre: string;
  correo: string;
  zona_horaria?: string | null;
}

//
// --- FUNCIONES DE USUARIO ---
export async function getUserById(
  id: number
): Promise<PublicUser | undefined> {
  return getQuery<PublicUser>(
    "SELECT id, nombre, correo, zona_horaria FROM usuarios WHERE id = ?",
    [id]
  );
}

export async function getUserByEmail(
  correo: string
): Promise<UsuarioRow | undefined> {
  if (!correo) return undefined;

  return getQuery<UsuarioRow>(
    "SELECT id, nombre, correo, password_hash, zona_horaria, creado_en FROM usuarios WHERE correo = ?",
    [correo]
  );
}

export async function createUser(
  nombre: string,
  correo: string,
  password: string
): Promise<PublicUser> {
  if (!nombre || !correo || !password) {
    throw new Error("Nombre, correo y contraseña son requeridos");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const insertResult = await runQuery(
    "INSERT INTO usuarios (nombre, correo, password_hash, zona_horaria, creado_en) VALUES (?, ?, ?, NULL, datetime('now'))",
    [nombre, correo, passwordHash]
  );

  const insertedId = Number(insertResult.lastID);
  if (!insertedId)
    throw new Error("No se pudo obtener el ID del nuevo usuario");

  const user = await getUserById(insertedId);
  if (!user) throw new Error("No se pudo recuperar el usuario insertado");

  return user;
}
