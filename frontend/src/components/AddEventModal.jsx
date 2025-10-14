import { useEffect, useState } from "react";

// Modal para introducir los datos de un nuevo evento.
// Incluye control del formulario y acciones de guardar/cancelar.
function AddEventModal({ isOpen, onClose, onSave }) {
  const [formValues, setFormValues] = useState({
    title: "",
    time: "",
    description: "",
  });

  // Cuando el modal se abre, reiniciamos los campos para evitar datos residuales.
  useEffect(() => {
    if (isOpen) {
      setFormValues({ title: "", time: "", description: "" });
    }
  }, [isOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formValues.title.trim() || !formValues.time.trim()) {
      return;
    }

    onSave({
      title: formValues.title.trim(),
      time: formValues.time.trim(),
      description: formValues.description.trim(),
    });
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Nuevo evento</h2>
          <p className="text-sm text-slate-500 mt-1">
            Completa la información para añadirlo a tu agenda.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formValues.title}
              onChange={handleChange}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Ej. Reunión con marketing"
              required
            />
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-slate-700">
              Hora
            </label>
            <input
              id="time"
              name="time"
              type="text"
              value={formValues.time}
              onChange={handleChange}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Ej. 4:00 PM"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700"
            >
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={formValues.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Notas adicionales"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Guardar evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEventModal;
