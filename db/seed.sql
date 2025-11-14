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

-- ============================================================
-- SEED EXTRA: Equipos y horarios ocupados para pruebas
-- ============================================================

PRAGMA foreign_keys = ON;

---------------------------------------------------------------
-- 1. Crear equipos
---------------------------------------------------------------
INSERT INTO equipos (nombre, creado_por)
VALUES 
    ('Clantindog', 1),   -- Daniel crea el equipo
    ('Prueba',     4);   -- Amir crea el equipo

---------------------------------------------------------------
-- 2. Miembros del equipo Clantindog
-- Daniel (admin), Adrián, Gustavo
---------------------------------------------------------------
INSERT INTO miembros_equipo (id_equipo, id_usuario, rol, estado, invitado_por)
VALUES
    (1, 1, 'administrador', 'aceptado', 1),  -- Daniel
    (1, 2, 'miembro',       'aceptado', 1),  -- Adrián
    (1, 5, 'miembro',       'aceptado', 1);  -- Gustavo

---------------------------------------------------------------
-- 3. Miembros del equipo Prueba
-- Amir (admin), Gustavo
---------------------------------------------------------------
INSERT INTO miembros_equipo (id_equipo, id_usuario, rol, estado, invitado_por)
VALUES
    (2, 4, 'administrador', 'aceptado', 4),  -- Amir
    (2, 5, 'miembro',       'aceptado', 4);  -- Gustavo

---------------------------------------------------------------
-- 4. EVENTOS INTERNOS - Día 20 noviembre 2025
-- Todos ocupados en diferentes horas excepto:
--   * Clantindog: libre 14:00–15:00 (2 a 3 PM)
--   * Prueba: libre 11:00–12:00
---------------------------------------------------------------

-- Daniel (ID 1)
INSERT INTO eventos_internos (id_usuario, titulo, descripcion, inicio, fin, tipo)
VALUES
    (1, 'Reunión 1', 'Ocupado', '2025-11-20T08:00:00', '2025-11-20T09:00:00', 'personal'),
    (1, 'Reunión 2', 'Ocupado', '2025-11-20T09:30:00', '2025-11-20T10:30:00', 'personal'),
    (1, 'Reunión 3', 'Ocupado', '2025-11-20T15:00:00', '2025-11-20T16:00:00', 'personal');

-- Adrián (ID 2)
INSERT INTO eventos_internos (id_usuario, titulo, descripcion, inicio, fin, tipo)
VALUES
    (2, 'Consulta médica', 'Ocupado', '2025-11-20T08:00:00', '2025-11-20T09:00:00', 'personal'),
    (2, 'Junta',           'Ocupado', '2025-11-20T10:00:00', '2025-11-20T11:00:00', 'personal'),
    (2, 'Trabajo',         'Ocupado', '2025-11-20T15:00:00', '2025-11-20T17:00:00', 'personal');

-- Gustavo (ID 5) — lo llenamos de tareas
INSERT INTO eventos_internos (id_usuario, titulo, descripcion, inicio, fin, tipo)
VALUES
    (5, 'Bloqueado 1', 'Ocupado', '2025-11-20T08:00:00', '2025-11-20T09:00:00', 'personal'),
    (5, 'Bloqueado 2', 'Ocupado', '2025-11-20T09:00:00', '2025-11-20T10:00:00', 'personal'),
    (5, 'Bloqueado 3', 'Ocupado', '2025-11-20T10:00:00', '2025-11-20T11:00:00', 'personal'),
    (5, 'Bloqueado 4', 'Ocupado', '2025-11-20T12:00:00', '2025-11-20T13:00:00', 'personal'),
    (5, 'Bloqueado 5', 'Ocupado', '2025-11-20T13:00:00', '2025-11-20T14:00:00', 'personal'),
    (5, 'Bloqueado 6', 'Ocupado', '2025-11-20T15:00:00', '2025-11-20T16:00:00', 'personal'),
    (5, 'Bloqueado 7', 'Ocupado', '2025-11-20T16:00:00', '2025-11-20T17:00:00', 'personal');

---------------------------------------------------------------
-- 5. Eventualidad especial por equipo
-- * Clantindog debe tener libre 14:00–15:00
-- * Prueba debe tener libre 11:00–12:00
---------------------------------------------------------------

-- Amir (ID 4) para equipo "Prueba" (libre 11–12)
INSERT INTO eventos_internos (id_usuario, titulo, descripcion, inicio, fin, tipo)
VALUES
    (4, 'Ocupado mañana 1', 'Reunión', '2025-11-20T08:00:00', '2025-11-20T09:00:00', 'personal'),
    (4, 'Ocupado mañana 2', 'Reunión', '2025-11-20T09:00:00', '2025-11-20T10:00:00', 'personal'),
    (4, 'Ocupado tarde',    'Trabajo', '2025-11-20T12:00:00', '2025-11-20T14:00:00', 'personal'),
    (4, 'Ocupado tarde 2',  'Trabajo', '2025-11-20T15:00:00', '2025-11-20T16:00:00', 'personal');

---------------------------------------------------------------
-- 6. Gustavo lleno de tareas (tarea 1, tarea 2, ...)
-- Para que el sistema tenga muchos intervalos.
---------------------------------------------------------------
INSERT INTO tareas (id_usuario, titulo, descripcion, fecha, es_grupal, tipo, id_equipo)
VALUES
    (5, 'Tarea 1', 'Bloqueo extra', '2025-11-20', 0, 'tarea_personal', NULL),
    (5, 'Tarea 2', 'Bloqueo extra', '2025-11-20', 0, 'tarea_personal', NULL),
    (5, 'Tarea 3', 'Bloqueo extra', '2025-11-20', 0, 'tarea_personal', NULL),
    (5, 'Tarea 4', 'Bloqueo extra', '2025-11-20', 0, 'tarea_personal', NULL);
