import clsx from 'clsx';

const baseStyles = 'inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary: 'bg-white text-brand-700 shadow hover:bg-slate-100 border border-slate-200',
  ghost: 'text-slate-600 hover:bg-slate-100'
};

function Button({ type = 'button', variant = 'primary', className, children, ...props }) {
  return (
    <button type={type} className={clsx(baseStyles, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export default Button;
