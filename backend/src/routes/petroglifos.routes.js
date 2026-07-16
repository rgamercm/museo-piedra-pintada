'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const ctrl = require('../controllers/petroglifos.controller');

const router = Router();

// GET /api/petroglifos - público
router.get('/', ctrl.listar);

// GET /api/petroglifos/:id - público
router.get('/:id', [param('id').isInt().withMessage('ID inválido')], validar, ctrl.detalle);

// POST /api/petroglifos - admin
router.post(
  '/',
  requiereSesion,
  requiereRol('admin'),
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
    body('descripcion').trim().notEmpty().withMessage('La descripción es obligatoria.'),
    body('texto_asistente').trim().notEmpty().withMessage('El texto del asistente es obligatorio.'),
    body('imagen_url').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('La URL de imagen es demasiado larga.'),
    body('codigo_qr').trim().notEmpty().withMessage('El código QR es obligatorio.'),
    body('categoria').optional().trim().isLength({ max: 100 })
  ],
  validar,
  ctrl.crear
);

// PUT /api/petroglifos/:id - admin
router.put(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [
    param('id').isInt().withMessage('ID inválido'),
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
    body('descripcion').trim().notEmpty().withMessage('La descripción es obligatoria.'),
    body('texto_asistente').trim().notEmpty().withMessage('El texto del asistente es obligatorio.'),
    body('imagen_url').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('La URL de imagen es demasiado larga.'),
    body('codigo_qr').trim().notEmpty().withMessage('El código QR es obligatorio.'),
    body('categoria').optional().trim().isLength({ max: 100 })
  ],
  validar,
  ctrl.editar
);

// DELETE /api/petroglifos/:id - admin
router.delete(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminar
);

module.exports = router;
