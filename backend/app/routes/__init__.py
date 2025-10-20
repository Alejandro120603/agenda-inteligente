from flask import Blueprint, jsonify, request

from ..models import Usuario
from .. import db

bp = Blueprint("main", __name__, url_prefix="/api")


@bp.route("/")
def home():
    return jsonify({"message": "Agenda Inteligente API funcionando correctamente ✅"})


@bp.route("/usuarios", methods=["GET"])
def obtener_usuarios():
    usuarios = Usuario.query.all()
    resultado = [
        {
            "id": u.id,
            "nombre": u.nombre,
            "correo": u.correo,
            "zona_horaria": u.zona_horaria,
            "creado_en": u.creado_en,
        }
        for u in usuarios
    ]
    return jsonify(resultado), 200


@bp.route("/usuarios", methods=["POST"])
def crear_usuario():
    datos = request.get_json()
    if not datos or "nombre" not in datos or "correo" not in datos:
        return jsonify({"error": "Faltan campos obligatorios (nombre, correo)"}), 400

    nuevo = Usuario(
        nombre=datos["nombre"],
        correo=datos["correo"],
        zona_horaria=datos.get("zona_horaria", "America/Mexico_City"),
    )
    db.session.add(nuevo)
    db.session.commit()

    return jsonify(
        {
            "id": nuevo.id,
            "nombre": nuevo.nombre,
            "correo": nuevo.correo,
            "zona_horaria": nuevo.zona_horaria,
            "creado_en": nuevo.creado_en,
        }
    ), 201


# Retrocompatibilidad con importaciones antiguas
main = bp

__all__ = ["bp", "main"]
