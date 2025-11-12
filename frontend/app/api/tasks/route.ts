import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import {
  TaskPriority,
  TaskStatus,
  createTaskForUser,
  getTasksForUser,
  updateTaskStatus,
} from "@/lib/tasks";

function normalizeIsoDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const isDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|([+-]\d{2}:?\d{2}))?$/.test(trimmed);

  if (!isDateOnly && !isDateTime) {
    throw new Error("Formato de fecha inválido");
  }

  if (isDateOnly) {
    return `${trimmed}T00:00:00`;
  }

  return trimmed;
}

const VALID_STATUS: TaskStatus[] = ["pendiente", "en_progreso", "completada"];
const VALID_PRIORITY: TaskPriority[] = ["baja", "media", "alta"];

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const dateParam = request.nextUrl.searchParams.get("date");
    let dateFilter: string | undefined;
    if (dateParam) {
      const normalized = dateParam.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return NextResponse.json(
          { error: "Formato de fecha inválido. Usa YYYY-MM-DD." },
          { status: 400 }
        );
      }
      dateFilter = normalized;
    }

    const includeCompletedParam = request.nextUrl.searchParams.get("includeCompleted");
    const includeCompleted = includeCompletedParam !== "false";

    const tareas = await getTasksForUser(user.id, {
      date: dateFilter,
      includeCompleted,
    });

    return NextResponse.json({ tareas });
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return NextResponse.json(
      { error: "Error al obtener las tareas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
    const descripcion =
      typeof body?.descripcion === "string" && body.descripcion.trim().length > 0
        ? body.descripcion.trim()
        : null;
    const fechaLimiteInput = typeof body?.fecha_limite === "string" ? body.fecha_limite : null;
    const prioridadInput = typeof body?.prioridad === "string" ? body.prioridad : undefined;

    if (!titulo) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    if (prioridadInput && !VALID_PRIORITY.includes(prioridadInput as TaskPriority)) {
      return NextResponse.json(
        { error: "Prioridad inválida" },
        { status: 400 }
      );
    }

    let fechaLimite: string | null = null;
    try {
      fechaLimite = normalizeIsoDate(fechaLimiteInput);
    } catch (err) {
      return NextResponse.json({ error: "Fecha límite inválida" }, { status: 400 });
    }

    const tarea = await createTaskForUser(user.id, {
      titulo,
      descripcion,
      fecha_limite: fechaLimite,
      prioridad: prioridadInput as TaskPriority | undefined,
    });

    return NextResponse.json({ tarea }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    return NextResponse.json(
      { error: "Error al crear la tarea" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const id = Number(body?.id);
    const estado = typeof body?.estado === "string" ? (body.estado as TaskStatus) : null;

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Identificador de tarea inválido" },
        { status: 400 }
      );
    }

    if (!estado || !VALID_STATUS.includes(estado)) {
      return NextResponse.json(
        { error: "Estado inválido" },
        { status: 400 }
      );
    }

    const tareaActualizada = await updateTaskStatus(user.id, id, estado);

    if (!tareaActualizada) {
      return NextResponse.json(
        { error: "La tarea no existe o no pertenece al usuario" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tarea: tareaActualizada });
  } catch (error) {
    console.error("[PATCH /api/tasks]", error);
    return NextResponse.json(
      { error: "Error al actualizar la tarea" },
      { status: 500 }
    );
  }
}
