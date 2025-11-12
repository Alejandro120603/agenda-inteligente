"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-gray-900">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-24 top-[-10rem] h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.div
          className="absolute -right-12 bottom-[-10rem] h-[28rem] w-[28rem] rounded-full bg-purple-500/20 blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/10">
              <Image src="/logo.png" alt="Agenda Inteligente" width={64} height={64} priority />
            </div>
            <h1 className="text-2xl font-semibold text-white">Agenda Inteligente</h1>
            <p className="mt-2 text-sm text-slate-200/80">
              Organiza tu día, mantén tu equipo sincronizado y recibe recordatorios inteligentes.
            </p>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
