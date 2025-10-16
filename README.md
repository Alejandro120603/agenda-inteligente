# Agenda Inteligente

Plataforma de gestión de tiempo y reuniones compuesta por un backend Flask y un frontend en React. Este documento resume el diagnóstico y la solución definitiva del problema de arranque de MySQL que impedía levantar el entorno completo.

## Diagnóstico del fallo en MySQL

**Síntomas observados**
- El contenedor `agenda-db` entraba en un bucle de reinicios y quedaba en estado `unhealthy`.
- Los logs solo mostraban `Initializing database files` y nunca aparecían los mensajes de fin de arranque ni de ejecución de `/docker-entrypoint-initdb.d`.
- `docker exec -it agenda-db mysql ...` fallaba incluso después de esperar varios minutos.

**Causa raíz**
- Las credenciales definidas (`rootpass` y `agenda123`) no cumplían con la política de contraseñas por defecto de MySQL 8 (`validate_password` en modo *MEDIUM*, que exige mayúsculas, minúsculas, números y caracteres especiales).
- El entrypoint oficial de la imagen `mysql:8.0.33` aborta el proceso de inicialización cuando falla el `ALTER USER ... IDENTIFIED BY ...` que establece estas credenciales.
- Al abortar antes de ejecutar `docker-entrypoint-initdb.d`, el servidor nunca llegaba a publicar el mensaje **“MySQL init process done. Ready for start up.”** ni a aceptar conexiones TCP.

## Correcciones aplicadas

1. **Credenciales robustas**: se actualizaron `MYSQL_ROOT_PASSWORD` y `MYSQL_PASSWORD` a valores que cumplen la política de MySQL (`RootPass123@` y `Agenda2025!`). Tanto Docker Compose como `backend/.env` leen ahora las mismas variables para que Flask se conecte correctamente.
2. **Inicialización consistente**: los scripts viven en `./init_db` (solo lectura dentro del contenedor) y se usa un volumen nombrado `mysql_data` para preservar el datadir entre reinicios.
3. **Healthcheck confiable**: el `docker-compose.yml` ahora usa el nuevo password de root en el `mysqladmin ping`, evitando falsos negativos.
4. **Verificación automática**: se añadió el script `scripts/check_db.sh` (expuesto también como `make check-db`) para listar bases y tablas, devolviendo código de salida distinto de cero ante cualquier error.

## Puesta en marcha limpia

1. **Limpiar contenedores y volumen**
   ```bash
   docker compose down -v
   docker volume rm agenda-inteligente_mysql_data  # opcional si quieres borrar completamente el datadir
   ```

2. **Reconstruir y levantar servicios**
   ```bash
   make compose-up
   ```
   Espera a ver en los logs de `agenda-db`:
   - `[Entrypoint]: Running /docker-entrypoint-initdb.d/init_db.sql`
   - `[Entrypoint]: MySQL init process done. Ready for start up.`
   - `[Server] Ready for connections.`

3. **Verificar estado de la base de datos**
   ```bash
   make check-db
   # o manualmente
   docker exec -it agenda-db mysql -h127.0.0.1 -uroot -pRootPass123@ -e "SHOW TABLES FROM agenda_inteligente;"
   ```

4. **Arrancar backend**
   El contenedor `agenda-backend` ejecuta `wait_for_db.py`; una vez que imprime `✅ Conexión establecida con la base de datos.` el backend Flask queda listo en `http://localhost:5000`.

## Notas adicionales
- Si el volumen `mysql_data` ya existía, MySQL arrancará directamente sin reejecutar `init_db.sql`. Solo se ejecuta en el primer arranque (cuando el volumen está vacío).
- Para reiniciar la base de datos desde cero puedes usar `make reset-db`, que elimina contenedores y volumen y vuelve a inicializar todo.
- El script `scripts/check_db.sh` acepta variables opcionales (`COMPOSE_BIN`, `DB_SERVICE`, `DB_NAME`, `ROOT_PASSWORD`) para integrarlo en CI o pipelines personalizados.
