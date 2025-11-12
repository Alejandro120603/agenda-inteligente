import { motion } from "framer-motion";

interface GreetingProps {
  name: string;
  date: string;
}

export default function Greeting({ name, date }: GreetingProps) {
  const firstName = name?.split(" ")[0] ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-xl"
    >
      <div className="rounded-[calc(1.5rem-1px)] bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-indigo-600">Hoy es</p>
        <p className="mt-1 text-sm font-medium text-slate-500">{date}</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-900">
          Hola, <span className="text-indigo-600">{firstName || "invitado"}</span>
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Aquí tienes un resumen de tus actividades para el día de hoy. Mantén el ritmo y coordina a tu equipo
          fácilmente.
        </p>
      </div>
    </motion.div>
  );
}
