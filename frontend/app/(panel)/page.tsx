// Importamos los componentes reutilizables del dashboard desde la carpeta global de componentes.
import Calendar from "../../components/Calendar";
import EventCard from "../../components/EventCard";

const upcomingEvents = [
  {
    time: "09:00",
    title: "Llamada con cliente",
    icon: "📞",
    description: "Revisión de requisitos y próximos pasos",
    tag: "Ventas",
  },
  {
    time: "11:00",
    title: "Revisión de proyecto",
    icon: "🗂️",
    location: "Sala 3B",
    description: "Evaluación del sprint y métricas clave",
  },
  {
    time: "14:00",
    title: "Reunión con equipo",
    icon: "🤝",
    description: "Definición de prioridades para la semana",
    tag: "Equipo",
  },
];

const summaryCards = [
  {
    title: "Eventos hoy",
    value: "8",
    description: "+2 respecto a ayer",
    accent: "bg-indigo-100 text-indigo-600",
    icon: "📅",
  },
  {
    title: "Próximo evento",
    value: "Llamada con cliente",
    description: "En 1 hora",
    accent: "bg-emerald-100 text-emerald-600",
    icon: "⏰",
  },
  {
    title: "Tiempo libre",
    value: "3h 20m",
    description: "Perfecto para focus",
    accent: "bg-amber-100 text-amber-600",
    icon: "🧘",
  },
  {
    title: "Cuentas conectadas",
    value: "4",
    description: "Google, Slack, Zoom, Notion",
    accent: "bg-sky-100 text-sky-600",
    icon: "🔗",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Encabezado de bienvenida que contextualiza al usuario. */}
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-500">Bienvenido,</p>
        <h2 className="text-3xl font-semibold text-gray-900">Bienvenido, Daniela 👋</h2>
        <p className="text-sm text-gray-500">
          Gestiona tu agenda diaria, coordina con tu equipo y mantén el control de tus compromisos.
        </p>
      </section>

      {/* Resumen en tarjetas con los principales indicadores del día. */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${card.accent}`}>
              {card.icon}
            </div>
            <p className="text-sm font-medium text-gray-500">{card.title}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{card.value}</p>
            <p className="mt-2 text-sm text-gray-400">{card.description}</p>
          </div>
        ))}
      </section>

      {/* Bloque principal con la lista de eventos próximos y el calendario interactivo. */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Próximos eventos</h3>
              <p className="text-sm text-gray-500">Mantente al día con lo que viene a continuación</p>
            </div>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Ver agenda completa</button>
          </header>
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <EventCard key={event.title} {...event} />
            ))}
          </div>
        </div>
        <div>
          <Calendar />
        </div>
      </section>
    </div>
  );
}
