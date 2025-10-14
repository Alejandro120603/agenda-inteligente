// Botón reutilizable para disparar la creación de un nuevo evento.
// Se mantiene la apariencia flotante utilizando clases de Tailwind.
function AddEventButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-lg transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Agregar evento
    </button>
  );
}

export default AddEventButton;
