-- ============================================================
-- MUSEO PIEDRA PINTADA — Migración: campos técnicos de petroglifos
-- Añade columnas de ficha arqueológica SIN destruir datos.
-- Seguro de ejecutar en producción (usa IF NOT EXISTS).
-- ============================================================

ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS codigo_roca        VARCHAR(20);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS latitud            DECIMAL(10,7);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS longitud           DECIMAL(10,7);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS altitud_m          INTEGER;
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS cantidad_caras     VARCHAR(10);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS profundidad_surco  VARCHAR(30);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS forma_surco        VARCHAR(50);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS exposicion_solar   VARCHAR(50);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS orientacion        VARCHAR(100);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS estado_conservacion VARCHAR(50);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS fecha_registro     VARCHAR(50);
ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS notas              TEXT;

CREATE INDEX IF NOT EXISTS idx_petroglifos_codigo_roca ON petroglifos(codigo_roca);
