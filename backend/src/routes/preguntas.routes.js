'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
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
// Para permitir preguntas anónimas, hacemos un middleware opcional de sesión
function sesionOpcional(req, res, next) {
  // Intentamos aplicar requiereSesion, pero si falla no cortamos la cadena, 
  // simplemente req.usuario será undefined.
  // Sin embargo, nuestro requiereSesion corta con error si no hay token.
  // Es mejor implementar una lógica rápida aquí:
  const jwt = require('jsonwebtoken');
  const env = require('../config/env');
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      req.usuario = jwt.verify(token, env.JWT_SECRET);
    } catch (e) {
      // Token inválido, ignoramos para que sea anónimo
    }
  }
  next();
}

router.post(
  '/',
  sesionOpcional,
  [
    body('pregunta').trim().notEmpty().withMessage('La pregunta no puede estar vacía.')
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
