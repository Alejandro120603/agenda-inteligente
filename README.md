# Agenda Inteligente

## Descripción
Proyecto **Agenda Inteligente**, una plataforma de gestión de tiempo y reuniones con sincronización hacia servicios externos como Outlook o Google Calendar.

### Estructura del proyecto
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Flask (Python)
- **Docs:** Documentación técnica y funcional

### Cómo iniciar el proyecto localmente
```bash
git clone https://github.com/TU_USUARIO/agenda-inteligente.git
cd agenda-inteligente
```

### Reconstrucción limpia de contenedores
Si necesitas forzar una reconstrucción del backend para asegurar que se use el `entrypoint.sh` actualizado, ejecuta los siguientes comandos:

```bash
docker compose down -v
docker image rm agenda-inteligente-backend || true
docker builder prune -af
docker compose build --no-cache backend
docker compose up -d
```

### Endpoints
- Backend disponible en: [http://localhost:5000](http://localhost:5000)
- Endpoint de eventos de Google: [http://localhost:5000/api/google/events](http://localhost:5000/api/google/events)
