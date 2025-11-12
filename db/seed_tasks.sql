-- ============================================================
-- SEED: Tareas iniciales para Agenda Inteligente (SQLite)
-- ============================================================

PRAGMA foreign_keys = ON;

INSERT INTO tareas (id_usuario, titulo, descripcion, fecha_limite, estado, prioridad)
VALUES
  (1, 'Preparar informe mensual', 'Revisar métricas clave y preparar la presentación del lunes.', datetime('now', '+1 day'), 'en_progreso', 'alta'),
  (1, 'Enviar recordatorios', 'Notificar al equipo sobre la retrospectiva semanal.', datetime('now', '+2 days'), 'pendiente', 'media'),
  (2, 'Actualizar tablero Kanban', 'Mover tarjetas completadas y asignar nuevas tareas.', datetime('now'), 'pendiente', 'media'),
  (3, 'Planificar sprint', 'Definir objetivos del próximo sprint con el equipo de producto.', datetime('now', '+3 days'), 'pendiente', 'alta');
