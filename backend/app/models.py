from . import db
from sqlalchemy import Enum
from datetime import datetime

# ============================================================
# 🧍 Tabla: usuarios
# ============================================================
class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    correo = db.Column(db.String(150), unique=True, nullable=False)
    password_user = db.Column(db.String(255))
    zona_horaria = db.Column(db.String(50))
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    cuentas = db.relationship("CuentaConectada", back_populates="usuario", cascade="all, delete-orphan")
    equipos_creados = db.relationship("Equipo", back_populates="creador")
    miembros = db.relationship("MiembroEquipo", back_populates="usuario")
    reuniones_creadas = db.relationship("ReunionPropuesta", back_populates="creador")
    participaciones = db.relationship("ParticipanteReunion", back_populates="usuario")

# ============================================================
# 🔐 Tabla: cuentas_conectadas
# ============================================================
class CuentaConectada(db.Model):
    __tablename__ = "cuentas_conectadas"

    id = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    proveedor = db.Column(Enum("google", "outlook", "icloud", name="proveedor_enum"), nullable=False)
    correo_vinculado = db.Column(db.String(150))
    access_token = db.Column(db.Text)
    refresh_token = db.Column(db.Text)
    token_expira_en = db.Column(db.DateTime)
    sincronizado_en = db.Column(db.DateTime)

    usuario = db.relationship("Usuario", back_populates="cuentas")
    eventos = db.relationship("EventoExterno", back_populates="cuenta", cascade="all, delete-orphan")

# ============================================================
# 📅 Tabla: eventos_externos
# ============================================================
class EventoExterno(db.Model):
    __tablename__ = "eventos_externos"

    id = db.Column(db.Integer, primary_key=True)
    id_cuenta = db.Column(db.Integer, db.ForeignKey("cuentas_conectadas.id"), nullable=False)
    id_evento_externo = db.Column(db.String(255))
    titulo = db.Column(db.String(255))
    descripcion = db.Column(db.Text)
    inicio = db.Column(db.DateTime)
    fin = db.Column(db.DateTime)
    estado = db.Column(Enum("confirmado", "cancelado", "tentativo", name="estado_evento_enum"))
    origen = db.Column(db.String(50))
    sincronizado_en = db.Column(db.DateTime)

    cuenta = db.relationship("CuentaConectada", back_populates="eventos")

# ============================================================
# 👥 Tabla: equipos
# ============================================================
class Equipo(db.Model):
    __tablename__ = "equipos"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    creado_por = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    creador = db.relationship("Usuario", back_populates="equipos_creados")
    miembros = db.relationship("MiembroEquipo", back_populates="equipo", cascade="all, delete-orphan")
    reuniones = db.relationship("ReunionPropuesta", back_populates="equipo", cascade="all, delete-orphan")

# ============================================================
# 🤝 Tabla: miembros_equipo (relación M:N usuarios ↔ equipos)
# ============================================================
class MiembroEquipo(db.Model):
    __tablename__ = "miembros_equipo"

    id = db.Column(db.Integer, primary_key=True)
    id_equipo = db.Column(db.Integer, db.ForeignKey("equipos.id"), nullable=False)
    id_usuario = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    rol = db.Column(Enum("administrador", "miembro", name="rol_equipo_enum"), default="miembro")
    unido_en = db.Column(db.DateTime, default=datetime.utcnow)

    equipo = db.relationship("Equipo", back_populates="miembros")
    usuario = db.relationship("Usuario", back_populates="miembros")

# ============================================================
# 💬 Tabla: reuniones_propuestas
# ============================================================
class ReunionPropuesta(db.Model):
    __tablename__ = "reuniones_propuestas"

    id = db.Column(db.Integer, primary_key=True)
    id_equipo = db.Column(db.Integer, db.ForeignKey("equipos.id"), nullable=False)
    creada_por = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    titulo = db.Column(db.String(150))
    descripcion = db.Column(db.Text)
    inicio_propuesto = db.Column(db.DateTime)
    fin_propuesto = db.Column(db.DateTime)
    estado = db.Column(Enum("propuesta", "aceptada", "rechazada", "confirmada", name="estado_reunion_enum"), default="propuesta")
    creada_en = db.Column(db.DateTime, default=datetime.utcnow)

    equipo = db.relationship("Equipo", back_populates="reuniones")
    creador = db.relationship("Usuario", back_populates="reuniones_creadas")
    participantes = db.relationship("ParticipanteReunion", back_populates="reunion", cascade="all, delete-orphan")

# ============================================================
# 👥 Tabla: participantes_reunion (relación M:N usuarios ↔ reuniones)
# ============================================================
class ParticipanteReunion(db.Model):
    __tablename__ = "participantes_reunion"

    id = db.Column(db.Integer, primary_key=True)
    id_reunion = db.Column(db.Integer, db.ForeignKey("reuniones_propuestas.id"), nullable=False)
    id_usuario = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    respuesta = db.Column(Enum("pendiente", "aceptado", "rechazado", name="respuesta_enum"), default="pendiente")
    invitado_en = db.Column(db.DateTime, default=datetime.utcnow)

    reunion = db.relationship("ReunionPropuesta", back_populates="participantes")
    usuario = db.relationship("Usuario", back_populates="participaciones")
