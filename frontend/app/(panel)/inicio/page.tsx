"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

// ⚠️ No importes CSS. En FullCalendar v6+ ya se inyectan automáticamente
const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
});

type TipoEvento = "personal" | "equipo" | "otro";

type Evento = {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  inicio: string;
  fin: string;
  ubicacion: string | null;
  tipo: TipoEvento | null;
  equipoNombre?: string | null;
};

type DashboardEvento = {
  id: number;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  tipo: TipoEvento;
  equipoNombre: string | null;
};

type DashboardTarea = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string | null;
  tipo: "tarea" | "tarea_grupal";
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
};

type Notificacion = {
  id: string;
  mensaje: string;
  fecha: string;
  tipo: "equipo" | "evento";
  estado: "pendiente" | "aceptado" | "rechazado" | null;
  puedeResponder: boolean;
  invitacionId?: number;
};

type ItemHoy = {
  id: string;
  titulo: string;
  tipo: "evento" | "tarea" | "tarea_grupal";
  inicio: string | null;
  fin: string | null;
  fecha: string | null;
  equipoNombre: string | null;
  descripcion?: string | null;
};

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
    return { texto: "Evento", clases: "bg-blue-100 text-blue-700" };
  }

  if (item.tipo === "tarea_grupal") {
    return { texto: "Tarea grupal", clases: "bg-purple-100 text-purple-700" };
  }

  return { texto: "Tarea personal", clases: "bg-emerald-100 text-emerald-700" };
}

function obtenerEtiquetaEstado(notificacion: Notificacion): { texto: string; clases: string } | null {
  if (!notificacion.estado || notificacion.puedeResponder) {
    return null;
  }

  if (notificacion.estado === "aceptado") {
    return { texto: "Aceptado", clases: "bg-emerald-100 text-emerald-700" };
  }

  if (notificacion.estado === "rechazado") {
    return { texto: "Rechazado", clases: "bg-rose-100 text-rose-700" };
  }

  return { texto: "Pendiente", clases: "bg-gray-100 text-gray-600" };
}

