"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import CrearEventoModal from "@/components/CrearEventoModal";
import useSWR from "swr";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

type TipoEventoUnificado = "evento" | "tarea_personal" | "tarea_grupal";

type EstadoAsistencia = "pendiente" | "aceptado" | "rechazado" | null;

type EventoUnificado = {
  id: string;
  source: "evento_interno" | "tarea";
  sourceId: number;
  tipo: TipoEventoUnificado;
  titulo: string;
  descripcion: string | null;
  inicio: string | null;
  fin: string | null;
  fecha: string | null;
  ubicacion: string | null;
  equipo_nombre: string | null;
  es_organizador: boolean;
  es_participante: boolean;
  estado_asistencia: EstadoAsistencia;
};

type FetchError = Error & { info?: { error?: string } };

const fetcher = async (url: string): Promise<EventoUnificado[]> => {
  const response = await fetch(url);

  if (!response.ok) {
    let info: { error?: string } | undefined;
    try {
      info = await response.json();
    } catch (error) {
      info = undefined;
    }
    const error = new Error(info?.error ?? "No se pudo cargar el calendario") as FetchError;
    error.info = info;
    throw error;
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return data as EventoUnificado[];
  }

  if (data && Array.isArray(data.eventos)) {
    return data.eventos as EventoUnificado[];
  }

  return [];
};

const obtenerColorPorTipo = (tipo: TipoEventoUnificado) => {
  switch (tipo) {
    case "tarea_personal":
      return "#22c55e"; // verde
    case "tarea_grupal":
      return "#a855f7"; // morado
    default:
      return "#3b82f6"; // azul
  }
};

const obtenerFechaBase = (item: EventoUnificado): Date | null => {
  if (item.tipo === "evento") {
    if (item.inicio) {
      return new Date(item.inicio);
    }

    if (item.fin) {
      return new Date(item.fin);
    }

    return null;
  }

  if (!item.fecha) {
    return null;
  }

  return new Date(`${item.fecha}T00:00:00`);
};

const formatearDescripcionCorta = (value: string | null) => {
  if (!value) return null;
  if (value.length <= 120) return value;
  return `${value.slice(0, 117)}...`;
};

const formatearRangoHorario = (inicio: string | null, fin: string | null) => {
  if (!inicio) return null;

  const inicioDate = new Date(inicio);
  const finDate = fin ? new Date(fin) : null;
  const fechaFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });
  const horaFormatter = new Intl.DateTimeFormat("es-MX", { timeStyle: "short" });
  const fechaTexto = fechaFormatter.format(inicioDate);
  const horaInicio = horaFormatter.format(inicioDate);
  const horaFin = finDate ? horaFormatter.format(finDate) : null;

  return horaFin ? `${fechaTexto} · ${horaInicio} - ${horaFin}` : `${fechaTexto} · ${horaInicio}`;
};

const formatearFechaSimple = (fecha: string | null) => {
  if (!fecha) return "Sin fecha";
  const fechaDate = new Date(`${fecha}T00:00:00`);
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(fechaDate);
};

const legendItems = [
  { label: "Eventos", color: "#3b82f6" },
  { label: "Tareas personales", color: "#22c55e" },
  { label: "Tareas grupales", color: "#a855f7" },
];

