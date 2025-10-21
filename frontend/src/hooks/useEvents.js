import { useCallback, useMemo, useState } from "react";

// Hook personalizado para manejar la lista de eventos en memoria.
// Se inicializa con algunos eventos de ejemplo y expone utilidades para añadir nuevos.
export default function useEvents() {
  const [localEvents, setLocalEvents] = useState(() => [
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
  const [externalEvents, setExternalEvents] = useState([]);

  // Función para añadir un evento generando un identificador simple basado en la fecha actual.
  const addEvent = useCallback((eventData) => {
    setLocalEvents((current) => [
      ...current,
      {
        id: Date.now(),
        ...eventData,
      },
    ]);
  }, []);

  const events = useMemo(
    () => [...externalEvents, ...localEvents],
    [externalEvents, localEvents],
  );

  const replaceExternalEvents = useCallback((newEvents) => {
    setExternalEvents(newEvents);
  }, []);

  return { events, addEvent, setExternalEvents: replaceExternalEvents };
}
