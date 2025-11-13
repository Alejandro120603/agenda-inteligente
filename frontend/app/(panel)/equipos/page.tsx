"use client";

import { useEffect, useState, type FormEvent } from "react";

interface EquipoItem {
  id: number;
  nombre: string;
  creado_en: string;
  creador_nombre: string | null;
  miembros: number;
  rol: "administrador" | "miembro";
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

interface MiembroEquipoDetalle {
  id: number;
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: "administrador" | "miembro";
  estado: "pendiente" | "aceptado" | "rechazado";
  invitado_en: string;
  respondido_en: string | null;
}

interface EquipoDetalle {
  id: number;
  nombre: string;
  creado_en: string;
  creado_por: number;
  creador_nombre: string | null;
  miembros: MiembroEquipoDetalle[];
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
  const [modalEdicionAbierta, setModalEdicionAbierta] = useState(false);
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState<number | null>(null);
  const [equipoEditando, setEquipoEditando] = useState<EquipoDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoNombreEquipo, setNuevoNombreEquipo] = useState("");
  const [invitadoAAgregar, setInvitadoAAgregar] = useState<string>("");
  const [accionEnProgreso, setAccionEnProgreso] = useState<string | null>(null);

  useEffect(() => {
    void cargarDatos();
  }, []);

  function estaProcesando(clave: string) {
    return accionEnProgreso === clave;
  }

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

