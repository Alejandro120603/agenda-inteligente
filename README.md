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

### Flujo de arranque del backend
Al iniciar los contenedores deberías ver, en los logs del backend, un flujo similar al siguiente:

```
⏳ Esperando a la base de datos...
🔍 Intentando conectar a MySQL (host=db, user=agenda_user, port=3306, db=agenda_inteligente)
  ↳ Intento 1: apertura de conexión (timeout=5s, tiempo restante ~115s)
⚠️ MySQL aún no acepta conexiones (connection refused): (2003, "Can't connect to MySQL server on 'db' ([Errno 111] Connection refused)")
  ↳ Intento 2: apertura de conexión (timeout=5s, tiempo restante ~113s)
✅ Base de datos disponible, conexión de prueba cerrada.
🚀 Iniciando Flask...
```

Los mensajes indican claramente si MySQL todavía no acepta conexiones, si hubo un problema de credenciales (`🚫 Credenciales rechazadas por MySQL`) o si se alcanzó el tiempo máximo de espera (`⛔️ Tiempo de espera agotado esperando la base de datos.`). Una vez establecida la conexión de prueba se inicia Flask y deberías ver el mensaje `Running on http://0.0.0.0:5000` en los logs.

### Endpoints
- Backend disponible en: [http://localhost:5000](http://localhost:5000)
- Endpoint de eventos de Google: [http://localhost:5000/api/google/events](http://localhost:5000/api/google/events)
