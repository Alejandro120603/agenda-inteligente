import { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { toastBus } from '../services/toastService.js';
import clsx from 'clsx';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = toastBus.subscribe((toast) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      setToasts((prev) => [...prev, { id, ...toast }]);
      setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 4000);
    });

    return unsub;
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-3">
      {toasts.map(({ id, type, message }) => {
        const Icon = icons[type] || Info;
        return (
          <div
            key={id}
            className={clsx(
              'pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur',
              type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              type === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
              type === 'info' && 'border-brand-200 bg-brand-50 text-brand-700'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{message}</span>
            <button
              className="ml-auto text-xs text-slate-500 transition hover:text-slate-800"
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
