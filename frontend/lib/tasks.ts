import { allQuery, getQuery, runQuery } from "./db";

export type TaskStatus = "pendiente" | "en_progreso" | "completada";
export type TaskPriority = "baja" | "media" | "alta";

export interface TaskRecord {
  id: number;
  id_usuario: number;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  estado: TaskStatus;
  prioridad: TaskPriority;
  creado_en: string;
}

interface GetTasksOptions {
  date?: string;
  includeCompleted?: boolean;
}

interface CreateTaskInput {
  titulo: string;
  descripcion?: string | null;
  fecha_limite?: string | null;
  prioridad?: TaskPriority;
}

export async function getTasksForUser(
  userId: number,
  { date, includeCompleted = true }: GetTasksOptions = {}
): Promise<TaskRecord[]> {
  const filters = ["id_usuario = ?"];
  const params: (number | string)[] = [userId];

  if (date) {
    filters.push("fecha_limite IS NOT NULL AND date(fecha_limite) = date(?)");
    params.push(date);
  }

  if (!includeCompleted) {
    filters.push("estado != 'completada'");
  }

  const query = `SELECT id, id_usuario, titulo, descripcion, fecha_limite, estado, prioridad, creado_en
    FROM tareas
    WHERE ${filters.join(" AND ")}
    ORDER BY
      CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
      datetime(fecha_limite) ASC,
      datetime(creado_en) DESC`;

  return allQuery<TaskRecord>(query, params);
}

export async function createTaskForUser(
  userId: number,
  input: CreateTaskInput
): Promise<TaskRecord> {
  const { titulo, descripcion = null, fecha_limite = null, prioridad = "media" } = input;

  const result = await runQuery(
    `INSERT INTO tareas (id_usuario, titulo, descripcion, fecha_limite, prioridad)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, titulo.trim(), descripcion, fecha_limite, prioridad]
  );

  const task = await getQuery<TaskRecord>(
    `SELECT id, id_usuario, titulo, descripcion, fecha_limite, estado, prioridad, creado_en
     FROM tareas WHERE id = ?`,
    [result.lastID]
  );

  if (!task) {
    throw new Error("No se pudo recuperar la tarea recién creada");
  }

  return task;
}

export async function updateTaskStatus(
  userId: number,
  taskId: number,
  status: TaskStatus
): Promise<TaskRecord | null> {
  await runQuery(
    `UPDATE tareas SET estado = ? WHERE id = ? AND id_usuario = ?`,
    [status, taskId, userId]
  );

  return getQuery<TaskRecord>(
    `SELECT id, id_usuario, titulo, descripcion, fecha_limite, estado, prioridad, creado_en
     FROM tareas WHERE id = ? AND id_usuario = ?`,
    [taskId, userId]
  );
}
