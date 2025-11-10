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
};

const esEventosWrapper = (value: unknown): value is { eventos: unknown[] } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Array.isArray((value as { eventos?: unknown }).eventos);
};

const esRegistroEvento = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

export default function InicioPage() {
  const [fecha, setFecha] = useState("");
  const [tareas, setTareas] = useState(0);
  const [eventosHoy, setEventosHoy] = useState(0);
  const [nombre, setNombre] = useState<string>("invitado");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cerrandoModal, setCerrandoModal] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const cierreModalTimeout = useRef<NodeJS.Timeout | null>(null);

  // 📅 Fecha y usuario
  useEffect(() => {
    // Fecha actual en español
    const hoy = new Date();
    const opciones = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    } as const;
    setFecha(hoy.toLocaleDateString("es-ES", opciones));

    setTareas(3); // placeholder

    // 🧠 Obtener nombre real desde /api/user
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            setNombre("invitado");
            return;
          }
          console.warn("No se pudo obtener el usuario:", res.status);
          setNombre("invitado");
          return;
        }

        const data: { id?: number; name?: string | null; email?: string | null } =
          await res.json();
        setNombre(data?.name ? String(data.name) : "invitado");
      } catch (err) {
        console.error("Error al obtener el usuario:", err);
        setNombre("invitado");
      }
    };

    fetchUser();
  }, []);

  // 🔄 Cargar eventos del usuario autenticado
  const cargarEventos = useCallback(async () => {
    try {
      setCargandoEventos(true);
      const respuesta = await fetch("/api/events", {
        method: "GET",
        credentials: "include",
      });

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setEventosHoy(0);
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
          };
        })
        .filter((evento): evento is Evento => Boolean(evento) && Number.isFinite(evento.id));

      // Contar los eventos de hoy
      const hoy = new Date();
      const eventosDelDia = listaNormalizada.filter((evento) => {
        if (!evento.inicio) return false;
        const fechaInicio = new Date(evento.inicio);
        return fechaInicio.toDateString() === hoy.toDateString();
      }).length;

      setEventosHoy(eventosDelDia);
      setEventos(listaNormalizada);
    } catch (error) {
      console.error("Error al cargar eventos:", error);
      setEventosHoy(0);
      setEventos([]);
    } finally {
      setCargandoEventos(false);
    }
  }, []);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  const plugins = useMemo(() => [dayGridPlugin, interactionPlugin], []);

  // 🛈 Este calendario funciona únicamente como visor, sin creación rápida desde la vista mensual.
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
    return () => {
      if (cierreModalTimeout.current) {
        clearTimeout(cierreModalTimeout.current);
      }
    };
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

  const formatearFecha = useCallback((valor: string) => {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return "Fecha no disponible";
    }

    return fecha.toLocaleString("es-ES", {
      dateStyle: "full",
      timeStyle: "short",
    });
  }, []);

  const formatearTipo = useCallback((tipo: TipoEvento | null | undefined) => {
    if (!tipo) {
      return "Sin especificar";
    }

    return tipo.charAt(0).toUpperCase() + tipo.slice(1);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* Sección izquierda */}
      <div className="flex-1">
        <h1 className="text-3xl font-semibold mb-1">Hola, {nombre} 👋</h1>
        <p className="text-gray-600 mb-6">
          Hoy es {fecha}. Tienes{" "}
          <span className="font-medium">{tareas}</span> tareas y{" "}
          <span className="font-medium">{eventosHoy}</span> eventos para hoy.
        </p>

        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Calendario interno de tus eventos
          </h2>

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
      </div>

      {/* Sección derecha */}
      <div className="w-full lg:w-1/3">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Resumen diario</h2>
          <p className="text-gray-600 text-sm">
            Consulta tus eventos programados y revisa los detalles en cualquier
            momento.
          </p>
        </div>
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
                <p className="mt-1 font-medium text-gray-900">{formatearFecha(eventoSeleccionado.inicio)}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Fin</p>
                <p className="mt-1 font-medium text-gray-900">{formatearFecha(eventoSeleccionado.fin)}</p>
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