const CalendarioUnificadoPage = () => {
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [respuestaPendiente, setRespuestaPendiente] = useState<string | null>(null);
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [toast, setToast] = useState<{ tipo: "success" | "error"; mensaje: string } | null>(null);

  const { data, error, isLoading, mutate } = useSWR<EventoUnificado[]>(
    "/api/events",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const abrirModalCrear = useCallback(() => {
    setMostrarModalCrear(true);
  }, []);

  const cerrarModalCrear = useCallback(() => {
    setMostrarModalCrear(false);
  }, []);

  const eventos = useMemo(() => data ?? [], [data]);

  const manejarCreacionExitosa = useCallback(
    async (texto: string) => {
      await mutate();
      setToast({ tipo: "success", mensaje: texto });
      cerrarModalCrear();
    },
    [mutate, cerrarModalCrear]
  );

  const manejarCreacionError = useCallback((texto: string) => {
    setToast({ tipo: "error", mensaje: texto });
  }, []);

  const eventosCalendario = useMemo<EventInput[]>(() => {
    return eventos
      .map((item) => {
        const start = item.tipo === "evento" ? item.inicio : item.fecha;

        if (!start) {
          return null;
        }

        const baseColor = obtenerColorPorTipo(item.tipo);

        return {
          id: item.id,
          title: item.tipo === "tarea_grupal" ? `👥 ${item.titulo}` : item.titulo,
          start,
          end: item.tipo === "evento" ? item.fin ?? undefined : undefined,
          allDay: item.tipo !== "evento",
          backgroundColor: baseColor,
          borderColor: baseColor,
          textColor: "#ffffff",
          extendedProps: item,
        } satisfies EventInput;
      })
      .filter((item): item is EventInput => item !== null);
  }, [eventos]);

  const proximosEventos = useMemo(() => {
    const ahora = new Date();

    return eventos
      .map((item) => {
        const fechaBase = obtenerFechaBase(item);
        return fechaBase
          ? {
              item,
              fechaBase,
            }
          : null;
      })
      .filter((registro): registro is { item: EventoUnificado; fechaBase: Date } =>
        Boolean(registro && registro.fechaBase)
      )
      .filter((registro) => registro.fechaBase.getTime() >= ahora.getTime() - 24 * 60 * 60 * 1000)
      .sort((a, b) => a.fechaBase.getTime() - b.fechaBase.getTime())
      .slice(0, 5);
  }, [eventos]);

  const manejarRespuesta = useCallback(
    async (item: EventoUnificado, estado: Exclude<EstadoAsistencia, null>) => {
      if (item.source !== "evento_interno") {
        return;
      }

      try {
        setRespuestaPendiente(`${item.id}-${estado}`);
        setMensaje(null);

        const response = await fetch(`/api/events/${item.sourceId}/respuesta`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ estado }),
        });

        if (!response.ok) {
          const info = await response.json().catch(() => ({ error: "No se pudo actualizar la respuesta" }));
          throw new Error(info?.error ?? "No se pudo actualizar la respuesta");
        }

        setMensaje({ tipo: "success", texto: "Respuesta registrada correctamente" });
        await mutate();
      } catch (error) {
        console.error("[Calendario] manejarRespuesta", error);
        setMensaje({ tipo: "error", texto: error instanceof Error ? error.message : "Ocurrió un error inesperado" });
      } finally {
        setRespuestaPendiente(null);
      }
    },
    [mutate]
  );

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calendario unificado de eventos y tareas</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Consulta de un vistazo tus eventos, tareas personales y tareas grupales en un mismo calendario.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            {legendItems.map((legend) => (
              <div key={legend.label} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span
                  className="inline-flex h-3 w-3 rounded-full"
                  style={{ backgroundColor: legend.color }}
                  aria-hidden="true"
                />
                {legend.label}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
            onClick={abrirModalCrear}
          >
            Crear evento
          </button>
        </div>
      </div>

      {mensaje && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            mensaje.tipo === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error instanceof Error ? error.message : "No se pudo cargar el calendario"}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/70">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tu calendario</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Navega entre meses y crea hábitos alrededor de tus compromisos.</p>
          </div>
          <div className="p-4">
            {isLoading && eventosCalendario.length === 0 ? (
              <div className="flex min-h-[480px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                Cargando calendario...
              </div>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                height="auto"
                events={eventosCalendario}
                eventDisplay="block"
                displayEventEnd
                locale="es"
                eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              />
            )}
          </div>
        </div>

        <aside className="flex h-full flex-col gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/70">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Próximos compromisos</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Los siguientes eventos y tareas en tu agenda.</p>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              {proximosEventos.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay eventos o tareas próximos.</p>
              ) : (
                proximosEventos.map(({ item }) => {
                  const color = obtenerColorPorTipo(item.tipo);
                  const descripcionCorta = formatearDescripcionCorta(item.descripcion);
                  const fechaTexto =
                    item.tipo === "evento"
                      ? formatearRangoHorario(item.inicio, item.fin)
                      : formatearFechaSimple(item.fecha);

                  const puedeResponder =
                    item.source === "evento_interno" &&
                    item.es_participante &&
                    !item.es_organizador &&
                    item.estado_asistencia === "pendiente";

                  return (
                    <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900/80">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                              {item.tipo === "evento"
                                ? "Evento"
                                : item.tipo === "tarea_grupal"
                                  ? "Tarea grupal"
                                  : "Tarea personal"}
                            </span>
                          </div>
                          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {item.tipo === "tarea_grupal" ? `👥 ${item.titulo}` : item.titulo}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{fechaTexto}</p>
                          {item.tipo === "evento" && item.equipo_nombre && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Equipo: {item.equipo_nombre}</p>
                          )}
                          {descripcionCorta && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{descripcionCorta}</p>
                          )}
                        </div>
                      </div>
                      {puedeResponder && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400"
                            onClick={() => manejarRespuesta(item, "aceptado")}
                            disabled={respuestaPendiente !== null}
                          >
                            Aceptar
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/70"
                            onClick={() => manejarRespuesta(item, "rechazado")}
                            disabled={respuestaPendiente !== null}
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                      {item.tipo === "evento" && item.estado_asistencia && item.estado_asistencia !== "pendiente" && (
                        <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Tu estado: {item.estado_asistencia === "aceptado" ? "✅ Aceptado" : "❌ Rechazado"}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </aside>
      </div>
      <CrearEventoModal
        open={mostrarModalCrear}
        onClose={cerrarModalCrear}
        onCreated={manejarCreacionExitosa}
        onError={manejarCreacionError}
      />
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-lg ${
            toast.tipo === "success" ? "bg-green-600 text-white" : "bg-rose-600 text-white"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {toast.tipo === "success" ? "Éxito" : "Error"}
            </span>
            <p className="text-sm leading-snug">{toast.mensaje}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar notificación"
            className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
      </div>
    </>
  );
};

export default CalendarioUnificadoPage;
