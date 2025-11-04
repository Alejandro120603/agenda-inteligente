// frontend/app/login/layout.tsx
import type { ReactNode } from "react";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    // Este div reemplaza al layout global sin usar <html> o <body>
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  );
}

