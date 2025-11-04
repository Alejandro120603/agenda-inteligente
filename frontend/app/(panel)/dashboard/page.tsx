"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Definimos la estructura esperada para los datos del usuario almacenados en localStorage.
interface StoredUser {
  id: number;
  nombre: string;
  correo: string;
}

export default function DashboardPage() {
  // useRouter nos permite redirigir a otras rutas dentro del App Router.
  const router = useRouter();
  // useState para guardar el primer nombre de la persona autenticada.
  const [firstName, setFirstName] = useState<string | null>(null);
  // useState que indica si seguimos validando la existencia de una sesión.
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // useEffect asegura que solo accedamos a localStorage en el cliente después del montaje.
    const storedUser = window.localStorage.getItem("userData");

    if (!storedUser) {
      // Si no hay sesión activa, redirigimos inmediatamente al formulario de login.
      router.replace("/login");
      setIsCheckingSession(false);
      return;
    }

    try {
      // Convertimos la cadena almacenada en un objeto para obtener el nombre del usuario.
      const parsedUser = JSON.parse(storedUser) as StoredUser;
      const parsedName = parsedUser.nombre?.trim();

      if (!parsedName) {
        // Si la información es inválida, limpiamos la sesión y regresamos al login.
        window.localStorage.removeItem("userData");
        router.replace("/login");
        setIsCheckingSession(false);
        return;
      }

      // Extraemos únicamente el primer nombre para personalizar el saludo.
      const [name] = parsedName.split(/\s+/);
      setFirstName(name || parsedName);
    } catch (error) {
      // Si ocurre un error al parsear, eliminamos los datos corruptos y redirigimos.
      console.error("No fue posible leer la sesión almacenada", error);
      window.localStorage.removeItem("userData");
      router.replace("/login");
      setIsCheckingSession(false);
      return;
    } finally {
      // Terminamos el proceso de verificación independientemente del resultado.
      setIsCheckingSession(false);
    }
  }, [router]);

  if (isCheckingSession) {
    // Mientras comprobamos la sesión mostramos un contenedor vacío para evitar parpadeos.
    return <div className="min-h-[200px]" />;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado principal del dashboard con un mensaje de bienvenida personalizado. */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-gray-900">
          Bienvenido, {firstName ?? ""}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Gestiona tus eventos y tareas desde el menú lateral para mantener tu agenda bajo control.
        </p>
      </section>
    </div>
  );
}
