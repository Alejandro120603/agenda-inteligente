import bcrypt from "bcryptjs";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const DEFAULT_DB_PATH = path.resolve("/data/app.db");
const dbPath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : DEFAULT_DB_PATH;

const sqlite = sqlite3.verbose();

type SqliteDatabase = sqlite3.Database;

declare global {
  // eslint-disable-next-line no-var
  var __agendaDb: SqliteDatabase | undefined;
}

function ensureDatabase(): SqliteDatabase {
  if (!globalThis.__agendaDb) {
    if (!fs.existsSync(dbPath)) {
      throw new Error(
        `[DB] No se encontró el archivo de base de datos en ${dbPath}. ` +
          "Asegúrate de que exista y que la variable SQLITE_DB_PATH esté configurada correctamente."
      );
    }

    globalThis.__agendaDb = new sqlite.Database(
      dbPath,
      sqlite3.OPEN_READWRITE,
      (error) => {
        if (error) {
          throw error;
        }
      }
    );

    globalThis.__agendaDb.run("PRAGMA foreign_keys = ON");
    console.log(`[DB] Using SQLite database at ${dbPath}`);
  }

  return globalThis.__agendaDb;
}

function runQuery(sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> {
  const database = ensureDatabase();

  return new Promise((resolve, reject) => {
    database.run(sql, params, function (this: sqlite3.RunResult, error) {
      if (error) {
        reject(error);
        return;
      }

      resolve(this);
    });
  });
}

function getQuery<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const database = ensureDatabase();

  return new Promise((resolve, reject) => {
    database.get(sql, params, (error, row: T | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

export interface UsuarioRow {
  id: number;
  nombre: string;
  correo: string;
  contraseña_hash: string;
  zona_horaria?: string | null;
  creado_en?: string;
}

export interface PublicUser {
  id: number;
  nombre: string;
  correo: string;
}

async function getUserById(id: number): Promise<PublicUser | undefined> {
  return getQuery<PublicUser>(
    "SELECT id, nombre, correo FROM usuarios WHERE id = ?",
    [id]
  );
}

export async function getUserByEmail(
  correo: string
): Promise<UsuarioRow | undefined> {
  if (!correo) {
    return undefined;
  }

  return getQuery<UsuarioRow>(
    "SELECT id, nombre, correo, contraseña_hash, zona_horaria, creado_en FROM usuarios WHERE correo = ?",
    [correo]
  );
}

export async function createUser(
  nombre: string,
  correo: string,
  contraseña: string
): Promise<PublicUser> {
  if (!nombre || !correo || !contraseña) {
    throw new Error("Nombre, correo y contraseña son requeridos");
  }

  const contraseñaHash = await bcrypt.hash(contraseña, 10);

  const insertResult = await runQuery(
    "INSERT INTO usuarios (nombre, correo, contraseña_hash, zona_horaria, creado_en) VALUES (?, ?, ?, NULL, datetime('now'))",
    [nombre, correo, contraseñaHash]
  );

  const insertedId = Number(insertResult.lastID);

  if (!insertedId) {
    throw new Error("No se pudo obtener el identificador del nuevo usuario");
  }

  const user = await getUserById(insertedId);

  if (!user) {
    throw new Error("No se pudo recuperar el usuario insertado");
  }

  return user;
}
