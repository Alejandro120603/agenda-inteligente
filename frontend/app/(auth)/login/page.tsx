"use client";

// Esta página se renderiza con el layout raíz minimalista, por lo que no hereda el sidebar ni el header del panel.

import "./login.css"; // 👈 importamos nuestro CSS del login
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
  // Hook de navegación del App Router para realizar redirecciones client-side.
  const router = useRouter();

  // useState para almacenar el correo ingresado en el formulario.
  const [correo, setCorreo] = useState("");
  // useState para capturar la contraseña escrita por la persona usuaria.
  const [password, setPassword] = useState("");
  // useState que controla el estado de carga mientras se procesa la solicitud.
  const [isLoading, setIsLoading] = useState(false);
  // useState que guarda un mensaje de error en caso de que la autenticación falle.
  const [error, setError] = useState<string | null>(null);
  // useState para mostrar un mensaje de éxito previo a la redirección.
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validación temprana para evitar peticiones innecesarias al backend.
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
        // Enviamos el payload con la propiedad `password` como espera el backend.
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

      if (!data.usuario) {
        // Validamos que el backend haya retornado la información necesaria del usuario autenticado.
        setError("No se pudo recuperar la información de la cuenta.");
        return;
      }

      // Guardamos la información del usuario en localStorage para recordar la sesión.
      window.localStorage.setItem("userData", JSON.stringify(data.usuario));

      // Mostramos un mensaje de bienvenida antes de enviar a la persona usuaria al panel.
      setSuccessMessage(`¡Bienvenido de nuevo, ${data.usuario?.nombre ?? ""}!`);
      setPassword("");

      // Redirigimos al panel principal utilizando el router del App Router.
      router.push("/inicio");
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

        <div className="login-footer">
          <p>
            ¿Olvidaste tu contraseña?{" "}
            <a href="#" className="login-link">
              Recuperar
            </a>
          </p>
          <p>
            ¿Aún no tienes cuenta?{" "}
            <Link href="/register" className="login-link">
              Crear cuenta
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
