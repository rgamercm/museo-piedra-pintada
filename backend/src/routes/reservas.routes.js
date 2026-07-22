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

// POST /api/reservas - Cualquier usuario logueado
router.post(
  '/',
  requiereSesion,
  [
    body('institucion').trim().notEmpty().withMessage('El nombre de la institución es obligatorio.').isLength({ max: 200 }),
    body('responsable_nombre').trim().notEmpty().withMessage('El nombre de contacto es obligatorio.').isLength({ max: 100 }),
    body('responsable_email').trim().isEmail().withMessage('Correo de contacto inválido.').normalizeEmail(),
    body('fecha_visita')
      .isDate().withMessage('Formato de fecha inválido (YYYY-MM-DD).')
      .custom(value => {
        const fecha = new Date(value);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (fecha < hoy) {
          throw new Error('La fecha de visita no puede ser en el pasado.');
        }
        return true;
      }),
    body('numero_personas').isInt({ min: 1, max: 200 }).withMessage('El número de personas debe estar entre 1 y 200.'),
    body('notas').optional().trim(),
    body('tipo_institucion').optional().trim()
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
