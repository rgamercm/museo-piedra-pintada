'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol, sesionOpcional } = require('../middlewares/auth');
const ctrl = require('../controllers/trivia.controller');

const router = Router();

// ==========================================
// RUTAS PÚBLICAS Y DE USUARIO
// ==========================================

// GET /api/trivia/preguntas (Público)
router.get(
  '/preguntas',
  [query('limite').optional().isInt({ min: 1, max: 20 }).withMessage('El límite debe ser entre 1 y 20')],
  validar,
  ctrl.obtenerSetAleatorio
);


// POST /api/trivia/verificar (Público, sesión opcional)
router.post(
  '/verificar',
  sesionOpcional,
  [
    body('respuestas').isArray().withMessage('Las respuestas deben ser un arreglo.')
  ],
  validar,
  ctrl.verificarRespuestas
);

// POST /api/trivia/resultados (Registrado)
router.post(
  '/resultados',
  requiereSesion,
  [
    body('total_preguntas').isInt({ min: 1 }).withMessage('El total de preguntas debe ser mayor a 0.'),
    body('respuestas_json').isArray().withMessage('Las respuestas deben ser un arreglo.')
  ],
  validar,
  ctrl.guardarResultado
);

// ==========================================
// RUTAS DE ADMINISTRADOR
// ==========================================

// GET /api/trivia/preguntas/todas
router.get('/preguntas/todas', requiereSesion, requiereRol('admin'), ctrl.listarTodas);

// Validación reutilizable para crear/editar preguntas
const valPregunta = [
  body('pregunta').trim().notEmpty().withMessage('La pregunta no puede estar vacía.'),
  body('opcion_a').trim().notEmpty().withMessage('Opción A requerida.'),
  body('opcion_b').trim().notEmpty().withMessage('Opción B requerida.'),
  body('opcion_c').trim().notEmpty().withMessage('Opción C requerida.'),
  body('opcion_d').trim().notEmpty().withMessage('Opción D requerida.'),
  body('respuesta_correcta').isIn(['A', 'B', 'C', 'D']).withMessage('Debe ser A, B, C o D.'),
  body('activa').optional().isBoolean()
];

// POST /api/trivia/preguntas
router.post('/preguntas', requiereSesion, requiereRol('admin'), valPregunta, validar, ctrl.crearPregunta);

// PUT /api/trivia/preguntas/:id
router.put(
  '/preguntas/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido'), ...valPregunta],
  validar,
  ctrl.editarPregunta
);

// DELETE /api/trivia/preguntas/:id
router.delete(
  '/preguntas/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminarPregunta
);

module.exports = router;
