import { NextResponse } from "next/server";

const mockEvents = [
  {
    id: 1,
    time: "09:00",
    title: "Llamada con cliente",
    description: "Revisión de requisitos y próximos pasos",
  },
  {
    id: 2,
    time: "11:00",
    title: "Revisión de proyecto",
    description: "Evaluación del sprint y métricas clave",
  },
  {
    id: 3,
    time: "14:00",
    title: "Reunión con equipo",
    description: "Definición de prioridades para la semana",
  },
];

export async function GET() {
  return NextResponse.json({ events: mockEvents });
}
