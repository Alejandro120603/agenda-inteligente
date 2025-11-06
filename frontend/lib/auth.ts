// frontend/lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import { getUserById } from "./db";

/**
 * Obtiene el usuario actual basado en la cookie de sesión `user_id`.
 * Debe ejecutarse SOLO en el servidor (RSC, route handlers, server actions).
 */
export async function getUserFromSession() {
  try {
    // Lee la cookie de la request actual (solo en servidor)
    const cookie = cookies().get("user_id");

    if (!cookie?.value) {
      console.warn("[auth] No hay cookie de sesión user_id");
      return null;
    }

    const userId = Number(cookie.value);
    if (!Number.isFinite(userId)) {
      console.warn("[auth] Cookie user_id inválida:", cookie.value);
      return null;
    }

    // Busca el usuario en la base de datos
    const user = await getUserById(userId);
    return user ?? null;
  } catch (err) {
    console.error("[auth] Error obteniendo usuario de sesión:", err);
    return null;
  }
}
