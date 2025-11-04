// Página de configuración que se beneficia del layout del panel al estar dentro del grupo (panel).
export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Título y descripción general de la vista de configuración. */}
      <section>
        <h2 className="text-3xl font-semibold text-gray-900">Configuración de cuenta</h2>
        <p className="mt-2 text-sm text-gray-500">
          Personaliza las notificaciones, gestiona tus integraciones y mantén tu información actualizada.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario principal con los datos personales del usuario. */}
        <form className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="name" className="text-sm font-semibold text-gray-700">
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue="Daniela García"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-gray-700">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue="daniela@agendainteligente.com"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Autenticación en dos pasos</p>
              <p className="text-xs text-gray-500">Añade una capa adicional de seguridad a tu cuenta.</p>
            </div>
            <button className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600">
              Configurar
            </button>
          </div>
          <button className="w-full rounded-full bg-indigo-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
            Guardar cambios
          </button>
        </form>
        {/* Tarjeta secundaria con opciones de notificaciones. */}
        <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
            <p className="text-sm text-gray-500">Controla qué alertas recibes y por qué canal.</p>
          </div>
          <ul className="space-y-4 text-sm text-gray-600">
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800">Recordatorios de eventos</p>
                <p className="text-xs text-gray-500">Notificaciones push 30 minutos antes de cada reunión.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">Activo</span>
            </li>
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800">Resúmenes diarios</p>
                <p className="text-xs text-gray-500">Envío a primera hora con los eventos y tareas del día.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">Programado</span>
            </li>
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800">Alertas de equipos</p>
                <p className="text-xs text-gray-500">Recibe avisos cuando tu equipo actualice la agenda compartida.</p>
              </div>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">Silenciado</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
