-- ============================================================
-- MUSEO PIEDRA PINTADA — agrega la roca faltante S9R98
-- El seed original tenía 110 rocas (faltaba S9R98). El informe de
-- Juszczyk (2023) documenta 111. Este script añade solo S9R98 sin
-- tocar el resto de la tabla. Idempotente: no duplica si ya existe.
-- Coordenadas del informe: 10°17'45.6"N, 67°53'34.24"W.
-- ============================================================

INSERT INTO petroglifos
  (nombre, descripcion, texto_asistente, imagen_url, codigo_qr, categoria,
   codigo_roca, latitud, longitud, altitud_m, cantidad_caras, profundidad_surco,
   forma_surco, exposicion_solar, orientacion, estado_conservacion, fecha_registro, notas)
VALUES
  ('Petroglifo S9R98', 'Roca registrada en el Sitio 9 (Museo Piedra Pintada). Estado: erosión; 1 cara(s) grabada(s); orientado al valle; altitud 502 m.', 'Estás frente al petroglifo S9R98, una de las 110 rocas grabadas documentadas en el Sitio 9 del Museo Piedra Pintada, en Guacara, estado Carabobo. Este grabado está orientado al valle. La superficie muestra signos de erosión por el paso del tiempo.', '../assets/img/petroglifos/S9R98.jpeg', 'S9R98', 'Erosionado', 'S9R98', 10.296, -67.8928444, 502, '1', '0,5 cm', 'redondeado', 'iluminado', 'al valle', 'erosión', '9.03.2022, 10:55 AM', NULL)
ON CONFLICT (codigo_qr) DO NOTHING;
