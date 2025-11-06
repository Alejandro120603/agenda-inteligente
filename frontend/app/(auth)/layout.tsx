// Layout de grupo para las pantallas de autenticación; asegura un lienzo centrado y sin elementos del panel.
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {children}
    </div>
  );
}
