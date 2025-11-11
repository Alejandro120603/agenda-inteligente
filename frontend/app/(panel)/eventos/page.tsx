"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

// Cargamos FullCalendar dinámicamente para evitar problemas con SSR en Next.js
const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
});

type TipoEvento = "personal" | "equipo" | "otro";

type EstadoAsistencia = "pendiente" | "aceptado" | "rechazado" | null;

type Equipo = {
  id: number;
  nombre: string;
};

type Evento = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  inicio: string;
  fin: string;
  ubicacion?: string | null;
  tipo: TipoEvento;
  recordatorio?: number | null;
  id_equipo?: number | null;
  equipo_nombre?: string | null;
  estado_asistencia?: EstadoAsistencia;
  es_organizador?: boolean;
  es_participante?: boolean;
};

type EventFormData = {
  titulo: string;
  descripcion: string;
  inicio: string;
  fin: string;
  ubicacion: string;
  tipo: TipoEvento;
  recordatorio: string;
  id_equipo: string;
};

type ModalEventoProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: Evento | null;
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
  loading: boolean;
  feedback: { type: "success" | "error"; message: string } | null;
  equipos: Equipo[];
  loadingEquipos: boolean;
};

type EventosState = Evento[] | { eventos: Evento[] };

const esEventosWrapper = (value: unknown): value is { eventos: Evento[] } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const possibleWrapper = value as { eventos?: unknown };
  return Array.isArray(possibleWrapper.eventos);
};

const esEstadoAsistenciaValido = (
  value: unknown
): value is Exclude<EstadoAsistencia, null> =>
  value === "pendiente" || value === "aceptado" || value === "rechazado";

// Convierte una fecha a un string compatible con <input type="datetime-local" />
// 🔧 Ajuste: usamos el offset de la fecha como referencia local sin aplicar correcciones extra en cadena.
const toLocalInputValue = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60000);
  return localDate.toISOString().slice(0, 16);
};

// Normaliza el valor del input (interpretado en la zona local del navegador) a ISO UTC.
// 🔧 Corrección principal: eliminamos el ajuste manual del offset para evitar el doble desplazamiento.
const fromLocalInputValue = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

const createEmptyFormData = (): EventFormData => {
  const formatAsDatetimeLocal = (date: Date) => {
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  };

  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    titulo: "",
    descripcion: "",
    // 🔧 Usamos el mismo formato local consistente para evitar offsets duplicados.
    inicio: formatAsDatetimeLocal(now),
    fin: formatAsDatetimeLocal(inOneHour),
    ubicacion: "",
    tipo: "personal",
    recordatorio: "",
    id_equipo: "",
  };
};

