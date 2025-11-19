import type { ReactNode } from "react";
import PanelLayoutClient from "./PanelLayoutClient";
import { getUserFromSession } from "@/lib/auth";

/**
 * Layout principal del panel.
 * Contiene el sidebar persistente y el área principal donde se renderizan las páginas.
 * No incluye etiquetas <html> ni <body> porque esas ya están definidas en app/layout.tsx.
 * El header se ha deshabilitado temporalmente.
 */
export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUserFromSession();

  return (
    <PanelLayoutClient initialThemePreference={user?.tema_preferencia ?? "auto"}>
      {children}
    </PanelLayoutClient>
  );
}
