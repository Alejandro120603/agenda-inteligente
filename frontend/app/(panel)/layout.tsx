import type { ReactNode } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

// Layout principal de las secciones internas del panel con sidebar persistente y encabezado superior.
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        <Header />
        <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
