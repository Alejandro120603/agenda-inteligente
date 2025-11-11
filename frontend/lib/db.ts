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

interface RunResult {
  lastID?: number;
  changes?: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __agendaDb: SqliteDatabase | undefined;
}

//
// --- CONEXIÓN ---
function initializeTeamSchema(database: SqliteDatabase) {
  database.serialize(() => {
    database.run("PRAGMA foreign_keys = ON", (error) => {
      if (error) {
        console.error("[DB] No fue posible habilitar las claves foráneas", error);
      }
    });

    database.run(
      `CREATE TABLE IF NOT EXISTS equipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        creado_por INTEGER NOT NULL,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE CASCADE
      )`,
      (error) => {
        if (error) {
          console.error("[DB] Error creando la tabla equipos", error);
        }
      }
    );

    database.run(
      `CREATE TABLE IF NOT EXISTS miembros_equipo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_equipo INTEGER NOT NULL,
        id_usuario INTEGER NOT NULL,
        rol TEXT CHECK(rol IN ('administrador','miembro')) DEFAULT 'miembro',
        estado TEXT CHECK(estado IN ('pendiente','aceptado','rechazado')) DEFAULT 'pendiente',
        invitado_por INTEGER,
        invitado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        respondido_en DATETIME,
        FOREIGN KEY (id_equipo) REFERENCES equipos(id) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (invitado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
        UNIQUE (id_equipo, id_usuario)
      )`,
      (error) => {
        if (error) {
          console.error("[DB] Error creando la tabla miembros_equipo", error);
        }
      }
    );
  });
}

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

    initializeTeamSchema(globalThis.__agendaDb);
    console.log(`[DB] Conectado a la base de datos SQLite en: ${dbPath}`);
  }

  return globalThis.__agendaDb;
}

//
// --- FUNCIONES DE CONSULTA ---
export const db = {
  run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const database = ensureDatabase();
    return new Promise((resolve, reject) => {
      database.run(sql, params, function (this: RunResult, err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  },
  get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const database = ensureDatabase();
    return new Promise((resolve, reject) => {
      database.get(sql, params, (err, row: T | undefined) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const database = ensureDatabase();
    return new Promise((resolve, reject) => {
      database.all(sql, params, (err, rows: T[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
};

export function runQuery(sql: string, params: unknown[] = []) {
  return db.run(sql, params);
}

export function getQuery<T>(sql: string, params: unknown[] = []) {
  return db.get<T>(sql, params);
}

export function allQuery<T>(sql: string, params: unknown[] = []) {
  return db.all<T>(sql, params);
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
