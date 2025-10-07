import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button.jsx';

function Modal({ title, children, onClose, isOpen, actions }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <Button variant="ghost" className="p-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-4 px-6 py-4">{children}</div>
        {actions && <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
