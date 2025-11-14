"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import EditarEventoModal from "@/components/EditarEventoModal";
import type { EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

// ⚠️ No importes CSS. En FullCalendar v6+ ya se inyectan automáticamente
const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
});

type TipoEventoDashboard = "personal" | "equipo" | "otro";

type TipoItemCalendario = "evento" | "tarea_personal" | "tarea_grupal";

type EstadoInvitacion = "pendiente" | "aceptado" | "rechazado" | null;

type Evento = {
  id: string;
  titulo: string | null;
  descripcion: string | null;
  inicio: string | null;
  fin: string | null;
  fecha: string | null;
  ubicacion: string | null;
  tipo: TipoItemCalendario;
  equipoNombre: string | null;
  esOrganizador: boolean;
  esParticipante: boolean;
  estadoInvitacion: EstadoInvitacion;
  source: "evento_interno" | "tarea";
  sourceId: number | null;
  equipoId: number | null;
  estadoEvento: string | null;
  creadorNombre: string | null;
};

type DashboardEvento = {
  id: number;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  tipo: TipoEventoDashboard;
  equipoNombre: string | null;
  estadoInvitacion: EstadoInvitacion;
  creadorNombre: string | null;
  esOrganizador: boolean;
  invitacionId: number | null;
};

type DashboardInvitacionPendiente = {
  eventoId: number;
  invitacionId: number | null;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  equipoNombre: string | null;
  creadorNombre: string | null;
  estadoInvitacion: Extract<Exclude<EstadoInvitacion, null>, "pendiente">;
};

type DashboardTarea = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string | null;
  tipo: "tarea_personal" | "tarea_grupal";
  equipoNombre: string | null;
};

type DashboardTodayResponse = {
  nombre: string;
  fechaIso: string;
  fechaLegible: string;
  totalEventos: number;
  totalTareas: number;
  eventos: DashboardEvento[];
  tareas: DashboardTarea[];
  invitacionesPendientes: DashboardInvitacionPendiente[];
};

type Notificacion = {
  id: string;
  mensaje: string;
  fecha: string;
  tipo: "equipo" | "evento";
  estado: EstadoInvitacion;
  puedeResponder: boolean;
  invitacionId?: number;
  eventoId?: number;
};

type ItemHoy = {
  id: string;
  titulo: string;
  tipo: TipoItemCalendario;
  inicio: string | null;
  fin: string | null;
  fecha: string | null;
  equipoNombre: string | null;
  descripcion?: string | null;
  estadoInvitacion?: EstadoInvitacion;
  creadorNombre?: string | null;
};

type ObjetivoInvitacion = { tipo: "evento" | "equipo"; id: number };

const intlFechaResumen = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const intlFechaNotificacion = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

const intlHora = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

const intlFechaEvento = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
});

const intlFechaCompromiso = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
});

type IconProps = { className?: string };

const combineClassNames = (...clases: Array<string | false | null | undefined>) => clases.filter(Boolean).join(" ");

function PencilMiniIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.125 19.586 3 21l1.414-4.125 12.448-13.388Z" />
    </svg>
  );
}

function CalendarMiniIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={3.75} y={4.5} width={16.5} height={15.75} rx={2} />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <path d="M3.75 9h16.5" />
    </svg>
  );
}

function UserMiniIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.5 20.25a4.5 4.5 0 0 1 9 0" />
      <path d="M12 3.75a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z" />
    </svg>
  );
}

function UsersMiniIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 20.25a4.5 4.5 0 0 1 9 0" />
      <path d="M15 20.25a4.5 4.5 0 0 1 4.5-4.5" />
      <path d="M12 3.75a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z" />
      <path d="M18 4.5a3 3 0 1 1-2.121 5.121" />
    </svg>
  );
}

const ICONOS_COMPROMISO: Record<TipoItemCalendario, (props: IconProps) => JSX.Element> = {
  evento: CalendarMiniIcon,
  tarea_personal: UserMiniIcon,
  tarea_grupal: UsersMiniIcon,
};

