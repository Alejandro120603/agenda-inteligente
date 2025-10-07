# Agenda Inteligente

Aplicación frontend creada con **React + Vite + TailwindCSS** para coordinar reuniones inteligentes entre equipos. Incluye autenticación simulada, panel principal, gestión de reuniones, equipos y perfil de usuario.

## 🚀 Scripts disponibles

```bash
npm install
npm run dev
npm run build
npm run preview
```

> El proyecto usa servicios mock con Axios y JSONPlaceholder para simular respuestas del backend.

## 🔐 Usuarios de ejemplo

Puedes iniciar sesión con las credenciales demo:

- **Correo:** `demo@agenda.com`
- **Contraseña:** `demo123`

## 📁 Estructura principal

```
src/
├── components/
├── context/
├── hooks/
├── layouts/
├── pages/
├── services/
├── App.jsx
└── main.jsx
```

## 🛠️ Tecnologías

- React 18 con Vite
- TailwindCSS para estilos
- React Router v6
- Axios
- Lucide React Icons
- Context API para sesión de usuario

## 📦 Backend simulado

Los servicios bajo `src/services` utilizan Axios contra JSONPlaceholder para emular latencia de red y responden con datos mockeados en memoria.
