// app/(panel)/layout.tsx
import React from "react";
// import Header from "@/components/Header"; // <-- comentalo o borralo

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* Sidebar aquí */}
          <aside>{/* ... */}</aside>

          <main className="flex-1">
            {/* <Header /> */}   {/* <-- comentado temporalmente */}
            <div className="p-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
