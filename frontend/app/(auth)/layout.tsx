// Layout de grupo para las pantallas de autenticación; asegura un lienzo centrado y sin elementos del panel.
import type { ReactNode } from "react";
import AuthLayoutShell from "./AuthLayout";

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
