'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dashboard minimalista completamente en blanco
 * ------------------------------------------------------------
 * - Verifica si hay sesión en localStorage.
 * - Si no existe, redirige al login.
 * - Fondo blanco vacío, sin widgets ni tarjetas.
 */

export default function DashboardPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const primerNombre = user?.nombre?.split(' ')[0] || 'Usuario';
      setNombre(primerNombre);
    } catch {
      router.push('/login');
    }
  }, [router]);

  return (
    <main className="flex items-center justify-center h-screen bg-white">
      <h1 className="text-5xl font-bold text-gray-800">
        Bienvenido, {nombre || '...'}
      </h1>
    </main>
  );
}
