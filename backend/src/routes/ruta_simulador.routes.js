'use strict';

const { Router } = require('express');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const ctrl = require('../controllers/ruta_simulador.controller');

const router = Router();

// GET /api/ruta_simulador - público (usado por el simulador frontal)
router.get('/', ctrl.obtener);

// PUT /api/ruta_simulador - admin (guarda el trazado personalizado)
router.put(
  '/',
  requiereSesion,
  requiereRol('admin'),
  ctrl.guardar
);

module.exports = router;
