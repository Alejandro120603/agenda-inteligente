'use client';

/**
 * Página de Inicio (HomeScreen)
 * ----------------------------------------------------------
 * - Pantalla completamente blanca y minimalista.
 * - No muestra métricas ni tarjetas de ejemplo.
 * - Ideal para personalizar más adelante.
 */

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center h-screen bg-white">
      <h1 className="text-4xl font-bold text-gray-800">
        Bienvenido a tu Agenda Inteligente
      </h1>
      <p className="mt-3 text-gray-500 text-lg">
        Esta pantalla está vacía por ahora ✨
      </p>
    </main>
  );
}
