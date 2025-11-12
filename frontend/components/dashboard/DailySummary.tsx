import EventCard from "./EventCard";
import InvitationCard from "./InvitationCard";
import type {
  DashboardEvent,
  DashboardInvitationItem,
  DashboardTask,
} from "@/types/dashboard";
import type { TaskStatus } from "@/lib/tasks";

interface DailySummaryProps {
  tasks: DashboardTask[];
  events: DashboardEvent[];
  invitations: DashboardInvitationItem[];
  onTaskStatusChange?: (taskId: number, status: TaskStatus) => Promise<void> | void;
}

export default function DailySummary({
  tasks,
  events,
  invitations,
  onTaskStatusChange,
}: DailySummaryProps) {
  const handleTaskToggle = (task: DashboardTask) => {
    const nextStatus: TaskStatus = task.estado === "completada" ? "pendiente" : "completada";
    onTaskStatusChange?.(task.id, nextStatus);
  };

  return (
    <aside className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">Tareas</p>
            <h3 className="text-lg font-semibold text-slate-900">Hoy tienes {tasks.length} pendientes</h3>
          </div>
        </header>
        <ul className="mt-4 flex flex-col gap-3">
          {tasks.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No tienes tareas para hoy. Aprovecha para planear nuevas metas.
            </li>
          ) : (
            tasks.map((task) => {
              const dueDateLabel = task.fecha_limite
                ? new Date(task.fecha_limite).toLocaleString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{task.titulo}</p>
                    {task.descripcion ? (
                      <p className="mt-1 text-xs text-slate-500">{task.descripcion}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-400">
                      {dueDateLabel ? `Fecha límite: ${dueDateLabel}` : "Sin fecha definida"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTaskToggle(task)}
                    className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-white ${
                      task.estado === "completada"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {task.estado === "completada" ? "Completada" : "Marcar como completada"}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">Eventos de hoy</p>
          <h3 className="text-lg font-semibold text-slate-900">{events.length} actividades programadas</h3>
        </header>
        <div className="mt-4 flex flex-col gap-3">
          {events.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No tienes eventos para hoy. Revisa tu calendario para planear nuevas reuniones.
            </p>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">Invitaciones</p>
          <h3 className="text-lg font-semibold text-slate-900">{invitations.length} pendientes</h3>
        </header>
        <div className="mt-4 flex flex-col gap-3">
          {invitations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No tienes invitaciones pendientes. Todo tu equipo está sincronizado.
            </p>
          ) : (
            invitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
