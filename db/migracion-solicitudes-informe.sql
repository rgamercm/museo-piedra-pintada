-- ============================================================
-- MUSEO PIEDRA PINTADA
-- Migración: solicitudes de descarga del informe arqueológico
-- (K. Juszczyk, AmerGraph 2023). Registro público (POST) que se lista
-- en el panel admin. Idempotente: se puede correr varias veces.
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitudes_informe (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(120) NOT NULL,
  correo       VARCHAR(160) NOT NULL,
  institucion  VARCHAR(200),
  finalidad    TEXT NOT NULL,
  creado_en    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_informe_creado
  ON solicitudes_informe (creado_en DESC);
