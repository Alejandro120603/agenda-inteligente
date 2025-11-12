import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { allQuery, getQuery, runQuery } from "@/lib/db";
import { getEventsForUser } from "@/lib/events";

async function obtenerUsuarioAutenticado(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("user_id");

  if (!cookie?.value) {
    return null;
  }

  const userId = Number(cookie.value);
  if (!Number.isFinite(userId)) {
    return null;
  }

  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await obtenerUsuarioAutenticado();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const dateParam = request.nextUrl.searchParams.get("date");
    let dateFilter: string | undefined;

    if (dateParam) {
      const normalized = dateParam.trim();
      const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
      if (!isIsoDate) {
        return NextResponse.json(
          { error: "Formato de fecha inválido. Usa YYYY-MM-DD." },
          { status: 400 }
        );
      }

      dateFilter = normalized;
    }

    const eventos = await getEventsForUser(userId, {
      date: dateFilter,
    });

    return NextResponse.json({ eventos });
  } catch (error) {
    console.error("[GET /api/events]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await obtenerUsuarioAutenticado();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      titulo,
      descripcion = null,
      inicio,
      fin,
      ubicacion = null,
      tipo = "personal",
      recordatorio = 0,
      id_equipo: idEquipoPayload = null,
    } = body ?? {};

    if (!titulo || typeof titulo !== "string") {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    if (!inicio || !fin) {
      return NextResponse.json(
        { error: "Las fechas de inicio y fin son obligatorias" },
        { status: 400 }
      );
    }

    const tiposPermitidos = new Set(["personal", "equipo", "otro"]);
    const tipoEvento =
      tipo === "equipo" ? "equipo" : tiposPermitidos.has(tipo) ? tipo : "personal";

    const recordatorioValor = Number.isFinite(Number(recordatorio))
      ? Number(recordatorio)
      : 0;

    const descripcionNormalizada =
      typeof descripcion === "string" && descripcion.trim().length > 0
        ? descripcion
        : null;
    const ubicacionNormalizada =
      typeof ubicacion === "string" && ubicacion.trim().length > 0
        ? ubicacion
        : null;

    if (tipoEvento === "equipo") {
      const equipoId = Number(idEquipoPayload);
      if (!Number.isInteger(equipoId)) {
        return NextResponse.json(
          { error: "Debes seleccionar un equipo válido" },
          { status: 400 }
        );
      }

      const pertenencia = await getQuery<{ id: number }>(
        `SELECT me.id
         FROM miembros_equipo me
         WHERE me.id_equipo = ? AND me.id_usuario = ? AND me.estado = 'aceptado'`,
        [equipoId, userId]
      );

      if (!pertenencia) {
        return NextResponse.json(
          { error: "No perteneces al equipo seleccionado" },
          { status: 403 }
        );
      }

      const miembros = await allQuery<{ id_usuario: number }>(
        `SELECT id_usuario
         FROM miembros_equipo
         WHERE id_equipo = ? AND estado = 'aceptado'`,
        [equipoId]
      );

      if (miembros.length === 0) {
        return NextResponse.json(
          { error: "El equipo no tiene miembros activos" },
          { status: 400 }
        );
      }

      await runQuery("BEGIN TRANSACTION");
      try {
        const insertResult = await runQuery(
          `INSERT INTO eventos_internos
            (id_usuario, id_equipo, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            equipoId,
            titulo.trim(),
            descripcionNormalizada,
            inicio,
            fin,
            ubicacionNormalizada,
            tipoEvento,
            recordatorioValor,
          ]
        );

        const id = Number(insertResult.lastID);
        const fechaRespuesta = new Date().toISOString();

        for (const miembro of miembros) {
          const participanteId = miembro.id_usuario;
          const estadoAsistencia =
            participanteId === userId ? "aceptado" : "pendiente";
          const respondidoEn =
            participanteId === userId ? fechaRespuesta : null;

          await runQuery(
            `INSERT OR IGNORE INTO participantes_evento_interno
              (id_evento, id_usuario, estado_asistencia, respondido_en)
             VALUES (?, ?, ?, ?)`,
            [id, participanteId, estadoAsistencia, respondidoEn]
          );
        }

        await runQuery("COMMIT");

        return NextResponse.json({ id, message: "Evento creado correctamente" });
      } catch (transactionError) {
        await runQuery("ROLLBACK");
        throw transactionError;
      }
    }

    const insertResult = await runQuery(
      `INSERT INTO eventos_internos
        (id_usuario, id_equipo, titulo, descripcion, inicio, fin, ubicacion, tipo, recordatorio)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        titulo.trim(),
        descripcionNormalizada,
        inicio,
        fin,
        ubicacionNormalizada,
        tipoEvento,
        recordatorioValor,
      ]
    );

    const id = Number(insertResult.lastID);

    return NextResponse.json({ id, message: "Evento creado correctamente" });
  } catch (error) {
    console.error("[POST /api/events]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

