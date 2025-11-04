-- ============================================================
-- SEED: Datos iniciales para Agenda Inteligente (SQLite)
-- ============================================================

PRAGMA foreign_keys = ON;

-- Inserta usuarios base (sin hash por ahora)
INSERT INTO usuarios (nombre, correo, contraseña_hash, zona_horaria)
VALUES
    ('Daniel',   'daniel@example.com',   'dan123',   'America/Mexico_City'),
    ('Adrián',   'adrian@example.com',   'adr123',   'America/Mexico_City'),
    ('Sebastián','sebastian@example.com','seb123',   'America/Mexico_City');
