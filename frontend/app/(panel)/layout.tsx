import type { ReactNode } from "react";
import Sidebar from "../../components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
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
    <ThemeProvider initialPreference={user?.tema_preferencia ?? "auto"}>
      <div className="flex min-h-screen w-full bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
        {/* Sidebar lateral */}
        <Sidebar />

        {/* Contenedor principal */}
        <main className="flex flex-1 flex-col p-6 md:ml-64">
          {/* Header temporalmente deshabilitado */}
          {/* <Header /> */}
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
