import type { EventRecord } from "@/lib/events";
import type { TaskRecord } from "@/lib/tasks";
import type { PublicUser } from "@/lib/db";

export interface DashboardInvitation {
  id: number;
  equipo_nombre: string;
  invitado_por_nombre: string | null;
  invitado_en: string;
}

export interface DashboardDataResponse {
  date: string;
  user: PublicUser;
  tareas: TaskRecord[];
  eventos: EventRecord[];
  invitaciones: DashboardInvitation[];
}

export type DashboardTask = TaskRecord;
export type DashboardEvent = EventRecord;
export type DashboardInvitationItem = DashboardInvitation;
