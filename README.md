# SAgenda Inteligente

## Descripción
Proyecto **Agenda Inteligente**, una plataforma de gestión de tiempo y reuniones con sincronización hacia servicios externos como Outlook o Google Calendar.

### Estructura del proyecto
- **Frontend:** React + Vite + TailwindCSS  
- **Backend:** Flask (Python) o Node (por definir)  
- **Docs:** documentación técnica y funcional

### Cómo iniciar el proyecto localmente
```bash
git clone https://github.com/TU_USUARIO/agenda-inteligente.git
cd agenda-inteligente
```

### Problema conocido: MySQL no levanta

Si al ejecutar `docker-compose up` observas que el contenedor `agenda-db` se
reinicia constantemente y `docker exec -it agenda-db mysql -uroot -prootpass`
devuelve `Can't connect to local MySQL server through socket`, verifica que el
archivo `backend/models/init_db.sql` exista y que el volumen en
`docker-compose.yml` apunte a esa ruta. Una referencia incorrecta hace que
Docker monte un directorio vacío en `/docker-entrypoint-initdb.d/init_db.sql`,
provocando que el entrypoint de MySQL falle al intentar ejecutar el script de
inicialización y el servidor nunca termine de arrancar.

Con la configuración actualizada en este repositorio, el servicio debería
arrancar correctamente y aceptar conexiones internas (`127.0.0.1`) y externas
(`db:3306`).
