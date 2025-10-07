function Loader({ label = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

export default Loader;
