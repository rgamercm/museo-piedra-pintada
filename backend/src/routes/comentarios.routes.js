'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const ctrl = require('../controllers/comentarios.controller');

const router = Router();

// GET /api/comentarios - público
router.get('/', ctrl.listarAprobados);

// GET /api/comentarios/pendientes - admin
router.get(
  '/pendientes',
  requiereSesion,
  requiereRol('admin'),
  ctrl.listarPendientes
);

const { tieneGroserias, tieneCaracteresSospechosos, limpiarHtml } = require('../utils/filtro');

// POST /api/comentarios - requiere sesión (registrado o institucion)
// Permite que cualquier usuario autenticado (que no sea admin necesariamente) comente.
// Usamos requiereSesion, y luego en el controlador tomamos el ID.
router.post(
  '/',
  requiereSesion,
  [
    body('texto')
      .trim()
      .notEmpty().withMessage('El texto no puede estar vacío.')
      .isLength({ max: 500 }).withMessage('La reseña no puede exceder los 500 caracteres.')
      .customSanitizer(value => limpiarHtml(value))
      .custom(value => {
        if (tieneGroserias(value)) throw new Error('El texto contiene lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(value)) throw new Error('El texto contiene secuencias inválidas.');
        return true;
      }),
      
    body('calificacion').optional().isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser de 1 a 5.')
  ],
  validar,
  ctrl.crear
);

// PATCH /api/comentarios/:id/moderar - admin
router.patch(
  '/:id/moderar',
  requiereSesion,
  requiereRol('admin'),
  [
    param('id').isInt().withMessage('ID inválido'),
    body('estado_moderacion').isIn(['aprobado', 'rechazado']).withMessage('Estado inválido.')
  ],
  validar,
  ctrl.moderar
);

module.exports = router;
