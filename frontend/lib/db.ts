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
      "ALTER TABLE usuarios ADD COLUMN tema_preferencia TEXT CHECK(tema_preferencia IN ('light','dark','auto')) DEFAULT 'auto'",
      (error) => {
        if (error && !String(error.message).includes("duplicate column name")) {
          console.error("[DB] Error agregando columna tema_preferencia en usuarios", error);
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

    database.run(
      "CREATE INDEX IF NOT EXISTS idx_miembros_equipo ON miembros_equipo(id_equipo)",
      (error) => {
        if (error) {
          console.error(
            "[DB] Error creando el índice idx_miembros_equipo",
            error
          );
        }
      }
    );

    database.run(
      "CREATE INDEX IF NOT EXISTS idx_miembros_equipo_usuario ON miembros_equipo(id_usuario)",
      (error) => {
        if (error) {
          console.error(
            "[DB] Error creando el índice idx_miembros_equipo_usuario",
            error
          );
        }
      }
    );

    database.run(
      "ALTER TABLE eventos_internos ADD COLUMN id_equipo INTEGER REFERENCES equipos(id) ON DELETE SET NULL",
      (error) => {
        if (error && !String(error.message).includes("duplicate column name")) {
          console.error("[DB] Error agregando columna id_equipo en eventos_internos", error);
        }
      }
    );

    database.run(
      `CREATE TABLE IF NOT EXISTS participantes_evento_interno (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_evento INTEGER NOT NULL,
        id_usuario INTEGER NOT NULL,
        estado_asistencia TEXT CHECK(estado_asistencia IN ('pendiente','aceptado','rechazado')) DEFAULT 'pendiente',
        invitado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        respondido_en DATETIME,
        FOREIGN KEY (id_evento) REFERENCES eventos_internos(id) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE (id_evento, id_usuario)
      )`,
      (error) => {
        if (error) {
          console.error("[DB] Error creando la tabla participantes_evento_interno", error);
        }
      }
    );

    database.run(
      `CREATE TABLE IF NOT EXISTS tareas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        id_equipo INTEGER,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        fecha DATE NOT NULL,
        es_grupal INTEGER NOT NULL DEFAULT 0,
        tipo TEXT CHECK(tipo IN ('tarea_personal','tarea_grupal')) DEFAULT 'tarea_personal',
        completada INTEGER NOT NULL DEFAULT 0,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (id_equipo) REFERENCES equipos(id) ON DELETE SET NULL
      )`,
      (error) => {
        if (error) {
          console.error("[DB] Error creando la tabla tareas", error);
        }
      }
    );

    database.run(
      "CREATE INDEX IF NOT EXISTS idx_tareas_usuario ON tareas(id_usuario)",
      (error) => {
        if (error) {
          console.error("[DB] Error creando el índice idx_tareas_usuario", error);
        }
      }
    );

    database.run(
      "CREATE INDEX IF NOT EXISTS idx_tareas_equipo ON tareas(id_equipo)",
      (error) => {
        if (error) {
          console.error("[DB] Error creando el índice idx_tareas_equipo", error);
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
export type ThemePreference = "light" | "dark" | "auto";

// --- INTERFACES ---
export interface UsuarioRow {
  id: number;
  nombre: string;
  correo: string;
  password_hash: string; // ✅ columna actualizada
  zona_horaria?: string | null;
  tema_preferencia?: ThemePreference | null;
  creado_en?: string;
}

export interface PublicUser {
  id: number;
  nombre: string;
  correo: string;
  zona_horaria?: string | null;
  tema_preferencia?: ThemePreference | null;
}

//
// --- FUNCIONES DE USUARIO ---
export async function getUserById(
  id: number
): Promise<PublicUser | undefined> {
  return getQuery<PublicUser>(
    "SELECT id, nombre, correo, zona_horaria, tema_preferencia FROM usuarios WHERE id = ?",
    [id]
  );
}

export async function getUserRowById(
  id: number
): Promise<UsuarioRow | undefined> {
  return getQuery<UsuarioRow>(
    "SELECT id, nombre, correo, password_hash, zona_horaria, tema_preferencia, creado_en FROM usuarios WHERE id = ?",
    [id]
  );
}

export async function getUserByEmail(
  correo: string
): Promise<UsuarioRow | undefined> {
  if (!correo) return undefined;

  return getQuery<UsuarioRow>(
    "SELECT id, nombre, correo, password_hash, zona_horaria, tema_preferencia, creado_en FROM usuarios WHERE correo = ?",
    [correo]
  );
}

export async function createUser(
  nombre: string,
  correo: string,
  password: string,
  zonaHoraria?: string | null
): Promise<PublicUser> {
  if (!nombre || !correo || !password) {
    throw new Error("Nombre, correo y contraseña son requeridos");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const insertResult = await runQuery(
    "INSERT INTO usuarios (nombre, correo, password_hash, zona_horaria, creado_en) VALUES (?, ?, ?, ?, datetime('now'))",
    [nombre, correo, passwordHash, zonaHoraria ?? null]
  );

  const insertedId = Number(insertResult.lastID);
  if (!insertedId)
    throw new Error("No se pudo obtener el ID del nuevo usuario");

  const user = await getUserById(insertedId);
  if (!user) throw new Error("No se pudo recuperar el usuario insertado");

  return user;
}

export async function updateUserProfile(
  id: number,
  nombre: string,
  temaPreferencia: ThemePreference
) {
  if (!nombre) {
    throw new Error("El nombre es obligatorio");
  }

  return runQuery(
    "UPDATE usuarios SET nombre = ?, tema_preferencia = ? WHERE id = ?",
    [nombre, temaPreferencia, id]
  );
}

export async function updateUserPasswordHash(id: number, passwordHash: string) {
  if (!passwordHash) {
    throw new Error("El hash de la contraseña es obligatorio");
  }

  return runQuery("UPDATE usuarios SET password_hash = ? WHERE id = ?", [passwordHash, id]);
}
