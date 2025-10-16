import os, time, pymysql

host = os.getenv("DB_HOST", "db")
port = int(os.getenv("DB_PORT", 3306))
user = os.getenv("DB_USER", "agenda_user")
password = os.getenv("DB_PASSWORD", "agenda123")
database = os.getenv("DB_NAME", "agenda_inteligente")

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
