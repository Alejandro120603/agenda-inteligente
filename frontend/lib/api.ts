export type EstadoAsistencia = "pendiente" | "aceptado" | "rechazado";
export type EstadoEvento = "confirmado" | "cancelado" | "tentativo";

const jsonHeaders = {
  "Content-Type": "application/json",
};

async function manejarRespuesta(respuesta: Response) {
  if (respuesta.ok) {
    if (respuesta.status === 204) {
      return null;
    }

    try {
      return await respuesta.json();
    } catch (error) {
      return null;
    }
  }

  let mensaje = "Error inesperado";
  try {
    const info = await respuesta.json();
    if (info && typeof info.error === "string") {
      mensaje = info.error;
    }
  } catch (error) {
    // Ignorar errores de parseo y mantener el mensaje genérico.
  }

  throw new Error(mensaje);
}

export async function actualizarEventoInterno(
  eventoId: number,
  datos: Partial<{
    titulo: string;
    descripcion: string | null;
    inicio: string | null;
    fin: string | null;
    estado: EstadoEvento;
  }>,
) {
  const payload: Record<string, unknown> = {};

  if (typeof datos.titulo === "string") {
    payload.titulo = datos.titulo;
  }
  if (typeof datos.descripcion === "string" || datos.descripcion === null) {
    payload.descripcion = datos.descripcion;
  }
  if (typeof datos.inicio === "string" || datos.inicio === null) {
    payload.inicio = datos.inicio;
  }
  if (typeof datos.fin === "string" || datos.fin === null) {
    payload.fin = datos.fin;
  }
  if (datos.estado) {
    payload.estado = datos.estado;
  }

  const respuesta = await fetch(`/api/events/${eventoId}`, {
    method: "PUT",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return manejarRespuesta(respuesta);
}

export async function eliminarEventoInterno(eventoId: number) {
  const respuesta = await fetch(`/api/events/${eventoId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return manejarRespuesta(respuesta);
}

export async function actualizarAsistenciaEvento(
  eventoId: number,
  estado: Exclude<EstadoAsistencia, "pendiente">,
) {
  const respuesta = await fetch(`/api/events/${eventoId}/respuesta`, {
    method: "PATCH",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify({ estado }),
  });

  return manejarRespuesta(respuesta);
}

export async function ocultarEventoParaUsuario(eventoId: number) {
  return actualizarAsistenciaEvento(eventoId, "rechazado");
}

export interface MiembroEquipo {
  id: number;
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: "administrador" | "miembro";
  estado: "pendiente" | "aceptado" | "rechazado";
}

export interface DetalleEquipoRespuesta {
  equipo: {
    id: number;
    nombre: string;
    creado_en: string;
    creado_por: number;
    creador_nombre: string | null;
  };
  miembros: MiembroEquipo[];
}

export async function obtenerEquipoConMiembros(equipoId: number): Promise<DetalleEquipoRespuesta> {
  const respuesta = await fetch(`/api/equipos/${equipoId}`, {
    cache: "no-store",
    credentials: "include",
  });
  return manejarRespuesta(respuesta);
}

export async function invitarMiembroAEquipo(equipoId: number, usuarioId: number) {
  const respuesta = await fetch(`/api/equipos/${equipoId}/miembros`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify({ usuarioId }),
  });

  return manejarRespuesta(respuesta);
}

export async function eliminarMiembroDeEquipo(equipoId: number, miembroId: number) {
  const respuesta = await fetch(`/api/equipos/${equipoId}/miembros/${miembroId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return manejarRespuesta(respuesta);
}
