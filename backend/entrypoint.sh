#!/bin/sh
set -euo pipefail

# Variables con valores por defecto para facilitar pruebas locales.
DB_HOST="${MYSQL_HOST:-db}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-agenda_user}"
DB_PASSWORD="${MYSQL_PASSWORD:-agenda123}"
DB_NAME="${MYSQL_DATABASE:-agenda_inteligente}"

export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME

printf '⏳ Esperando a que MySQL (%s:%s) esté listo...\n' "$DB_HOST" "$DB_PORT"

# Reintento exponencial leve para manejar reinicios lentos de InnoDB.
attempt=1
until python - <<'PY'
import os
import pymysql

host = os.environ["DB_HOST"]
port = int(os.environ["DB_PORT"])
user = os.environ["DB_USER"]
password = os.environ["DB_PASSWORD"]
database = os.environ["DB_NAME"]

try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        connect_timeout=3,
    )
except pymysql.err.OperationalError:
    raise SystemExit(1)
else:
    conn.close()
PY

do
  sleep_duration=$((attempt < 5 ? attempt * 2 : 10))
  printf '   ↻ Base de datos no disponible todavía (intento %s). Reintentando en %s s...\n' "$attempt" "$sleep_duration"
  sleep "$sleep_duration"
  attempt=$((attempt + 1))
done

printf '✅ MySQL disponible, iniciando Flask...\n'

exec flask --app app run --host=0.0.0.0
