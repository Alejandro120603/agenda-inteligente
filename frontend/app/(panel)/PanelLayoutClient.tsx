"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import Sidebar from "../../components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { ThemePreference } from "@/components/ThemeProvider";

interface PanelLayoutClientProps {
  children: ReactNode;
  initialThemePreference: ThemePreference | null | undefined;
}

export default function PanelLayoutClient({
  children,
  initialThemePreference,
}: PanelLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <ThemeProvider initialPreference={initialThemePreference ?? undefined}>
      <div className="relative flex min-h-screen w-full bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebar} />

        <div className="flex min-h-screen flex-1 flex-col md:ml-64">
          <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:hidden">
            <button
              type="button"
              onClick={toggleSidebar}
              className="rounded-md p-2 text-2xl text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-gray-200 dark:hover:bg-gray-800"
              aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={sidebarOpen}
              aria-controls="panel-sidebar"
            >
              ☰
            </button>
          </header>

          <main className="flex flex-1 flex-col p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}