    const equiposCrudos = Array.isArray(datos.equipos) ? datos.equipos : [];
    const equiposNormalizados: EquipoItem[] = equiposCrudos
      .map((equipo: Record<string, unknown>) => {
        const id = Number(equipo.id);
        const miembros = Number(equipo.miembros);
        if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(miembros) || miembros < 0) {
          return null;
        }

        const rol =
          equipo.rol_usuario === "administrador" ? "administrador" : "miembro";

        return {
          id,
          nombre: typeof equipo.nombre === "string" ? equipo.nombre : "Equipo sin nombre",
          creado_en: typeof equipo.creado_en === "string" ? equipo.creado_en : "",
          creador_nombre:
            typeof equipo.creador_nombre === "string"
              ? equipo.creador_nombre
              : null,
          miembros,
          rol,
        } satisfies EquipoItem;
      })
      .filter((equipo): equipo is EquipoItem => equipo !== null);

    setEquipos(equiposNormalizados);
  }

  async function obtenerInvitaciones() {
    const respuesta = await fetch("/api/invitaciones", { cache: "no-store" });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(datos.error ?? "No se pudieron cargar las invitaciones");
    }

    const invitacionesCrudas: Array<Partial<InvitacionItem>> = datos.invitaciones ?? [];
    const invitacionesNormalizadas: InvitacionItem[] = invitacionesCrudas
      .map((invitacion) => ({
        ...invitacion,
        id: Number(invitacion.id),
      }))
      .filter(
        (invitacion): invitacion is InvitacionItem =>
          Number.isInteger(invitacion.id) && invitacion.id > 0
      );

    if (invitacionesNormalizadas.length !== invitacionesCrudas.length) {
      console.warn(
        "[equipos] Invitaciones descartadas por id inválido:",
        invitacionesCrudas
      );
    }

    setInvitaciones(invitacionesNormalizadas);
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
    const invitacionId = Number(id);
    if (!Number.isInteger(invitacionId) || invitacionId <= 0) {
      setFeedback({ type: "error", message: "Invitación inválida" });
      return;
    }

    setProcesandoInvitacion(invitacionId);
    setFeedback(null);
    try {
      const respuesta = await fetch(`/api/invitaciones/${invitacionId}/${accion}`, {
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

  function cerrarModalEdicion() {
    setModalEdicionAbierta(false);
    setEquipoSeleccionadoId(null);
    setEquipoEditando(null);
    setNuevoNombreEquipo("");
    setInvitadoAAgregar("");
    setAccionEnProgreso(null);
    setCargandoDetalle(false);
  }

  async function cargarDetalleEquipo(equipoId: number) {
    setCargandoDetalle(true);
    try {
      const respuesta = await fetch(`/api/equipos/${equipoId}`, { cache: "no-store" });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(
          datos.error ?? "No se pudo obtener la información del equipo"
        );
      }

      const equipo = datos.equipo ?? {};
      const miembrosCrudos: Array<Partial<MiembroEquipoDetalle>> = Array.isArray(
        datos.miembros
      )
        ? datos.miembros
        : [];

      const miembros = miembrosCrudos
        .map((miembro) => {
          const id = Number(miembro.id);
          const usuarioId = Number((miembro as { id_usuario?: unknown }).id_usuario);
          if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(usuarioId) || usuarioId <= 0) {
            return null;
          }

          const rol = miembro.rol === "administrador" ? "administrador" : "miembro";
          const estado =
            miembro.estado === "aceptado"
              ? "aceptado"
              : miembro.estado === "pendiente"
              ? "pendiente"
              : "rechazado";

          return {
            id,
            id_usuario: usuarioId,
            nombre:
              typeof miembro.nombre === "string"
                ? miembro.nombre
                : "Usuario sin nombre",
            correo: typeof miembro.correo === "string" ? miembro.correo : "",
            rol,
            estado,
            invitado_en:
              typeof miembro.invitado_en === "string"
                ? miembro.invitado_en
                : new Date().toISOString(),
            respondido_en:
              typeof miembro.respondido_en === "string"
                ? miembro.respondido_en
                : null,
          } satisfies MiembroEquipoDetalle;
        })
        .filter((miembro): miembro is MiembroEquipoDetalle => miembro !== null);

      const detalle: EquipoDetalle = {
        id: Number(equipo.id),
        nombre: typeof equipo.nombre === "string" ? equipo.nombre : "Equipo sin nombre",
        creado_en: typeof equipo.creado_en === "string" ? equipo.creado_en : "",
        creado_por: Number(equipo.creado_por ?? 0),
        creador_nombre:
          typeof equipo.creador_nombre === "string"
            ? equipo.creador_nombre
            : null,
        miembros,
      };

      if (!Number.isInteger(detalle.id) || detalle.id <= 0) {
        throw new Error("La información del equipo es inválida");
      }

      setEquipoEditando(detalle);
      setNuevoNombreEquipo(detalle.nombre);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar la información del equipo",
      });
      cerrarModalEdicion();
    } finally {
      setCargandoDetalle(false);
    }
  }

  function abrirModalEdicion(equipoId: number) {
    setModalEdicionAbierta(true);
    setEquipoSeleccionadoId(equipoId);
    setEquipoEditando(null);
    setNuevoNombreEquipo("");
    setInvitadoAAgregar("");
    void cargarDetalleEquipo(equipoId);
  }

  async function manejarEdicionNombre(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!equipoEditando) {
      return;
    }

    const nombreActualizado = nuevoNombreEquipo.trim();
    if (!nombreActualizado) {
      setFeedback({ type: "error", message: "El nombre del equipo es obligatorio" });
      return;
    }

    if (nombreActualizado === equipoEditando.nombre) {
      setFeedback({ type: "error", message: "El nombre ingresado es igual al actual" });
      return;
    }

    setAccionEnProgreso(`renombrar-${equipoEditando.id}`);
    setFeedback(null);
    try {
      const respuesta = await fetch(`/api/equipos/${equipoEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreActualizado }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No se pudo actualizar el equipo");
      }

      setEquipoEditando((prev) =>
        prev ? { ...prev, nombre: nombreActualizado } : prev
      );
      setEquipos((prev) =>
        prev.map((equipo) =>
          equipo.id === equipoEditando.id
            ? { ...equipo, nombre: nombreActualizado }
            : equipo
        )
      );
      setFeedback({
        type: "success",
        message: datos.message ?? "Equipo actualizado correctamente",
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo actualizar el equipo",
      });
    } finally {
      setAccionEnProgreso(null);
    }
  }

  async function manejarInvitacionMiembro() {
    if (!equipoEditando) {
      return;
    }

    const usuarioId = Number(invitadoAAgregar);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      setFeedback({ type: "error", message: "Selecciona un usuario válido" });
      return;
    }

    setAccionEnProgreso(`invitar-${equipoEditando.id}`);
    setFeedback(null);
    try {
      const respuesta = await fetch(`/api/equipos/${equipoEditando.id}/miembros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No se pudo enviar la invitación");
      }

      setFeedback({
        type: "success",
        message: datos.message ?? "Invitación enviada correctamente",
      });
      setInvitadoAAgregar("");
      await cargarDetalleEquipo(equipoEditando.id);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo enviar la invitación",
      });
    } finally {
      setAccionEnProgreso(null);
    }
  }

  async function manejarEliminarMiembro(miembro: MiembroEquipoDetalle) {
    if (!equipoEditando) {
      return;
    }

    if (!window.confirm(`¿Deseas eliminar a ${miembro.nombre} del equipo?`)) {
      return;
    }

    setAccionEnProgreso(`eliminar-miembro-${miembro.id}`);
    setFeedback(null);
    try {
      const respuesta = await fetch(
        `/api/equipos/${equipoEditando.id}/miembros/${miembro.id}`,
        { method: "DELETE" }
      );
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No se pudo eliminar al miembro");
      }

      setEquipoEditando((prev) =>
        prev
          ? { ...prev, miembros: prev.miembros.filter((item) => item.id !== miembro.id) }
          : prev
      );

      if (miembro.estado === "aceptado") {
        setEquipos((prev) =>
          prev.map((equipo) =>
            equipo.id === equipoEditando.id
              ? { ...equipo, miembros: Math.max(0, equipo.miembros - 1) }
              : equipo
          )
        );
      }

      setFeedback({
        type: "success",
        message: datos.message ?? "Miembro eliminado del equipo",
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo eliminar al miembro",
      });
    } finally {
      setAccionEnProgreso(null);
    }
  }

  async function manejarEliminarEquipo(equipoId: number) {
    if (!window.confirm("Esta acción eliminará el equipo para todos sus miembros. ¿Continuar?")) {
      return;
    }

    setAccionEnProgreso(`eliminar-equipo-${equipoId}`);
    setFeedback(null);
    try {
      const respuesta = await fetch(`/api/equipos/${equipoId}`, { method: "DELETE" });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No se pudo eliminar el equipo");
      }

      setEquipos((prev) => prev.filter((equipo) => equipo.id !== equipoId));
      if (equipoSeleccionadoId === equipoId) {
        cerrarModalEdicion();
      }
      setFeedback({
        type: "success",
        message: datos.message ?? "Equipo eliminado correctamente",
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo eliminar el equipo",
      });
    } finally {
      setAccionEnProgreso(null);
    }
  }

  async function manejarAbandonarEquipo(equipoId: number) {
    if (!window.confirm("¿Seguro que deseas abandonar este equipo?")) {
      return;
    }

    setAccionEnProgreso(`abandonar-${equipoId}`);
    setFeedback(null);
    try {
      const respuesta = await fetch(`/api/equipos/${equipoId}/abandonar`, {
        method: "POST",
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No se pudo abandonar el equipo");
      }

      setEquipos((prev) => prev.filter((equipo) => equipo.id !== equipoId));
      setFeedback({
        type: "success",
        message: datos.message ?? "Has abandonado el equipo",
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo abandonar el equipo",
      });
    } finally {
      setAccionEnProgreso(null);
    }
  }

  const miembrosActualesIds = new Set(
    (equipoEditando?.miembros ?? []).map((miembro) => miembro.id_usuario)
  );
  const usuariosDisponibles = usuarios.filter(
    (usuario) => !miembrosActualesIds.has(usuario.id)
  );

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
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipos.map((equipo) => {
                  const esAdministrador = equipo.rol === "administrador";
                  return (
                    <tr key={equipo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{equipo.nombre}</span>
                          {esAdministrador && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                              Administras
                            </span>
                          )}
                        </div>
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
                      <td className="px-4 py-3">
                        {esAdministrador ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => abrirModalEdicion(equipo.id)}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => manejarEliminarEquipo(equipo.id)}
                              disabled={estaProcesando(`eliminar-equipo-${equipo.id}`)}
                              className={`rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400`}
                            >
                              {estaProcesando(`eliminar-equipo-${equipo.id}`)
                                ? "Eliminando…"
                                : "Eliminar"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <button
                              onClick={() => manejarAbandonarEquipo(equipo.id)}
                              disabled={estaProcesando(`abandonar-${equipo.id}`)}
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
                            >
                              {estaProcesando(`abandonar-${equipo.id}`)
                                ? "Saliendo…"
                                : "Abandonar"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {modalEdicionAbierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Editar equipo</h3>
                {equipoEditando && (
                  <p className="text-sm text-gray-500">
                    Gestiona el nombre y los miembros del equipo.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={cerrarModalEdicion}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            {cargandoDetalle || !equipoEditando ? (
              <div className="py-12 text-center text-sm text-gray-500">Cargando información…</div>
            ) : (
              <div className="mt-6 space-y-6">
                <form onSubmit={manejarEdicionNombre} className="space-y-2">
                  <label htmlFor="nombre-edicion" className="block text-sm font-medium text-gray-700">
                    Nombre del equipo
                  </label>
                  <input
                    id="nombre-edicion"
                    type="text"
                    value={nuevoNombreEquipo}
                    onChange={(event) => setNuevoNombreEquipo(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={estaProcesando(`renombrar-${equipoEditando.id}`)}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
                    >
                      {estaProcesando(`renombrar-${equipoEditando.id}`)
                        ? "Guardando…"
                        : "Guardar cambios"}
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Miembros del equipo</h4>
                      <p className="text-xs text-gray-500">
                        Administra las invitaciones y la composición del equipo.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={invitadoAAgregar}
                        onChange={(event) => setInvitadoAAgregar(event.target.value)}
                        className="min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="" disabled>
                          {usuariosDisponibles.length
                            ? "Selecciona un usuario"
                            : "No hay usuarios disponibles"}
                        </option>
                        {usuariosDisponibles.map((usuario) => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombre} · {usuario.correo}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={manejarInvitacionMiembro}
                        disabled={
                          !invitadoAAgregar || estaProcesando(`invitar-${equipoEditando.id}`)
                        }
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
                      >
                        {estaProcesando(`invitar-${equipoEditando.id}`)
                          ? "Enviando…"
                          : "Invitar"}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 space-y-3 overflow-y-auto pr-2">
                    {equipoEditando.miembros.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Aún no hay miembros en este equipo.
                      </p>
                    ) : (
                      equipoEditando.miembros.map((miembro) => (
                        <div
                          key={miembro.id}
                          className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{miembro.nombre}</p>
                            <p className="text-xs text-gray-600">{miembro.correo}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                miembro.rol === "administrador"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {miembro.rol === "administrador" ? "Administrador" : "Miembro"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                miembro.estado === "aceptado"
                                  ? "bg-green-100 text-green-700"
                                  : miembro.estado === "pendiente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {miembro.estado === "aceptado"
                                ? "Aceptado"
                                : miembro.estado === "pendiente"
                                ? "Pendiente"
                                : "Rechazado"}
                            </span>
                            {miembro.rol !== "administrador" && (
                              <button
                                type="button"
                                onClick={() => manejarEliminarMiembro(miembro)}
                                disabled={estaProcesando(`eliminar-miembro-${miembro.id}`)}
                                className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
                              >
                                {estaProcesando(`eliminar-miembro-${miembro.id}`)
                                  ? "Quitando…"
                                  : "Eliminar"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => equipoEditando && manejarEliminarEquipo(equipoEditando.id)}
                    disabled={
                      !equipoEditando || estaProcesando(`eliminar-equipo-${equipoEditando?.id}`)
                    }
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                  >
                    {estaProcesando(`eliminar-equipo-${equipoEditando.id}`)
                      ? "Eliminando…"
                      : "Eliminar equipo"}
                  </button>
                  <p className="text-xs text-gray-500">
                    Solo el administrador puede eliminar el equipo o a sus miembros.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
