"use client";

import "./login.css"; // 👈 importamos nuestro CSS del login
import { useState } from "react";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Intento de login:", { correo, password });
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

        <button type="submit" className="login-btn">
          Entrar
        </button>

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
