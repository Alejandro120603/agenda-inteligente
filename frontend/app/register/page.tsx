"use client";

import "./register.css";
import { useState } from "react";

interface RegisterResponse {
  ok: boolean;
  message?: string;
  usuario?: {
    id: number;
    nombre: string;
    correo: string;
  };
}

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
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
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, correo, contraseña: password }),
      });

      const data = (await response.json()) as RegisterResponse;

      if (!response.ok || !data.ok) {
        setError(data.message ?? "No fue posible registrar al usuario");
        return;
      }

      setSuccessMessage("Tu cuenta fue creada exitosamente. ¡Ahora puedes iniciar sesión!");
      setNombre("");
      setCorreo("");
      setPassword("");
    } catch (err) {
      console.error("Error al registrar usuario", err);
      setError("No fue posible conectar con el servidor. Inténtalo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-card">
        <h1 className="register-title">Crear cuenta</h1>

        <div className="register-field">
          <label htmlFor="nombre">Nombre completo</label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Nombre Apellido"
            required
          />
        </div>

        <div className="register-field">
          <label htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            type="email"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
            placeholder="tu@correo.com"
            required
          />
        </div>

        <div className="register-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="register-btn" disabled={isLoading}>
          {isLoading ? "Creando cuenta..." : "Registrarme"}
        </button>

        {error ? (
          <p className="register-error" role="alert">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="register-success" role="status">
            {successMessage}
          </p>
        ) : null}

        <p className="register-footer">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="register-link">
            Inicia sesión
          </a>
        </p>
      </form>
    </div>
  );
}
