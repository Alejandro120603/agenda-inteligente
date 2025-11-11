"use client";

import { useEffect, useState, type FormEvent } from "react";

interface EquipoItem {
  id: number;
  nombre: string;
  creado_en: string;
  creador_nombre: string | null;
  miembros: number;
}

interface InvitacionItem {
  id: number;
  equipo_nombre: string;
  invitado_por_nombre: string | null;
  invitado_en: string;
}

interface UsuarioOption {
  id: number;
  nombre: string;
  correo: string;
}

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<EquipoItem[]>([]);
  const [invitaciones, setInvitaciones] = useState<InvitacionItem[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [invitadosSeleccionados, setInvitadosSeleccionados] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [procesandoInvitacion, setProcesandoInvitacion] = useState<number | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    try {
      await Promise.all([obtenerEquipos(), obtenerInvitaciones(), obtenerUsuarios()]);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos iniciales",
      });
    } finally {
      setCargando(false);
    }
  }

  async function obtenerEquipos() {
    const respuesta = await fetch("/api/equipos", { cache: "no-store" });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(datos.error ?? "No se pudieron cargar los equipos");
    }
    setEquipos(datos.equipos ?? []);
  }

  async function obtenerInvitaciones() {
    const respuesta = await fetch("/api/invitaciones", { cache: "no-store" });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(datos.error ?? "No se pudieron cargar las invitaciones");
    }
    setInvitaciones(datos.invitaciones ?? []);
  }

  async function obtenerUsuarios() {
    const respuesta = await fetch("/api/usuarios", { cache: "no-store" });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(datos.error ?? "No se pudieron cargar los usuarios");
    }
    setUsuarios(datos.usuarios ?? []);
  }

  function resetFormulario() {
    setNombreEquipo("");
    setInvitadosSeleccionados([]);
  }

  async function manejarCreacionEquipo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!nombreEquipo.trim()) {
      setFeedback({ type: "error", message: "Debes indicar un nombre para el equipo" });
      return;
    }

    setCreando(true);
    setFeedback(null);
    try {
      const respuesta = await fetch("/api/equipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreEquipo.trim(), invitados: invitadosSeleccionados }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No se pudo crear el equipo");
      }

      setFeedback({ type: "success", message: datos.message ?? "Equipo creado" });
      resetFormulario();
      await Promise.all([obtenerEquipos(), obtenerInvitaciones()]);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo crear el equipo",
      });
    } finally {
      setCreando(false);
    }
  }

  async function manejarRespuestaInvitacion(id: number, accion: "aceptar" | "rechazar") {
    setProcesandoInvitacion(id);
    setFeedback(null);
    try {
      const respuesta = await fetch(`/api/invitaciones/${id}/${accion}`, {
        method: "POST",
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No se pudo actualizar la invitación");
      }

      setFeedback({
        type: "success",
        message:
          datos.message ??
          (accion === "aceptar"
            ? "Invitación aceptada"
            : "Invitación rechazada"),
      });
      await Promise.all([obtenerEquipos(), obtenerInvitaciones()]);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la invitación",
      });
    } finally {
      setProcesandoInvitacion(null);
    }
  }

  function formatearFecha(valor: string) {
    try {
      return new Date(valor).toLocaleString();
    } catch {
      return valor;
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-gray-900">Equipos</h1>
        <p className="text-sm text-gray-600">
          Organiza tu trabajo colaborativo: revisa tus equipos activos, responde
          invitaciones pendientes y crea nuevos grupos para tus proyectos.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-md border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Mis equipos</h2>
          {cargando && <span className="text-xs text-gray-500">Actualizando…</span>}
        </div>
        {!equipos.length && !cargando ? (
          <p className="mt-6 text-sm text-gray-500">
            Todavía no formas parte de ningún equipo. ¡Crea uno nuevo o acepta
            una invitación!
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Creado por</th>
                  <th className="px-4 py-3">Fecha de creación</th>
                  <th className="px-4 py-3 text-center">Miembros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipos.map((equipo) => (
                  <tr key={equipo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {equipo.nombre}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {equipo.creador_nombre ?? "Desconocido"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatearFecha(equipo.creado_en)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {equipo.miembros}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Invitaciones pendientes</h2>
          {cargando && <span className="text-xs text-gray-500">Actualizando…</span>}
        </div>
        {!invitaciones.length && !cargando ? (
          <p className="mt-6 text-sm text-gray-500">
            No tienes invitaciones por el momento.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {invitaciones.map((invitacion) => (
              <li
                key={invitacion.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {invitacion.equipo_nombre}
                  </p>
                  <p className="text-xs text-gray-600">
                    Invitado por {invitacion.invitado_por_nombre ?? "alguien"} el {" "}
                    {formatearFecha(invitacion.invitado_en)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => manejarRespuestaInvitacion(invitacion.id, "aceptar")}
                    disabled={procesandoInvitacion === invitacion.id}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => manejarRespuestaInvitacion(invitacion.id, "rechazar")}
                    disabled={procesandoInvitacion === invitacion.id}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Crear equipo</h2>
        <form onSubmit={manejarCreacionEquipo} className="mt-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
              Nombre del equipo
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={nombreEquipo}
              onChange={(event) => setNombreEquipo(event.target.value)}
              placeholder="Ej. Equipo de producto"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="invitados" className="block text-sm font-medium text-gray-700">
              Invitar usuarios
            </label>
            <p className="text-xs text-gray-500">
              Selecciona uno o varios compañeros para enviarles una invitación.
            </p>
            <select
              id="invitados"
              multiple
              value={invitadosSeleccionados.map(String)}
              onChange={(event) => {
                const opciones = Array.from(event.target.selectedOptions).map((opcion) =>
                  Number(opcion.value)
                );
                setInvitadosSeleccionados(opciones);
              }}
              className="h-40 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {usuarios.length === 0 ? (
                <option disabled value="">
                  {cargando ? "Cargando usuarios…" : "No hay otros usuarios disponibles"}
                </option>
              ) : (
                usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre} · {usuario.correo}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetFormulario}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={creando}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {creando ? "Creando…" : "Crear equipo"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
