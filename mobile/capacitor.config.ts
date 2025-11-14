import type { CapacitorConfig } from "@capacitor/cli";

// Esta configuración solo abre la versión web hospedada de Agenda Inteligente.
// No se incluye backend ni base de datos dentro de la app móvil.
const config: CapacitorConfig = {
  appId: "com.agenda.inteligente",
  appName: "Agenda Inteligente",
  bundledWebRuntime: false,
  webDir: "public",
  server: {
    // En desarrollo apunta a tu LAN (por ejemplo http://192.168.1.20:3000).
    // En producción define MOBILE_SERVER_URL con tu dominio HTTPS.
    url: process.env.MOBILE_SERVER_URL ?? "http://localhost:3000",
    cleartext: true
  }
};

export default config;