function formatearTipo(tipo: TipoEvento | null | undefined) {
  if (!tipo) {
    return "Sin especificar";
  }

  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

function formatearFechaDetallada(valor: string) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return "Fecha no disponible";
  }

  return fecha.toLocaleString("es-ES", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default function InicioPage() {
  const [dashboard, setDashboard] = useState<DashboardTodayResponse | null>(null);
  const [cargandoDashboard, setCargandoDashboard] = useState(true);
  const [errorDashboard, setErrorDashboard] = useState<string | null>(null);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(true);
  const [errorNotificaciones, setErrorNotificaciones] = useState<string | null>(null);
  const [accionInvitacion, setAccionInvitacion] = useState<number | null>(null);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cerrandoModal, setCerrandoModal] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const cierreModalTimeout = useRef<NodeJS.Timeout | null>(null);

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
    async (invitacionId: number, accion: "aceptar" | "rechazar") => {
      try {
        setAccionInvitacion(invitacionId);
        setErrorNotificaciones(null);

        const respuesta = await fetch(`/api/invitaciones/${invitacionId}/${accion}`, {
          method: "PATCH",
          credentials: "include",
        });

        if (!respuesta.ok) {
          throw new Error(`Error ${respuesta.status}`);
        }

        await cargarNotificaciones();
      } catch (error) {
        console.error("[Invitaciones] Error al actualizar", error);
        setErrorNotificaciones("No se pudo actualizar la invitación. Intenta de nuevo.");
      } finally {
        setAccionInvitacion(null);
      }
    },
    [cargarNotificaciones],
  );

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
          const inicioValue = item.inicio;
          const finValue = item.fin;

          if (typeof inicioValue !== "string" || typeof finValue !== "string") {
            return null;
          }

          const tipoValue = item.tipo;
          const tipoEvento: TipoEvento | null =
            tipoValue === "personal" || tipoValue === "equipo" || tipoValue === "otro"
              ? tipoValue
              : null;

          const idNormalizado =
            typeof idValue === "number"
              ? idValue
              : typeof idValue === "string"
                ? Number.parseInt(idValue, 10)
                : NaN;

          const tituloValue = item.titulo;
          const descripcionValue = item.descripcion;
          const ubicacionValue = item.ubicacion;
          const equipoValue = (item as { equipo_nombre?: unknown }).equipo_nombre;

          return {
            id: idNormalizado,
            titulo:
              typeof tituloValue === "string"
                ? tituloValue
                : tituloValue === null
                  ? null
                  : null,
            descripcion:
              typeof descripcionValue === "string"
                ? descripcionValue
                : descripcionValue === null
                  ? null
                  : null,
            inicio: inicioValue,
            fin: finValue,
            ubicacion:
              typeof ubicacionValue === "string"
                ? ubicacionValue
                : ubicacionValue === null
                  ? null
                  : null,
            tipo: tipoEvento,
            equipoNombre:
              typeof equipoValue === "string"
                ? equipoValue
                : equipoValue === null
                  ? null
                  : null,
          } satisfies Evento;
        })
        .filter((evento): evento is Evento => Boolean(evento) && Number.isFinite(evento.id));

      setEventos(listaNormalizada);
    } catch (error) {
      console.error("[Eventos] Error al cargar eventos", error);
      setEventos([]);
    } finally {
      setCargandoEventos(false);
    }
  }, []);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  useEffect(() => {
    return () => {
      if (cierreModalTimeout.current) {
        clearTimeout(cierreModalTimeout.current);
      }
    };
  }, []);

  const plugins = useMemo(() => [dayGridPlugin, interactionPlugin], []);

  const eventosCalendario = useMemo(
    () =>
      eventos.map((evento) => ({
        id: String(evento.id),
        title: evento.titulo ?? "(Sin título)",
        start: evento.inicio,
        end: evento.fin,
        extendedProps: {
          descripcion: evento.descripcion,
          ubicacion: evento.ubicacion,
          tipo: evento.tipo,
          equipoNombre: evento.equipoNombre,
        },
      })),
    [eventos],
  );

  const abrirModalEvento = useCallback(
    (evento: Evento) => {
      if (cierreModalTimeout.current) {
        clearTimeout(cierreModalTimeout.current);
        cierreModalTimeout.current = null;
      }

      setEventoSeleccionado(evento);
      setCerrandoModal(false);
      setMostrarModal(true);
    },
    [],
  );

  const cerrarModalEvento = useCallback(() => {
    setCerrandoModal(true);
    cierreModalTimeout.current = setTimeout(() => {
      setMostrarModal(false);
      setEventoSeleccionado(null);
      setCerrandoModal(false);
    }, 200);
  }, []);

  useEffect(() => {
    if (!mostrarModal) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cerrarModalEvento();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mostrarModal, cerrarModalEvento]);

  const manejarClickEvento = useCallback(
    (info: EventClickArg) => {
      const evento = eventos.find((item) => item.id === Number(info.event.id));
      if (evento) {
        abrirModalEvento(evento);
      }
    },
    [eventos, abrirModalEvento],
  );

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

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-semibold mb-1">Hola, {nombreUsuario} 👋</h1>
        <p className="text-gray-600">
          Hoy es {fechaResumen}. Tienes {" "}
          <span className="font-medium">{totalTareasHoy}</span> tareas y {" "}
          <span className="font-medium">{totalEventosHoy}</span> eventos para hoy.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Hoy</h2>
              {cargandoDashboard && <span className="text-sm text-gray-400">Actualizando...</span>}
            </div>
            {errorDashboard && (
              <p className="mt-2 text-sm text-rose-600">{errorDashboard}</p>
            )}

            {!cargandoDashboard && itemsHoy.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-600">
                No tienes eventos ni tareas para hoy 🎉
              </div>
            ) : (
              <ul className="mt-6 space-y-4">
                {itemsHoy.map((item) => {
                  const etiqueta = obtenerEtiquetaTipo(item);
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${etiqueta.clases}`}>
                            {etiqueta.texto}
                          </span>
                          {item.equipoNombre && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                              Equipo: {item.equipoNombre}
                            </span>
                          )}
                        </div>
                        <p className="text-base font-semibold text-gray-900">{item.titulo}</p>
                        <p className="text-sm text-gray-600">{formatearHoraItem(item)}</p>
                        {item.descripcion && (
                          <p className="text-sm text-gray-500">{item.descripcion}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Calendario interno</h2>
              <span className="text-sm text-gray-500">Solo lectura</span>
            </div>

            <div className="mt-4">
              {cargandoEventos ? (
                <p className="text-gray-500">Cargando tus eventos...</p>
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
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Actividad reciente</h2>
              <button
                type="button"
                onClick={cargarNotificaciones}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Actualizar
              </button>
            </div>

            {errorNotificaciones && (
              <p className="mb-3 text-sm text-rose-600">{errorNotificaciones}</p>
            )}

            {cargandoNotificaciones ? (
              <p className="text-gray-500">Cargando actividad...</p>
            ) : notificaciones.length === 0 ? (
              <p className="text-gray-500">No hay notificaciones recientes.</p>
            ) : (
              <ul className="space-y-4">
                {notificaciones.map((notificacion) => {
                  const etiquetaEstado = obtenerEtiquetaEstado(notificacion);

                  return (
                    <li
                      key={notificacion.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-gray-900">{notificacion.mensaje}</p>
                        <span className="text-xs text-gray-500">
                          {formatearFechaNotificacion(notificacion.fecha)}
                        </span>
                        {etiquetaEstado && (
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${etiquetaEstado.clases}`}
                          >
                            {etiquetaEstado.texto}
                          </span>
                        )}
                        {notificacion.puedeResponder && notificacion.invitacionId && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => manejarAccionInvitacion(notificacion.invitacionId!, "aceptar")}
                              disabled={accionInvitacion === notificacion.invitacionId}
                              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Aceptar
                            </button>
                            <button
                              type="button"
                              onClick={() => manejarAccionInvitacion(notificacion.invitacionId!, "rechazar")}
                              disabled={accionInvitacion === notificacion.invitacionId}
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
          </section>
        </aside>
      </div>

      {mostrarModal && eventoSeleccionado && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 transition-opacity duration-300 ${
            cerrandoModal ? "opacity-0" : "opacity-100"
          }`}
          onClick={cerrarModalEvento}
        >
          <div
            className={`w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl transition-all duration-300 ease-out ${
              cerrandoModal ? "scale-95 opacity-0" : "scale-100 opacity-100"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {eventoSeleccionado.titulo ?? "(Sin título)"}
                </h3>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                  {formatearTipo(eventoSeleccionado.tipo)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-gray-700">
              <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Inicio</p>
                <p className="mt-1 font-medium text-gray-900">{formatearFechaDetallada(eventoSeleccionado.inicio)}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Fin</p>
                <p className="mt-1 font-medium text-gray-900">{formatearFechaDetallada(eventoSeleccionado.fin)}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Ubicación</p>
                <p className="mt-1 text-gray-900">
                  {eventoSeleccionado.ubicacion?.trim()
                    ? eventoSeleccionado.ubicacion
                    : "No se especificó una ubicación."}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Descripción</p>
                <p className="mt-1 whitespace-pre-line text-gray-900">
                  {eventoSeleccionado.descripcion?.trim()
                    ? eventoSeleccionado.descripcion
                    : "Sin descripción adicional."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={cerrarModalEvento}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
