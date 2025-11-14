"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

interface EquipoOption {
  id: number;
  nombre: string;
}

interface CrearEventoModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (mensaje: string) => void | Promise<void>;
  onError: (mensaje: string) => void;
}

type Alcance = "personal" | "equipo";

type TipoBase = "evento" | "tarea";

interface FormState {
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  tipoBase: TipoBase;
  alcance: Alcance;
  equipoId: string;
}

interface AutoHorarioState {
  habilitado: boolean;
  horaInicio: string;
  horaFin: string;
  duracion: string;
}

interface DisponibilidadRespuesta {
  slots: string[];
  best: string | null;
  score: { slot: string; available: number; total: number }[];
}

const HORA_REGEX = /^\d{2}:\d{2}$/;

const formatearFecha = (valor: Date) => {
  const year = valor.getFullYear();
  const month = String(valor.getMonth() + 1).padStart(2, "0");
  const day = String(valor.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatearHora = (valor: Date) => {
  const hours = String(valor.getHours()).padStart(2, "0");
  const minutes = String(valor.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const crearEstadoInicial = (): FormState => {
  const ahora = new Date();
  const inicio = new Date(ahora.getTime() + 60 * 60 * 1000);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);

  return {
    titulo: "",
    descripcion: "",
    fechaInicio: formatearFecha(inicio),
    horaInicio: formatearHora(inicio),
    fechaFin: formatearFecha(fin),
    horaFin: formatearHora(fin),
    tipoBase: "evento",
    alcance: "personal",
    equipoId: "",
  };
};

const crearAutoHorarioInicial = (base?: Pick<FormState, "horaInicio" | "horaFin">): AutoHorarioState => ({
  habilitado: false,
  horaInicio: base?.horaInicio ?? "09:00",
  horaFin: base?.horaFin ?? "18:00",
  duracion: "60",
});

const combinarFechaHoraLocal = (fecha: string, hora: string) => {
  const [horasRaw = "00", minutosRaw = "00"] = hora.split(":");
  const horas = horasRaw.padStart(2, "0");
  const minutos = minutosRaw.padStart(2, "0");
  return `${fecha}T${horas}:${minutos}`;
};

const parseLocalDateTime = (valor: string): Date | null => {
  if (typeof valor !== "string") {
    return null;
  }

  const [fecha, tiempo] = valor.split("T");
  if (!fecha || !tiempo) {
    return null;
  }

  const [anio, mes, dia] = fecha.split("-").map((parte) => Number(parte));
  const [horaRaw, minutoRaw] = tiempo.split(":");
  const hora = Number(horaRaw);
  const minuto = Number(minutoRaw);

  if ([anio, mes, dia, hora, minuto].some((numero) => !Number.isFinite(numero))) {
    return null;
  }

  return new Date(anio, mes - 1, dia, hora, minuto);
};

const convertirHoraAMinutos = (hora: string): number | null => {
  if (!HORA_REGEX.test(hora)) {
    return null;
  }

  const [horasRaw, minutosRaw] = hora.split(":");
  const horas = Number(horasRaw);
  const minutos = Number(minutosRaw);

  if (!Number.isFinite(horas) || !Number.isFinite(minutos)) {
    return null;
  }

  return horas * 60 + minutos;
};

const CrearEventoModal = ({ open, onClose, onCreated, onError }: CrearEventoModalProps) => {
  const [form, setForm] = useState<FormState>(crearEstadoInicial);
  const [autoHorario, setAutoHorario] = useState<AutoHorarioState>(() => {
    const base = crearEstadoInicial();
    return crearAutoHorarioInicial({ horaInicio: base.horaInicio, horaFin: base.horaFin });
  });
  const [equipos, setEquipos] = useState<EquipoOption[]>([]);
  const [cargandoEquipos, setCargandoEquipos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [errorEquipos, setErrorEquipos] = useState<string | null>(null);
  const [buscandoDisponibilidad, setBuscandoDisponibilidad] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState<string | null>(null);
  const [resultadoDisponibilidad, setResultadoDisponibilidad] = useState<DisponibilidadRespuesta | null>(null);

  const horarioFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const formatearSlotLegible = useCallback(
    (slot: string) => {
      const parsed = parseLocalDateTime(slot);
      return parsed ? horarioFormatter.format(parsed) : slot;
    },
    [horarioFormatter]
  );

  const restablecerFormulario = useCallback(() => {
    const base = crearEstadoInicial();
    setForm(base);
    setAutoHorario(crearAutoHorarioInicial({ horaInicio: base.horaInicio, horaFin: base.horaFin }));
    setBuscandoDisponibilidad(false);
    setResultadoDisponibilidad(null);
    setErrorDisponibilidad(null);
    setErrorLocal(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    restablecerFormulario();
  }, [open, restablecerFormulario]);

  const cargarEquipos = useCallback(async () => {
    setCargandoEquipos(true);
    try {
      const respuesta = await fetch("/api/equipos", { cache: "no-store" });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(datos?.error ?? "No se pudieron cargar tus equipos");
      }

      const lista: EquipoOption[] = Array.isArray(datos?.equipos)
        ? datos.equipos
            .map((item: { id?: unknown; nombre?: unknown }) => ({
              id: Number(item.id),
              nombre: typeof item.nombre === "string" ? item.nombre : "Sin nombre",
            }))
            .filter((item) => Number.isInteger(item.id) && item.id > 0)
        : [];

      setEquipos(lista);
      setErrorEquipos(null);
    } catch (error) {
      console.error("[CrearEventoModal] cargarEquipos", error);
      setEquipos([]);
      setErrorEquipos(error instanceof Error ? error.message : "No se pudieron cargar los equipos");
    } finally {
      setCargandoEquipos(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (equipos.length === 0 && !cargandoEquipos) {
      void cargarEquipos();
    }
  }, [open, equipos.length, cargandoEquipos, cargarEquipos]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const tipoDerivado = useMemo(() => {
    if (form.alcance === "equipo") {
      return "tarea_grupal" as const;
    }

    return form.tipoBase === "evento" ? "evento" : "tarea_personal";
  }, [form.alcance, form.tipoBase]);

  const manejarCambio = (evento: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = evento.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "equipoId" || name === "fechaInicio") {
      setResultadoDisponibilidad(null);
      setErrorDisponibilidad(null);
    }
  };

  const manejarSeleccionTipo = (tipoBase: TipoBase) => {
    setForm((prev) => ({ ...prev, tipoBase }));
  };

  const manejarSeleccionAlcance = (alcance: Alcance) => {
    setForm((prev) => ({ ...prev, alcance, equipoId: alcance === "equipo" ? prev.equipoId : "" }));

    if (alcance === "personal") {
      setAutoHorario((prev) => ({ ...prev, habilitado: false }));
      setResultadoDisponibilidad(null);
      setErrorDisponibilidad(null);
    }
  };

  const manejarToggleAutoHorario = (habilitado: boolean) => {
    setAutoHorario((prev) => ({ ...prev, habilitado }));

    if (!habilitado) {
      setResultadoDisponibilidad(null);
      setErrorDisponibilidad(null);
    }
  };

  const manejarCambioAutoCampo = (
    campo: keyof Omit<AutoHorarioState, "habilitado">,
    valor: string
  ) => {
    setAutoHorario((prev) => ({ ...prev, [campo]: valor }));
    setResultadoDisponibilidad(null);
    setErrorDisponibilidad(null);
  };

  const manejarBusquedaDisponibilidad = useCallback(async () => {
    if (form.alcance !== "equipo") {
      return;
    }

    if (!form.equipoId) {
      setErrorDisponibilidad("Selecciona un equipo antes de buscar disponibilidad");
      return;
    }

    if (!form.fechaInicio) {
      setErrorDisponibilidad("Indica la fecha del evento para calcular la disponibilidad");
      return;
    }

    const horaInicioNormalizada = autoHorario.horaInicio.padStart(5, "0");
    const horaFinNormalizada = autoHorario.horaFin.padStart(5, "0");
    const minutosInicio = convertirHoraAMinutos(horaInicioNormalizada);
    const minutosFin = convertirHoraAMinutos(horaFinNormalizada);
    const duracionMinutos = Number.parseInt(autoHorario.duracion, 10);

    if (minutosInicio === null || minutosFin === null) {
      setErrorDisponibilidad("Debes ingresar horas válidas en formato HH:MM");
      return;
    }

    if (!Number.isFinite(duracionMinutos) || duracionMinutos <= 0) {
      setErrorDisponibilidad("La duración debe ser un número mayor a cero");
      return;
    }

    if (duracionMinutos > 24 * 60) {
      setErrorDisponibilidad("La duración máxima soportada es de 1440 minutos");
      return;
    }

    if (minutosFin <= minutosInicio) {
      setErrorDisponibilidad("La hora final debe ser mayor a la inicial");
      return;
    }

    const inicioIso = combinarFechaHoraLocal(form.fechaInicio, horaInicioNormalizada);
    const finIso = combinarFechaHoraLocal(form.fechaInicio, horaFinNormalizada);

    const inicioFecha = parseLocalDateTime(inicioIso);
    const finFecha = parseLocalDateTime(finIso);

    if (!inicioFecha || !finFecha || finFecha.getTime() <= inicioFecha.getTime()) {
      setErrorDisponibilidad("El rango seleccionado no es válido");
      return;
    }

    setBuscandoDisponibilidad(true);
    setErrorDisponibilidad(null);
    setResultadoDisponibilidad(null);

    try {
      const params = new URLSearchParams({
        teamId: form.equipoId,
        start: inicioIso,
        end: finIso,
        duration: String(duracionMinutos),
      });

      const respuesta = await fetch(`/api/events/smart-availability?${params.toString()}`);
      const datos = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        throw new Error(datos?.error ?? "No se pudo calcular la disponibilidad");
      }

      const resultado = datos as DisponibilidadRespuesta;
      setResultadoDisponibilidad(resultado);

      if (resultado.best) {
        const mejor = parseLocalDateTime(resultado.best);

        if (mejor) {
          const finSugerido = new Date(mejor.getTime() + duracionMinutos * 60 * 1000);
          setForm((prev) => ({
            ...prev,
            fechaInicio: formatearFecha(mejor),
            horaInicio: formatearHora(mejor),
            fechaFin: formatearFecha(finSugerido),
            horaFin: formatearHora(finSugerido),
          }));
        }
      }
    } catch (error) {
      console.error("[CrearEventoModal] manejarBusquedaDisponibilidad", error);
      const mensaje =
        error instanceof Error ? error.message : "No se pudo calcular la disponibilidad";
      setErrorDisponibilidad(mensaje);
      setResultadoDisponibilidad(null);
    } finally {
      setBuscandoDisponibilidad(false);
    }
  }, [
    autoHorario.duracion,
    autoHorario.horaFin,
    autoHorario.horaInicio,
    form.alcance,
    form.equipoId,
    form.fechaInicio,
  ]);

  const manejarEnvio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const titulo = form.titulo.trim();
    if (!titulo) {
      setErrorLocal("El título es obligatorio");
      return;
    }

    if (!form.fechaInicio || !form.fechaFin || !form.horaInicio || !form.horaFin) {
      setErrorLocal("Completa las fechas y horas del evento");
      return;
    }

    const inicioIso = `${form.fechaInicio}T${form.horaInicio}`;
    const finIso = `${form.fechaFin}T${form.horaFin}`;
    const inicioFecha = new Date(inicioIso);
    const finFecha = new Date(finIso);

    if (Number.isNaN(inicioFecha.getTime()) || Number.isNaN(finFecha.getTime())) {
      setErrorLocal("Las fechas proporcionadas no son válidas");
      return;
    }

    if (finFecha.getTime() <= inicioFecha.getTime()) {
      setErrorLocal("La fecha final debe ser mayor a la inicial");
      return;
    }

    let equipoIdNumero: number | null = null;
    if (form.alcance === "equipo") {
      if (!form.equipoId) {
        setErrorLocal("Selecciona un equipo para la tarea grupal");
        return;
      }
      equipoIdNumero = Number(form.equipoId);
      if (!Number.isInteger(equipoIdNumero) || equipoIdNumero <= 0) {
        setErrorLocal("Selecciona un equipo válido");
        return;
      }
    }

    const descripcionTexto = form.descripcion.trim();

    const payload: Record<string, unknown> = {
      titulo,
      descripcion: descripcionTexto.length > 0 ? descripcionTexto : undefined,
      fecha_inicio: form.fechaInicio,
      hora_inicio: form.horaInicio,
      fecha_fin: form.fechaFin,
      hora_fin: form.horaFin,
      tipo: tipoDerivado,
      es_equipo: form.alcance === "equipo" ? 1 : 0,
    };

    if (typeof equipoIdNumero === "number") {
      payload.equipo_id = equipoIdNumero;
    }

    setEnviando(true);
    setErrorLocal(null);
    try {
      const respuesta = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(datos?.error ?? "No se pudo crear el registro");
      }

      const mensaje = typeof datos?.message === "string" ? datos.message : "Registro creado";
      await onCreated(mensaje);
      restablecerFormulario();
    } catch (error) {
      console.error("[CrearEventoModal] manejarEnvio", error);
      const mensaje = error instanceof Error ? error.message : "Ocurrió un error inesperado";
      setErrorLocal(mensaje);
      onError(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex min-h-screen items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-950 max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Nuevo registro</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Crear evento o tarea</h2>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <form onSubmit={manejarEnvio} className="flex h-full flex-col text-gray-900 dark:text-gray-100">
          <div
            className="flex-1 max-h-[85vh] overflow-y-auto overscroll-contain px-6 py-6 scrollbar-thin"
            onWheel={(evento) => evento.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900/70">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tipo</p>
                  <div className="mt-3 flex gap-2">
                    {["evento", "tarea"].map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => manejarSeleccionTipo(opcion as TipoBase)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          form.tipoBase === opcion
                            ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
                        }`}
                      >
                        {opcion === "evento" ? "Evento" : "Tarea"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Los eventos se mostrarán con horario. Las tareas aparecerán como actividades de día completo.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Alcance</p>
                <div className="mt-3 flex gap-2">
                  {["personal", "equipo"].map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => manejarSeleccionAlcance(opcion as Alcance)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        form.alcance === opcion
                          ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      {opcion === "personal" ? "Personal" : "Equipo"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Si eliges equipo, se registrará como tarea grupal automáticamente.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="titulo">
                  Título
                </label>
                <input
                  id="titulo"
                  name="titulo"
                  type="text"
                  required
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2 text-base text-gray-900 transition focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-100"
                  placeholder="Ej. Plan de entrega del sprint"
                  value={form.titulo}
                  onChange={manejarCambio}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="descripcion">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2 text-sm text-gray-900 transition focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-100"
                  rows={4}
                  placeholder="Agrega notas, objetivos o enlaces relevantes"
                  value={form.descripcion}
                  onChange={manejarCambio}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900/70">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Inicio</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      name="fechaInicio"
                      value={form.fechaInicio}
                      onChange={manejarCambio}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-100"
                      required
                    />
                    <input
                      type="time"
                      name="horaInicio"
                      value={form.horaInicio}
                      onChange={manejarCambio}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-100"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900/70">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Fin</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      name="fechaFin"
                      value={form.fechaFin}
                      onChange={manejarCambio}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-100"
                      required
                    />
                    <input
                      type="time"
                      name="horaFin"
                      value={form.horaFin}
                      onChange={manejarCambio}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-100"
                      required
                    />
                  </div>
                </div>
              </div>

              {form.alcance === "equipo" && (
                <div className="space-y-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900/70">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="equipoId">
                      Equipo
                    </label>
                    <select
                      id="equipoId"
                      name="equipoId"
                      value={form.equipoId}
                      onChange={manejarCambio}
                      required
                      className="w-full rounded-2xl border border-gray-300 px-4 py-2 text-sm text-gray-900 transition focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-100"
                    >
                      <option value="">Selecciona un equipo</option>
                      {equipos.map((equipo) => (
                        <option key={equipo.id} value={equipo.id}>
                          {equipo.nombre}
                        </option>
                      ))}
                    </select>
                    {cargandoEquipos && <p className="text-xs text-gray-500 dark:text-gray-400">Cargando equipos...</p>}
                    {!cargandoEquipos && errorEquipos && (
                      <p className="text-xs text-red-600 dark:text-red-300">{errorEquipos}</p>
                    )}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-dashed border-gray-200 p-4 dark:border-gray-600">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-start gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900/70"
                          checked={autoHorario.habilitado}
                          onChange={(evento) => manejarToggleAutoHorario(evento.target.checked)}
                        />
                        <span>
                          Encontrar horario automáticamente
                          <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                            Busca el mejor horario disponible para todo el equipo dentro del rango indicado.
                          </span>
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          void manejarBusquedaDisponibilidad();
                        }}
                        disabled={!autoHorario.habilitado || !form.equipoId || buscandoDisponibilidad}
                        className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400"
                      >
                        {buscandoDisponibilidad ? "Buscando..." : "Buscar disponibilidad"}
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Hora inicio deseada
                        </p>
                        <input
                          id="auto-hora-inicio"
                          type="time"
                          value={autoHorario.horaInicio}
                          onChange={(evento) => manejarCambioAutoCampo("horaInicio", evento.target.value)}
                          disabled={!autoHorario.habilitado}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:border-gray-200 dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Hora fin deseada
                        </p>
                        <input
                          id="auto-hora-fin"
                          type="time"
                          value={autoHorario.horaFin}
                          onChange={(evento) => manejarCambioAutoCampo("horaFin", evento.target.value)}
                          disabled={!autoHorario.habilitado}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:border-gray-200 dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Duración (minutos)
                        </p>
                        <input
                          id="auto-duracion"
                          type="number"
                          min={15}
                          step={15}
                          value={autoHorario.duracion}
                          onChange={(evento) => manejarCambioAutoCampo("duracion", evento.target.value)}
                          disabled={!autoHorario.habilitado}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:border-gray-200 dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {errorDisponibilidad && (
                      <p className="text-xs text-red-600 dark:text-red-300">{errorDisponibilidad}</p>
                    )}

                    {resultadoDisponibilidad && (
                      <div className="space-y-3 rounded-2xl bg-gray-50 p-4 text-sm dark:bg-gray-900/60">
                        {resultadoDisponibilidad.slots.length > 0 ? (
                          <div className="space-y-2">
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              Se encontraron horarios donde todo el equipo está disponible:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {resultadoDisponibilidad.slots.map((slot) => (
                                <span
                                  key={slot}
                                  className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-200"
                                >
                                  {formatearSlotLegible(slot)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : resultadoDisponibilidad.best ? (
                          <p className="font-medium text-amber-600 dark:text-amber-300">
                            ⚠️ No existe un horario donde todos estén disponibles. Se sugiere el siguiente horario óptimo:
                            {" "}
                            <span className="font-semibold">
                              {formatearSlotLegible(resultadoDisponibilidad.best)}
                            </span>
                          </p>
                        ) : (
                          <p className="font-medium text-amber-600 dark:text-amber-300">
                            ⚠️ No se encontraron horarios disponibles en el rango indicado.
                          </p>
                        )}

                        {resultadoDisponibilidad.score.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Disponibilidad por horario
                            </p>
                            <ul className="space-y-2">
                              {resultadoDisponibilidad.score.map((item) => (
                                <li
                                  key={item.slot}
                                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                                    item.slot === resultadoDisponibilidad.best
                                      ? "border-blue-500/60 bg-blue-50 text-blue-700 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-200"
                                      : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-200"
                                  }`}
                                >
                                  <span>{formatearSlotLegible(item.slot)}</span>
                                  <span className="font-semibold">
                                    {item.available} / {item.total} disponibles
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errorLocal && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                  {errorLocal}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tipoDerivado === "evento"
                ? "El registro se añadirá como evento con horario."
                : tipoDerivado === "tarea_grupal"
                  ? "Se creará una tarea grupal para tu equipo."
                  : "Se añadirá una tarea personal para ese día."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/80"
                onClick={onClose}
                disabled={enviando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400"
                disabled={enviando}
              >
                {enviando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearEventoModal;
