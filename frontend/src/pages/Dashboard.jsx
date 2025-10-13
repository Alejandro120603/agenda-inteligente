import EventCard from "../components/EventCard";
import TaskCard from "../components/TaskCard";

const events = [
  {
    id: 1,
    title: "Reunión con equipo",
    time: "10:00 AM",
    description: "Revisión semanal de avances",
  },
  {
    id: 2,
    title: "Cita médica",
    time: "3:30 PM",
    description: "Chequeo de rutina",
  },
];

const tasks = [
  { id: 1, title: "Preparar presentación del proyecto" },
  { id: 2, title: "Enviar reportes de progreso" },
];

function Dashboard() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleAddEvent = () => {
    alert("Agregar evento");
  };

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
            <div className="space-y-4">
              {events.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
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

      <button
        type="button"
        onClick={handleAddEvent}
        className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
      >
        Agregar evento
      </button>
    </div>
  );
}

export default Dashboard;
