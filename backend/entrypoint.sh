#!/bin/bash
set -euo pipefail

echo "⏳ Esperando a la base de datos..."

python <<'PY'
import os
import time

import pymysql

host = os.getenv("DB_HOST", "db")
user = os.getenv("DB_USER", "root")
password = os.getenv("DB_PASSWORD", "")
database = os.getenv("DB_NAME")
port = int(os.getenv("DB_PORT", "3306"))
interval = float(os.getenv("DB_RETRY_INTERVAL", "2"))
max_wait = float(os.getenv("DB_MAX_WAIT", "60"))

deadline = time.time() + max_wait

while True:
    try:
        connection = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=port,
            connect_timeout=5,
        )
    except Exception as exc:  # pylint: disable=broad-except
        print(f"❌ Aún no disponible ({exc}), reintentando...", flush=True)
        if time.time() >= deadline:
            raise SystemExit("⛔️ Tiempo de espera agotado esperando la base de datos.")
        time.sleep(interval)
    else:
        connection.close()
        print("✅ Base de datos disponible!", flush=True)
        break
PY

echo "🚀 Iniciando Flask..."
exec flask run --host=0.0.0.0 --port=5000
