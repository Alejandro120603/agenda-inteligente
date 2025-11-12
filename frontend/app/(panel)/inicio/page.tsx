"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import useSWR from "swr";

import Greeting from "@/components/dashboard/Greeting";
import DailySummary from "@/components/dashboard/DailySummary";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { DashboardEvent } from "@/types/dashboard";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
});

type EventosResponse = {
  eventos: DashboardEvent[];
};

const calendarFetcher = async (url: string): Promise<EventosResponse> => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error("No se pudieron cargar los eventos");
  }
  return response.json() as Promise<EventosResponse>;
};

function formatDateToLong(date: string | null | undefined) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    const [year, month, day] = date.split("-");
    if (!year || !month || !day) return date;
    const fallback = new Date(Number(year), Number(month) - 1, Number(day));
    return fallback.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
  return parsed.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function InicioPage() {
  const { data: dashboardData, error: dashboardError, isLoading, mutate } = useDashboardData();
  const { data: calendarData } = useSWR<EventosResponse>("/api/events", calendarFetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | null>(null);

  const plugins = useMemo(() => [dayGridPlugin, interactionPlugin], []);

  const calendarEvents = useMemo(() => {
    return (calendarData?.eventos ?? []).map((event) => ({
      id: String(event.id),
      title: event.titulo,
      start: event.inicio,
      end: event.fin,
      extendedProps: event,
    }));
  }, [calendarData?.eventos]);

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const eventId = Number(info.event.id);
      if (!Number.isFinite(eventId)) return;
      const eventDetail = calendarData?.eventos.find((event) => event.id === eventId) ?? null;
      setSelectedEvent(eventDetail);
    },
    [calendarData?.eventos]
  );

  const closeModal = useCallback(() => setSelectedEvent(null), []);

  const formattedDate = useMemo(() => formatDateToLong(dashboardData?.date), [dashboardData?.date]);

  const handleTaskStatusChange = useCallback(
    async (taskId: number, status: "pendiente" | "en_progreso" | "completada") => {
      try {
        const response = await fetch("/api/tasks", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ id: taskId, estado: status }),
        });

        if (!response.ok) {
          throw new Error("No se pudo actualizar la tarea");
        }

        await mutate();
      } catch (error) {
        console.error("[Dashboard] Error actualizando tarea", error);
      }
    },
    [mutate]
  );

  const stats = useMemo(() => {
    const tareas = dashboardData?.tareas.length ?? 0;
    const eventos = dashboardData?.eventos.length ?? 0;
    return [
      {
        label: "Tareas de hoy",
        value: tareas,
        description: "Actividades planificadas",
      },
      {
        label: "Eventos",
        value: eventos,
        description: "Reuniones y recordatorios",
      },
    ];
  }, [dashboardData?.eventos.length, dashboardData?.tareas.length]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Greeting name={dashboardData?.user.nombre ?? "invitado"} date={formattedDate} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <FullCalendar
              plugins={plugins}
              initialView="dayGridMonth"
              locale="es"
              height="auto"
              events={calendarEvents}
              eventClick={handleEventClick}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,dayGridWeek,dayGridDay",
              }}
            />
          </div>
        </div>

        <DailySummary
          tasks={dashboardData?.tareas ?? []}
          events={dashboardData?.eventos ?? []}
          invitations={dashboardData?.invitaciones ?? []}
          onTaskStatusChange={handleTaskStatusChange}
        />
      </div>

      {dashboardError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Hubo un problema al cargar la información del dashboard.
        </div>
      ) : null}

      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">Detalle del evento</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedEvent.titulo}</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                <strong>Inicio:</strong>{" "}
                {new Date(selectedEvent.inicio).toLocaleString("es-MX")}
              </p>
              <p>
                <strong>Fin:</strong>{" "}
                {new Date(selectedEvent.fin).toLocaleString("es-MX")}
              </p>
              {selectedEvent.descripcion ? (
                <p>
                  <strong>Descripción:</strong> {selectedEvent.descripcion}
                </p>
              ) : null}
              {selectedEvent.ubicacion ? (
                <p>
                  <strong>Ubicación:</strong> {selectedEvent.ubicacion}
                </p>
              ) : null}
              <p>
                <strong>Tipo:</strong> {selectedEvent.tipo === "equipo" ? "Equipo" : "Personal"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Cargando información actualizada...
        </div>
      ) : null}
    </div>
  );
}
