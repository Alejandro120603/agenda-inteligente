import { useCallback, useState } from "react";

// Hook personalizado para manejar la lista de eventos en memoria.
// Se inicializa con algunos eventos de ejemplo y expone utilidades para añadir nuevos.
export default function useEvents() {
  const [events, setEvents] = useState(() => [
    {
      id: 1,
      title: "Reunión con equipo",
      time: "10:00 AM",
      description: "Revisión semanal de avances",
    },
    {
      id: 2,
      title: "Cita médica",
      time: "3:30 PM",
      description: "Chequeo de rutina",
    },
  ]);

  // Función para añadir un evento generando un identificador simple basado en la fecha actual.
  const addEvent = useCallback((eventData) => {
    setEvents((current) => [
      ...current,
      {
        id: Date.now(),
        ...eventData,
      },
    ]);
  }, []);

  return { events, addEvent };
}
