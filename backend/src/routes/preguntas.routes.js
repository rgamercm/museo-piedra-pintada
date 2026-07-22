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

const { tieneGroserias, tieneCaracteresSospechosos, limpiarHtml } = require('../utils/filtro');

// POST /api/preguntas - público o autenticado
router.post(
  '/',
  sesionOpcional,
  [
    body('pregunta')
      .trim()
      .notEmpty().withMessage('La pregunta no puede estar vacía.')
      .isLength({ max: 500 }).withMessage('La pregunta no puede exceder los 500 caracteres.')
      .customSanitizer(value => limpiarHtml(value))
      .custom(value => {
        if (tieneGroserias(value)) throw new Error('La pregunta contiene lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(value)) throw new Error('La pregunta contiene secuencias inválidas.');
        return true;
      }),
      
    body('nombre')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 100 }).withMessage('El nombre es demasiado largo.')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/).withMessage('El nombre solo debe contener letras.')
      .custom(value => {
        if (tieneGroserias(value)) throw new Error('El nombre contiene lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(value)) throw new Error('El nombre contiene secuencias inválidas.');
        return true;
      }),
      
    body('correo')
      .optional({ values: 'falsy' })
      .trim()
      .isEmail().withMessage('El correo no es válido.')
      .isLength({ max: 150 })
      .normalizeEmail()
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
    body('respuesta')
      .trim()
      .notEmpty().withMessage('La respuesta no puede estar vacía.')
      .customSanitizer(value => limpiarHtml(value))
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
