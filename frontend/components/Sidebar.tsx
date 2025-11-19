"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Barra lateral del panel con la navegación principal e iconografía definida por el equipo de diseño.
const navigation = [
  { name: "Inicio", href: "/inicio", icon: "🏠" },
  { name: "Equipos", href: "/equipos", icon: "👥" },
  { name: "Eventos", href: "/eventos", icon: "📅" },
  { name: "Configuración", href: "/configuracion", icon: "⚙️" },
];

interface SidebarProps {
  isOpen: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      id="panel-sidebar"
      className={`fixed top-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white p-6 text-gray-700 shadow-xl transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 md:translate-x-0 md:shadow-none ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">
          Agenda Inteligente
        </span>
        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Panel</h2>
      </div>
      <nav className="flex flex-1 flex-col gap-1 text-sm" aria-label="Navegación principal">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                isActive
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
