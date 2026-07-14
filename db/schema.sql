-- ============================================================
-- MUSEO ARQUEOLÓGICO PIEDRA PINTADA
-- M1 · schema.sql — Esquema de base de datos (PostgreSQL)
-- 12 entidades + 1 tabla intermedia (recorrido_estaciones)
-- Basado en el modelo de datos F3 del documento de arquitectura.
-- ============================================================

-- Limpieza (orden inverso por dependencias). Útil al recargar en desarrollo.
DROP TABLE IF EXISTS resultados_trivia    CASCADE;
DROP TABLE IF EXISTS preguntas_trivia      CASCADE;
DROP TABLE IF EXISTS noticias_eventos       CASCADE;
DROP TABLE IF EXISTS preguntas_respuestas   CASCADE;
DROP TABLE IF EXISTS fotos                  CASCADE;
DROP TABLE IF EXISTS comentarios_resenas    CASCADE;
DROP TABLE IF EXISTS reservas               CASCADE;
DROP TABLE IF EXISTS recorrido_estaciones   CASCADE;
DROP TABLE IF EXISTS recorridos             CASCADE;
DROP TABLE IF EXISTS estaciones             CASCADE;
DROP TABLE IF EXISTS petroglifos            CASCADE;
DROP TABLE IF EXISTS visitas_sitio          CASCADE;
DROP TABLE IF EXISTS usuarios               CASCADE;

