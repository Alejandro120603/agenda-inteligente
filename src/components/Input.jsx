import clsx from 'clsx';

function Input({ label, type = 'text', className, error, ...props }) {
  return (
    <label className="flex flex-col space-y-2 text-sm">
      {label && <span className="font-medium text-slate-700">{label}</span>}
      <input
        type={type}
        className={clsx(
          'w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}

export default Input;
