import { useState } from "react";
import {
  GoogleOAuthProvider,
  useGoogleLogin,
} from "@react-oauth/google";

const clientId =
  "1099030842105-m1bi5dq2l91f0i6ic4to7kmt6kdq3bpa.apps.googleusercontent.com";

const fetchGoogleEvents = async (accessToken, setState) => {
  const { setLoading, setError, setEvents } = setState;
  setLoading(true);
  setError(null);

  try {
    const response = await fetch("http://localhost:5000/api/google/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "No se pudieron cargar los eventos.");
    }

    const data = await response.json();
    setEvents(data.events || []);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

const GoogleCalendarContent = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    onSuccess: async (tokenResponse) => {
      await fetchGoogleEvents(tokenResponse.access_token, {
        setEvents,
        setLoading,
        setError,
      });
    },
    onError: () => {
      setError("No se pudo completar el inicio de sesión con Google.");
    },
    flow: "implicit",
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-xl bg-white/80 p-8 shadow-lg">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Conecta tu Google Calendar
        </h1>
        <p className="text-sm text-slate-600">
          Inicia sesión con tu cuenta de Google para sincronizar tus próximos
          eventos.
        </p>
      </div>

      <button
        type="button"
        onClick={() => login()}
        className="mx-auto flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
        disabled={loading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          className="h-5 w-5"
        >
          <path
            fill="#4285F4"
            d="M45.09 24.5c0-1.59-.14-3.13-.41-4.62H24v8.74h11.86c-.51 2.74-2.09 5.06-4.43 6.61v5.48h7.16c4.19-3.86 6.5-9.55 6.5-16.21z"
          />
          <path
            fill="#34A853"
            d="M24 46c5.85 0 10.77-1.94 14.36-5.29l-7.16-5.48c-2 1.32-4.56 2.1-7.2 2.1-5.53 0-10.22-3.73-11.89-8.76H4.66v5.6C8.23 40.78 15.51 46 24 46z"
          />
          <path
            fill="#FBBC05"
            d="M12.11 28.57c-.45-1.32-.71-2.72-.71-4.17 0-1.45.26-2.85.71-4.17v-5.6H4.66A21.99 21.99 0 0 0 2 24.4c0 3.54.85 6.89 2.66 9.77l7.45-5.6z"
          />
          <path
            fill="#EA4335"
            d="M24 10.66c3.18 0 6.03 1.09 8.28 3.22l6.19-6.19C34.73 3.08 29.82 1 24 1 15.51 1 8.23 6.22 4.66 13.43l7.45 5.6C13.78 14.39 18.47 10.66 24 10.66z"
          />
          <path fill="none" d="M2 2h44v44H2z" />
        </svg>
        {loading ? "Conectando..." : "Conectar con Google Calendar"}
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Próximos eventos</h2>
        {loading && (
          <p className="text-sm text-slate-500">Cargando eventos...</p>
        )}
        {!loading && events.length === 0 && (
          <p className="text-sm text-slate-500">
            Aún no has sincronizado tus eventos de Google Calendar.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-base font-medium text-slate-900">
                {event.summary}
              </p>
              <p className="text-sm text-slate-600">
                {event.start ? new Date(event.start).toLocaleString() : "Sin fecha"}
              </p>
              {event.location && (
                <p className="text-xs text-slate-500">{event.location}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const GoogleCalendarPage = () => {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="min-h-screen bg-slate-100 py-12">
        <GoogleCalendarContent />
      </div>
    </GoogleOAuthProvider>
  );
};

export default GoogleCalendarPage;
