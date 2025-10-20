from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
        f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    from .routes import main
    from backend.routes.google_events import google_events_bp

    app.register_blueprint(main)
    app.register_blueprint(google_events_bp)

    with app.app_context():
        db.create_all()  # 👈 ESTA LÍNEA CREA LAS TABLAS
        print("✅ Tablas creadas en la base de datos")

    return app
