import { useMemo, useState } from "react";
import AddEventButton from "../components/AddEventButton";
import AddEventModal from "../components/AddEventModal";
import EventCard from "../components/EventCard";
import TaskCard from "../components/TaskCard";
import useEvents from "../hooks/useEvents";
import GoogleCalendarPage from "../components/GoogleCalendarPage";

const tasks = [
  { id: 1, title: "Preparar presentación del proyecto" },
  { id: 2, title: "Enviar reportes de progreso" },
];

function Dashboard() {
  const { events, addEvent } = useEvents();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            Agenda Inteligente
          </h1>
          <span className="text-sm text-slate-500 capitalize">
            {formattedDate}
          </span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        {/* BIENVENIDA */}
        <section className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Hola, Usuario 👋
          </h2>
          <p className="text-slate-600 text-base">
            Aquí tienes un resumen de tu agenda para hoy. Mantente al día con tus
            compromisos y tareas pendientes.
          </p>
        </section>

        {/* EVENTOS Y TAREAS */}
        <section className="grid gap-8 lg:grid-cols-2">
          {/* EVENTOS LOCALES */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Próximos eventos
              </h3>
              <span className="text-sm text-slate-500">
                {events.length} eventos
              </span>
            </div>
            <div className="space-y-4">
              {events.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>

            {/* 🔗 GOOGLE CALENDAR INTEGRATION */}
            <div className="mt-10 border-t border-slate-200 pt-6">
              <h4 className="text-lg font-semibold text-slate-800 mb-4">
                Eventos de Google Calendar
              </h4>
              <GoogleCalendarPage />
            </div>
          </div>

          {/* TAREAS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Tareas pendientes
              </h3>
              <span className="text-sm text-slate-500">
                {tasks.length} tareas
              </span>
            </div>
            <div className="space-y-4">
              {tasks.map((task) => (
                <TaskCard key={task.id} {...task} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* BOTONES Y MODALES */}
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
