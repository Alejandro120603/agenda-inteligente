import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserFromSession } from "@/lib/auth";
import { getUserRowById, updateUserPasswordHash } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "Todos los campos son obligatorios" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "La confirmación no coincide" },
      { status: 400 }
    );
  }

  try {
    const dbUser = await getUserRowById(user.id);

    if (!dbUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, dbUser.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 401 }
      );
    }

    if (await bcrypt.compare(newPassword, dbUser.password_hash)) {
      return NextResponse.json(
        { error: "La nueva contraseña no puede ser igual a la actual" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await updateUserPasswordHash(user.id, newHash);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/me/password]", error);
    return NextResponse.json(
      { error: "No fue posible actualizar la contraseña" },
      { status: 500 }
    );
  }
}
