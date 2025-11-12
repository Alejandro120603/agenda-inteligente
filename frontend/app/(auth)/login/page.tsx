"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LoginResponse {
  ok: boolean;
  message?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

const inputVariants = {
  focus: { scale: 1.01 },
  initial: { scale: 1 },
};

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.removeItem("userData");
    } catch (err) {
      console.warn("No fue posible limpiar userData del almacenamiento local", err);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!correo.trim() || !password.trim()) {
        setError("Debes ingresar tu correo electrónico y contraseña.");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ correo, password }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.ok) {
        const message =
          data.message ??
          (response.status === 401
            ? "Credenciales inválidas"
            : "No fue posible completar el inicio de sesión.");
        setError(message);
        return;
      }

      if (!data.user) {
        setError("No se pudo recuperar la información de la cuenta.");
        return;
      }

      setSuccessMessage(`¡Bienvenido de nuevo, ${data.user?.name ?? ""}!`);
      setPassword("");

      setTimeout(() => {
        router.push("/inicio");
      }, 600);
    } catch (err) {
      console.error("Error al intentar iniciar sesión", err);
      setError("No fue posible conectar con el servidor. Inténtalo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/google", {
        method: "GET",
        credentials: "include",
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "La autenticación con Google estará disponible próximamente.");
        return;
      }

      setSuccessMessage("Redirigiendo a Google...");
    } catch (err) {
      console.error("Error en el flujo de Google", err);
      setError("No fue posible iniciar la autenticación con Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="text-left">
        <h2 className="text-2xl font-semibold text-white">Inicia sesión</h2>
        <p className="mt-1 text-sm text-slate-200/80">
          Ingresa tus credenciales para acceder al panel y mantener tu agenda sincronizada.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-lg shadow-indigo-950/20 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-80"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
            <span className="text-[16px] leading-none text-indigo-600">G</span>
          </span>
          {isGoogleLoading ? "Conectando con Google..." : "Iniciar sesión con Google"}
        </motion.button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-white/20" />
          <span className="text-xs uppercase tracking-[0.3em] text-slate-200/70">o continúa con tu correo</span>
          <span className="h-px flex-1 bg-white/20" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <motion.label
          className="group flex flex-col gap-2"
          variants={inputVariants}
          whileFocus="focus"
          initial="initial"
        >
          <span className="text-sm font-medium text-slate-200">Correo electrónico</span>
          <div className="relative">
            <input
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
              className="peer w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white focus:bg-white/20"
              required
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/40 transition-all peer-focus:-top-2 peer-focus:text-[11px] peer-focus:text-white/70 peer-valid:-top-2 peer-valid:text-[11px] peer-valid:text-white/70">
              tu@correo.com
            </span>
          </div>
        </motion.label>

        <motion.label
          className="group flex flex-col gap-2"
          variants={inputVariants}
          whileFocus="focus"
          initial="initial"
        >
          <span className="text-sm font-medium text-slate-200">Contraseña</span>
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="peer w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white focus:bg-white/20"
              required
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/40 transition-all peer-focus:-top-2 peer-focus:text-[11px] peer-focus:text-white/70 peer-valid:-top-2 peer-valid:text-[11px] peer-valid:text-white/70">
              Tu contraseña
            </span>
          </div>
        </motion.label>

        <motion.button
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-80"
        >
          {isLoading ? "Ingresando..." : "Entrar"}
        </motion.button>
      </form>

      {error ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {error}
        </motion.p>
      ) : null}

      {successMessage ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          {successMessage}
        </motion.p>
      ) : null}

      <div className="flex flex-col gap-2 text-sm text-slate-200/80">
        <a href="#" className="text-indigo-200 transition hover:text-white">
          ¿Olvidaste tu contraseña?
        </a>
        <p>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/register" className="text-indigo-200 transition hover:text-white">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
