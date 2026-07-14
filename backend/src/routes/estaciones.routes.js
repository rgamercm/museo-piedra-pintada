'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const ctrl = require('../controllers/estaciones.controller');

const router = Router();

// GET /api/estaciones - público
router.get('/', ctrl.listar);

// GET /api/estaciones/qr/:codigo - público
router.get('/qr/:codigo', [param('codigo').notEmpty().withMessage('El código QR es obligatorio')], validar, ctrl.buscarPorQr);

// POST /api/estaciones - admin
router.post(
  '/',
  requiereSesion,
  requiereRol('admin'),
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
    body('descripcion').optional().trim(),
    body('latitud').isFloat().withMessage('Latitud inválida.'),
    body('longitud').isFloat().withMessage('Longitud inválida.'),
    body('petroglifo_id').optional({ nullable: true }).isInt().withMessage('ID de petroglifo inválido.')
  ],
  validar,
  ctrl.crear
);

// PUT /api/estaciones/:id - admin
router.put(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [
    param('id').isInt().withMessage('ID inválido'),
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
    body('descripcion').optional().trim(),
    body('latitud').isFloat().withMessage('Latitud inválida.'),
    body('longitud').isFloat().withMessage('Longitud inválida.'),
    body('petroglifo_id').optional({ nullable: true }).isInt().withMessage('ID de petroglifo inválido.')
  ],
  validar,
  ctrl.editar
);

// DELETE /api/estaciones/:id - admin
router.delete(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminar
);

module.exports = router;
