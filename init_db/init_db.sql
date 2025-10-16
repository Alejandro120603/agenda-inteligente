-- Inicialización de la base de datos agenda_inteligente
-- Este script crea el esquema completo requerido por la aplicación Agenda Inteligente.

CREATE DATABASE IF NOT EXISTS agenda_inteligente
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE agenda_inteligente;

-- Asegurar configuración de caracteres para la sesión actual
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- Eliminación de tablas existentes para permitir una recreación limpia del esquema
DROP TABLE IF EXISTS participantes_reunion;
DROP TABLE IF EXISTS reuniones_propuestas;
DROP TABLE IF EXISTS miembros_equipo;
DROP TABLE IF EXISTS eventos_externos;
DROP TABLE IF EXISTS cuentas_conectadas;
DROP TABLE IF EXISTS equipos;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- Tabla de usuarios principales de la plataforma
CREATE TABLE usuarios (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    zona_horaria VARCHAR(50) NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Usuarios registrados en la aplicación Agenda Inteligente';

-- Cuentas conectadas de proveedores externos (Google, Outlook, iCloud)
CREATE TABLE cuentas_conectadas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario INT UNSIGNED NOT NULL,
    proveedor ENUM('google','outlook','icloud') NOT NULL,
    correo_vinculado VARCHAR(150) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expira_en DATETIME NULL,
    sincronizado_en DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cuentas_conectadas_usuario_proveedor (id_usuario, proveedor, correo_vinculado),
    KEY idx_cuentas_conectadas_usuario (id_usuario),
    CONSTRAINT fk_cuentas_conectadas_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Conexiones a servicios externos vinculadas a cada usuario';

-- Eventos externos importados desde servicios conectados
CREATE TABLE eventos_externos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_cuenta INT UNSIGNED NOT NULL,
    id_evento_externo VARCHAR(191) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    inicio DATETIME NOT NULL,
    fin DATETIME NOT NULL,
    estado ENUM('confirmado','cancelado','tentativo') NOT NULL DEFAULT 'confirmado',
    origen VARCHAR(50) NOT NULL,
    sincronizado_en DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_eventos_externos_id_externo (id_cuenta, id_evento_externo),
    KEY idx_eventos_externos_cuenta (id_cuenta),
    KEY idx_eventos_externos_intervalo (inicio, fin),
    CONSTRAINT fk_eventos_externos_cuenta
        FOREIGN KEY (id_cuenta)
        REFERENCES cuentas_conectadas (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_eventos_externos_intervalo CHECK (fin > inicio)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Eventos sincronizados desde proveedores externos de calendario';

-- Equipos de trabajo creados dentro de la plataforma
CREATE TABLE equipos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(120) NOT NULL,
    creado_por INT UNSIGNED NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_equipos_creado_por (creado_por),
    CONSTRAINT fk_equipos_creado_por
        FOREIGN KEY (creado_por)
        REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Equipos colaborativos dentro de la Agenda Inteligente';

-- Relación de miembros dentro de cada equipo
CREATE TABLE miembros_equipo (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_equipo INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    rol ENUM('administrador','miembro') NOT NULL DEFAULT 'miembro',
    unido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_miembros_equipo (id_equipo, id_usuario),
    KEY idx_miembros_equipo_equipo (id_equipo),
    KEY idx_miembros_equipo_usuario (id_usuario),
    CONSTRAINT fk_miembros_equipo_equipo
        FOREIGN KEY (id_equipo)
        REFERENCES equipos (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_miembros_equipo_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Participación de usuarios dentro de cada equipo';

-- Reuniones propuestas dentro de un equipo
CREATE TABLE reuniones_propuestas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_equipo INT UNSIGNED NOT NULL,
    creada_por INT UNSIGNED NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    inicio_propuesto DATETIME NOT NULL,
    fin_propuesto DATETIME NOT NULL,
    estado ENUM('propuesta','aceptada','rechazada','confirmada') NOT NULL DEFAULT 'propuesta',
    creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reuniones_equipo (id_equipo),
    KEY idx_reuniones_creada_por (creada_por),
    KEY idx_reuniones_estado (estado),
    CONSTRAINT fk_reuniones_equipo
        FOREIGN KEY (id_equipo)
        REFERENCES equipos (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reuniones_creada_por
        FOREIGN KEY (creada_por)
        REFERENCES usuarios (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_reuniones_intervalo CHECK (fin_propuesto > inicio_propuesto)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Reuniones propuestas para coordinación entre miembros del equipo';

-- Participantes invitados a las reuniones propuestas
CREATE TABLE participantes_reunion (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_reunion INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    respuesta ENUM('pendiente','aceptado','rechazado') NOT NULL DEFAULT 'pendiente',
    invitado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_participantes_reunion (id_reunion, id_usuario),
    KEY idx_participantes_reunion_reunion (id_reunion),
    KEY idx_participantes_reunion_usuario (id_usuario),
    CONSTRAINT fk_participantes_reunion_reunion
        FOREIGN KEY (id_reunion)
        REFERENCES reuniones_propuestas (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_participantes_reunion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Relación de usuarios invitados a reuniones propuestas';

-- Inserción de usuario inicial de ejemplo
INSERT INTO usuarios (nombre, correo, contrasena_hash, zona_horaria)
VALUES ('Administrador', 'admin@test.com', '', 'UTC');
