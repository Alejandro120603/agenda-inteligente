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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200 bg-white p-6 text-gray-700 shadow-xl transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 md:flex">
      <div className="mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">
          Agenda Inteligente
        </span>
        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Panel</h2>
      </div>
      <nav className="flex flex-1 flex-col gap-1 text-sm">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
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
      <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-900 transition dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-gray-100">
        <p className="font-semibold text-indigo-700 dark:text-indigo-200">Sincroniza tu agenda</p>
        <p className="mt-1 text-indigo-600 dark:text-indigo-200/90">
          Conecta tus cuentas para mantener tus eventos siempre actualizados.
        </p>
        <button className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400">
          Conectar ahora
        </button>
      </div>
    </aside>
  );
}
