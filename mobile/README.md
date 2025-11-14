# Aplicación móvil con Capacitor

Este wrapper móvil carga la versión web hospedada de **Agenda Inteligente** dentro de un WebView utilizando Capacitor.

## Requisitos previos

- Node.js 18 o superior.
- npm 9 o superior.
- Android Studio (para Android) y Xcode (para iOS) instalados según la plataforma que quieras probar.
- Un backend de Agenda Inteligente corriendo de forma remota o accesible en la red local.

## Preparación del proyecto

1. Instala las dependencias dentro de la carpeta `mobile/`:

   ```bash
   cd mobile
   npm install
   ```

   > Si prefieres recrear el proyecto desde cero, ejecuta `npm create @capacitor/app@latest` y selecciona la plantilla en blanco.

2. Configura la URL del backend remoto editando la variable `MOBILE_SERVER_URL` en el archivo `.env` (consulta `../.env.multiplatform.example`).
   - En desarrollo, apunta a la IP local donde corra `frontend` (por ejemplo `http://192.168.1.20:3000`).
   - En producción, usa tu dominio público (`https://agenda.midominio.com`).

3. Sincroniza las plataformas nativas después de cualquier cambio de configuración:

   ```bash
   npm run sync
   # o directamente
   npx cap sync
   ```

## Añadir plataformas

- Android:

  ```bash
  npx cap add android
  npm run android
  ```

- iOS:

  ```bash
  npx cap add ios
  npm run ios
  ```

Cada comando `open` lanzará el proyecto en Android Studio o Xcode para que puedas compilar y ejecutar.

## Comportamiento

- La app **no** incluye ningún backend ni base de datos local. Todo el contenido se sirve desde la URL definida en `capacitor.config.ts`.
- Las llamadas a `/api/...` siguen funcionando porque la web renderizada dentro del WebView se comunica con el backend remoto existente.
- Si cambias la URL del servidor, vuelve a ejecutar `npm run sync` para propagar la configuración a los proyectos nativos.

## Lanzamiento

1. Asegúrate de tener el backend (`frontend/`) accesible en la red.
2. Construye o abre la plataforma deseada desde Android Studio o Xcode.
3. Comprueba que la aplicación abre la interfaz de Agenda Inteligente y que puedes iniciar sesión y gestionar eventos.
