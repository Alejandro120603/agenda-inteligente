from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from models import db
import os

app = Flask(__name__)

# Configurar la conexión con MySQL
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

@app.route("/")
def index():
    return "✅ Backend Flask conectado correctamente a MySQL"

if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # 👈 crea todas las tablas automáticamente
    app.run(host="0.0.0.0", port=5000, debug=True)
