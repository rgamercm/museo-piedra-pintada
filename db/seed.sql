-- ============================================================
-- MUSEO ARQUEOLÓGICO PIEDRA PINTADA
-- M1 · seed.sql — Datos de ejemplo (placeholders, decisión S1)
-- Alineado con los datos que ya muestra el frontend (12 estaciones,
-- códigos QR-001..QR-012 y coordenadas reales del recorrido).
-- Cargar SIEMPRE después de schema.sql.
-- ============================================================

-- ── Usuarios ─────────────────────────────────────────────────
-- Contraseña del admin: "Admin1234" (hash bcrypt real, 10 rounds).
-- Cambiar en producción.
INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, institucion_nombre) VALUES
('Administrador',     'admin@piedrapintada.ve',  '$2a$10$dMNe2WKSL7GOjuSeIr4iiO.p8g76n6Z5nNM8OV4A9rSJ2g7sS5gOa', 'admin',       NULL),
('María González',    'maria@example.com',       '$2a$10$dMNe2WKSL7GOjuSeIr4iiO.p8g76n6Z5nNM8OV4A9rSJ2g7sS5gOa', 'registrado',  NULL),
('Liceo Bolivariano', 'liceo@institucion.ve',    '$2a$10$dMNe2WKSL7GOjuSeIr4iiO.p8g76n6Z5nNM8OV4A9rSJ2g7sS5gOa', 'institucion', 'Liceo Bolivariano Simón Bolívar');

-- ── Petroglifos (12, uno por estación del recorrido) ─────────
INSERT INTO petroglifos (nombre, descripcion, texto_asistente, imagen_url, codigo_qr, categoria) VALUES
('La Constelación',       'Conjunto de puntos que representa un mapa estelar precolombino.',                 'Estás frente a La Constelación. Estos puntos grabados en la roca representan un antiguo mapa estelar usado para marcar las estaciones del año.',           'assets/img/petroglifo-01.png', 'QR-001', 'Astronómico'),
('La Tortuga Sagrada',    'Figura zoomorfa de una tortuga, símbolo de longevidad y fertilidad.',             'Esta es La Tortuga Sagrada. Para los pueblos originarios, la tortuga simbolizaba la longevidad, la sabiduría y la fertilidad de la tierra.',            NULL, 'QR-002', 'Zoomorfo'),
('El Guardián',           'Figura antropomorfa de gran tamaño que custodia la entrada del valle.',           'Ante ti está El Guardián. Esta figura humana de gran tamaño se cree que protegía simbólicamente la entrada al valle sagrado.',                          NULL, 'QR-003', 'Antropomorfo'),
('El Espiral del Tiempo', 'Espiral concéntrica que representa el ciclo de la vida y el tiempo.',              'El Espiral del Tiempo representa los ciclos de la vida, las estaciones y el eterno retorno según la cosmovisión ancestral.',                            NULL, 'QR-004', 'Geométrico'),
('El Jaguar Celeste',     'Representación estilizada de un jaguar, animal de poder y del inframundo.',        'Este es El Jaguar Celeste. El jaguar era el animal de poder más respetado, asociado a los chamanes y al mundo de los espíritus.',                       NULL, 'QR-005', 'Zoomorfo'),
('La Luna Llena',         'Círculo grabado que marca los ciclos lunares para la agricultura.',               'La Luna Llena grabada aquí servía para llevar el calendario lunar, esencial para saber cuándo sembrar y cosechar.',                                      NULL, 'QR-006', 'Astronómico'),
('La Serpiente Cósmica',  'Línea ondulante que representa los ríos y la energía de la vida.',                'La Serpiente Cósmica simboliza los ríos, el agua y la energía que da vida a toda la naturaleza.',                                                       NULL, 'QR-007', 'Zoomorfo'),
('El Pez Dorado',         'Figura de pez asociada a la abundancia de los ríos cercanos.',                   'El Pez Dorado representa la abundancia de los ríos que alimentaban a las comunidades que habitaron estas tierras.',                                      NULL, 'QR-008', 'Zoomorfo'),
('El Chamán',             'Figura humana con tocado ceremonial en posición ritual.',                        'Este petroglifo muestra a El Chamán, el líder espiritual, con su tocado ceremonial durante un ritual de conexión con los ancestros.',                   NULL, 'QR-009', 'Antropomorfo'),
('La Danza Ritual',       'Conjunto de figuras humanas tomadas de las manos en círculo.',                   'La Danza Ritual muestra a varias personas tomadas de las manos, celebrando las ceremonias comunitarias de la cosecha.',                                 NULL, 'QR-010', 'Antropomorfo'),
('El Rombo Sagrado',      'Patrón geométrico de rombos asociado a la dualidad y el equilibrio.',            'El Rombo Sagrado representa la dualidad: el día y la noche, lo masculino y lo femenino, el equilibrio del universo.',                                   NULL, 'QR-011', 'Geométrico'),
('Venus Matutina',        'Símbolo del planeta Venus, guía de los viajeros al amanecer.',                   'Venus Matutina representa al lucero del alba, que guiaba a los viajeros y marcaba el inicio de un nuevo día.',                                          NULL, 'QR-012', 'Astronómico');

