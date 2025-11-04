"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const breadcrumbs: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Agenda",
  "/settings": "Configuración",
};

export default function Header() {
  const pathname = usePathname();
  const title = breadcrumbs[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div>
          <nav className="text-sm text-gray-500">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-gray-700">
                  Agenda Inteligente
                </Link>
              </li>
              <li className="text-gray-300">/</li>
              <li className="font-semibold text-gray-900">{title}</li>
            </ol>
          </nav>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white sm:inline-flex">
            Exportar agenda
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
            <span className="text-lg">＋</span>
            Nuevo evento
          </button>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            <span role="img" aria-label="Usuario" className="text-lg">
              😊
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
