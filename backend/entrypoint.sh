#!/bin/bash
set -euo pipefail

python <<'PY'
"""Script auxiliar para esperar la disponibilidad de MySQL con logs detallados."""

from __future__ import annotations

import os
import sys
import time

import pymysql
from pymysql import err as pymysql_err


host = os.getenv("DB_HOST", "db")
user = os.getenv("DB_USER", "root")
password = os.getenv("DB_PASSWORD", "")
database = os.getenv("DB_NAME", "")
port = int(os.getenv("DB_PORT", "3306"))
interval = float(os.getenv("DB_RETRY_INTERVAL", "2"))
max_wait = float(os.getenv("DB_MAX_WAIT", "60"))

deadline = time.time() + max_wait
attempt = 1

print("⏳ Esperando a la base de datos...", flush=True)
print(
    f"🔍 Intentando conectar a MySQL (host={host}, user={user}, port={port}, db={database or '[sin definir]'})",
    flush=True,
)

while True:
    remaining = max(0, int(deadline - time.time()))
    try:
        print(
            f"  ↳ Intento {attempt}: apertura de conexión (timeout=5s, tiempo restante ~{remaining}s)",
            flush=True,
        )
        connection = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=database or None,
            port=port,
            connect_timeout=5,
        )
    except pymysql_err.OperationalError as exc:
        error_code = exc.args[0] if exc.args else None
        if error_code == 1045:
            message = "🚫 Credenciales rechazadas por MySQL"
        elif error_code in {2002, 2003} or "Connection refused" in str(exc):
            message = "⚠️ MySQL aún no acepta conexiones (connection refused)"
        else:
            message = "⚠️ Error operacional al conectar con MySQL"
        print(f"{message}: {exc}", flush=True)
    except Exception as exc:  # pylint: disable=broad-except
        print(
            f"⚠️ Error inesperado al conectar con MySQL: {exc.__class__.__name__}: {exc}",
            flush=True,
        )
    else:
        connection.close()
        print("✅ Base de datos disponible, conexión de prueba cerrada.", flush=True)
        break

    if time.time() >= deadline:
        print("⛔️ Tiempo de espera agotado esperando la base de datos.", flush=True)
        sys.exit(1)

    time.sleep(interval)
    attempt += 1

print("🚀 Iniciando Flask...", flush=True)
PY

exec flask run --host=0.0.0.0 --port=5000