-- ── Estaciones (coordenadas reales del recorrido del frontend) ──
INSERT INTO estaciones (nombre, descripcion, latitud, longitud, petroglifo_id) VALUES
('Estación 1',  'Inicio del sendero, zona de bienvenida.',          7.4200000, -65.0320000, 1),
('Estación 2',  'Pequeño claro junto al arroyo.',                   7.4205000, -65.0315000, 2),
('Estación 3',  'Mirador con vista al valle.',                      7.4210000, -65.0310000, 3),
('Estación 4',  'Formación rocosa principal.',                      7.4215000, -65.0305000, 4),
('Estación 5',  'Cueva de los grabados.',                           7.4220000, -65.0300000, 5),
('Estación 6',  'Plataforma ceremonial.',                           7.4225000, -65.0295000, 6),
('Estación 7',  'Cauce del río antiguo.',                           7.4230000, -65.0290000, 7),
('Estación 8',  'Zona de descanso sombreada.',                      7.4235000, -65.0285000, 8),
('Estación 9',  'Altar de piedra.',                                 7.4240000, -65.0280000, 9),
('Estación 10', 'Anfiteatro natural.',                              7.4245000, -65.0275000, 10),
('Estación 11', 'Paso entre rocas.',                                7.4250000, -65.0270000, 11),
('Estación 12', 'Cima del recorrido, punto final.',                 7.4255000, -65.0265000, 12);

-- ── Recorrido principal + secuencia ordenada ─────────────────
INSERT INTO recorridos (nombre, descripcion, activo) VALUES
('Recorrido Completo', 'Las 12 estaciones del valle sagrado, de la bienvenida a la cima.', TRUE);

INSERT INTO recorrido_estaciones (recorrido_id, estacion_id, orden) VALUES
(1, 1, 1), (1, 2, 2), (1, 3, 3),  (1, 4, 4),  (1, 5, 5),  (1, 6, 6),
(1, 7, 7), (1, 8, 8), (1, 9, 9),  (1, 10, 10),(1, 11, 11),(1, 12, 12);

-- ── Noticias y eventos ───────────────────────────────────────
INSERT INTO noticias_eventos (titulo, contenido, imagen_url, categoria, fecha_publicacion) VALUES
('Restauración de Petroglifo Ancestral', 'Se completó el trabajo de conservación en la estación 5. Los expertos han revelado nuevos detalles del petroglifo El Jaguar Celeste tras meses de cuidadosa restauración.', 'assets/img/museo-exterior.png', 'restauracion', '2026-06-28 10:00:00'),
('Festival de Arte Ancestral',           'Únete a nosotros para celebrar la cultura ancestral con danzas tradicionales, exposiciones y talleres educativos para toda la familia.',                                          NULL, 'evento', '2026-06-22 09:00:00'),
('Nueva Herramienta Interactiva',        'Hemos lanzado nuestra aplicación PWA con experiencia offline. Descárgala en tu teléfono y vive el recorrido con guía de voz aunque no tengas señal.',                              NULL, 'tecnologia', '2026-06-15 12:00:00');

-- ── Reseñas (una aprobada, una pendiente) ────────────────────
INSERT INTO comentarios_resenas (usuario_id, texto, calificacion, estado_moderacion) VALUES
(2, 'Experiencia extraordinaria. Los petroglifos son una maravilla y el asistente de voz hace que todo cobre vida. Definitivamente regresaré.', 5, 'aprobado'),
(2, 'Patrimonio venezolano que merece ser conocido por todos. La app interactiva es de primer nivel.', 5, 'pendiente');

-- ── Preguntas y respuestas (FAQ) ─────────────────────────────
INSERT INTO preguntas_respuestas (pregunta, respuesta, usuario_id, publicada) VALUES
('¿Cuál es la mejor época para visitar?', 'El parque es visitable todo el año. Recomendamos la temporada seca (noviembre a abril) para evitar el barro en los senderos.', NULL, TRUE),
('¿El recorrido es apto para niños?',     'Sí, el sendero es de dificultad baja y dura unas 2 horas. La trivia y el asistente de voz lo hacen muy entretenido para los más jóvenes.', NULL, TRUE),
('¿Necesito conexión a internet?',        'No para el recorrido: la app funciona sin señal una vez descargado el mapa. Sí para reservas y dejar reseñas.', NULL, TRUE),
('¿Puedo llevar mi propia comida?',       NULL, 2, FALSE);

-- ── Trivia ───────────────────────────────────────────────────
INSERT INTO preguntas_trivia (pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta) VALUES
('¿Qué animal era el más respetado y se asociaba a los chamanes?', 'El pez', 'El jaguar', 'La tortuga', 'La serpiente', 'B'),
('¿Para qué servía el petroglifo "La Luna Llena"?',                'Decoración', 'Marcar el calendario lunar', 'Señalar un tesoro', 'Indicar peligro', 'B'),
('¿Qué representa "El Espiral del Tiempo"?',                       'Un río', 'Una estrella', 'Los ciclos de la vida', 'Una montaña', 'C'),
('¿Cuántas estaciones tiene el recorrido completo?',              '8', '10', '12', '15', 'C'),
('¿Qué simboliza la tortuga en la cosmovisión ancestral?',        'Velocidad', 'Longevidad y sabiduría', 'Peligro', 'Riqueza', 'B');

-- ── Contador de visitas (fila única inicial) ─────────────────
INSERT INTO visitas_sitio (contador) VALUES (1247);

-- Fin de los datos de ejemplo.
