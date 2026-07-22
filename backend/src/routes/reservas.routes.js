'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const ctrl = require('../controllers/reservas.controller');

const router = Router();

// GET /api/reservas - admin
router.get(
  '/',
  requiereSesion,
  requiereRol('admin'),
  [
    query('estado').optional().isIn(['pendiente', 'aprobada', 'rechazada']).withMessage('Estado inválido')
  ],
  validar,
  ctrl.listar
);

// GET /api/reservas/mias - institucion
router.get(
  '/mias',
  requiereSesion,
  requiereRol('institucion'),
  ctrl.listarMias
);

const { tieneGroserias, tieneCaracteresSospechosos, limpiarHtml } = require('../utils/filtro');

// POST /api/reservas - Cualquier usuario logueado
router.post(
  '/',
  requiereSesion,
  [
    body('institucion')
      .trim()
      .notEmpty().withMessage('El nombre de la institución es obligatorio.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres permitidos.')
      .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\.,\-]+$/).withMessage('Nombre de institución contiene caracteres no permitidos.')
      .custom(value => {
        if (tieneGroserias(value)) throw new Error('El nombre de la institución contiene lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(value)) throw new Error('El nombre de la institución contiene secuencias inválidas.');
        return true;
      }),
    
    body('responsable_nombre')
      .trim()
      .notEmpty().withMessage('El nombre de contacto es obligatorio.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres permitidos.')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/).withMessage('El nombre solo debe contener letras.')
      .custom(value => {
        if (tieneGroserias(value)) throw new Error('El nombre contiene lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(value)) throw new Error('El nombre contiene secuencias inválidas.');
        return true;
      }),

    body('responsable_email')
      .trim()
      .isEmail().withMessage('Correo de contacto inválido.')
      .normalizeEmail(),
      
    body('fecha_visita')
      .isDate().withMessage('Formato de fecha inválido (YYYY-MM-DD).')
      .custom(value => {
        const fecha = new Date(value);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const limiteMaximo = new Date();
        limiteMaximo.setFullYear(limiteMaximo.getFullYear() + 1);

        if (fecha < hoy) {
          throw new Error('La fecha de visita no puede ser en el pasado.');
        }
        if (fecha > limiteMaximo) {
          throw new Error('No se pueden hacer reservas con más de 1 año de anticipación.');
        }
        return true;
      }),
      
    body('numero_personas')
      .isInt({ min: 1, max: 10000 }).withMessage('El número de personas debe estar entre 1 y 10000.'),
      
    body('notas')
      .optional()
      .trim()
      .customSanitizer(value => limpiarHtml(value))
      .custom(value => {
        if (tieneGroserias(value)) throw new Error('Las notas contienen lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(value)) throw new Error('Las notas contienen secuencias inválidas.');
        return true;
      }),
      
    body('tipo_institucion')
      .optional()
      .trim()
      .customSanitizer(value => limpiarHtml(value))
  ],
  validar,
  ctrl.crear
);

// PATCH /api/reservas/:id/estado - admin
router.patch(
  '/:id/estado',
  requiereSesion,
  requiereRol('admin'),
  [
    param('id').isInt().withMessage('ID inválido'),
    body('estado').isIn(['aprobada', 'rechazada']).withMessage('El estado debe ser aprobada o rechazada')
  ],
  validar,
  ctrl.cambiarEstado
);

module.exports = router;
