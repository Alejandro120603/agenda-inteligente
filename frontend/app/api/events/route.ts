import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { allQuery, getQuery, runQuery } from "@/lib/db";

interface EventoInternoRow {
  id: number;
  id_usuario: number;
  id_equipo: number | null;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  ubicacion: string | null;
  tipo: "personal" | "equipo" | "otro";
  recordatorio: number;
  creado_en: string;
  equipo_nombre: string | null;
  es_organizador: 0 | 1;
  es_participante: 0 | 1;
  estado_asistencia: "pendiente" | "aceptado" | "rechazado" | null;
}

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

export async function GET() {
  try {
    const userId = await obtenerUsuarioAutenticado();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const eventos = await allQuery<EventoInternoRow>(
      `SELECT
        e.id,
        e.id_usuario,
        e.id_equipo,
        e.titulo,
        e.descripcion,
        e.inicio,
        e.fin,
        e.ubicacion,
        e.tipo,
        e.recordatorio,
        e.creado_en,
        eq.nombre AS equipo_nombre,
        CASE WHEN e.id_usuario = ? THEN 1 ELSE 0 END AS es_organizador,
        CASE WHEN pei.id IS NULL THEN 0 ELSE 1 END AS es_participante,
        pei.estado_asistencia
      FROM eventos_internos e
      LEFT JOIN participantes_evento_interno pei
        ON pei.id_evento = e.id AND pei.id_usuario = ?
      LEFT JOIN equipos eq ON eq.id = e.id_equipo
      WHERE e.id_usuario = ? OR pei.id IS NOT NULL
      ORDER BY datetime(e.inicio) ASC`,
      [userId, userId, userId]
    );

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

