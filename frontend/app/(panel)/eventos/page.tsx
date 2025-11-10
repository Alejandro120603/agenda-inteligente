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

type Evento = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  inicio: string;
  fin: string;
  ubicacion?: string | null;
  tipo: TipoEvento;
  recordatorio?: number | null;
};

type EventFormData = {
  titulo: string;
  descripcion: string;
  inicio: string;
  fin: string;
  ubicacion: string;
  tipo: TipoEvento;
  recordatorio: string;
};

type ModalEventoProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: Evento | null;
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
  loading: boolean;
  feedback: { type: "success" | "error"; message: string } | null;
};

type EventosState = Evento[] | { eventos: Evento[] };

const esEventosWrapper = (value: unknown): value is { eventos: Evento[] } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const possibleWrapper = value as { eventos?: unknown };
  return Array.isArray(possibleWrapper.eventos);
};

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
              >
                <option value="personal">Personal</option>
                <option value="equipo">Equipo</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

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
}: {
  eventos: Evento[];
  onEdit: (evento: Evento) => void;
  onDelete: (evento: Evento) => Promise<void>;
  deleting: number | null;
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
            eventos.map((evento) => (
              <tr key={evento.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{evento.titulo}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(evento.inicio).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(evento.fin).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600">{evento.tipo}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-600">
                  <div className="flex justify-end gap-2">
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
                  </div>
                </td>
              </tr>
            ))
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

      if (Array.isArray(data)) {
        setEventos(data as Evento[]);
      } else if (esEventosWrapper(data)) {
        setEventos({ eventos: data.eventos as Evento[] });
      } else {
        setEventos([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingEventos(false);
    }
  }, []);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  const handleOpenCreate = () => {
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
      const payload = {
        titulo: data.titulo.trim(),
        descripcion: data.descripcion.trim() || null,
        inicio: fromLocalInputValue(data.inicio),
        fin: fromLocalInputValue(data.fin),
        ubicacion: data.ubicacion.trim() || null,
        tipo: data.tipo,
        recordatorio: data.recordatorio ? Number(data.recordatorio) : null,
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
              const tipoDesdeCalendario = info.event.extendedProps.tipo;
              const tipoNormalizado: TipoEvento =
                tipoDesdeCalendario === "personal" ||
                tipoDesdeCalendario === "equipo" ||
                tipoDesdeCalendario === "otro"
                  ? tipoDesdeCalendario
                  : eventoExistente?.tipo ?? "personal";

              const eventoSeleccionadoCalendario: Evento = {
                id,
                titulo: eventoExistente?.titulo ?? info.event.title,
                descripcion:
                  eventoExistente?.descripcion ?? info.event.extendedProps.descripcion ?? null,
                inicio: eventoExistente?.inicio ?? info.event.startStr,
                fin:
                  eventoExistente?.fin ??
                  info.event.endStr ??
                  info.event.start?.toISOString() ??
                  info.event.startStr,
                ubicacion:
                  eventoExistente?.ubicacion ?? info.event.extendedProps.ubicacion ?? null,
                tipo: tipoNormalizado,
                recordatorio:
                  eventoExistente?.recordatorio ?? info.event.extendedProps.recordatorio ?? null,
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
        <ListaEventos eventos={listaEventos} onEdit={handleOpenEdit} onDelete={handleDelete} deleting={deletingId} />
      </div>

      <ModalEvento
        isOpen={modalOpen}
        mode={modalMode}
        initialData={eventoSeleccionado}
        onClose={handleCloseModal}
        onSubmit={handleSubmitModal}
        loading={saving}
        feedback={feedback}
      />
    </div>
  );
}

