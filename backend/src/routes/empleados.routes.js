'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion } = require('../middlewares/auth');
const ctrl = require('../controllers/empleados.controller');

const router = Router();

// GET /api/empleados (Público)
router.get('/', ctrl.obtenerTodos);

// GET /api/empleados/:id (Público)
router.get('/:id', ctrl.obtenerPorId);

// ==========================================
// RUTAS DE ADMINISTRADOR
// ==========================================

// POST /api/empleados
router.post(
  '/',
  requiereSesion,
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim().escape(),
    body('cargo').notEmpty().withMessage('El cargo es obligatorio').trim().escape(),
    body('descripcion').optional().trim().escape(),
    body('imagen_url').optional().trim(),
    body('orden').optional().isInt().withMessage('El orden debe ser un número entero'),
    body('destacado').optional().isBoolean().withMessage('Destacado debe ser booleano')
  ],
  validar,
  ctrl.crear
);

// PUT /api/empleados/:id
router.put(
  '/:id',
  requiereSesion,
  [
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío').trim().escape(),
    body('cargo').optional().notEmpty().withMessage('El cargo no puede estar vacío').trim().escape(),
    body('descripcion').optional().trim().escape(),
    body('imagen_url').optional().trim(),
    body('orden').optional().isInt().withMessage('El orden debe ser un número entero'),
    body('destacado').optional().isBoolean().withMessage('Destacado debe ser booleano')
  ],
  validar,
  ctrl.actualizar
);

// DELETE /api/empleados/:id
router.delete('/:id', requiereSesion, ctrl.eliminar);

module.exports = router;
