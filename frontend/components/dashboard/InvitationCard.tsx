import type { DashboardInvitationItem } from "@/types/dashboard";

interface InvitationCardProps {
  invitation: DashboardInvitationItem;
}

export default function InvitationCard({ invitation }: InvitationCardProps) {
  const invitedAt = new Date(invitation.invitado_en);
  const formatter = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Invitación a {invitation.equipo_nombre}</h3>
      <p className="mt-1 text-xs text-slate-500">
        {invitation.invitado_por_nombre
          ? `Invitado por ${invitation.invitado_por_nombre}`
          : "Invitación automática"}
      </p>
      <p className="mt-2 text-xs text-slate-400">Enviada el {formatter.format(invitedAt)}</p>
    </div>
  );
}
