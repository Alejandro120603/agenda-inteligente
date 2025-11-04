import Calendar from "../../components/Calendar";
import EventCard from "../../components/EventCard";
import LoadingSpinner from "../../components/LoadingSpinner";

const teamEvents = [
  {
    time: "08:30",
    title: "Daily Standup",
    icon: "📈",
    description: "Actualización rápida con todo el equipo de producto",
    tag: "Daily",
  },
  {
    time: "10:00",
    title: "Diseño UX",
    icon: "🎨",
    location: "Sala de innovación",
    description: "Revisión de wireframes para la nueva vista de tareas",
  },
  {
    time: "16:00",
    title: "Onboarding clientes",
    icon: "🚀",
    description: "Sesión de formación para nuevos clientes corporativos",
    tag: "Clientes",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-3xl font-semibold text-gray-900">Agenda detallada</h2>
        <p className="mt-1 text-sm text-gray-500">
          Visualiza tus reuniones, asigna tareas y gestiona recordatorios desde una misma vista.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Eventos del día</h3>
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                12 eventos programados
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {teamEvents.map((event) => (
                <EventCard key={event.title} {...event} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-8 text-center text-sm text-indigo-700">
            <p className="font-semibold">Sincroniza nuevas fuentes</p>
            <p className="mt-1 text-indigo-600">
              Conecta otras aplicaciones para importar automáticamente tus tareas y reuniones.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <Calendar />
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-gray-900">Seguimiento de cargas</p>
            <p className="mt-1 text-sm text-gray-500">
              Procesando sincronización con Google Calendar...
            </p>
            <div className="mt-6 flex justify-center">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
