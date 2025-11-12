import useSWR from "swr";
import type { DashboardDataResponse } from "@/types/dashboard";

async function fetcher(url: string): Promise<DashboardDataResponse> {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    const error = new Error("Error al obtener el dashboard");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return response.json() as Promise<DashboardDataResponse>;
}

export function useDashboardData() {
  const swr = useSWR<DashboardDataResponse>("/api/dashboard/today", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  return swr;
}

export type { DashboardDataResponse };
