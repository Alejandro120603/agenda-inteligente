import { useCallback, useEffect, useMemo, useState } from "react";
import AddEventButton from "../components/AddEventButton";
import AddEventModal from "../components/AddEventModal";
import EventCard from "../components/EventCard";
import TaskCard from "../components/TaskCard";
import useEvents from "../hooks/useEvents";
import { API_BASE_URL } from "../config";

const tasks = [
  { id: 1, title: "Preparar presentación del proyecto" },
  { id: 2, title: "Enviar reportes de progreso" },
];

const parseGoogleDate = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatGoogleEventTime = (event) => {
  const start = parseGoogleDate(event.start);
  const end = parseGoogleDate(event.end);
  if (!start) return "Sin horario";

  const dateFormatter = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" });
  const timeFormatter = new Intl.DateTimeFormat("es-ES", { timeStyle: "short" });

  if (event.isAllDay) {
    return dateFormatter.format(start);
  }

  if (!end) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)}`;
  }

  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }

  return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} → ${dateFormatter.format(end)} · ${timeFormatter.format(end)}`;
};

const mapGoogleEventsToCards = (events) =>
  events.map((event) => ({
    id: `google-${event.id}`,
    title: event.summary ?? "Sin título",
    time: formatGoogleEventTime(event),
    description: event.description ?? "",
  }));

function Dashboard() {
  const { events, addEvent, setExternalEvents } = useEvents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [googleUser, setGoogleUser] = useState(() => {
    try {
      const stored = localStorage.getItem("agenda-google-user");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("No se pudo leer el usuario de Google almacenado", error);
      return null;
    }
  });
  const [googleState, setGoogleState] = useState({
    connected: Boolean(googleUser),
    connecting: false,
    syncing: false,
    error: null,
  });

  // Calculamos la fecha actual solo una vez durante el render del componente.
  const formattedDate = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const handleAddEventClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveEvent = (eventData) => {
    addEvent(eventData);
  };

  const fetchGoogleEvents = useCallback(async () => {
    if (!googleUser?.id) {
      return;
    }

    setGoogleState((prev) => ({ ...prev, syncing: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/google/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: googleUser.id }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          errorBody.error || "No se pudieron obtener los eventos de Google."
        );
      }

      const data = await response.json();
      if (data.requires_auth) {
        localStorage.removeItem("agenda-google-user");
        setGoogleUser(null);
        setExternalEvents([]);
        throw new Error("La sesión de Google expiró. Vuelve a conectar tu cuenta.");
      }

      const cards = mapGoogleEventsToCards(data.events ?? []);
      setExternalEvents(cards);
      setGoogleState((prev) => ({ ...prev, connected: true }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGoogleState((prev) => ({ ...prev, error: errorMessage, connected: false }));
    } finally {
      setGoogleState((prev) => ({ ...prev, syncing: false, connecting: false }));
    }
  }, [googleUser?.id, setExternalEvents]);

  useEffect(() => {
    if (googleUser?.id) {
      fetchGoogleEvents();
    }
  }, [fetchGoogleEvents, googleUser?.id]);

  const handleGoogleButtonClick = useCallback(async () => {
    if (googleState.connected) {
      fetchGoogleEvents();
      return;
    }

    setGoogleState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const statePayload = JSON.stringify({
        redirect: `${window.location.origin}/google/callback`,
        userId: googleUser?.id ?? null,
        next: window.location.pathname,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/google/auth?state=${encodeURIComponent(statePayload)}`,
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "No se pudo iniciar la conexión con Google.");
      }

      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGoogleState((prev) => ({ ...prev, error: errorMessage, connecting: false }));
    }
  }, [fetchGoogleEvents, googleState.connected, googleUser?.id]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Agenda Inteligente</h1>
          <span className="text-sm text-slate-500 capitalize">{formattedDate}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        <section className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Hola, Usuario 👋</h2>
          <p className="text-slate-600 text-base">
            Aquí tienes un resumen de tu agenda para hoy. Mantente al día con tus
            compromisos y tareas pendientes.
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Próximos eventos
              </h3>
              <span className="text-sm text-slate-500">{events.length} eventos</span>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGoogleButtonClick}
                disabled={googleState.connecting || googleState.syncing}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {googleState.connected
                  ? googleState.syncing
                    ? "Sincronizando eventos..."
                    : "Actualizar eventos de Google"
                  : googleState.connecting
                    ? "Redirigiendo a Google..."
                    : "Conectar con Google Calendar"}
              </button>
              {googleState.connected && !googleState.syncing ? (
                <span className="flex items-center gap-2 text-sm text-green-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.59a.75.75 0 1 0-1.22-.92l-3.483 4.62-1.79-1.79a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.14-.094l3.913-5.376Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Sincronizado con Google Calendar
                </span>
              ) : null}
            </div>
            {googleState.error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {googleState.error}
              </div>
            ) : null}
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
                  No hay eventos programados aún. ¡Conecta tu Google Calendar o agrega
                  uno nuevo!
                </p>
              ) : (
                events.map((event) => <EventCard key={event.id} {...event} />)
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Tareas pendientes
              </h3>
              <span className="text-sm text-slate-500">{tasks.length} tareas</span>
            </div>
            <div className="space-y-4">
              {tasks.map((task) => (
                <TaskCard key={task.id} {...task} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <AddEventButton onClick={handleAddEventClick} />

      <AddEventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
      />
    </div>
  );
}

export default Dashboard;
