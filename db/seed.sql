-- ============================================================
-- SEED: Datos iniciales para Agenda Inteligente (SQLite)
-- ============================================================

PRAGMA foreign_keys = ON;

-- Inserta usuarios base con contraseñas cifradas en bcrypt
INSERT INTO usuarios (nombre, correo, password_hash, zona_horaria)
VALUES
    ('Daniel',   'daniel@correo.com',   '$2y$10$vumSDY3.6wPPqFwpJ5PxAettRW0TgrUIblFdxPUcYw5Aq47h.IglO',   'America/Mexico_City'),
    ('Adrián',   'adrian@correo.com',   '$2b$10$HvaDMdEcptihAA6j.hVpZ.HR90CBh0OiOm0EIv9zaPnoroXDnila2',   'America/Mexico_City'),
    ('Sebastián','sebastian@correo.com','$2b$10$uvVu2C4JHAQYHwIUyOOqHeHChAZvLnNWBYftZGVTQo5WnEbJl6Sru',   'America/Mexico_City'),
    ('Amir',     'amir@correo.com',     '$2b$10$I7iISrQrmbCcAFTFyJxv0Oy/LuFqVFFDSA2HmG2RuO3w5OwokSzA6',   'America/Mexico_City'),
    ('Gustavo',  'gustavo@correo.com',  '$2b$10$Vn3KRP4.HTdyMgvtl656e.opCv3B.UsA6VG/pKHJexCOnDvseKZxu',   'America/Mexico_City');

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