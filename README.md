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
