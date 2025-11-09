"use client";

import "./register.css";
import Link from "next/link";
import { FormEvent, useState } from "react";

// Pantalla de registro de personas usuarias con manejo de estados y comunicación con la API.
interface RegisterSuccessResponse {
  id: number;
  name: string;
  email: string;
}

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
        body: JSON.stringify({
          name: nombre,
          email: correo,
          password,
        }),
      });

      const data = (await response.json()) as
        | RegisterSuccessResponse
        | { error?: string };

      if (!response.ok) {
        const errorMessage =
          (data as { error?: string })?.error ??
          (response.status === 400
            ? "Faltan datos obligatorios."
            : response.status === 409
            ? "El correo electrónico ya está registrado."
            : "No fue posible registrar al usuario.");
        setError(errorMessage);
        return;
      }

      const user = data as RegisterSuccessResponse;

      setSuccessMessage("Tu cuenta fue creada exitosamente. ¡Ahora puedes iniciar sesión!");
      console.info("Usuario registrado", user);
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
          <Link href="/login" className="register-link">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
