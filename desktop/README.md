# Aplicación de escritorio con Tauri

Este contenedor de escritorio utiliza **Tauri** para abrir la versión web remota de Agenda Inteligente.

## Requisitos previos

- Rust y cargo instalados (consulta <https://www.rust-lang.org/tools/install>).
- Node.js 18+ y npm 9+.
- El backend de Agenda Inteligente accesible desde la máquina local o un dominio público.

## Preparación inicial

1. Instala las dependencias de JavaScript:

   ```bash
   cd desktop
   npm install
   ```

   > También puedes recrear el proyecto con `npm create tauri-app@latest` eligiendo una plantilla vacía y reemplazando la configuración con los archivos de esta carpeta.

2. Configura la variable `DESKTOP_SERVER_URL` en tu `.env` (consulta `../.env.multiplatform.example`).
   - En desarrollo apunta a `http://localhost:3000` mientras ejecutas `frontend`.
   - En producción utiliza tu dominio HTTPS público.

## Ejecución

- Desarrollo:

  ```bash
  npm run dev
  ```

  Esto abrirá una ventana de Tauri que carga la URL definida en `DESKTOP_SERVER_URL`.

- Construcción de binarios:

  ```bash
  npm run build
  ```

  Generará instaladores o ejecutables para la plataforma actual en `src-tauri/target/`.

## Notas importantes

- No se empaqueta ningún backend ni base de datos dentro de la aplicación. Todo el tráfico se dirige al backend remoto existente.
- Asegúrate de permitir contenido remoto en `tauri.conf.json` si utilizas dominios externos (la configuración incluida ya lo hace).
- Para depurar problemas de conexión, verifica la consola de desarrollador (Ctrl+Shift+I) en la ventana de Tauri y la disponibilidad del backend remoto.
