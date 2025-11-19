# Agenda Inteligente

## Descripción
Proyecto **Agenda Inteligente**, una plataforma para gestionar reuniones y agendas compartidas. El repositorio está organizado como un monorepo que concentra el frontend (Next.js) y las utilidades de base de datos.

## Estructura del proyecto
- **frontend/**: Aplicación Next.js (App Router) con TailwindCSS.
- **db/**: Scripts de esquema y semillas para SQLite.
- **data/**: Ubicación esperada de la base `app.db` utilizada por la aplicación (fuera de `frontend/`).

## Puesta en marcha rápida del frontend
```bash
cd frontend
npm install
npm run dev
```

La aplicación espera encontrar la base de datos SQLite en `../data/app.db` (desde la carpeta `frontend/`). Si necesitas un archivo inicial puedes generar uno ejecutando el `schema.sql` dentro de `db/`.

## Base de datos
La tabla principal `usuarios` utilizada para autenticación y registro contiene las siguientes columnas:

| Columna         | Tipo         | Descripción                                      |
| --------------- | ------------ | ------------------------------------------------ |
| `id`            | INTEGER PK   | Identificador autoincremental.                   |
| `nombre`        | VARCHAR(100) | Nombre visible de la persona usuaria (`name`).   |
| `correo`        | VARCHAR(150) | Correo electrónico único (`email`).              |
| `password_hash` | TEXT         | Hash de contraseña generado con `bcryptjs`.      |
| `zona_horaria`  | VARCHAR(50)  | Zona horaria preferida (opcional).               |
| `creado_en`     | DATETIME     | Marca de tiempo de creación (`created_at`).      |

> Nota: los campos `nombre`/`correo` se exponen como `name`/`email` en las respuestas HTTP.

## API (Next.js App Router)
Los endpoints HTTP viven bajo `frontend/app/api/*/route.ts`. Cada carpeta dentro de `app/api` define una ruta; por ejemplo, el archivo `frontend/app/api/register/route.ts` responde a `POST /api/register`.

Endpoints disponibles:

- `POST /api/register`: Crea una nueva cuenta.
- `POST /api/login`: Autentica y devuelve los datos públicos del usuario.
- `GET /api/user` y `GET /api/me`: Recuperan la información del usuario autenticado utilizando la cookie de sesión existente.

Consulta la documentación detallada de los endpoints en el código fuente dentro de `frontend/app/api/`.

## Flujo de autenticación y cookie de sesión

1. **Inicio de sesión (`POST /api/login`)**
   - El route handler valida las credenciales y, cuando son correctas, genera una cookie `user_id` con el identificador del usuario.
   - La cookie está configurada como `httpOnly`, `sameSite: "lax"`, `path: "/"` y `secure` en producción, con una duración de 7 días.
   - El cuerpo de la respuesta incluye `{ ok: true, user: { id, name, email } }` para que el cliente pueda mostrar la información básica.

2. **Lectura de la sesión (`GET /api/user`)**
   - El helper `getUserFromSession` definido en `frontend/lib/auth.ts` usa `cookies().get("user_id")` para leer la cookie establecida durante el login.
   - Si la cookie existe y el usuario está presente en la base de datos, la respuesta es `{ id, name, email }`.
   - Si la cookie no está o el usuario no existe, el endpoint responde `401` con `{ "error": "No autenticado" }`.

3. **Renderizado del saludo en `/inicio`**
   - El componente cliente `frontend/app/(panel)/inicio/page.tsx` llama a `/api/user` cuando se monta.
   - Con una sesión activa muestra `Hola, {name} `; si la petición responde `401/404` mantiene el fallback `Hola, invitado `.

### Ejemplos de solicitudes/respuestas

#### `POST /api/login`

```http
POST /api/login HTTP/1.1
Content-Type: application/json

{ "correo": "diego@example.com", "password": "supersecreto" }
```

```json
{
  "ok": true,
  "user": {
    "id": 1,
    "name": "Diego",
    "email": "diego@example.com"
  }
}
```

> La respuesta incluye la cookie de sesión `user_id` en el encabezado `Set-Cookie`.

#### `GET /api/user` (con sesión activa)

```json
{
  "id": 1,
  "name": "Diego",
  "email": "diego@example.com"
}
```

#### `GET /api/user` (sin sesión)

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{ "error": "No autenticado" }
```

## Multiplataforma

### PWA (Next.js)
1. Instala dependencias y levanta el frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Verifica que `http://localhost:3000/manifest.json` responde correctamente.
3. Abre las DevTools del navegador (Application → Service Workers) y confirma que `sw.js` se registre en producción. En desarrollo puedes forzarlo ejecutando un build (`npm run build && npm run start`).
4. Ejecuta Lighthouse y comprueba que detecta la aplicación como instalable.
5. Sustituye los iconos de `frontend/public/icons/` por imágenes reales en formato PNG para los tamaños indicados (192px y 512px como mínimo).

### Aplicación móvil (Capacitor)
Consulta la guía detallada en [`mobile/README.md`](mobile/README.md). Resumen rápido:
1. Copia `.env.multiplatform.example` a `.env` y ajusta `MOBILE_SERVER_URL`.
2. Desde `mobile/`, instala dependencias con `npm install`.
3. Sincroniza plataformas con `npm run sync`.
4. Añade Android/iOS (`npx cap add android` / `npx cap add ios`) y abre cada proyecto (`npm run android` / `npm run ios`).
5. Comprueba que la aplicación abre la web remota y funciona el inicio de sesión.

### Aplicación de escritorio (Tauri)
Consulta [`desktop/README.md`](desktop/README.md). Resumen:
1. Configura `DESKTOP_SERVER_URL` en tu `.env`.
2. Desde `desktop/`, instala dependencias con `npm install`.
3. Ejecuta `npm run dev` para abrir la ventana que carga la web remota.
4. Utiliza `npm run build` para generar binarios de distribución.

## Resumen de cambios multiplataforma
- **PWA**: `frontend/public/manifest.json`, `frontend/public/sw.js`, `frontend/app/layout.tsx`, `frontend/components/ServiceWorkerRegistrar.tsx`.
- **Mobile (Capacitor)**: carpeta `mobile/` con `package.json`, `capacitor.config.ts`, `tsconfig.json` y documentación.
- **Desktop (Tauri)**: carpeta `desktop/` con configuración de Tauri (`src-tauri/`), `package.json`, `README.md` y placeholder de frontend.
- **Configuración común**: archivo `.env.multiplatform.example` en la raíz para centralizar URLs.

## Cómo probar todo
1. **Web PWA**:
   - `cd frontend && npm run dev`.
   - Visita `http://localhost:3000/manifest.json` y comprueba que Lighthouse reconoce la PWA.
   - En producción (`npm run build && npm run start`), revisa en DevTools que el service worker esté activo.
2. **Mobile**:
   - `cd mobile && npm install`.
   - Ajusta `MOBILE_SERVER_URL` para apuntar al backend remoto (LAN o dominio).
   - `npm run sync`, luego `npx cap add android` / `npx cap add ios` y abre cada IDE con `npm run android` / `npm run ios`.
   - Comprueba que la app carga la web y que las operaciones básicas (login, eventos) funcionan.
3. **Desktop**:
   - `cd desktop && npm install`.
   - Configura `DESKTOP_SERVER_URL` (por ejemplo `http://localhost:3000`).
   - `npm run dev` para ejecutar en modo desarrollo o `npm run build` para generar binarios.
   - Confirma que la ventana abre la web de Agenda Inteligente y mantiene el flujo de trabajo.
