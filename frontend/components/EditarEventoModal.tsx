"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  actualizarAsistenciaEvento,
  actualizarEventoInterno,
  eliminarEventoInterno,
  eliminarMiembroDeEquipo,
  invitarMiembroAEquipo,
  obtenerEquipoConMiembros,
  ocultarEventoParaUsuario,
  type EstadoEvento,
  type MiembroEquipo,
} from "@/lib/api";

export type TipoItemCalendario = "evento" | "tarea_personal" | "tarea_grupal";

export interface EventoEditable {
  id: string;
  source: "evento_interno" | "tarea";
  sourceId: number | null;
  titulo: string | null;
  descripcion: string | null;
  inicio: string | null;
  fin: string | null;
  fecha: string | null;
  tipo: TipoItemCalendario;
  estadoInvitacion: "pendiente" | "aceptado" | "rechazado" | null;
  esOrganizador: boolean;
  equipoNombre: string | null;
  equipoId: number | null;
  estadoEvento?: string | null;
  creadorNombre?: string | null;
}

interface EditarEventoModalProps {
  open: boolean;
  evento: EventoEditable | null;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
}

interface MensajeEstado {
  tipo: "success" | "error";
  texto: string;
}

const ESTADOS_EVENTO_LABEL: Record<EstadoEvento, string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  tentativo: "Tentativo",
};

const combinarFechaHora = (fecha: string, hora: string) => {
  const horaNormalizada = hora.length === 5 ? `${hora}:00` : hora;
  return `${fecha}T${horaNormalizada}`;
};

const obtenerFechaInput = (valor: string | null) => {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor.slice(0, 10);
  }
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const obtenerHoraInput = (valor: string | null) => {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor.split("T")[1]?.slice(0, 5) ?? "";
  }
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
};

const esEstadoEvento = (valor: string): valor is EstadoEvento =>
  valor === "confirmado" || valor === "cancelado" || valor === "tentativo";

