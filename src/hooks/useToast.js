import { useCallback } from 'react';
import { toastBus } from '../services/toastService.js';

export function useToast() {
  const push = useCallback((type, message) => {
    toastBus.emit({ type, message });
  }, []);

  return {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message)
  };
}
