import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import path from "path";

const dbPath = path.resolve("/data/app.db");
console.log(`[DB] Using SQLite database at ${dbPath}`);

const db = new Database(dbPath, { fileMustExist: true });

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

const getUserByEmailStatement = db.prepare<[string], UsuarioRow>(
  "SELECT id, nombre, correo, contraseña_hash, zona_horaria, creado_en FROM usuarios WHERE correo = ?"
);

const getUserByIdStatement = db.prepare<[number], PublicUser>(
  "SELECT id, nombre, correo FROM usuarios WHERE id = ?"
);

export function getUserByEmail(correo: string): UsuarioRow | undefined {
  if (!correo) {
    return undefined;
  }

  return getUserByEmailStatement.get(correo) ?? undefined;
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

  const insertStatement = db.prepare(
    "INSERT INTO usuarios (nombre, correo, contraseña_hash, zona_horaria, creado_en) VALUES (?, ?, ?, NULL, datetime('now'))"
  );

  const result = insertStatement.run(nombre, correo, contraseñaHash);
  const insertedId = Number(result.lastInsertRowid);

  const user = getUserByIdStatement.get(insertedId);

  if (!user) {
    throw new Error("No se pudo recuperar el usuario insertado");
  }

  return user;
}
