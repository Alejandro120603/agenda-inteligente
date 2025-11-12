import type { DashboardEvent } from "@/types/dashboard";

interface EventCardProps {
  event: DashboardEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const start = new Date(event.inicio);
  const end = new Date(event.fin);
  const formatter = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="text-indigo-500">📅</span>
        <span className="line-clamp-2 leading-tight">{event.titulo}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {formatter.format(start)} - {formatter.format(end)}
      </p>
      {event.ubicacion ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <span className="text-indigo-400">📍</span>
          <span className="line-clamp-2">{event.ubicacion}</span>
        </p>
      ) : null}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span className="text-indigo-400">👥</span>
        <span>{event.tipo === "equipo" ? "Evento de equipo" : "Evento personal"}</span>
      </div>
    </div>
  );
}
