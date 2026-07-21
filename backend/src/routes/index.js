/**
 * routes/index.js — Router principal de la API.
 * Aquí se irán montando los módulos de cada recurso (M4.1 .. M4.9).
 */
'use strict';

const { Router } = require('express');
const db = require('../config/db');
const { exito, error } = require('../utils/respuestas');

const authRoutes = require('./auth.routes');

const router = Router();

// ── Healthcheck (M2) ───────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const ahora = await db.probarConexion();
    return exito(res, { estado: 'ok', bd: 'conectada', hora: ahora });
  } catch (e) {
    return error(res, 'La base de datos no responde.', 503, e.message);
  }
});

// ── Módulos de recursos ────────────────────────────────────
router.use('/auth', authRoutes);

// Próximamente (M4.1 .. M4.9):
router.use('/petroglifos', require('./petroglifos.routes'));
router.use('/estaciones',  require('./estaciones.routes'));
router.use('/recorridos',  require('./recorridos.routes'));
router.use('/reservas',    require('./reservas.routes'));
router.use('/comentarios', require('./comentarios.routes'));
router.use('/fotos',       require('./fotos.routes'));
router.use('/preguntas',   require('./preguntas.routes'));
router.use('/noticias',    require('./noticias.routes'));
router.use('/trivia',      require('./trivia.routes'));
router.use('/visitas',     require('./visitas.routes'));
router.use('/ruta_simulador', require('./ruta_simulador.routes'));
router.use('/configuracion', require('./configuracion.routes'));

module.exports = router;
