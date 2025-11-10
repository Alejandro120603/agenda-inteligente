-- ============================================================
-- SEED: Datos iniciales para Agenda Inteligente (SQLite)
-- ============================================================

PRAGMA foreign_keys = ON;

-- Inserta usuarios base con contraseñas cifradas en bcrypt
INSERT INTO usuarios (nombre, correo, password_hash, zona_horaria)
VALUES
    ('Daniel',   'daniel@correo.com',   '$2y$10$vumSDY3.6wPPqFwpJ5PxAettRW0TgrUIblFdxPUcYw5Aq47h.IglO',   'America/Mexico_City'),
    ('Adrián',   'adrian@correo.com',   '$2y$10$lL09MVtQwLpwglXWGvec9OVVCBCmtAoQMIUnWn4Dk3b334r3MbQGS',   'America/Mexico_City'),
    ('Sebastián','sebastian@correo.com','$2y$10$0KABdqRFzf2StNEF2Zn3n.1/poMOcAu0rBhDPYZGhsvptcJFNV0QW',   'America/Mexico_City');

-- ============================================================
-- 2. Evento inicial en el calendario interno
-- ============================================================
-- 🎄 Evento: Navidad (para el usuario Daniel, id_usuario = 1)
INSERT INTO eventos_internos (
    id_usuario,
    titulo,
    descripcion,
    inicio,
    fin,
    ubicacion,
    tipo,
    recordatorio
)
VALUES (
    1,
    'Navidad 🎄',
    'Celebración navideña con la familia',
    '2025-12-24T00:00:00',
    '2025-12-25T00:00:00',
    'Casa',
    'personal',
    0
);

-- ============================================================
-- FIN DEL SEED
-- ============================================================