const ModalEvento = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  loading,
  feedback,
  equipos,
  loadingEquipos,
}: ModalEventoProps) => {
  const [formData, setFormData] = useState<EventFormData>(createEmptyFormData);
  const [errors, setErrors] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrors(null);
      setFormData(createEmptyFormData());
      return;
    }

    if (mode === "edit" && initialData) {
      setFormData({
        titulo: initialData.titulo,
        descripcion: initialData.descripcion ?? "",
        inicio: toLocalInputValue(initialData.inicio),
        fin: toLocalInputValue(initialData.fin),
        ubicacion: initialData.ubicacion ?? "",
        tipo: initialData.tipo,
        recordatorio:
          initialData.recordatorio !== null && initialData.recordatorio !== undefined
            ? String(initialData.recordatorio)
            : "",
        id_equipo:
          initialData.tipo === "equipo" && initialData.id_equipo
            ? String(initialData.id_equipo)
            : "",
      });
      setErrors(null);
    }

    if (mode === "create") {
      setFormData(createEmptyFormData());
      setErrors(null);
    }
  }, [initialData, isOpen, mode]);

  const handleChange = (field: keyof EventFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.titulo.trim()) {
      setErrors("El título es obligatorio.");
      return;
    }

    if (!formData.inicio || !formData.fin) {
      setErrors("Las fechas de inicio y fin son obligatorias.");
      return;
    }

    const start = new Date(formData.inicio);
    const end = new Date(formData.fin);

    if (end <= start) {
      setErrors("La fecha de fin debe ser posterior a la fecha de inicio.");
      return;
    }

    if (formData.tipo === "equipo" && !formData.id_equipo) {
      setErrors("Selecciona el equipo para el evento.");
      return;
    }

    setErrors(null);
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {mode === "create" ? "➕ Crear nuevo evento" : "✏️ Editar evento"}
          </h2>
          <button
            type="button"
            className="rounded-md px-3 py-1 text-sm text-gray-500 transition hover:bg-gray-100"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="titulo">
              Título
            </label>
            <input
              id="titulo"
              type="text"
              className="w-full rounded-md border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={formData.titulo}
              onChange={(event) => handleChange("titulo", event.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="descripcion">
              Descripción
            </label>
            <textarea
              id="descripcion"
              className="h-24 w-full rounded-md border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={formData.descripcion}
              onChange={(event) => handleChange("descripcion", event.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="inicio">
                Inicio
              </label>
              <input
                id="inicio"
                type="datetime-local"
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={formData.inicio}
                onChange={(event) => handleChange("inicio", event.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="fin">
                Fin
              </label>
              <input
                id="fin"
                type="datetime-local"
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={formData.fin}
                onChange={(event) => handleChange("fin", event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="ubicacion">
                Ubicación (opcional)
              </label>
              <input
                id="ubicacion"
                type="text"
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={formData.ubicacion}
                onChange={(event) => handleChange("ubicacion", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="tipo">
                Tipo
              </label>
              <select
                id="tipo"
                className="w-full rounded-md border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={formData.tipo}
                onChange={(event) => handleChange("tipo", event.target.value as TipoEvento)}
                disabled={mode === "edit" && initialData?.tipo === "equipo"}
              >
                <option value="personal">Personal</option>
                <option value="equipo">Equipo</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {formData.tipo === "equipo" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="equipo">
                Equipo
              </label>
              {loadingEquipos ? (
                <p className="text-sm text-gray-500">Cargando equipos...</p>
              ) : equipos.length > 0 ? (
                <select
                  id="equipo"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  value={formData.id_equipo}
                  onChange={(event) => handleChange("id_equipo", event.target.value)}
                  disabled={mode === "edit" && initialData?.tipo === "equipo"}
                >
                  <option value="">Selecciona un equipo</option>
                  {equipos.map((equipo) => (
                    <option key={equipo.id} value={equipo.id}>
                      {equipo.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-amber-600">
                  No perteneces a ningún equipo aceptado todavía.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="recordatorio">
              Recordatorio (minutos, opcional)
            </label>
            <input
              id="recordatorio"
              type="number"
              min={0}
              className="w-full rounded-md border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={formData.recordatorio}
              onChange={(event) => handleChange("recordatorio", event.target.value)}
            />
          </div>

          {errors && <p className="text-sm text-red-500">{errors}</p>}

          {feedback && (
            <p
              className={`text-sm ${
                feedback.type === "success" ? "text-green-600" : "text-red-500"
              }`}
            >
              {feedback.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-md border border-gray-200 px-4 py-2 text-sm transition hover:bg-gray-100"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              disabled={loading}
            >
              {loading ? "Guardando..." : mode === "create" ? "Guardar" : "Actualizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ListaEventos = ({
  eventos,
  onEdit,
  onDelete,
  deleting,
  onResponder,
  responding,
}: {
  eventos: Evento[];
  onEdit: (evento: Evento) => void;
  onDelete: (evento: Evento) => Promise<void>;
  deleting: number | null;
  onResponder: (evento: Evento, estado: Exclude<EstadoAsistencia, null>) => Promise<void>;
  responding: number | null;
}) => {
  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Título
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Inicio
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Fin
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Tipo
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Equipo
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Asistencia
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {eventos.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                Aún no tienes eventos registrados.
              </td>
            </tr>
          ) : (
            eventos.map((evento) => {
              const esEquipo = evento.tipo === "equipo";
              const esOrganizador = Boolean(evento.es_organizador);
              const esParticipante = Boolean(evento.es_participante);
              const estadoAsistencia = evento.estado_asistencia ?? null;
              const puedeResponder = esEquipo && esParticipante && !esOrganizador;
              const mostrarRevertir =
                puedeResponder && estadoAsistencia !== null && estadoAsistencia !== "pendiente";

              return (
                <tr key={evento.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{evento.titulo}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(evento.inicio).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(evento.fin).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-600">{evento.tipo}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {esEquipo ? evento.equipo_nombre ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {(() => {
                      if (!esEquipo) {
                        return "—";
                      }

                      if (esOrganizador) {
                        return "👑 Organizador";
                      }

                      switch (estadoAsistencia) {
                        case "aceptado":
                          return "🟢 Aceptado";
                        case "rechazado":
                          return "🔴 Rechazado";
                        case "pendiente":
                        default:
                          return "🟡 Pendiente";
                      }
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    <div className="flex flex-wrap justify-end gap-2">
                      {puedeResponder ? (
                        <>
                          <button
                            className="rounded-md border border-green-200 px-3 py-1 text-sm text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => onResponder(evento, "aceptado")}
                            disabled={responding === evento.id}
                        >
                          {responding === evento.id ? "Actualizando..." : "🟢 Aceptar"}
                        </button>
                          <button
                            className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => onResponder(evento, "rechazado")}
                            disabled={responding === evento.id}
                          >
                            {responding === evento.id ? "Actualizando..." : "🔴 Rechazar"}
                          </button>
                        {mostrarRevertir && (
                          <button
                            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => onResponder(evento, "pendiente")}
                            disabled={responding === evento.id}
                          >
                            {responding === evento.id ? "Actualizando..." : "↩️ Pendiente"}
                          </button>
                        )}
                      </>
                      ) : null}

                      {esOrganizador ? (
                        <>
                          <button
                            className="rounded-md border border-gray-200 px-3 py-1 text-sm transition hover:bg-blue-50"
                            onClick={() => onEdit(evento)}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed"
                          onClick={() => onDelete(evento)}
                          disabled={deleting === evento.id}
                        >
                          {deleting === evento.id ? "Eliminando..." : "🗑️ Eliminar"}
                        </button>
                        </>
                      ) : null}

                      {!esOrganizador && !puedeResponder ? (
                        <span className="px-3 py-1 text-sm text-gray-400">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default function Page() {
  const [eventos, setEventos] = useState<EventosState>(() => []);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [respuestaMensaje, setRespuestaMensaje] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    if (!respuestaMensaje) {
      return;
    }

    const timeout = setTimeout(() => setRespuestaMensaje(null), 5000);
    return () => clearTimeout(timeout);
  }, [respuestaMensaje]);

  const fetchEquipos = useCallback(async () => {
    try {
      setLoadingEquipos(true);
      const response = await fetch("/api/equipos", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setEquipos([]);
          return;
        }

        throw new Error("No se pudo obtener la lista de equipos");
      }

      const data: unknown = await response.json();
      const posiblesEquipos: unknown[] = Array.isArray(data)
        ? data
        : data && typeof data === "object" && Array.isArray((data as { equipos?: unknown[] }).equipos)
        ? ((data as { equipos?: unknown[] }).equipos as unknown[])
        : [];

      const normalizados = posiblesEquipos
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const registro = item as Record<string, unknown>;
          const idValor = registro.id;
          const nombreValor = registro.nombre;

          const id =
            typeof idValor === "number"
              ? idValor
              : typeof idValor === "string"
              ? Number.parseInt(idValor, 10)
              : NaN;

          if (!Number.isInteger(id)) {
            return null;
          }

          if (typeof nombreValor !== "string" || nombreValor.trim().length === 0) {
            return null;
          }

          return {
            id,
            nombre: nombreValor,
          } satisfies Equipo;
        })
        .filter((equipo): equipo is Equipo => Boolean(equipo));

      setEquipos(normalizados);
    } catch (error) {
      console.error(error);
      setEquipos([]);
    } finally {
      setLoadingEquipos(false);
    }
  }, []);

  const fetchEventos = useCallback(async () => {
    try {
      setLoadingEventos(true);
      const response = await fetch("/api/events", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener la lista de eventos");
      }

      const data: unknown = await response.json();
      const listaBruta: unknown[] = Array.isArray(data)
        ? data
        : esEventosWrapper(data)
        ? data.eventos
        : [];

      const normalizados = listaBruta
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const registro = item as Record<string, unknown>;
          const idValor = registro.id;
          const inicioValor = registro.inicio;
          const finValor = registro.fin;

          const id =
            typeof idValor === "number"
              ? idValor
              : typeof idValor === "string"
              ? Number.parseInt(idValor, 10)
              : NaN;

          if (!Number.isInteger(id)) {
            return null;
          }

          if (typeof inicioValor !== "string" || typeof finValor !== "string") {
            return null;
          }

          const tituloValor = registro.titulo;
          const tipoValor = registro.tipo;

          const tipoEvento: TipoEvento =
            tipoValor === "personal" || tipoValor === "equipo" || tipoValor === "otro"
              ? tipoValor
              : "personal";

          const descripcionValor =
            typeof registro.descripcion === "string" ? registro.descripcion : null;
          const ubicacionValor =
            typeof registro.ubicacion === "string" ? registro.ubicacion : null;

          const recordatorioValor = (() => {
            if (typeof registro.recordatorio === "number") {
              return registro.recordatorio;
            }

            if (
              typeof registro.recordatorio === "string" &&
              !Number.isNaN(Number.parseInt(registro.recordatorio, 10))
            ) {
              return Number.parseInt(registro.recordatorio, 10);
            }

            return null;
          })();

          const idEquipoValor = registro.id_equipo;
          const idEquipo =
            typeof idEquipoValor === "number"
              ? idEquipoValor
              : typeof idEquipoValor === "string"
              ? Number.parseInt(idEquipoValor, 10)
              : null;

          const equipoNombre =
            typeof registro.equipo_nombre === "string" ? registro.equipo_nombre : null;

          const estadoAsistencia = esEstadoAsistenciaValido(registro.estado_asistencia)
            ? registro.estado_asistencia
            : null;

          const esOrganizador =
            registro.es_organizador === 1 || registro.es_organizador === true;
          const esParticipante =
            registro.es_participante === 1 || registro.es_participante === true;

          return {
            id,
            titulo:
              typeof tituloValor === "string"
                ? tituloValor
                : tituloValor != null
                ? String(tituloValor)
                : "(Sin título)",
            descripcion: descripcionValor,
            inicio: inicioValor,
            fin: finValor,
            ubicacion: ubicacionValor,
            tipo: tipoEvento,
            recordatorio: recordatorioValor,
            id_equipo: idEquipo,
            equipo_nombre: equipoNombre,
            estado_asistencia: estadoAsistencia,
            es_organizador: esOrganizador,
            es_participante: esParticipante,
          } satisfies Evento;
        })
        .filter((evento): evento is Evento => Boolean(evento));

      if (Array.isArray(data)) {
        setEventos(normalizados);
      } else if (esEventosWrapper(data)) {
        setEventos({ eventos: normalizados });
      } else {
        setEventos(normalizados);
      }
    } catch (error) {
      console.error(error);
      setEventos([]);
    } finally {
      setLoadingEventos(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipos();
  }, [fetchEquipos]);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  const handleOpenCreate = () => {
    fetchEquipos();
    setModalMode("create");
    setEventoSeleccionado(null);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (evento: Evento) => {
    setModalMode("edit");
    setEventoSeleccionado(evento);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEventoSeleccionado(null);
    setFeedback(null);
  };

  const handleSubmitModal = async (data: EventFormData) => {
    setSaving(true);
    setFeedback(null);

    try {
      const equipoId =
        data.tipo === "equipo" && data.id_equipo
          ? Number.parseInt(data.id_equipo, 10)
          : null;

      const payload = {
        titulo: data.titulo.trim(),
        descripcion: data.descripcion.trim() || null,
        inicio: fromLocalInputValue(data.inicio),
        fin: fromLocalInputValue(data.fin),
        ubicacion: data.ubicacion.trim() || null,
        tipo: data.tipo,
        recordatorio: data.recordatorio ? Number(data.recordatorio) : null,
        id_equipo: Number.isInteger(equipoId) ? equipoId : null,
      };

      let response: Response;

      if (modalMode === "create") {
        response = await fetch("/api/events", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else if (eventoSeleccionado) {
        // Validamos que el identificador exista antes de enviar la petición PUT
        if (
          typeof eventoSeleccionado.id !== "number" ||
          Number.isNaN(eventoSeleccionado.id)
        ) {
          throw new Error("Identificador de evento inválido.");
        }

        response = await fetch(`/api/events/${eventoSeleccionado.id}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        throw new Error("No hay evento seleccionado para editar");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Ocurrió un error al guardar el evento");
      }

      setFeedback({ type: "success", message: "Evento guardado correctamente." });
      await fetchEventos();
      setTimeout(() => {
        setModalOpen(false);
        setEventoSeleccionado(null);
        setFeedback(null);
      }, 600);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResponderEvento = async (
    evento: Evento,
    estado: Exclude<EstadoAsistencia, null>
  ) => {
    if (!Number.isInteger(evento.id)) {
      setRespuestaMensaje({
        type: "error",
        message: "No se pudo identificar el evento seleccionado.",
      });
      return;
    }

    setRespondingId(evento.id);
    setRespuestaMensaje(null);

    try {
      const response = await fetch(`/api/events/${evento.id}/respuesta`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "No se pudo actualizar la asistencia.");
      }

      let message = "Estado de asistencia actualizado.";
      if (estado === "aceptado") {
        message = "Has confirmado tu asistencia.";
      } else if (estado === "rechazado") {
        message = "Has rechazado la invitación.";
      } else if (estado === "pendiente") {
        message = "Has marcado la asistencia como pendiente.";
      }

      setRespuestaMensaje({ type: "success", message });
      await fetchEventos();
    } catch (error) {
      console.error(error);
      setRespuestaMensaje({
        type: "error",
        message:
          error instanceof Error ? error.message : "No se pudo actualizar la asistencia.",
      });
    } finally {
      setRespondingId(null);
    }
  };

  const handleDelete = useCallback(
    async (evento: Evento) => {
      const confirmado = window.confirm(
        `¿Seguro que deseas eliminar el evento "${evento.titulo}"? Esta acción no se puede deshacer.`,
      );

      if (!confirmado) return;

      setDeletingId(evento.id);
      try {
        const response = await fetch(`/api/events/${evento.id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "No se pudo eliminar el evento");
        }

        await fetchEventos();
      } catch (error) {
        console.error(error);
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "No se pudo eliminar el evento.",
        });
      } finally {
        setDeletingId(null);
      }
    },
    [fetchEventos],
  );

  const listaEventos = useMemo(() => {
    const lista = Array.isArray(eventos)
      ? eventos
      : esEventosWrapper(eventos)
      ? eventos.eventos
      : [];

    return lista;
  }, [eventos]);

  const eventosCalendario = useMemo(() => {
    const lista = Array.isArray(eventos)
      ? eventos
      : esEventosWrapper(eventos)
      ? eventos.eventos
      : [];

    return lista.map((evento) => ({
      id: String(evento.id),
      title: evento.titulo ?? "(Sin título)",
      start: evento.inicio,
      end: evento.fin,
      extendedProps: {
        descripcion: evento.descripcion ?? null,
        ubicacion: evento.ubicacion ?? null,
        tipo: evento.tipo,
        recordatorio: evento.recordatorio ?? null,
        id_equipo: evento.id_equipo ?? null,
        equipo_nombre: evento.equipo_nombre ?? null,
        estado_asistencia: evento.estado_asistencia ?? null,
        es_organizador: evento.es_organizador ?? false,
        es_participante: evento.es_participante ?? false,
      },
    }));
  }, [eventos]);

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📅 Gestión de Eventos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Visualiza y administra tus eventos personales y de equipo.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            ➕ Nuevo evento
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={eventosCalendario}
            eventClick={(info) => {
              const id = Number.parseInt(info.event.id, 10);

              if (Number.isNaN(id)) {
                setFeedback({
                  type: "error",
                  message: "No pudimos identificar el evento seleccionado.",
                });
                return;
              }

              const eventoExistente = listaEventos.find((item) => item.id === id);
              if (eventoExistente) {
                handleOpenEdit(eventoExistente);
                return;
              }
              const tipoDesdeCalendario = info.event.extendedProps.tipo;
              const tipoNormalizado: TipoEvento =
                tipoDesdeCalendario === "personal" ||
                tipoDesdeCalendario === "equipo" ||
                tipoDesdeCalendario === "otro"
                  ? tipoDesdeCalendario
                  : "personal";

              const idEquipoDesdeCalendarioRaw = info.event.extendedProps.id_equipo;
              const idEquipoDesdeCalendario =
                typeof idEquipoDesdeCalendarioRaw === "number"
                  ? idEquipoDesdeCalendarioRaw
                  : typeof idEquipoDesdeCalendarioRaw === "string"
                  ? Number.parseInt(idEquipoDesdeCalendarioRaw, 10)
                  : null;

              const equipoNombreDesdeCalendario =
                typeof info.event.extendedProps.equipo_nombre === "string"
                  ? info.event.extendedProps.equipo_nombre
                  : null;

              const estadoAsistenciaDesdeCalendario = esEstadoAsistenciaValido(
                info.event.extendedProps.estado_asistencia,
              )
                ? info.event.extendedProps.estado_asistencia
                : null;

              const esOrganizadorCalendario =
                info.event.extendedProps.es_organizador === true ||
                info.event.extendedProps.es_organizador === 1;
              const esParticipanteCalendario =
                info.event.extendedProps.es_participante === true ||
                info.event.extendedProps.es_participante === 1;

              const eventoSeleccionadoCalendario: Evento = {
                id,
                titulo: typeof info.event.title === "string" ? info.event.title : "(Sin título)",
                descripcion:
                  typeof info.event.extendedProps.descripcion === "string"
                    ? info.event.extendedProps.descripcion
                    : null,
                inicio: info.event.startStr,
                fin:
                  info.event.endStr ??
                  info.event.start?.toISOString() ??
                  info.event.startStr,
                ubicacion:
                  typeof info.event.extendedProps.ubicacion === "string"
                    ? info.event.extendedProps.ubicacion
                    : null,
                tipo: tipoNormalizado,
                recordatorio:
                  typeof info.event.extendedProps.recordatorio === "number"
                    ? info.event.extendedProps.recordatorio
                    : typeof info.event.extendedProps.recordatorio === "string" &&
                      !Number.isNaN(
                        Number.parseInt(info.event.extendedProps.recordatorio, 10),
                      )
                    ? Number.parseInt(info.event.extendedProps.recordatorio, 10)
                    : null,
                id_equipo: Number.isInteger(idEquipoDesdeCalendario)
                  ? Number(idEquipoDesdeCalendario)
                  : null,
                equipo_nombre: equipoNombreDesdeCalendario,
                estado_asistencia: estadoAsistenciaDesdeCalendario,
                es_organizador: esOrganizadorCalendario,
                es_participante: esParticipanteCalendario,
              };

              // Abrimos el modal con los datos provenientes directamente del calendario
              handleOpenEdit(eventoSeleccionadoCalendario);
            }}
            height={650}
            locale="es"
          />
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Lista de eventos</h2>
          {loadingEventos && <span className="text-sm text-gray-500">Cargando...</span>}
        </div>
        {respuestaMensaje && (
          <p
            className={`mt-3 text-sm ${
              respuestaMensaje.type === "success" ? "text-green-600" : "text-red-500"
            }`}
          >
            {respuestaMensaje.message}
          </p>
        )}
        <ListaEventos
          eventos={listaEventos}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          deleting={deletingId}
          onResponder={handleResponderEvento}
          responding={respondingId}
        />
      </div>

      <ModalEvento
        isOpen={modalOpen}
        mode={modalMode}
        initialData={eventoSeleccionado}
        onClose={handleCloseModal}
        onSubmit={handleSubmitModal}
        loading={saving}
        feedback={feedback}
        equipos={equipos}
        loadingEquipos={loadingEquipos}
      />
    </div>
  );
}

