#!/bin/bash
set -euo pipefail

python <<'PY'
"""Script auxiliar para esperar la disponibilidad de MySQL con logs detallados."""

from __future__ import annotations

import os
import socket
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
    print(
        f"  ↳ Intento {attempt}: apertura de conexión (timeout=5s, tiempo restante ~{remaining}s)",
        flush=True,
    )

    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        print(
            f"❓ DNS aún no resuelve '{host}': {exc}",
            flush=True,
        )
    else:
        addresses = sorted({info[4][0] for info in infos})
        if addresses:
            print(
                f"     ↳ DNS resuelto: {', '.join(addresses)}",
                flush=True,
            )

        try:
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
            message = "⚠️ Error operacional al conectar con MySQL"
            details = str(exc)
            if error_code == 1045:
                message = "🚫 Credenciales rechazadas por MySQL"
            elif "[Errno 111]" in details or "Connection refused" in details:
                message = "⚠️ MySQL aún no acepta conexiones (connection refused)"
            elif "[Errno -2]" in details or "Name or service not known" in details:
                message = "❓ DNS resuelto pero MySQL no es alcanzable"
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