export default function EditarEventoModal({ open, evento, onClose, onRefresh }: EditarEventoModalProps) {
  const esEventoInterno = evento?.source === "evento_interno";
  const esEvento = evento?.tipo === "evento";
  const esTarea = evento?.source === "tarea";
  const esAdmin = Boolean(evento && esEventoInterno && evento.esOrganizador);
  const esParticipante = Boolean(evento && esEventoInterno && !evento.esOrganizador);
  const esEventoGrupal = Boolean(esEvento && evento?.equipoId);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [estadoEvento, setEstadoEvento] = useState<EstadoEvento>("confirmado");

  const [mensaje, setMensaje] = useState<MensajeEstado | null>(null);
  const [procesando, setProcesando] = useState<"guardar" | "asistencia" | "cancelar" | "eliminar" | "miembros" | null>(null);

  const [miembros, setMiembros] = useState<MiembroEquipo[]>([]);
  const [errorMiembros, setErrorMiembros] = useState<string | null>(null);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);
  const [nuevoMiembroId, setNuevoMiembroId] = useState("");

  useEffect(() => {
    if (!open || !evento) {
      setTitulo("");
      setDescripcion("");
      setFechaInicio("");
      setHoraInicio("");
      setFechaFin("");
      setHoraFin("");
      setEstadoEvento("confirmado");
      setMensaje(null);
      setMiembros([]);
      setErrorMiembros(null);
      setNuevoMiembroId("");
      return;
    }

    setTitulo(evento.titulo ?? "");
    setDescripcion(evento.descripcion ?? "");
    setFechaInicio(obtenerFechaInput(evento.inicio ?? evento.fecha));
    setHoraInicio(obtenerHoraInput(evento.inicio));
    setFechaFin(obtenerFechaInput(evento.fin ?? evento.fecha));
    setHoraFin(obtenerHoraInput(evento.fin));

    const estadoActual = typeof evento.estadoEvento === "string" && esEstadoEvento(evento.estadoEvento)
      ? evento.estadoEvento
      : "confirmado";
    setEstadoEvento(estadoActual);
  }, [open, evento]);

  useEffect(() => {
    if (!open || !esEventoGrupal || !evento?.equipoId) {
      return;
    }

    let cancelado = false;
    const cargarMiembros = async () => {
      try {
        setCargandoMiembros(true);
        setErrorMiembros(null);
        const detalle = await obtenerEquipoConMiembros(evento.equipoId!);
        if (cancelado) return;
        setMiembros(detalle.miembros ?? []);
      } catch (error) {
        if (cancelado) return;
        console.error("[EditarEventoModal] obtenerEquipoConMiembros", error);
        setErrorMiembros(
          error instanceof Error ? error.message : "No se pudieron cargar los miembros del equipo",
        );
      } finally {
        if (!cancelado) {
          setCargandoMiembros(false);
        }
      }
    };

    void cargarMiembros();

    return () => {
      cancelado = true;
    };
  }, [open, esEventoGrupal, evento?.equipoId]);

  const horaFinPlaceholder = useMemo(() => (horaInicio ? horaInicio : ""), [horaInicio]);

  const manejarGuardar = useCallback(async () => {
    if (!evento || !esAdmin || !evento.sourceId) {
      return;
    }

    if (!fechaInicio || !horaInicio || !fechaFin || !horaFin) {
      setMensaje({ tipo: "error", texto: "Debes completar las fechas y horas de inicio y fin." });
      return;
    }

    const inicio = combinarFechaHora(fechaInicio, horaInicio);
    const fin = combinarFechaHora(fechaFin, horaFin);

    setProcesando("guardar");
    setMensaje(null);

    try {
      await actualizarEventoInterno(evento.sourceId, {
        titulo: titulo.trim() || "(Sin título)",
        descripcion: descripcion.trim() ? descripcion : null,
        inicio,
        fin,
      });
      await onRefresh();
      setMensaje({ tipo: "success", texto: "Los cambios se guardaron correctamente." });
    } catch (error) {
      console.error("[EditarEventoModal] manejarGuardar", error);
      setMensaje({
        tipo: "error",
        texto: error instanceof Error ? error.message : "No fue posible actualizar el evento.",
      });
    } finally {
      setProcesando(null);
    }
  }, [evento, esAdmin, fechaFin, fechaInicio, horaFin, horaInicio, titulo, descripcion, onRefresh]);

  const manejarCancelarEvento = useCallback(async () => {
    if (!evento || !esAdmin || !evento.sourceId) {
      return;
    }

    setProcesando("cancelar");
    setMensaje(null);

    try {
      await actualizarEventoInterno(evento.sourceId, { estado: "cancelado" });
      await onRefresh();
      setEstadoEvento("cancelado");
      setMensaje({ tipo: "success", texto: "El evento fue marcado como cancelado." });
    } catch (error) {
      console.error("[EditarEventoModal] manejarCancelarEvento", error);
      setMensaje({
        tipo: "error",
        texto: error instanceof Error ? error.message : "No se pudo cancelar el evento.",
      });
    } finally {
      setProcesando(null);
    }
  }, [evento, esAdmin, onRefresh]);

  const manejarEliminarEvento = useCallback(async () => {
    if (!evento || !esAdmin || !evento.sourceId) {
      return;
    }

    setProcesando("eliminar");
    setMensaje(null);

    try {
      await eliminarEventoInterno(evento.sourceId);
      await onRefresh();
      onClose();
    } catch (error) {
      console.error("[EditarEventoModal] manejarEliminarEvento", error);
      setMensaje({
        tipo: "error",
        texto: error instanceof Error ? error.message : "No se pudo eliminar el evento.",
      });
    } finally {
      setProcesando(null);
    }
  }, [evento, esAdmin, onRefresh, onClose]);

  const manejarAsistencia = useCallback(
    async (estado: "aceptado" | "rechazado") => {
      if (!evento || !evento.sourceId) {
        return;
      }

      setProcesando("asistencia");
      setMensaje(null);

      try {
        await actualizarAsistenciaEvento(evento.sourceId, estado);
        await onRefresh();
        setMensaje({ tipo: "success", texto: "Tu respuesta fue registrada." });
      } catch (error) {
        console.error("[EditarEventoModal] manejarAsistencia", error);
        setMensaje({
          tipo: "error",
          texto: error instanceof Error ? error.message : "No se pudo actualizar tu asistencia.",
        });
      } finally {
        setProcesando(null);
      }
    },
    [evento, onRefresh],
  );

  const manejarOcultar = useCallback(async () => {
    if (!evento || !evento.sourceId) {
      return;
    }

    setProcesando("asistencia");
    setMensaje(null);

    try {
      await ocultarEventoParaUsuario(evento.sourceId);
      await onRefresh();
      onClose();
    } catch (error) {
      console.error("[EditarEventoModal] manejarOcultar", error);
      setMensaje({
        tipo: "error",
        texto: error instanceof Error ? error.message : "No se pudo ocultar el evento.",
      });
    } finally {
      setProcesando(null);
    }
  }, [evento, onRefresh, onClose]);

  const manejarInvitacion = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!evento?.equipoId || !nuevoMiembroId) {
        return;
      }

      const usuarioId = Number(nuevoMiembroId);
      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        setErrorMiembros("Debes indicar un identificador válido de usuario.");
        return;
      }

      setProcesando("miembros");
      setErrorMiembros(null);

      try {
        await invitarMiembroAEquipo(evento.equipoId, usuarioId);
        const detalle = await obtenerEquipoConMiembros(evento.equipoId);
        setMiembros(detalle.miembros ?? []);
        setNuevoMiembroId("");
      } catch (error) {
        console.error("[EditarEventoModal] manejarInvitacion", error);
        setErrorMiembros(
          error instanceof Error ? error.message : "No se pudo agregar al miembro indicado.",
        );
      } finally {
        setProcesando(null);
      }
    },
    [evento?.equipoId, nuevoMiembroId],
  );

  const manejarEliminarMiembro = useCallback(
    async (miembroId: number) => {
      if (!evento?.equipoId) {
        return;
      }

      setProcesando("miembros");
      setErrorMiembros(null);

      try {
        await eliminarMiembroDeEquipo(evento.equipoId, miembroId);
        const detalle = await obtenerEquipoConMiembros(evento.equipoId);
        setMiembros(detalle.miembros ?? []);
      } catch (error) {
        console.error("[EditarEventoModal] manejarEliminarMiembro", error);
        setErrorMiembros(
          error instanceof Error ? error.message : "No se pudo quitar al miembro seleccionado.",
        );
      } finally {
        setProcesando(null);
      }
    },
    [evento?.equipoId],
  );

  if (!open || !evento) {
    return null;
  }

  const estadoInvitacionActual = evento.estadoInvitacion ?? "pendiente";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-950">
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
              {esEvento ? "Editar evento" : "Detalle del compromiso"}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {titulo || evento.titulo || "(Sin título)"}
            </h2>
            {evento.equipoNombre && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Equipo: {evento.equipoNombre}</p>
            )}
            {evento.creadorNombre && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Organizado por {evento.creadorNombre}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-600 transition hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus-visible:outline-gray-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400">
                {evento.tipo === "evento"
                  ? "Evento"
                  : evento.tipo === "tarea_grupal"
                    ? "Tarea grupal"
                    : "Tarea personal"}
              </span>
              {esEventoInterno && estadoInvitacionActual && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800/70 dark:text-gray-300">
                  Estado: {estadoInvitacionActual}
                </span>
              )}
              {esEventoInterno && esAdmin && estadoEvento && (
                <span className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
                  {ESTADOS_EVENTO_LABEL[estadoEvento]}
                </span>
              )}
            </div>

            {esAdmin ? (
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/70">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Título
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setTitulo(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    placeholder="Título del evento"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Descripción
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescripcion(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    rows={4}
                    placeholder="Describe el evento"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setFechaInicio(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Hora de inicio
                    </label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setHoraInicio(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Fecha de fin
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setFechaFin(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Hora de fin
                    </label>
                    <input
                      type="time"
                      value={horaFin}
                      placeholder={horaFinPlaceholder}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setHoraFin(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={manejarGuardar}
                    disabled={procesando !== null}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    onClick={manejarCancelarEvento}
                    disabled={procesando !== null}
                    className="inline-flex items-center justify-center rounded-xl border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-500/10"
                  >
                    Marcar como cancelado
                  </button>
                  <button
                    type="button"
                    onClick={manejarEliminarEvento}
                    disabled={procesando !== null}
                    className="inline-flex items-center justify-center rounded-xl border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    Eliminar definitivamente
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-gray-100">Descripción</p>
                <p className="whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                  {evento.descripcion?.trim() || "Sin descripción proporcionada."}
                </p>
                {esEventoInterno && esParticipante && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tu asistencia</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => manejarAsistencia("aceptado")}
                        disabled={procesando !== null}
                        className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                          estadoInvitacionActual === "aceptado"
                            ? "bg-emerald-500 text-white"
                            : "border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                        }`}
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => manejarAsistencia("rechazado")}
                        disabled={procesando !== null}
                        className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                          estadoInvitacionActual === "rechazado"
                            ? "bg-rose-500 text-white"
                            : "border border-rose-500 text-rose-600 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        }`}
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={manejarOcultar}
                        disabled={procesando !== null}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/80"
                      >
                        Ocultar evento
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mensaje && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  mensaje.tipo === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
                }`}
              >
                {mensaje.texto}
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Información general
              </p>
              <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Fecha de inicio:</span> {fechaInicio || "Sin definir"}
                </p>
                {horaInicio && (
                  <p>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Hora de inicio:</span> {horaInicio}
                  </p>
                )}
                <p>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Fecha de fin:</span> {fechaFin || "Sin definir"}
                </p>
                {horaFin && (
                  <p>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Hora de fin:</span> {horaFin}
                  </p>
                )}
                {esEventoInterno && (
                  <p>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Estado actual:</span> {estadoInvitacionActual}
                  </p>
                )}
              </div>
            </div>

            {esEventoGrupal && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Miembros del equipo
                  </p>
                </div>

                {cargandoMiembros ? (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Cargando miembros del equipo...</p>
                ) : errorMiembros ? (
                  <p className="mt-3 text-sm text-rose-500 dark:text-rose-300">{errorMiembros}</p>
                ) : miembros.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No se encontraron miembros para este equipo.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    {miembros.map((miembro) => (
                      <li key={miembro.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/70">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{miembro.nombre || "Miembro"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{miembro.correo}</p>
                        </div>
                        {esAdmin && miembro.rol !== "administrador" && (
                          <button
                            type="button"
                            onClick={() => manejarEliminarMiembro(miembro.id)}
                            disabled={procesando === "miembros"}
                            className="rounded-lg border border-rose-400 px-2 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            Quitar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {esAdmin && (
                  <form onSubmit={manejarInvitacion} className="mt-4 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Agregar miembro por ID de usuario
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={nuevoMiembroId}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setNuevoMiembroId(event.target.value)}
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        placeholder="ID del usuario"
                      />
                      <button
                        type="submit"
                        disabled={procesando === "miembros"}
                        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
                      >
                        Invitar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {esTarea && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-300">
                <p>
                  Esta tarea es gestionada desde el módulo de tareas. Puedes editarla allí para cambiar su información.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
