"use client";
import { useEffect, useState } from "react";

function MiniCalendar() {
  const now = new Date();
  const month = now.toLocaleString("es-ES", { month: "long" });
  const year = now.getFullYear();

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold mb-2 capitalize">
        {month} {year}
      </h2>
      <div className="text-gray-500 text-sm">
        (Calendario próximamente 📅)
      </div>
    </div>
  );
}

export default function InicioPage() {
  const [fecha, setFecha] = useState("");
  const [tareas, setTareas] = useState(0);
  const [eventos, setEventos] = useState(0);
  const [nombre, setNombre] = useState<string>("invitado");

  useEffect(() => {
    // 📅 Fecha actual
    const hoy = new Date();
    const opciones = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    } as const;
    setFecha(hoy.toLocaleDateString("es-ES", opciones));

    setTareas(3);
    setEventos(2);

    // 🧠 Obtener nombre real desde /api/user
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            setNombre("invitado");
            return;
          }

          console.warn("No se pudo obtener el usuario:", res.status);
          setNombre("invitado");
          return;
        }

        const data: { id?: number; name?: string | null; email?: string | null } =
          await res.json();
        setNombre(data?.name ? String(data.name) : "invitado");
      } catch (err) {
        console.error("Error al obtener el usuario:", err);
        setNombre("invitado");
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* Sección izquierda */}
      <div className="flex-1">
        <h1 className="text-3xl font-semibold mb-1">Hola, {nombre} 👋</h1>
        <p className="text-gray-600 mb-6">
          Hoy es {fecha}. Tienes{" "}
          <span className="font-medium">{tareas}</span> tareas y{" "}
          <span className="font-medium">{eventos}</span> eventos para hoy.
        </p>

        <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl text-blue-800">
          📆 Aquí podrás ver un resumen de tu día. Muy pronto añadiremos tus
          próximas actividades.
        </div>
      </div>

      {/* Sección derecha */}
      <div className="w-full lg:w-1/3">
        <MiniCalendar />
      </div>
    </div>
  );
}
