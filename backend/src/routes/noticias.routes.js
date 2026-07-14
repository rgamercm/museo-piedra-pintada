'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const ctrl = require('../controllers/noticias.controller');

const router = Router();

// GET /api/noticias - público
router.get('/', ctrl.listar);

// GET /api/noticias/:id - público
router.get('/:id', [param('id').isInt().withMessage('ID inválido')], validar, ctrl.detalle);

// POST /api/noticias - admin
router.post(
  '/',
  requiereSesion,
  requiereRol('admin'),
  [
    body('titulo').trim().notEmpty().withMessage('El título es obligatorio.').isLength({ max: 300 }),
    body('contenido').trim().notEmpty().withMessage('El contenido es obligatorio.'),
    body('imagen_url').optional({ checkFalsy: true }).isURL().withMessage('URL de imagen inválida.'),
    body('categoria').optional().trim().isLength({ max: 50 }),
    body('activa').optional().isBoolean().withMessage('Debe ser booleano.')
  ],
  validar,
  ctrl.crear
);

// PUT /api/noticias/:id - admin
router.put(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [
    param('id').isInt().withMessage('ID inválido'),
    body('titulo').trim().notEmpty().withMessage('El título es obligatorio.').isLength({ max: 300 }),
    body('contenido').trim().notEmpty().withMessage('El contenido es obligatorio.'),
    body('imagen_url').optional({ checkFalsy: true }).isURL().withMessage('URL de imagen inválida.'),
    body('categoria').optional().trim().isLength({ max: 50 }),
    body('activa').optional().isBoolean().withMessage('Debe ser booleano.')
  ],
  validar,
  ctrl.editar
);

// DELETE /api/noticias/:id - admin
router.delete(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminar
);

module.exports = router;
