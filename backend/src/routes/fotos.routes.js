'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const ctrl = require('../controllers/fotos.controller');

const router = Router();

// GET /api/fotos - público
router.get(
  '/',
  [
    query('petroglifo_id').optional().isInt().withMessage('Debe ser entero.'),
    query('comentario_id').optional().isInt().withMessage('Debe ser entero.')
  ],
  validar,
  ctrl.listar
);

// POST /api/fotos - requiere sesión
// upload.single('imagen') procesa el multipart/form-data
router.post(
  '/',
  requiereSesion,
  upload.single('imagen'),
  [
    body('petroglifo_id').optional().isInt().withMessage('Debe ser entero.'),
    body('comentario_id').optional().isInt().withMessage('Debe ser entero.')
  ],
  validar,
  ctrl.subir
);

// DELETE /api/fotos/:id - requiere sesión (admin o creador)
router.delete(
  '/:id',
  requiereSesion,
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminar
);

module.exports = router;
