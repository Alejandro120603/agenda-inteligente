import type { ReactNode } from "react";
import Sidebar from "../../components/Sidebar";

/**
 * Layout principal del panel.
 * Contiene el sidebar persistente y el área principal donde se renderizan las páginas.
 * No incluye etiquetas <html> ni <body> porque esas ya están definidas en app/layout.tsx.
 * El header se ha deshabilitado temporalmente.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      {/* Sidebar lateral */}
      <Sidebar />

      {/* Contenedor principal */}
      <main className="flex flex-1 flex-col p-6 md:ml-64">
        {/* Header temporalmente deshabilitado */}
        {/* <Header /> */}
        {children}
      </main>
    </div>
  );
}
