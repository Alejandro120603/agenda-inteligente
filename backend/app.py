import os
import time

from dotenv import load_dotenv
from flask import Flask, current_app
from sqlalchemy.exc import OperationalError

from models import (
    CuentaConectada,
    Equipo,
    EventoExterno,
    MiembroEquipo,
    ParticipanteReunion,
    ReunionPropuesta,
    Usuario,
    db,
)

# Aseguramos que SQLAlchemy cargue la metadata de todos los modelos antes de
# ejecutar ``db.create_all()``. La tupla sirve únicamente para documentar la
# dependencia explícita y evitar advertencias por importaciones sin uso.
_MODEL_REGISTRY = (
    Usuario,
    CuentaConectada,
    EventoExterno,
    Equipo,
    MiembroEquipo,
    ReunionPropuesta,
    ParticipanteReunion,
)

load_dotenv()


def create_app() -> Flask:
    """Configura y devuelve la instancia principal de Flask."""
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    @app.route("/")
    def index():
        return "✅ Backend Flask conectado correctamente a MySQL"

    _initialise_database(app)

    return app


def _initialise_database(app: Flask) -> None:
    """Crea las tablas de la base de datos con reintentos."""
    max_attempts = int(os.getenv("DB_MAX_RETRIES", 5))
    base_delay = float(os.getenv("DB_RETRY_DELAY", 2))

    with app.app_context():
        for attempt in range(1, max_attempts + 1):
            try:
                db.create_all()
                current_app.logger.info("✅ Tablas creadas o ya existentes.")
                return
            except OperationalError as exc:
                wait_seconds = base_delay * attempt
                current_app.logger.warning(
                    "Intento %s de crear las tablas fallido: %s. Reintentando en %.1f segundos...",
                    attempt,
                    exc,
                    wait_seconds,
                )
                time.sleep(wait_seconds)
        raise RuntimeError(
            "No se pudieron crear las tablas después de varios intentos. "
            "Verifica la conexión con la base de datos."
        )


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
