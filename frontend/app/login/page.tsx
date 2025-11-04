"use client";

// Esta página se renderiza con el layout raíz minimalista, por lo que no hereda el sidebar ni el header del panel.

import "./login.css"; // 👈 importamos nuestro CSS del login
import { useState } from "react";

interface LoginResponse {
  ok: boolean;
  message?: string;
  usuario?: {
    id: number;
    nombre: string;
    correo: string;
  };
}

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ correo, contraseña: password }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.ok) {
        setError(data.message ?? "Credenciales inválidas");
        return;
      }

      setSuccessMessage(`¡Bienvenido de nuevo, ${data.usuario?.nombre ?? ""}!`);
    } catch (err) {
      console.error("Error al intentar iniciar sesión", err);
      setError("No fue posible conectar con el servidor. Inténtalo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-card">
        <h1 className="login-title">Iniciar sesión</h1>

        <div className="login-field">
          <label htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            required
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="login-btn" disabled={isLoading}>
          {isLoading ? "Ingresando..." : "Entrar"}
        </button>

        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="login-success" role="status">
            {successMessage}
          </p>
        ) : null}

        <p className="login-footer">
          ¿Olvidaste tu contraseña?{" "}
          <a href="#" className="login-link">
            Recuperar
          </a>
        </p>
      </form>
    </div>
  );
}
