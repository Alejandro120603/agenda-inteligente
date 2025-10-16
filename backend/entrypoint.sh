#!/bin/sh
set -eu

# Variables con valores por defecto para facilitar pruebas locales.
# Respetamos primero las variables DB_* declaradas por ``env_file``; si no
# existen, usamos posibles equivalentes MYSQL_* y, en última instancia,
# valores por defecto seguros para desarrollo local.
DB_HOST="${DB_HOST:-${MYSQL_HOST:-db}}"
DB_PORT="${DB_PORT:-${MYSQL_PORT:-3306}}"
DB_USER="${DB_USER:-${MYSQL_USER:-agenda_user}}"
DB_PASSWORD="${DB_PASSWORD:-${MYSQL_PASSWORD:-agenda123}}"
DB_NAME="${DB_NAME:-${MYSQL_DATABASE:-agenda_inteligente}}"

export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME

printf '⏳ Esperando a que MySQL (%s:%s) esté listo...\n' "$DB_HOST" "$DB_PORT"

attempt=1
while true; do
  if python - "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASSWORD" "$DB_NAME" <<'PY'; then
import sys
import pymysql

host, port, user, password, database = sys.argv[1:6]
port = int(port)

try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        connect_timeout=3,
    )
except pymysql.MySQLError:
    sys.exit(1)
else:
    conn.close()
PY
    break
  fi

  sleep_duration=$((attempt < 5 ? attempt * 2 : 10))
  printf '   ↻ Base de datos no disponible todavía (intento %s). Reintentando en %s s...\n' "$attempt" "$sleep_duration"
  sleep "$sleep_duration"
  attempt=$((attempt + 1))
done

printf '✅ Conexión establecida con la base de datos\n'

exec flask --app app run --host=0.0.0.0
