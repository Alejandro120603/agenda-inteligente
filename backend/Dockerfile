FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código de la aplicación (incluido entrypoint.sh)
COPY . .

# Garantizamos permisos de ejecución para el script de arranque
RUN chmod +x /app/entrypoint.sh

# PyMySQL hace la espera de la base de datos antes de lanzar Flask
ENTRYPOINT ["/app/entrypoint.sh"]
