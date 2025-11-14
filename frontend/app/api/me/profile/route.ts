import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import {
  ThemePreference,
  getUserById,
  updateUserProfile,
} from "@/lib/db";

const THEME_OPTIONS: ThemePreference[] = ["light", "dark", "auto"];

export async function PATCH(request: NextRequest) {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const name =
    typeof body?.name === "string" ? body.name.trim() : "";
  const themePreferenceRaw =
    typeof body?.themePreference === "string" ? body.themePreference : "";

  if (!name) {
    return NextResponse.json(
      { error: "El nombre es obligatorio" },
      { status: 400 }
    );
  }

  const themePreference = (THEME_OPTIONS.includes(themePreferenceRaw as ThemePreference)
    ? (themePreferenceRaw as ThemePreference)
    : undefined) ?? "auto";

  try {
    await updateUserProfile(user.id, name, themePreference);
    const updatedUser = await getUserById(user.id);

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser?.id ?? user.id,
        name: updatedUser?.nombre ?? name,
        email: updatedUser?.correo ?? user.correo,
        timezone: updatedUser?.zona_horaria ?? null,
        themePreference: updatedUser?.tema_preferencia ?? themePreference,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/me/profile]", error);
    return NextResponse.json(
      { error: "No fue posible actualizar el perfil" },
      { status: 500 }
    );
  }
}
