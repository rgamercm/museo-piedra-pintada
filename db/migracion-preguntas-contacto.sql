-- ============================================================
-- MIGRACIÓN: datos de contacto en preguntas anónimas
-- Ejecutar UNA VEZ sobre bases de datos ya existentes.
-- Añade nombre y correo del visitante a preguntas_respuestas
-- para que el equipo del museo pueda responder por correo.
-- ============================================================

ALTER TABLE preguntas_respuestas
  ADD COLUMN IF NOT EXISTS nombre_visitante VARCHAR(100),
  ADD COLUMN IF NOT EXISTS correo_visitante VARCHAR(150);
