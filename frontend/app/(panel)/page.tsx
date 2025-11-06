// Página índice del panel que redirige automáticamente a la sección de Inicio.
import { redirect } from "next/navigation";

export default function PanelIndexPage() {
  redirect("/inicio");
}
