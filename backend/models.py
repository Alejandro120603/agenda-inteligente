from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# ============================================================
# 🧍 Tabla: usuarios
# ============================================================
class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    correo = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    zona_horaria = db.Column(db.String(50), default='America/Mexico_City')
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    # Relaciones
    cuentas = db.relationship('CuentaConectada', backref='usuario', lazy=True)
    equipos_creados = db.relationship('Equipo', backref='creador', lazy=True)
    reuniones_creadas = db.relationship('ReunionPropuesta', backref='creador', lazy=True)
    miembros = db.relationship('MiembroEquipo', backref='usuario', lazy=True)
    participaciones = db.relationship('ParticipanteReunion', backref='usuario', lazy=True)

# ============================================================
# 🔐 Tabla: cuentas_conectadas
# ============================================================
class CuentaConectada(db.Model):
    __tablename__ = 'cuentas_conectadas'

    id = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    proveedor = db.Column(db.Enum('google', 'outlook', 'icloud', name='proveedor_enum'), nullable=False)
    correo_vinculado = db.Column(db.String(150), nullable=False)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expira_en = db.Column(db.DateTime, nullable=True)
    sincronizado_en = db.Column(db.DateTime, default=datetime.utcnow)

    eventos = db.relationship('EventoExterno', backref='cuenta', lazy=True)

# ============================================================
# 🗓️ Tabla: eventos_externos
# ============================================================
class EventoExterno(db.Model):
    __tablename__ = 'eventos_externos'

    id = db.Column(db.Integer, primary_key=True)
    id_cuenta = db.Column(db.Integer, db.ForeignKey('cuentas_conectadas.id'), nullable=False)
    id_evento_externo = db.Column(db.String(255), nullable=False)
    titulo = db.Column(db.String(255))
    descripcion = db.Column(db.Text)
    inicio = db.Column(db.DateTime, nullable=False)
    fin = db.Column(db.DateTime, nullable=False)
    estado = db.Column(db.Enum('confirmado', 'cancelado', 'tentativo', name='estado_evento_enum'), default='confirmado')
    origen = db.Column(db.String(50), nullable=False)
    sincronizado_en = db.Column(db.DateTime, default=datetime.utcnow)

# ============================================================
# 👥 Tabla: equipos
# ============================================================
class Equipo(db.Model):
    __tablename__ = 'equipos'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    creado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    miembros = db.relationship('MiembroEquipo', backref='equipo', lazy=True)
    reuniones = db.relationship('ReunionPropuesta', backref='equipo', lazy=True)

# ============================================================
# 🧑‍🤝‍🧑 Tabla: miembros_equipo
# ============================================================
class MiembroEquipo(db.Model):
    __tablename__ = 'miembros_equipo'

    id = db.Column(db.Integer, primary_key=True)
    id_equipo = db.Column(db.Integer, db.ForeignKey('equipos.id'), nullable=False)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    rol = db.Column(db.Enum('administrador', 'miembro', name='rol_enum'), default='miembro')
    unido_en = db.Column(db.DateTime, default=datetime.utcnow)

# ============================================================
# 📅 Tabla: reuniones_propuestas
# ============================================================
class ReunionPropuesta(db.Model):
    __tablename__ = 'reuniones_propuestas'

    id = db.Column(db.Integer, primary_key=True)
    id_equipo = db.Column(db.Integer, db.ForeignKey('equipos.id'), nullable=False)
    creada_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    titulo = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text)
    inicio_propuesto = db.Column(db.DateTime, nullable=False)
    fin_propuesto = db.Column(db.DateTime, nullable=False)
    estado = db.Column(db.Enum('propuesta', 'aceptada', 'rechazada', 'confirmada', name='estado_reunion_enum'), default='propuesta')
    creada_en = db.Column(db.DateTime, default=datetime.utcnow)

    participantes = db.relationship('ParticipanteReunion', backref='reunion', lazy=True)

# ============================================================
# 👤 Tabla: participantes_reunion
# ============================================================
class ParticipanteReunion(db.Model):
    __tablename__ = 'participantes_reunion'

    id = db.Column(db.Integer, primary_key=True)
    id_reunion = db.Column(db.Integer, db.ForeignKey('reuniones_propuestas.id'), nullable=False)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    respuesta = db.Column(db.Enum('pendiente', 'aceptado', 'rechazado', name='respuesta_enum'), default='pendiente')
    invitado_en = db.Column(db.DateTime, default=datetime.utcnow)
