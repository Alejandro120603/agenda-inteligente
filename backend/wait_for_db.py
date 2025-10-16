import os
import time

import pymysql
from dotenv import load_dotenv


load_dotenv()


def _required_env(name: str) -> str:
    """Return the environment variable or raise a helpful error."""

    value = os.getenv(name)
    if value is None or value == "":
        raise RuntimeError(
            f"La variable de entorno '{name}' no está definida y es necesaria para conectarse a la base de datos."
        )
    return value


try:
    host = _required_env("DB_HOST")
    port = int(os.getenv("DB_PORT", 3306))
    user = _required_env("DB_USER")
    password = _required_env("DB_PASSWORD")
    database = _required_env("DB_NAME")
except RuntimeError as env_error:
    print(f"❌ {env_error}")
    raise SystemExit(1) from env_error

print("⏳ Esperando a que la base de datos esté lista...")

for i in range(30):
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password, database=database)
        print("✅ Conexión establecida con la base de datos.")
        conn.close()
        break
    except Exception as e:
        print(f"Intento {i+1}/30 fallido: {e}")
        time.sleep(3)
else:
    print("❌ No se pudo conectar a la base de datos después de 30 intentos.")
    exit(1)
