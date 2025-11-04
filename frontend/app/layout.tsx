import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import "../styles/globals.css";
import "../styles/theme.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Agenda Inteligente",
  description: "Dashboard principal de Agenda Inteligente",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <div className="flex min-h-screen w-full bg-gray-50">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col md:ml-64">
            <Header />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
