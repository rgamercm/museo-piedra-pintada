/**
 * routes/auth.routes.js — Rutas de autenticación.
 */
'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion } = require('../middlewares/auth');
const ctrl = require('../controllers/auth.controller');

const router = Router();

router.post(
  '/registro',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.')
      .isLength({ max: 100 }).withMessage('Nombre demasiado largo.'),
    body('correo').trim().isEmail().withMessage('Correo inválido.')
      .normalizeEmail(),
    body('contrasena').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
    body('rol').optional().isIn(['registrado', 'institucion']).withMessage('Rol no permitido en el registro.'),
    body('institucion_nombre').optional().trim().isLength({ max: 200 }),
  ],
  validar,
  ctrl.registro
);

router.post(
  '/login',
  [
    body('correo').trim().isEmail().withMessage('Correo inválido.').normalizeEmail(),
    body('contrasena').notEmpty().withMessage('La contraseña es obligatoria.'),
  ],
  validar,
  ctrl.login
);

router.get('/perfil', requiereSesion, ctrl.perfil);

module.exports = router;
