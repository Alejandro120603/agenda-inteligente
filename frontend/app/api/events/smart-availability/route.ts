import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  AvailabilityScore,
  BusyInterval,
  computeAvailabilityMatrix,
  formatLocalDateTime,
  generateTimeSlots,
  getEventsForUserInRange,
  getTeamMembers,
} from "@/lib/smartAvailability";

interface NormalizedDateTime {
  iso: string;
  date: Date;
}

function normalizeDateTimeParam(value: string | null): NormalizedDateTime | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const parsed = new Date(candidate);
  const timestamp = parsed.getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return { iso: formatLocalDateTime(parsed), date: parsed };
}

function normalizeDurationMinutes(raw: string | null): number | null {
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  const minutes = Math.floor(parsed);
  return minutes > 0 ? minutes : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const teamIdRaw = searchParams.get("teamId");
    const teamId = Number(teamIdRaw);

    if (!Number.isInteger(teamId) || teamId <= 0) {
      return NextResponse.json(
        { error: "Debes proporcionar un equipo válido" },
        { status: 400 }
      );
    }

    const startInfo = normalizeDateTimeParam(searchParams.get("start"));
    const endInfo = normalizeDateTimeParam(searchParams.get("end"));
    const durationMinutes = normalizeDurationMinutes(searchParams.get("duration"));

    if (!startInfo || !endInfo) {
      return NextResponse.json(
        { error: "Debes indicar un rango de horario válido" },
        { status: 400 }
      );
    }

    if (!durationMinutes) {
      return NextResponse.json(
        { error: "La duración debe ser un número en minutos" },
        { status: 400 }
      );
    }

    if (endInfo.date.getTime() <= startInfo.date.getTime()) {
      return NextResponse.json(
        { error: "La hora final debe ser mayor a la inicial" },
        { status: 400 }
      );
    }

    if (durationMinutes > 24 * 60) {
      return NextResponse.json(
        { error: "La duración máxima soportada es de 24 horas" },
        { status: 400 }
      );
    }

    const members = await getTeamMembers(teamId);

    if (members.length === 0) {
      const teamExists = await db.get<{ id: number }>(
        "SELECT id FROM equipos WHERE id = ?",
        [teamId]
      );

      if (!teamExists) {
        return NextResponse.json(
          { error: "El equipo no existe" },
          { status: 404 }
        );
      }
    }

    if (!members.some((member) => member.id === user.id)) {
      return NextResponse.json(
        { error: "No perteneces al equipo indicado" },
        { status: 403 }
      );
    }

    const slots = generateTimeSlots(startInfo.iso, endInfo.iso, durationMinutes);

    if (slots.length === 0) {
      return NextResponse.json(
        {
          error: "El rango proporcionado no permite generar horarios con la duración solicitada",
          slots: [],
          best: null,
          score: [],
        },
        { status: 400 }
      );
    }

    const eventsByUser = new Map<number, BusyInterval[]>();

    await Promise.all(
      members.map(async (member) => {
        const intervals = await getEventsForUserInRange(
          member.id,
          startInfo.iso,
          endInfo.iso
        );
        eventsByUser.set(member.id, intervals);
      })
    );

    const availability = computeAvailabilityMatrix(
      members,
      eventsByUser,
      slots,
      durationMinutes
    );

    const perfectSlots = availability
      .filter((item) => item.available === item.total)
      .map((item) => item.slot);

    let bestSlot: string | null = null;
    let bestScore: AvailabilityScore | null = null;

    for (const item of availability) {
      if (!bestScore) {
        bestScore = item;
        continue;
      }

      if (item.available > bestScore.available) {
        bestScore = item;
        continue;
      }

      if (item.available === bestScore.available && item.slot < bestScore.slot) {
        bestScore = item;
      }
    }

    if (bestScore) {
      bestSlot = bestScore.slot;
    }

    return NextResponse.json({
      slots: perfectSlots,
      best: bestSlot,
      score: availability.map(({ slot, available, total }) => ({
        slot,
        available,
        total,
      })),
    });
  } catch (error) {
    console.error("[GET /api/events/smart-availability]", error);
    return NextResponse.json(
      { error: "No se pudo calcular la disponibilidad" },
      { status: 500 }
    );
  }
}
