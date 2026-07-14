'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const ctrl = require('../controllers/recorridos.controller');

const router = Router();

// GET /api/recorridos - público
router.get('/', ctrl.listar);

// GET /api/recorridos/:id - público
router.get('/:id', [param('id').isInt().withMessage('ID inválido')], validar, ctrl.detalle);

// POST /api/recorridos - admin
router.post(
  '/',
  requiereSesion,
  requiereRol('admin'),
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
    body('descripcion').optional().trim(),
    body('activo').optional().isBoolean().withMessage('Debe ser booleano.'),
    body('estaciones_ids').optional().isArray().withMessage('Las estaciones deben ser un arreglo de IDs.'),
    body('estaciones_ids.*').optional().isInt().withMessage('Cada ID de estación debe ser entero.')
  ],
  validar,
  ctrl.crear
);

// PUT /api/recorridos/:id - admin
router.put(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [
    param('id').isInt().withMessage('ID inválido'),
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
    body('descripcion').optional().trim(),
    body('activo').optional().isBoolean().withMessage('Debe ser booleano.'),
    body('estaciones_ids').optional().isArray().withMessage('Las estaciones deben ser un arreglo de IDs.'),
    body('estaciones_ids.*').optional().isInt().withMessage('Cada ID de estación debe ser entero.')
  ],
  validar,
  ctrl.editar
);

// DELETE /api/recorridos/:id - admin
router.delete(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminar
);

module.exports = router;
