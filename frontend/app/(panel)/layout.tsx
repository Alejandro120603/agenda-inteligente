import type { ReactNode } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

// Layout específico del panel administrativo.
// Al ubicarse dentro del grupo de rutas (panel), solo se aplica a las páginas del dashboard,
// manteniendo aisladas rutas como /login que no deben mostrar la navegación lateral.
export default function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      {/* Barra lateral fija del panel. */}
      <Sidebar />

      {/* Contenedor principal donde se muestran el header y el contenido dinámico. */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        {/* Encabezado superior del panel con acciones y avatar. */}
        <Header />

        {/* Área central que renderiza la página hija correspondiente (dashboard, settings, etc.). */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