const CONFIG_COMPROMISO: Record<
  TipoItemCalendario,
  { etiqueta: string; clases: string; icono: string }
> = {
  evento: { etiqueta: "Evento", clases: "bg-blue-500/15 text-blue-400", icono: "bg-blue-500/10 text-blue-500" },
  tarea_personal: {
    etiqueta: "Tarea personal",
    clases: "bg-green-500/15 text-green-400",
    icono: "bg-green-500/10 text-green-500",
  },
  tarea_grupal: {
    etiqueta: "Tarea grupal",
    clases: "bg-purple-500/15 text-purple-400",
    icono: "bg-purple-500/10 text-purple-500",
  },
};

const esEventosWrapper = (value: unknown): value is { eventos: unknown[] } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Array.isArray((value as { eventos?: unknown }).eventos);
};

const esRegistroEvento = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

function capitalizar(texto: string): string {
  if (!texto) {
    return "";
  }

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerHora(valor: string | null): string | null {
  if (!valor) {
    return null;
  }

  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return intlHora.format(parsed);
}

function formatearHoraItem(item: ItemHoy): string {
  if (item.tipo === "evento") {
    const inicio = obtenerHora(item.inicio);
    const fin = obtenerHora(item.fin);

    if (inicio && fin) {
      return `${inicio} - ${fin}`;
    }

    if (inicio) {
      return inicio;
    }

    if (fin) {
      return fin;
    }

    return "Sin hora definida";
  }

  if (!item.fecha) {
    return "Sin hora";
  }

  if (/T\d{2}:\d{2}/.test(item.fecha)) {
    const hora = obtenerHora(item.fecha);
    return hora ?? "Sin hora";
  }

  return "Todo el día";
}

function formatearFechaNotificacion(fecha: string): string {
  const parsed = new Date(fecha);

  if (Number.isNaN(parsed.getTime())) {
    return "Fecha desconocida";
  }

  return intlFechaNotificacion.format(parsed);
}

function obtenerTimestamp(item: ItemHoy): number {
  const referencia = item.tipo === "evento" ? item.inicio ?? item.fin : item.fecha;

  if (!referencia) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(referencia);
  if (Number.isNaN(parsed.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return parsed.getTime();
}

function obtenerEtiquetaTipo(item: ItemHoy): { texto: string; clases: string } {
  if (item.tipo === "evento") {
    return {
      texto: "Evento",
      clases: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
    };
  }

  if (item.tipo === "tarea_grupal") {
    return {
      texto: "Tarea grupal",
      clases: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200",
    };
  }

  return {
    texto: "Tarea personal",
    clases: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  };
}

function obtenerEtiquetaEstado(notificacion: Notificacion): { texto: string; clases: string } | null {
  if (!notificacion.estado || notificacion.puedeResponder) {
    return null;
  }

  if (notificacion.estado === "aceptado") {
    return {
      texto: "Aceptado",
      clases: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    };
  }

  if (notificacion.estado === "rechazado") {
    return {
      texto: "Rechazado",
      clases: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
    };
  }

  return {
    texto: "Pendiente",
    clases: "bg-gray-100 text-gray-600 dark:bg-gray-800/70 dark:text-gray-300",
  };
}

function formatearRangoEvento(inicio: string | null, fin: string | null): string {
  if (!inicio && !fin) {
    return "Fecha no disponible";
  }

  const inicioDate = inicio ? new Date(inicio) : null;
  const finDate = fin ? new Date(fin) : null;

  if (inicioDate && !Number.isNaN(inicioDate.getTime())) {
    const fechaTexto = intlFechaEvento.format(inicioDate);
    const horaInicio = obtenerHora(inicio);
    const horaFin = obtenerHora(fin);

    if (horaInicio && horaFin) {
      return `${fechaTexto}, ${horaInicio} — ${horaFin}`;
    }

    if (horaInicio) {
      return `${fechaTexto}, ${horaInicio}`;
    }

    if (horaFin) {
      return `${fechaTexto}, ${horaFin}`;
    }

    return fechaTexto;
  }

  if (finDate && !Number.isNaN(finDate.getTime())) {
    const fechaTexto = intlFechaEvento.format(finDate);
    const horaFin = obtenerHora(fin);
    return horaFin ? `${fechaTexto}, ${horaFin}` : fechaTexto;
  }

  return "Fecha no disponible";
}

function obtenerFechaBaseCompromiso(evento: Evento): Date | null {
  if (evento.tipo === "evento") {
    if (evento.inicio) {
      const inicio = new Date(evento.inicio);
      if (!Number.isNaN(inicio.getTime())) {
        return inicio;
      }
    }

    if (evento.fin) {
      const fin = new Date(evento.fin);
      if (!Number.isNaN(fin.getTime())) {
        return fin;
      }
    }

    return null;
  }

  if (!evento.fecha) {
    return null;
  }

  const fecha = evento.fecha.includes("T") ? new Date(evento.fecha) : new Date(`${evento.fecha}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha;
}

function truncarDescripcion(valor: string | null, limite = 120): string | null {
  if (!valor) {
    return null;
  }

  const texto = valor.trim();
  if (texto.length <= limite) {
    return texto;
  }

  return `${texto.slice(0, limite - 3)}...`;
}

function formatearResumenCompromiso(evento: Evento): string {
  if (evento.tipo === "evento") {
    return formatearRangoEvento(evento.inicio, evento.fin);
  }

  if (!evento.fecha) {
    return "Sin fecha";
  }

  const fecha = evento.fecha.includes("T") ? new Date(evento.fecha) : new Date(`${evento.fecha}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) {
    return "Sin fecha";
  }

  const fechaTexto = intlFechaCompromiso.format(fecha);
  const hora = evento.fecha.includes("T") ? obtenerHora(evento.fecha) : null;

  return hora ? `${fechaTexto} · ${hora}` : fechaTexto;
}

export default function InicioPage() {
  const [dashboard, setDashboard] = useState<DashboardTodayResponse | null>(null);
  const [cargandoDashboard, setCargandoDashboard] = useState(true);
  const [errorDashboard, setErrorDashboard] = useState<string | null>(null);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(true);
  const [errorNotificaciones, setErrorNotificaciones] = useState<string | null>(null);
  const [accionInvitacion, setAccionInvitacion] = useState<ObjetivoInvitacion | null>(null);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);
  const [eventoEdicion, setEventoEdicion] = useState<Evento | null>(null);

  const cargarDashboard = useCallback(async () => {
    try {
      setCargandoDashboard(true);
      setErrorDashboard(null);

      const respuesta = await fetch("/api/dashboard/today", {
        method: "GET",
        credentials: "include",
      });

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setDashboard(null);
          setErrorDashboard("Inicia sesión para ver tu resumen diario.");
          return;
        }

        throw new Error(`Error ${respuesta.status}`);
      }

      const data: unknown = await respuesta.json();
      if (!data || typeof data !== "object") {
        throw new Error("Respuesta inesperada del servidor");
      }

      const normalizado = data as DashboardTodayResponse;
      setDashboard(normalizado);
    } catch (error) {
      console.error("[Dashboard] Error al cargar el resumen", error);
      setDashboard(null);
      setErrorDashboard("No pudimos cargar tu día. Intenta nuevamente más tarde.");
    } finally {
      setCargandoDashboard(false);
    }
  }, []);

  const cargarEventos = useCallback(async () => {
    try {
      setCargandoEventos(true);
      const respuesta = await fetch("/api/events", {
        method: "GET",
        credentials: "include",
      });

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setEventos([]);
          return;
        }
        throw new Error(`Error ${respuesta.status}`);
      }

      const data: unknown = await respuesta.json();

      const listaBruta: unknown[] = Array.isArray(data)
        ? data
        : esEventosWrapper(data)
          ? data.eventos
          : [];

      const listaNormalizada = listaBruta
        .filter(esRegistroEvento)
        .map((registro) => {
          const item = registro as Record<string, unknown>;

          const idValue = item.id;
          const id = typeof idValue === "string" ? idValue : typeof idValue === "number" ? String(idValue) : null;
          if (!id) {
            return null;
          }

          const sourceValue = (item as { source?: unknown }).source;
          const source = sourceValue === "tarea" || sourceValue === "evento_interno" ? sourceValue : "evento_interno";

          const sourceIdRaw =
            (item as { source_id?: unknown }).source_id ?? (item as { sourceId?: unknown }).sourceId ?? null;
          const sourceId =
            typeof sourceIdRaw === "number"
              ? sourceIdRaw
              : typeof sourceIdRaw === "string" && sourceIdRaw.trim() && !Number.isNaN(Number(sourceIdRaw))
                ? Number(sourceIdRaw)
                : null;

          const tipoValue = item.tipo;
          const tipo: TipoItemCalendario =
            tipoValue === "tarea_personal" || tipoValue === "tarea_grupal"
              ? tipoValue
              : "evento";

          const tituloValue = item.titulo;
          const descripcionValue = item.descripcion;
          const ubicacionValue = item.ubicacion;
          const equipoValue = (item as { equipo_nombre?: unknown }).equipo_nombre;
          const equipoIdRaw = (item as { id_equipo?: unknown }).id_equipo ?? (item as { idEquipo?: unknown }).idEquipo;
          const estadoValue = (item as { estado_asistencia?: unknown }).estado_asistencia;
          const estadoEventoValue =
            (item as { estado_evento?: unknown }).estado_evento ?? (item as { estadoEvento?: unknown }).estadoEvento;
          const creadorNombreValue =
            (item as { creador_nombre?: unknown }).creador_nombre ?? (item as { creadorNombre?: unknown }).creadorNombre;

          const inicioValue = typeof item.inicio === "string" ? item.inicio : null;
          const finValue = typeof item.fin === "string" ? item.fin : null;
          const fechaValue = typeof (item as { fecha?: unknown }).fecha === "string" ? (item as { fecha: string }).fecha : null;

          const esOrganizador = Boolean((item as { es_organizador?: unknown }).es_organizador);
          const esParticipante = Boolean((item as { es_participante?: unknown }).es_participante);

          const estadoInvitacion: EstadoInvitacion =
            estadoValue === "pendiente" || estadoValue === "aceptado" || estadoValue === "rechazado"
              ? estadoValue
              : null;

          const titulo =
            typeof tituloValue === "string"
              ? tituloValue
              : tituloValue === null
                ? null
                : null;

          const descripcion =
            typeof descripcionValue === "string"
              ? descripcionValue
              : descripcionValue === null
                ? null
                : null;

          const ubicacion =
            typeof ubicacionValue === "string"
              ? ubicacionValue
              : ubicacionValue === null
                ? null
                : null;

          const equipoNombre =
            typeof equipoValue === "string"
              ? equipoValue
              : equipoValue === null
                ? null
                : null;

          if (!inicioValue && !fechaValue && !finValue) {
            return null;
          }

          return {
            id,
            titulo,
            descripcion,
            inicio: inicioValue,
            fin: finValue,
            fecha: fechaValue,
            ubicacion,
            tipo,
            equipoNombre,
            esOrganizador,
            esParticipante,
            estadoInvitacion,
            source,
            sourceId: typeof sourceId === "number" && Number.isFinite(sourceId) ? sourceId : null,
            equipoId:
              typeof equipoIdRaw === "number"
                ? equipoIdRaw
                : typeof equipoIdRaw === "string" && equipoIdRaw.trim() && !Number.isNaN(Number(equipoIdRaw))
                  ? Number(equipoIdRaw)
                  : null,
            estadoEvento:
              typeof estadoEventoValue === "string" ? estadoEventoValue : null,
            creadorNombre:
              typeof creadorNombreValue === "string"
                ? creadorNombreValue
                : creadorNombreValue === null
                  ? null
                  : null,
          } satisfies Evento;
        })
        .filter((evento): evento is Evento => Boolean(evento));

      setEventos(listaNormalizada);
    } catch (error) {
      console.error("[Eventos] Error al cargar eventos", error);
      setEventos([]);
    } finally {
      setCargandoEventos(false);
    }
  }, []);

  const cargarNotificaciones = useCallback(async () => {
    try {
      setCargandoNotificaciones(true);
      setErrorNotificaciones(null);

      const respuesta = await fetch("/api/notificaciones", {
        method: "GET",
        credentials: "include",
      });

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setNotificaciones([]);
          setErrorNotificaciones("Inicia sesión para ver tus notificaciones.");
          return;
        }

        throw new Error(`Error ${respuesta.status}`);
      }

      const data: unknown = await respuesta.json();
      if (
        !data ||
        typeof data !== "object" ||
        !Array.isArray((data as { notificaciones?: unknown }).notificaciones)
      ) {
        throw new Error("Respuesta inesperada del servidor");
      }

      setNotificaciones((data as { notificaciones: Notificacion[] }).notificaciones);
    } catch (error) {
      console.error("[Notificaciones] Error al cargar", error);
      setNotificaciones([]);
      setErrorNotificaciones("No pudimos cargar la actividad reciente.");
    } finally {
      setCargandoNotificaciones(false);
    }
  }, []);

  const manejarAccionInvitacion = useCallback(
    async (objetivo: ObjetivoInvitacion, accion: "aceptar" | "rechazar") => {
      try {
        setAccionInvitacion(objetivo);
        setErrorNotificaciones(null);

        let respuesta: Response;
        if (objetivo.tipo === "equipo") {
          respuesta = await fetch(`/api/invitaciones/${objetivo.id}/${accion}`, {
            method: "PATCH",
            credentials: "include",
          });
        } else {
          const estado = accion === "aceptar" ? "aceptado" : "rechazado";
          const url = `/api/events/${objetivo.id}/respuesta?estado=${estado}`;
          respuesta = await fetch(url, {
            method: "POST",
            credentials: "include",
          });
        }

        if (!respuesta.ok) {
          throw new Error(`Error ${respuesta.status}`);
        }

        await Promise.all([cargarNotificaciones(), cargarDashboard(), cargarEventos()]);
      } catch (error) {
        console.error("[Invitaciones] Error al actualizar", error);
        setErrorNotificaciones("No se pudo actualizar la invitación. Intenta de nuevo.");
      } finally {
        setAccionInvitacion(null);
      }
    },
    [cargarDashboard, cargarEventos, cargarNotificaciones],
  );

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  const plugins = useMemo(() => [dayGridPlugin, interactionPlugin], []);

  const eventosCalendario = useMemo(
    () =>
      eventos
        .map((evento) => {
          const inicio = evento.inicio ?? evento.fecha ?? evento.fin;
          if (!inicio) {
            return null;
          }

          const esTarea = evento.tipo === "tarea_personal" || evento.tipo === "tarea_grupal";
          const esPendiente = evento.tipo === "evento" && evento.estadoInvitacion === "pendiente";

          let backgroundColor = "#3b82f6";
          let borderColor = "#3b82f6";

          if (esTarea) {
            if (evento.tipo === "tarea_grupal") {
              backgroundColor = "#a855f7";
            } else {
              backgroundColor = "#22c55e";
            }
            borderColor = backgroundColor;
          } else if (esPendiente) {
            backgroundColor = "#facc15";
            borderColor = "#facc15";
          }

          return {
            id: evento.id,
            title: evento.titulo ?? "(Sin título)",
            start: inicio,
            end: evento.tipo === "evento" ? evento.fin ?? undefined : undefined,
            allDay: esTarea || (!evento.inicio && Boolean(evento.fecha)),
            backgroundColor,
            borderColor,
            extendedProps: {
              descripcion: evento.descripcion,
              ubicacion: evento.ubicacion,
              tipo: evento.tipo,
              equipoNombre: evento.equipoNombre,
              estadoInvitacion: evento.estadoInvitacion,
              source: evento.source,
            },
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [eventos],
  );

  const proximosCompromisos = useMemo(() => {
    const ahora = Date.now();
    const limitePasado = ahora - 60 * 60 * 1000;
    const estadosExcluidos = new Set(["cancelado", "eliminado"]);

    return eventos
      .map((evento) => {
        if (evento.estadoInvitacion === "rechazado") {
          return null;
        }

        const estadoGeneral = evento.estadoEvento?.toLowerCase() ?? null;
        if (estadoGeneral && estadosExcluidos.has(estadoGeneral)) {
          return null;
        }

        const fechaBase = obtenerFechaBaseCompromiso(evento);
        if (!fechaBase) {
          return null;
        }

        const timestamp = fechaBase.getTime();
        if (!Number.isFinite(timestamp) || timestamp < limitePasado) {
          return null;
        }

        return { evento, fechaBase };
      })
      .filter((registro): registro is { evento: Evento; fechaBase: Date } => Boolean(registro))
      .sort((a, b) => a.fechaBase.getTime() - b.fechaBase.getTime())
      .slice(0, 6);
  }, [eventos]);

  const abrirModalEvento = useCallback((evento: Evento) => {
    setEventoEdicion(evento);
    setModalEdicionAbierto(true);
  }, []);

  const cerrarModalEdicion = useCallback(() => {
    setModalEdicionAbierto(false);
    setEventoEdicion(null);
  }, []);

  useEffect(() => {
    if (!modalEdicionAbierto) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cerrarModalEdicion();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalEdicionAbierto, cerrarModalEdicion]);

  const manejarClickEvento = useCallback(
    (info: EventClickArg) => {
      const evento = eventos.find((item) => item.id === info.event.id);
      if (evento && evento.source === "evento_interno") {
        abrirModalEvento(evento);
      }
    },
    [eventos, abrirModalEvento],
  );

  const recargarTodo = useCallback(async () => {
    await Promise.all([cargarEventos(), cargarDashboard(), cargarNotificaciones()]);
  }, [cargarDashboard, cargarEventos, cargarNotificaciones]);

  const nombreUsuario = dashboard?.nombre ?? "invitado";
  const fechaResumen = capitalizar(dashboard?.fechaLegible ?? intlFechaResumen.format(new Date()));
  const totalTareasHoy = dashboard?.totalTareas ?? 0;
  const totalEventosHoy = dashboard?.totalEventos ?? 0;

  const itemsHoy = useMemo(() => {
    if (!dashboard) {
      return [] as ItemHoy[];
    }

    const lista: ItemHoy[] = [];

    dashboard.eventos.forEach((evento) => {
      lista.push({
        id: `evento-${evento.id}`,
        titulo: evento.titulo ?? "(Sin título)",
        tipo: "evento",
        inicio: evento.inicio,
        fin: evento.fin,
        fecha: evento.inicio ?? null,
        equipoNombre: evento.equipoNombre ?? null,
        descripcion: evento.descripcion,
        estadoInvitacion: evento.estadoInvitacion,
        creadorNombre: evento.creadorNombre ?? null,
      });
    });

    dashboard.invitacionesPendientes.forEach((invitacion) => {
      lista.push({
        id: `evento-pendiente-${invitacion.eventoId}`,
        titulo: invitacion.titulo,
        tipo: "evento",
        inicio: invitacion.inicio,
        fin: invitacion.fin,
        fecha: invitacion.inicio ?? null,
        equipoNombre: invitacion.equipoNombre ?? null,
        descripcion: invitacion.descripcion,
        estadoInvitacion: invitacion.estadoInvitacion,
        creadorNombre: invitacion.creadorNombre ?? null,
      });
    });

    dashboard.tareas.forEach((tarea) => {
      lista.push({
        id: `tarea-${tarea.id}`,
        titulo: tarea.titulo,
        tipo: tarea.tipo,
        inicio: null,
        fin: null,
        fecha: tarea.fecha ?? null,
        equipoNombre: tarea.equipoNombre ?? null,
        descripcion: tarea.descripcion,
      });
    });

    return lista.sort((a, b) => obtenerTimestamp(a) - obtenerTimestamp(b));
  }, [dashboard]);

  const invitacionesPendientes = dashboard?.invitacionesPendientes ?? [];

  const notificacionesFiltradas = useMemo(
    () =>
      notificaciones.filter(
        (notificacion) =>
          !(notificacion.tipo === "evento" && notificacion.puedeResponder && typeof notificacion.eventoId === "number"),
      ),
    [notificaciones],
  );

  return (
    <div className="flex flex-col gap-6 p-6 text-gray-900 dark:text-gray-100">
      <header className="space-y-1">
        <h1 className="mb-1 text-3xl font-semibold">Hola, {nombreUsuario} 👋</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Hoy es {fechaResumen}. Tienes {" "}
          <span className="font-medium">{totalTareasHoy}</span> tareas y {" "}
          <span className="font-medium">{totalEventosHoy}</span> eventos para hoy.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Hoy</h2>
              {cargandoDashboard && (
                <span className="text-sm text-gray-400 dark:text-gray-500">Actualizando...</span>
              )}
            </div>
            {errorDashboard && (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{errorDashboard}</p>
            )}

            {!cargandoDashboard && itemsHoy.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300">
                No tienes eventos ni tareas para hoy 🎉
              </div>
            ) : (
              <ul className="mt-6 space-y-4">
                {itemsHoy.map((item) => {
                  const etiqueta = obtenerEtiquetaTipo(item);
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${etiqueta.clases}`}>
                            {etiqueta.texto}
                          </span>
                          {item.equipoNombre && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800/70 dark:text-gray-300">
                              Equipo: {item.equipoNombre}
                            </span>
                          )}
                          {item.estadoInvitacion === "pendiente" && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                              Invitación pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.titulo}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{formatearHoraItem(item)}</p>
                        {item.creadorNombre && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Organiza: {item.creadorNombre}</p>
                        )}
                        {item.descripcion && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.descripcion}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Calendario interno</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Eventos y tareas</span>
            </div>

            <div className="mt-4">
              {cargandoEventos ? (
                <p className="text-gray-500 dark:text-gray-400">Cargando tus eventos...</p>
              ) : (
                <FullCalendar
                  plugins={plugins}
                  initialView="dayGridMonth"
                  locale="es"
                  events={eventosCalendario}
                  height="auto"
                  eventClick={manejarClickEvento}
                  headerToolbar={{
                    start: "title",
                    center: "",
                    end: "prev,next today",
                  }}
                />
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Próximos compromisos</h2>
              <button
                type="button"
                onClick={cargarEventos}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800/80"
              >
                Actualizar
              </button>
            </div>

            {cargandoEventos ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando tus próximos eventos...</p>
            ) : proximosCompromisos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay compromisos próximos en tu agenda.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {proximosCompromisos.map(({ evento }) => {
                  const config = CONFIG_COMPROMISO[evento.tipo] ?? CONFIG_COMPROMISO.evento;
                  const Icono = ICONOS_COMPROMISO[evento.tipo] ?? ICONOS_COMPROMISO.evento;
                  const descripcion = truncarDescripcion(evento.descripcion);
                  return (
                    <li
                      key={`compromiso-${evento.id}`}
                      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/80 dark:hover:border-gray-700"
                    >
                      <div
                        className={combineClassNames(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-base",
                          config.icono,
                        )}
                      >
                        <Icono className="h-5 w-5" />
                      </div>
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={combineClassNames(
                                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                                  config.clases,
                                )}
                              >
                                {config.etiqueta}
                              </span>
                              {evento.estadoInvitacion === "pendiente" && (
                                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
                                  Invitación pendiente
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {evento.titulo?.trim() || "(Sin título)"}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => abrirModalEvento(evento)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:hover:bg-gray-800/70 dark:hover:text-gray-200 dark:focus-visible:outline-gray-600"
                            aria-label="Editar evento"
                          >
                            <PencilMiniIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatearResumenCompromiso(evento)}</p>
                        {evento.equipoNombre && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Equipo: {evento.equipoNombre}</p>
                        )}
                        {descripcion && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">{descripcion}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Actividad reciente</h2>
              <button
                type="button"
                onClick={cargarNotificaciones}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800/80"
              >
                Actualizar
              </button>
            </div>

            {errorNotificaciones && (
              <p className="mb-3 text-sm text-rose-600 dark:text-rose-300">{errorNotificaciones}</p>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Invitaciones pendientes
                </h3>
                {cargandoDashboard ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Revisando invitaciones...</p>
                ) : invitacionesPendientes.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No tienes invitaciones pendientes.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {invitacionesPendientes.map((invitacion) => {
                      const creador = invitacion.creadorNombre ?? "Alguien";
                      const estaProcesando =
                        accionInvitacion?.tipo === "evento" && accionInvitacion.id === invitacion.eventoId;

                      return (
                        <li
                          key={`invitacion-evento-${invitacion.eventoId}`}
                          className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10"
                        >
                          <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {creador} te invitó al evento “{invitacion.titulo}”
                            </p>
                            {invitacion.equipoNombre && (
                              <span className="text-xs text-gray-600 dark:text-gray-300">
                                Equipo: {invitacion.equipoNombre}
                              </span>
                            )}
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              Cuando: {formatearRangoEvento(invitacion.inicio, invitacion.fin)}
                            </span>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => manejarAccionInvitacion({ tipo: "evento", id: invitacion.eventoId }, "aceptar")}
                                disabled={estaProcesando}
                                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                Aceptar
                              </button>
                              <button
                                type="button"
                                onClick={() => manejarAccionInvitacion({ tipo: "evento", id: invitacion.eventoId }, "rechazar")}
                                disabled={estaProcesando}
                                className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Actividad
                  </h3>
                  {cargandoNotificaciones && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Actualizando...</span>
                  )}
                </div>
                {cargandoNotificaciones ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cargando actividad...</p>
                ) : notificacionesFiltradas.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No hay notificaciones recientes.</p>
                ) : (
                  <ul className="space-y-4">
                    {notificacionesFiltradas.map((notificacion) => {
                      const etiquetaEstado = obtenerEtiquetaEstado(notificacion);

                      const objetivoAccion: ObjetivoInvitacion | null =
                        notificacion.tipo === "equipo" && typeof notificacion.invitacionId === "number"
                          ? { tipo: "equipo", id: notificacion.invitacionId }
                          : notificacion.tipo === "evento" && typeof notificacion.eventoId === "number"
                            ? { tipo: "evento", id: notificacion.eventoId }
                            : null;

                      const estaProcesando =
                        objetivoAccion &&
                        accionInvitacion?.tipo === objetivoAccion.tipo &&
                        accionInvitacion.id === objetivoAccion.id;

                      return (
                        <li
                          key={notificacion.id}
                          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                        >
                          <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{notificacion.mensaje}</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatearFechaNotificacion(notificacion.fecha)}
                            </span>
                            {etiquetaEstado && (
                              <span
                                className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${etiquetaEstado.clases}`}
                              >
                                {etiquetaEstado.texto}
                              </span>
                            )}
                            {notificacion.puedeResponder && objetivoAccion && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => manejarAccionInvitacion(objetivoAccion, "aceptar")}
                                  disabled={estaProcesando}
                                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  Aceptar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => manejarAccionInvitacion(objetivoAccion, "rechazar")}
                                  disabled={estaProcesando}
                                  className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  Rechazar
                                </button>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <EditarEventoModal
        open={modalEdicionAbierto}
        evento={eventoEdicion}
        onClose={cerrarModalEdicion}
        onRefresh={recargarTodo}
      />
    </div>
  );
}