-- ── 1. usuarios ──────────────────────────────────────────────
CREATE TABLE usuarios (
  id                  SERIAL PRIMARY KEY,
  nombre              VARCHAR(100)  NOT NULL,
  correo              VARCHAR(150)  NOT NULL UNIQUE,
  contrasena_hash     VARCHAR(255)  NOT NULL,
  rol                 VARCHAR(20)   NOT NULL DEFAULT 'registrado'
                        CHECK (rol IN ('visitante','registrado','institucion','admin')),
  institucion_nombre  VARCHAR(200),
  creado_en           TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── 2. petroglifos ───────────────────────────────────────────
CREATE TABLE petroglifos (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(200)  NOT NULL,
  descripcion      TEXT          NOT NULL,
  texto_asistente  TEXT          NOT NULL,           -- lo que narra la voz
  imagen_url       VARCHAR(500),
  codigo_qr        VARCHAR(50)   NOT NULL UNIQUE,
  categoria        VARCHAR(100),
  creado_en        TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── 3. estaciones ────────────────────────────────────────────
CREATE TABLE estaciones (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(200)   NOT NULL,
  descripcion    TEXT,
  latitud        DECIMAL(10,7)  NOT NULL,
  longitud       DECIMAL(10,7)  NOT NULL,
  petroglifo_id  INTEGER        UNIQUE REFERENCES petroglifos(id) ON DELETE SET NULL,
  creado_en      TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- ── 4. recorridos ────────────────────────────────────────────
CREATE TABLE recorridos (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(200)  NOT NULL,
  descripcion  TEXT,
  activo       BOOLEAN       NOT NULL DEFAULT TRUE,
  creado_en    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── 5. recorrido_estaciones (intermedia N–N, ordenada) ───────
CREATE TABLE recorrido_estaciones (
  id            SERIAL PRIMARY KEY,
  recorrido_id  INTEGER  NOT NULL REFERENCES recorridos(id) ON DELETE CASCADE,
  estacion_id   INTEGER  NOT NULL REFERENCES estaciones(id) ON DELETE CASCADE,
  orden         INTEGER  NOT NULL,
  UNIQUE (recorrido_id, estacion_id),
  UNIQUE (recorrido_id, orden)
);

-- ── 6. reservas ──────────────────────────────────────────────
CREATE TABLE reservas (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
  institucion_nombre  VARCHAR(200)  NOT NULL,
  contacto_nombre     VARCHAR(100)  NOT NULL,
  contacto_telefono   VARCHAR(20)   NOT NULL,
  contacto_correo     VARCHAR(150)  NOT NULL,
  fecha_visita        DATE          NOT NULL CHECK (fecha_visita >= CURRENT_DATE),
  num_personas        INTEGER       NOT NULL CHECK (num_personas > 0 AND num_personas <= 200),
  estado              VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','aprobada','rechazada')),
  notas               TEXT,
  creado_en           TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── 7. comentarios_resenas ───────────────────────────────────
CREATE TABLE comentarios_resenas (
  id                 SERIAL PRIMARY KEY,
  usuario_id         INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  texto              TEXT        NOT NULL,
  calificacion       INTEGER     NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  estado_moderacion  VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                       CHECK (estado_moderacion IN ('pendiente','aprobado','rechazado')),
  creado_en          TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── 8. fotos ─────────────────────────────────────────────────
CREATE TABLE fotos (
  id             SERIAL PRIMARY KEY,
  url            VARCHAR(500)  NOT NULL,
  tipo_mime      VARCHAR(50)   NOT NULL,
  tamano_bytes   INTEGER       NOT NULL CHECK (tamano_bytes <= 5242880),  -- 5 MB
  comentario_id  INTEGER       REFERENCES comentarios_resenas(id) ON DELETE CASCADE,
  petroglifo_id  INTEGER       REFERENCES petroglifos(id) ON DELETE CASCADE,
  usuario_id     INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en      TIMESTAMP     NOT NULL DEFAULT NOW(),
  -- una foto pertenece a una reseña O a un petroglifo (al menos uno)
  CHECK (comentario_id IS NOT NULL OR petroglifo_id IS NOT NULL)
);

-- ── 9. preguntas_respuestas ──────────────────────────────────
CREATE TABLE preguntas_respuestas (
  id          SERIAL PRIMARY KEY,
  pregunta    TEXT      NOT NULL,
  respuesta   TEXT,
  usuario_id  INTEGER   REFERENCES usuarios(id) ON DELETE SET NULL,
  publicada   BOOLEAN   NOT NULL DEFAULT FALSE,
  creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── 10. noticias_eventos ─────────────────────────────────────
CREATE TABLE noticias_eventos (
  id                 SERIAL PRIMARY KEY,
  titulo             VARCHAR(300)  NOT NULL,
  contenido          TEXT          NOT NULL,
  imagen_url         VARCHAR(500),
  categoria          VARCHAR(50),
  fecha_publicacion  TIMESTAMP     NOT NULL DEFAULT NOW(),
  activa             BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ── 11. preguntas_trivia ─────────────────────────────────────
CREATE TABLE preguntas_trivia (
  id                  SERIAL PRIMARY KEY,
  pregunta            TEXT          NOT NULL,
  opcion_a            VARCHAR(300)  NOT NULL,
  opcion_b            VARCHAR(300)  NOT NULL,
  opcion_c            VARCHAR(300)  NOT NULL,
  opcion_d            VARCHAR(300)  NOT NULL,
  respuesta_correcta  CHAR(1)       NOT NULL CHECK (respuesta_correcta IN ('A','B','C','D')),
  activa              BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ── 12. resultados_trivia ────────────────────────────────────
CREATE TABLE resultados_trivia (
  id               SERIAL PRIMARY KEY,
  usuario_id       INTEGER   REFERENCES usuarios(id) ON DELETE SET NULL,
  puntaje          INTEGER   NOT NULL,
  total_preguntas  INTEGER   NOT NULL,
  respuestas_json  JSONB     NOT NULL,
  creado_en        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── 13. visitas_sitio (contador global, una sola fila) ───────
CREATE TABLE visitas_sitio (
  id              SERIAL PRIMARY KEY,
  contador        INTEGER   NOT NULL DEFAULT 0,
  ultima_visita   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Índices para consultas frecuentes ────────────────────────
CREATE INDEX idx_usuarios_correo            ON usuarios(correo);
CREATE INDEX idx_petroglifos_qr             ON petroglifos(codigo_qr);
CREATE INDEX idx_petroglifos_categoria      ON petroglifos(categoria);
CREATE INDEX idx_estaciones_petroglifo      ON estaciones(petroglifo_id);
CREATE INDEX idx_rec_estaciones_recorrido   ON recorrido_estaciones(recorrido_id, orden);
CREATE INDEX idx_reservas_estado            ON reservas(estado);
CREATE INDEX idx_comentarios_estado         ON comentarios_resenas(estado_moderacion);
CREATE INDEX idx_preguntas_publicada        ON preguntas_respuestas(publicada);
CREATE INDEX idx_noticias_activa            ON noticias_eventos(activa, fecha_publicacion DESC);

-- Fin del esquema.
