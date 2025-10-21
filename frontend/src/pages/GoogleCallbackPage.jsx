import { useEffect, useState } from "react";

const DEFAULT_REDIRECT = "/";

function GoogleCallbackPage() {
  const [message, setMessage] = useState("Procesando la conexión con Google...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const userId = params.get("user_id");
    const email = params.get("email");
    const name = params.get("name");
    const next = params.get("next") || DEFAULT_REDIRECT;

    if (status !== "success" || !userId) {
      const errorMessage =
        params.get("message") || "No se pudo completar la conexión con Google.";
      setMessage(errorMessage);
      return;
    }

    const userData = {
      id: Number(userId),
      correo: email ?? "",
      nombre: name ?? "",
    };

    localStorage.setItem("agenda-google-user", JSON.stringify(userData));
    setMessage("Google Calendar conectado. Redirigiendo...");

    const timer = setTimeout(() => {
      window.location.replace(next);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow">
        <p className="text-base text-slate-700">{message}</p>
      </div>
    </div>
  );
}

export default GoogleCallbackPage;
