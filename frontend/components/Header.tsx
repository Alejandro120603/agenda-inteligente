"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Definimos el mismo contrato de datos que el utilizado en la página del dashboard.
interface StoredUser {
  id: number;
  nombre: string;
  correo: string;
}

export default function Header() {
  // useRouter se emplea para enviar al usuario al login si su sesión expira.
  const router = useRouter();
  // useState almacena el primer nombre a mostrar dentro del encabezado del panel.
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    // Este efecto se ejecuta solo en cliente para obtener los datos persistidos en localStorage.
    const storedUser = window.localStorage.getItem("userData");

    if (!storedUser) {
      // Si no encontramos sesión, redirigimos al formulario de acceso y evitamos mostrar información residual.
      router.replace("/login");
      return;
    }

    try {
      // Parseamos el JSON almacenado para extraer el nombre de la persona usuaria.
      const parsedUser = JSON.parse(storedUser) as StoredUser;
      const parsedName = parsedUser.nombre?.trim();

      if (!parsedName) {
        // Si el nombre no existe limpiamos la sesión y regresamos al login.
        window.localStorage.removeItem("userData");
        router.replace("/login");
        return;
      }

      const [name] = parsedName.split(/\s+/);
      setFirstName(name || parsedName);
    } catch (error) {
      // En caso de datos corruptos, eliminamos la sesión y redirigimos por seguridad.
      console.error("No fue posible recuperar la sesión desde el encabezado", error);
      window.localStorage.removeItem("userData");
      router.replace("/login");
    }
  }, [router]);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="px-4 py-4 sm:px-6 lg:px-10">
        {/* Mensaje de bienvenida limpio, sin breadcrumbs ni botones secundarios. */}
        <h2 className="text-2xl font-semibold text-gray-900">
          {firstName ? `Bienvenido, ${firstName}` : "Bienvenido"}
        </h2>
      </div>
    </header>
  );
}
