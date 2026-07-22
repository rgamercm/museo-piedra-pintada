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

const { tieneGroserias, tieneCaracteresSospechosos } = require('../utils/filtro');

router.post(
  '/registro',
  [
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio.')
      .isLength({ max: 100 }).withMessage('Nombre demasiado largo.')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/).withMessage('El nombre solo debe contener letras.')
      .custom(value => {
        if (tieneGroserias(value)) throw new Error('El nombre contiene lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(value)) throw new Error('El nombre contiene caracteres inválidos.');
        return true;
      }),
    body('correo').trim().isEmail().withMessage('Correo inválido.')
      .normalizeEmail(),
    body('contrasena').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
    body('rol').optional().isIn(['registrado', 'institucion']).withMessage('Rol no permitido en el registro.'),
    body('institucion_nombre').optional().trim().isLength({ max: 100 }),
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
