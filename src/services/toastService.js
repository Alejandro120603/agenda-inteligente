class ToastBus {
  listeners = new Set();

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event) {
    this.listeners.forEach((listener) => listener(event));
  }
}

export const toastBus = new ToastBus();
