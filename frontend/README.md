# 📅 Agenda Inteligente

Una plataforma de gestión de tiempo y reuniones que permite visualizar eventos, tareas y sincronizar compromisos con servicios externos (Outlook, Google Calendar, etc.).

---

## 🚀 Estado del proyecto
✅ **MVP Frontend funcional**  
Construido con React + Vite + TailwindCSS v4 y una estructura modular preparada para integración con backend Flask.

---

## 🧩 Estructura del proyecto

agenda-inteligente/
├── frontend/
│ ├── src/
│ │ ├── pages/
│ │ │ └── Dashboard.jsx → vista principal
│ │ ├── components/
│ │ │ ├── EventCard.jsx → tarjeta de eventos
│ │ │ └── TaskCard.jsx → tarjeta de tareas
│ │ └── App.jsx → punto de entrada
│ ├── postcss.config.js
│ ├── tailwind.config.js
│ └── index.css → @import "tailwindcss";
├── backend/ → reservado para API Flask
├── docs/ → documentación técnica
└── Makefile → automatización de tareas

yaml
Copiar código

---

## ⚙️ Tecnologías utilizadas

| Tipo | Herramienta |
|------|--------------|
| **Frontend** | React + Vite |
| **Estilos** | TailwindCSS v4 |
| **Compilador CSS** | PostCSS + @tailwindcss/postcss |
| **Automatización** | Makefile |
| **Gestor de dependencias** | npm |

---

## 🧠 Funcionalidades implementadas (MVP)

- 🏠 **Dashboard principal** con eventos y tareas simuladas (mock data).  
- 🧱 **Componentes reutilizables:**  
  - `EventCard` → muestra eventos próximos.  
  - `TaskCard` → muestra tareas pendientes.  
- 🎨 **Estilos responsivos** con Tailwind.  
- ⚡ **Servidor Vite** para desarrollo rápido.  
- 🧰 **Makefile** con comandos útiles (`run`, `install`, `clean`).

---

## 🧾 Makefile disponible

Comandos:
```bash
make run       # Ejecuta el servidor frontend (Vite)
make install   # Instala dependencias
make clean     # Limpia cachés y node_modules
make help      # Muestra los comandos disponibles
💻 Cómo ejecutar el proyecto
bash
Copiar código
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/agenda-inteligente.git
cd agenda-inteligente

# Instalar dependencias
make install

# Iniciar el servidor de desarrollo
make run
Luego abre en tu navegador:
👉 http://localhost:5173

🧩 Próximos pasos
 Crear formulario/modal “Agregar evento”.

 Conectar con backend Flask (API REST).

 Añadir persistencia (localStorage o BD).

 Sincronizar con Google / Outlook Calendar.