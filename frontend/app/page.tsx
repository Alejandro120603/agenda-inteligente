// Página raíz de la aplicación; redirige inmediatamente al formulario de inicio de sesión.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
