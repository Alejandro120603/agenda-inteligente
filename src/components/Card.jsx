import clsx from 'clsx';

function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
