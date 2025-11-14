const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 👇 Nueva configuración requerida por Next.js 16 para silenciar el error cuando coexisten ajustes de Webpack.
  turbopack: {},
  // Si necesitas seguir usando Webpack (por ejemplo, por alias personalizados), ejecuta `next dev --webpack`.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.swr = path.resolve(__dirname, "lib/swr");
    return config;
  },
};

module.exports = nextConfig;
