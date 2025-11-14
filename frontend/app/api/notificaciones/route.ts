import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { allQuery } from "@/lib/db";

type EstadoInvitacion = "pendiente" | "aceptado" | "rechazado";

type Notificacion = {
  id: string;
  mensaje: string;
  fecha: string;
  tipo: "equipo" | "evento";
  estado: EstadoInvitacion | null;
  puedeResponder: boolean;
  invitacionId?: number;
  eventoId?: number;
};

type InvitacionEquipoPendienteRow = {
  id: number;
  invitado_en: string;
  equipo_nombre: string;
  invitador_nombre: string | null;
};

type RespuestaEquipoRow = {
  id: number;
  respondido_en: string | null;
  equipo_nombre: string;
  miembro_nombre: string;
  estado: EstadoInvitacion;
};

type InvitacionEventoPendienteRow = {
  id: number;
  id_evento: number;
  invitado_en: string;
  titulo_evento: string;
  organizador_nombre: string | null;
  inicio: string;
  fin: string;
  equipo_nombre: string | null;
};

type RespuestaEventoRow = {
  id: number;
  respondido_en: string | null;
  titulo_evento: string;
  participante_nombre: string;
  estado_asistencia: EstadoInvitacion;
};

function normalizarFecha(fecha: string | null): string {
  if (!fecha) {
    return new Date().toISOString();
  }

  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const [invitacionesEquipo, respuestasEquipo, invitacionesEvento, respuestasEvento] = await Promise.all([
      allQuery<InvitacionEquipoPendienteRow>(
        `SELECT
          me.id,
          me.invitado_en,
          e.nombre AS equipo_nombre,
          invitador.nombre AS invitador_nombre
        FROM miembros_equipo me
        INNER JOIN equipos e ON e.id = me.id_equipo
        LEFT JOIN usuarios invitador ON invitador.id = me.invitado_por
        WHERE me.id_usuario = ? AND me.estado = 'pendiente'`,
        [user.id]
      ),
      allQuery<RespuestaEquipoRow>(
        `SELECT
          me.id,
          me.respondido_en,
          e.nombre AS equipo_nombre,
          miembro.nombre AS miembro_nombre,
          me.estado AS estado
        FROM miembros_equipo me
        INNER JOIN equipos e ON e.id = me.id_equipo
        INNER JOIN usuarios miembro ON miembro.id = me.id_usuario
        WHERE me.invitado_por = ? AND me.estado IN ('aceptado','rechazado')`,
        [user.id]
      ),
      allQuery<InvitacionEventoPendienteRow>(
        `SELECT
          pei.id,
          pei.id_evento,
          pei.invitado_en,
          e.titulo AS titulo_evento,
          e.inicio,
          e.fin,
          eq.nombre AS equipo_nombre,
          organizador.nombre AS organizador_nombre
        FROM participantes_evento_interno pei
        INNER JOIN eventos_internos e ON e.id = pei.id_evento
        LEFT JOIN equipos eq ON eq.id = e.id_equipo
        LEFT JOIN usuarios organizador ON organizador.id = e.id_usuario
        WHERE pei.id_usuario = ? AND pei.estado_asistencia = 'pendiente'`,
        [user.id]
      ),
      allQuery<RespuestaEventoRow>(
        `SELECT
          pei.id,
          pei.respondido_en,
          e.titulo AS titulo_evento,
          participante.nombre AS participante_nombre,
          pei.estado_asistencia
        FROM participantes_evento_interno pei
        INNER JOIN eventos_internos e ON e.id = pei.id_evento
        INNER JOIN usuarios participante ON participante.id = pei.id_usuario
        WHERE e.id_usuario = ? AND pei.estado_asistencia IN ('aceptado','rechazado')`,
        [user.id]
      ),
    ]);

    const notificaciones: Notificacion[] = [];

    invitacionesEquipo.forEach((invitacion) => {
      const fecha = normalizarFecha(invitacion.invitado_en);
      const invitador = invitacion.invitador_nombre ?? "Alguien";
      notificaciones.push({
        id: `equipo-pendiente-${invitacion.id}`,
        mensaje: `${invitador} te invitó al equipo ${invitacion.equipo_nombre}`,
        fecha,
        tipo: "equipo",
        estado: "pendiente",
        puedeResponder: true,
        invitacionId: invitacion.id,
      });
    });

    respuestasEquipo.forEach((respuesta) => {
      const fecha = normalizarFecha(respuesta.respondido_en);
      const accion = respuesta.estado === "aceptado" ? "aceptó" : "rechazó";
      notificaciones.push({
        id: `equipo-respuesta-${respuesta.id}`,
        mensaje: `${respuesta.miembro_nombre} ${accion} tu invitación al equipo ${respuesta.equipo_nombre}`,
        fecha,
        tipo: "equipo",
        estado: respuesta.estado,
        puedeResponder: false,
      });
    });

    invitacionesEvento.forEach((invitacion) => {
      const fecha = normalizarFecha(invitacion.invitado_en);
      const organizador = invitacion.organizador_nombre ?? "Alguien";
      const equipoTexto = invitacion.equipo_nombre ? ` del equipo ${invitacion.equipo_nombre}` : "";
      notificaciones.push({
        id: `evento-pendiente-${invitacion.id}`,
        mensaje: `${organizador} te invitó al evento ${invitacion.titulo_evento}${equipoTexto}`,
        fecha,
        tipo: "evento",
        estado: "pendiente",
        puedeResponder: true,
        eventoId: invitacion.id_evento,
      });
    });

    respuestasEvento.forEach((respuesta) => {
      const fecha = normalizarFecha(respuesta.respondido_en);
      const accion = respuesta.estado_asistencia === "aceptado" ? "aceptó" : "rechazó";
      notificaciones.push({
        id: `evento-respuesta-${respuesta.id}`,
        mensaje: `${respuesta.participante_nombre} ${accion} tu invitación al evento ${respuesta.titulo_evento}`,
        fecha,
        tipo: "evento",
        estado: respuesta.estado_asistencia,
        puedeResponder: false,
      });
    });

    const ordenadas = notificaciones.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return fechaB - fechaA;
    });

    return NextResponse.json({ notificaciones: ordenadas.slice(0, 10) });
  } catch (error) {
    console.error("[GET /api/notificaciones]", error);
    return NextResponse.json(
      { error: "Error al obtener las notificaciones" },
      { status: 500 }
    );
  }
}
