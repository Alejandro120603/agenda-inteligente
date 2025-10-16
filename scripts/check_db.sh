#!/usr/bin/env bash
set -euo pipefail

COMPOSE_BIN=${COMPOSE_BIN:-"docker compose"}
IFS=' ' read -r -a COMPOSE_CMD <<< "$COMPOSE_BIN"
IFS=$' \t\n'
DB_SERVICE=${DB_SERVICE:-db}
DB_NAME=${DB_NAME:-agenda_inteligente}
ROOT_PASSWORD=${ROOT_PASSWORD:-RootPass123@}

run_compose() {
  "${COMPOSE_CMD[@]}" "$@"
}

if ! command -v "${COMPOSE_CMD[0]}" >/dev/null 2>&1; then
  echo "[check_db] No se encontró '${COMPOSE_CMD[0]}' en el PATH." >&2
  exit 1
fi

services=$(run_compose ps --services)
if ! grep -qx "$DB_SERVICE" <<<"$services"; then
  echo "[check_db] El servicio '$DB_SERVICE' no existe en docker-compose.yml" >&2
  exit 1
fi

running=$(run_compose ps --status running --services)
if ! grep -qx "$DB_SERVICE" <<<"$running"; then
  echo "[check_db] El servicio '$DB_SERVICE' no está en ejecución." >&2
  exit 1
fi

mysql_exec=(exec -T "$DB_SERVICE" mysql -h127.0.0.1 -uroot -p"$ROOT_PASSWORD")

if ! run_compose "${mysql_exec[@]}" -e "SHOW DATABASES;"; then
  echo "[check_db] No se pudo listar las bases de datos." >&2
  exit 1
fi

if ! run_compose "${mysql_exec[@]}" -e "SHOW TABLES FROM $DB_NAME;"; then
  echo "[check_db] No se pudo listar las tablas de '$DB_NAME'." >&2
  exit 1
fi

echo "[check_db] ✅ Base de datos '$DB_NAME' disponible y tablas listadas correctamente."

