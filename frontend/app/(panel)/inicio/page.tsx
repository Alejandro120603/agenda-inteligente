"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "@fullcalendar/core/index.css";
import "@fullcalendar/daygrid/index.css";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
});

interface EventoCalendario {
  id: string;
  title: string;
  start: string;
  end: string;
}

export default function InicioPage() {
  const [fecha, setFecha] = useState("");
  const [tareas, setTareas] = useState(0);
  const [eventosHoy, setEventosHoy] = useState(0);
  const [nombre, setNombre] = useState<string>("invitado");
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>(
    []
  );
  const [cargandoEventos, setCargandoEventos] = useState(true);

  useEffect(() => {
    // 📅 Fecha actual
    const hoy = new Date();
    const opciones = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    } as const;
    setFecha(hoy.toLocaleDateString("es-ES", opciones));

    setTareas(3);

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
          setEventosCalendario([]);
          return;
        }
        throw new Error(`Error ${respuesta.status}`);
      }

      const data: { eventos?: any[] } = await respuesta.json();
      const eventos = Array.isArray(data.eventos) ? data.eventos : [];

      const eventosMapeados: EventoCalendario[] = eventos.map((evento) => ({
        id: String(evento.id),
        title: evento.titulo ?? "(Sin título)",
        start: evento.inicio,
        end: evento.fin,
      }));

      const hoy = new Date();
      const eventosDelDia = eventosMapeados.filter((evento) => {
        if (!evento.start) return false;
        const fechaInicio = new Date(evento.start);
        return fechaInicio.toDateString() === hoy.toDateString();
      }).length;

      setEventosHoy(eventosDelDia);
      setEventosCalendario(eventosMapeados);
    } catch (error) {
      console.error("Error al cargar eventos:", error);
      setEventosHoy(0);
      setEventosCalendario([]);
    } finally {
      setCargandoEventos(false);
    }
  }, []);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  const manejarCreacionRapida = useCallback(
    async (info: any) => {
      const titulo = window.prompt(
        `Nuevo evento para el ${info.dateStr}. Ingresa un título:`
      );

      if (!titulo) return;

      const inicio = info.dateStr.includes("T")
        ? info.dateStr
        : `${info.dateStr}T09:00:00`;
      const fin = info.dateStr.includes("T")
        ? info.dateStr
        : `${info.dateStr}T10:00:00`;

      try {
        const respuesta = await fetch("/api/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            titulo,
            inicio,
            fin,
            tipo: "personal",
          }),
        });

        if (!respuesta.ok) {
          throw new Error(`Error ${respuesta.status}`);
        }

        await cargarEventos();
      } catch (error) {
        console.error("No se pudo crear el evento:", error);
        window.alert("No fue posible crear el evento. Intenta nuevamente.");
      }
    },
    [cargarEventos]
  );

  const plugins = useMemo(() => [dayGridPlugin, interactionPlugin], []);

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
              dateClick={manejarCreacionRapida}
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
            Crea tus eventos personales directamente desde el calendario y
            visualízalos aquí mismo.
          </p>
        </div>
      </div>
    </div>
  );
}
