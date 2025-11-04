"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Inicio", href: "/", icon: "🏠" },
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Equipos", href: "/teams", icon: "👥" },
  { name: "Eventos", href: "/events", icon: "📅" },
  { name: "Tareas", href: "/tasks", icon: "✅" },
  { name: "Integraciones", href: "/integrations", icon: "🔗" },
  { name: "Configuración", href: "/settings", icon: "⚙️" },
  { name: "Soporte", href: "/support", icon: "💬" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-800 bg-gray-900 p-6 text-white shadow-xl md:flex">
      <div className="mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
          Agenda Inteligente
        </span>
        <h2 className="mt-2 text-2xl font-bold">Panel</h2>
      </div>
      <nav className="flex flex-1 flex-col gap-1 text-sm">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                isActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-gray-200">
        <p className="font-semibold text-white">Sincroniza tu agenda</p>
        <p className="mt-1 text-gray-300">
          Conecta tus cuentas para mantener tus eventos siempre actualizados.
        </p>
        <button className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400">
          Conectar ahora
        </button>
      </div>
    </aside>
  );
}
