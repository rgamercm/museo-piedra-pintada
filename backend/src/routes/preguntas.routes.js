'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol, sesionOpcional } = require('../middlewares/auth');
const ctrl = require('../controllers/preguntas.controller');

const router = Router();

// GET /api/preguntas - público
router.get('/', ctrl.listar);

// GET /api/preguntas/pendientes - admin
router.get(
  '/pendientes',
  requiereSesion,
  requiereRol('admin'),
  ctrl.listarPendientes
);

// POST /api/preguntas - público o autenticado

router.post(
  '/',
  sesionOpcional,
  [
    body('pregunta').trim().notEmpty().withMessage('La pregunta no puede estar vacía.'),
    body('nombre').optional({ values: 'falsy' }).trim().isLength({ max: 100 })
      .withMessage('El nombre es demasiado largo.'),
    body('correo').optional({ values: 'falsy' }).trim().isEmail()
      .withMessage('El correo no es válido.').isLength({ max: 150 })
  ],
  validar,
  ctrl.crear
);

// PATCH /api/preguntas/:id/responder - admin
router.patch(
  '/:id/responder',
  requiereSesion,
  requiereRol('admin'),
  [
    param('id').isInt().withMessage('ID inválido'),
    body('respuesta').trim().notEmpty().withMessage('La respuesta no puede estar vacía.')
  ],
  validar,
  ctrl.responder
);

// DELETE /api/preguntas/:id - admin
router.delete(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminar
);

module.exports = router;
