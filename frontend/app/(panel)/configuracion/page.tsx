"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "@/lib/swr";
import { ThemePreference, useTheme } from "@/components/ThemeProvider";

interface MeResponse {
  id: number;
  name: string;
  email: string;
  timezone: string | null;
  themePreference: ThemePreference;
}

interface UpdateProfileResponse {
  ok: boolean;
  user: MeResponse;
  error?: string;
}

interface BasicResponse {
  ok?: boolean;
  error?: string;
}

const fetcher = async (url: string): Promise<MeResponse> => {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    throw new Error("No se pudo cargar la información del perfil");
  }

  return (await response.json()) as MeResponse;
};

const themeOptions: { value: ThemePreference; label: string; description: string }[] = [
  {
    value: "auto",
    label: "Automático",
    description:
      "Detecta el mejor tema según la hora del día y cambia entre claro y oscuro automáticamente.",
  },
  {
    value: "light",
    label: "Claro",
    description: "Usa siempre el modo claro, ideal para ambientes bien iluminados.",
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Mantiene un contraste bajo para trabajar mejor de noche.",
  },
];

export default function ConfiguracionPage() {
  const router = useRouter();
  const { preference, resolvedTheme, setPreference } = useTheme();

  const { data, error, isLoading, mutate } = useSWR<MeResponse>(
    "/api/me",
    fetcher,
    { revalidateOnFocus: false }
  );

  const [name, setName] = useState("");
  const [themePreference, setThemePreference] = useState<ThemePreference>("auto");
  const [profileMessage, setProfileMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }

    setName(data.name);
    setThemePreference(data.themePreference);

    if (data.themePreference && data.themePreference !== preference) {
      setPreference(data.themePreference);
    }
  }, [data, preference, setPreference]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, themePreference }),
      });

      const payload = (await response.json().catch(() => ({}))) as UpdateProfileResponse;

      if (!response.ok || !payload?.ok || !payload.user) {
        const message = payload?.error ?? "No fue posible guardar los cambios.";
        setProfileMessage({ type: "error", text: message });
        return;
      }

      mutate(payload.user, false).catch(() => undefined);
      setPreference(payload.user.themePreference);
      setProfileMessage({ type: "success", text: "Perfil actualizado correctamente." });
    } catch (err) {
      console.error("[Configuración] Error al actualizar perfil", err);
      setProfileMessage({
        type: "error",
        text: "Ocurrió un error inesperado. Intenta de nuevo en unos minutos.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "La confirmación de la nueva contraseña no coincide.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }

    setIsSavingPassword(true);

    try {
      const response = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const payload = (await response.json().catch(() => ({}))) as BasicResponse;

      if (!response.ok || !payload?.ok) {
        const message = payload?.error ?? "No fue posible cambiar la contraseña.";
        setPasswordMessage({ type: "error", text: message });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: "Contraseña actualizada correctamente." });
    } catch (err) {
      console.error("[Configuración] Error al cambiar contraseña", err);
      setPasswordMessage({
        type: "error",
        text: "Ocurrió un error inesperado. Intenta nuevamente más tarde.",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLogoutMessage(null);
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setPreference("auto");
      mutate(undefined, false).catch(() => undefined);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("[Configuración] Error al cerrar sesión", err);
      setLogoutMessage("No fue posible cerrar sesión. Intenta nuevamente.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isProfileDisabled = isLoading || !data;

  const resolvedThemeDescription = useMemo(() => {
    if (themePreference !== "auto") {
      return "";
    }

    return resolvedTheme === "dark"
      ? "Actualmente se usa el modo oscuro por el horario."
      : "Actualmente se usa el modo claro por el horario.";
  }, [resolvedTheme, themePreference]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Ajustes de la cuenta</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Gestiona tu información personal, credenciales y preferencias visuales.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          No fue posible cargar los datos del perfil. Recarga la página.
        </div>
      ) : null}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Perfil</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Actualiza tu nombre visible y el tema que prefieres para el panel.
          </p>
        </div>
        <form className="flex flex-col gap-6" onSubmit={handleProfileSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="name">
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
              disabled={isProfileDisabled}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={data?.email ?? ""}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-sm text-gray-500 shadow-inner dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Tema del panel
            </legend>
            <div className="grid gap-3 md:grid-cols-3">
              {themeOptions.map((option) => {
                const isChecked = themePreference === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 text-sm transition ${
                      isChecked
                        ? "border-indigo-400 bg-indigo-50/70 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-200"
                        : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="themePreference"
                      value={option.value}
                      checked={isChecked}
                      onChange={() => setThemePreference(option.value)}
                      className="sr-only"
                      disabled={isProfileDisabled}
                    />
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
            {resolvedThemeDescription ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">{resolvedThemeDescription}</p>
            ) : null}
          </fieldset>

          {profileMessage ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                profileMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-red-200 bg-red-50/80 text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200"
              }`}
            >
              {profileMessage.text}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={isProfileDisabled || isSavingProfile}
            >
              {isSavingProfile ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Cambiar contraseña</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Asegúrate de usar una contraseña robusta y diferente a la anterior.
          </p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handlePasswordSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="currentPassword">
                Contraseña actual
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="newPassword">
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                required
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="confirmPassword">
                Confirmar nueva contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                required
              />
            </div>
          </div>

          {passwordMessage ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                passwordMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-red-200 bg-red-50/80 text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200"
              }`}
            >
              {passwordMessage.text}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={isSavingPassword}
            >
              {isSavingPassword ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sesión</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Puedes cerrar la sesión actual en este dispositivo cuando lo necesites.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {logoutMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
              {logoutMessage}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-fit items-center justify-center rounded-xl border border-red-300 bg-red-50 px-5 py-2 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-200 dark:hover:border-red-400 dark:hover:bg-red-500/20"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </section>
    </div>
  );
}
