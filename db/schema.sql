-- ============================================================
-- SCHEMA: Agenda Inteligente (versión SQLite)
-- ============================================================
-- Crea la estructura completa de la base de datos
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. Tabla: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          VARCHAR(100) NOT NULL,
    correo          VARCHAR(150) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    zona_horaria    VARCHAR(50) DEFAULT 'America/Mexico_City',
    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Tabla: cuentas_conectadas
-- ============================================================
CREATE TABLE IF NOT EXISTS cuentas_conectadas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario       INTEGER NOT NULL,
    proveedor        TEXT CHECK(proveedor IN ('google','outlook','icloud')) NOT NULL,
    correo_vinculado VARCHAR(150),
    access_token     TEXT,
    refresh_token    TEXT,
    token_expira_en  DATETIME,
    sincronizado_en  DATETIME,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================
-- 3. Tabla: eventos_externos
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos_externos (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cuenta         INTEGER NOT NULL,
    id_evento_externo VARCHAR(255) NOT NULL,
    titulo            VARCHAR(255),
    descripcion       TEXT,
    inicio            DATETIME NOT NULL,
    fin               DATETIME NOT NULL,
    estado            TEXT CHECK(estado IN ('confirmado','cancelado','tentativo')) DEFAULT 'confirmado',
    origen            VARCHAR(50),
    sincronizado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cuenta) REFERENCES cuentas_conectadas(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. Tabla: equipos
-- ============================================================
CREATE TABLE IF NOT EXISTS equipos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      VARCHAR(100) NOT NULL,
    creado_por  INTEGER NOT NULL,
    creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================
-- 5. Tabla: miembros_equipo
-- ============================================================
CREATE TABLE IF NOT EXISTS miembros_equipo (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_equipo       INTEGER NOT NULL,
    id_usuario      INTEGER NOT NULL,
    rol             TEXT CHECK(rol IN ('administrador','miembro')) DEFAULT 'miembro',
    estado          TEXT CHECK(estado IN ('pendiente','aceptado','rechazado')) DEFAULT 'pendiente',
    invitado_por    INTEGER,  -- quién envió la invitación
    invitado_en     DATETIME DEFAULT CURRENT_TIMESTAMP,
    respondido_en   DATETIME,
    FOREIGN KEY (id_equipo) REFERENCES equipos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (invitado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE (id_equipo, id_usuario)
);

-- ============================================================
-- 6. Tabla: reuniones_propuestas
-- ============================================================
CREATE TABLE IF NOT EXISTS reuniones_propuestas (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    id_equipo         INTEGER NOT NULL,
    creada_por        INTEGER NOT NULL,
    titulo            VARCHAR(150) NOT NULL,
    descripcion       TEXT,
    inicio_propuesto  DATETIME NOT NULL,
    fin_propuesto     DATETIME NOT NULL,
    estado            TEXT CHECK(estado IN ('propuesta','aceptada','rechazada','confirmada')) DEFAULT 'propuesta',
    creada_en         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_equipo) REFERENCES equipos(id) ON DELETE CASCADE,
    FOREIGN KEY (creada_por) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================
-- 7. Tabla: participantes_reunion
-- ============================================================
CREATE TABLE IF NOT EXISTS participantes_reunion (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    id_reunion    INTEGER NOT NULL,
    id_usuario    INTEGER NOT NULL,
    respuesta     TEXT CHECK(respuesta IN ('pendiente','aceptado','rechazado')) DEFAULT 'pendiente',
    invitado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reunion) REFERENCES reuniones_propuestas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (id_reunion, id_usuario)  -- Evita duplicar participantes
);

-- ============================================================
-- ÍNDICES opcionales (mejoran las búsquedas comunes)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cuentas_usuario      ON cuentas_conectadas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_eventos_cuenta       ON eventos_externos(id_cuenta);
CREATE INDEX IF NOT EXISTS idx_miembros_equipo      ON miembros_equipo(id_equipo);
CREATE INDEX IF NOT EXISTS idx_reuniones_equipo     ON reuniones_propuestas(id_equipo);
CREATE INDEX IF NOT EXISTS idx_participantes_reunion ON participantes_reunion(id_reunion);

-- ============================================================
-- Eventos internos
-- ============================================================


CREATE TABLE IF NOT EXISTS eventos_internos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario      INTEGER NOT NULL,
    id_equipo       INTEGER,
    titulo          VARCHAR(255) NOT NULL,
    descripcion     TEXT,
    inicio          DATETIME NOT NULL,
    fin             DATETIME NOT NULL,
    ubicacion       VARCHAR(255),
    tipo            TEXT CHECK(tipo IN ('personal','equipo','otro')) DEFAULT 'personal',
    recordatorio    INTEGER DEFAULT 0,  -- minutos antes del evento
    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_equipo) REFERENCES equipos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS participantes_evento_interno (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    id_evento         INTEGER NOT NULL,
    id_usuario        INTEGER NOT NULL,
    estado_asistencia TEXT CHECK(estado_asistencia IN ('pendiente','aceptado','rechazado')) DEFAULT 'pendiente',
    invitado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
    respondido_en     DATETIME,
    FOREIGN KEY (id_evento) REFERENCES eventos_internos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (id_evento, id_usuario)
);
