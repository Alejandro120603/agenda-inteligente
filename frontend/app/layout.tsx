import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "../styles/globals.css";
import "../styles/theme.css";
import ServiceWorkerRegistrar from "../components/ServiceWorkerRegistrar";

// Inicializamos la fuente Inter para tener una tipografía consistente en toda la aplicación.
const inter = Inter({ subsets: ["latin"], display: "swap" });

// Definimos los metadatos globales que usará Next.js para todas las páginas.
export const metadata: Metadata = {
  title: "Agenda Inteligente",
  description: "Dashboard principal de Agenda Inteligente",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
};

// Este layout raíz solo envuelve la aplicación con las etiquetas <html> y <body>.
// Al no renderizar aquí el sidebar ni el header, evitamos que rutas especiales como /login
// hereden el diseño del panel administrativo. Las secciones del panel tendrán su propio
// layout dedicado dentro de un grupo de rutas.
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      {/* Aplicamos la fuente y colores de fondo base a todo el proyecto. */}
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100`}
      >
        {/* Renderizamos el contenido específico de cada página o layout anidado. */}
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
