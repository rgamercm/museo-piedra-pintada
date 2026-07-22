'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const ctrl = require('../controllers/petroglifos.controller');

const router = Router();

// GET /api/petroglifos - público
router.get('/', ctrl.listar);

// GET /api/petroglifos/qr/:codigo - público (escáner QR + ficha)
router.get('/qr/:codigo', [param('codigo').notEmpty()], validar, ctrl.buscarPorQr);

// GET /api/petroglifos/:id - público
router.get('/:id', [param('id').isInt().withMessage('ID inválido')], validar, ctrl.detalle);

// POST /api/petroglifos - admin
router.post(
  '/',
  requiereSesion,
  requiereRol('admin'),
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
    body('descripcion').trim().notEmpty().withMessage('La descripción es obligatoria.'),
    body('texto_asistente').trim().notEmpty().withMessage('El texto del asistente es obligatorio.'),
    body('imagen_url').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('La URL de imagen es demasiado larga.'),
    body('codigo_qr').trim().notEmpty().withMessage('El código QR es obligatorio.'),
    body('categoria').optional().trim().isLength({ max: 100 }),
    body('codigo_roca').optional({ checkFalsy: true }).isLength({ max: 20 }),
    body('latitud').optional({ nullable: true, checkFalsy: true }).isFloat(),
    body('longitud').optional({ nullable: true, checkFalsy: true }).isFloat(),
    body('altitud_m').optional({ nullable: true, checkFalsy: true }).isInt(),
    body('cantidad_caras').optional({ checkFalsy: true }).isLength({ max: 10 }),
    body('profundidad_surco').optional({ checkFalsy: true }).isLength({ max: 30 }),
    body('forma_surco').optional({ checkFalsy: true }).isLength({ max: 50 }),
    body('exposicion_solar').optional({ checkFalsy: true }).isLength({ max: 50 }),
    body('orientacion').optional({ checkFalsy: true }).isLength({ max: 100 }),
    body('estado_conservacion').optional({ checkFalsy: true }).isLength({ max: 50 }),
    body('fecha_registro').optional({ checkFalsy: true }).isLength({ max: 50 }),
    body('notas').optional({ checkFalsy: true }),
    body('destacado').optional().isBoolean().withMessage('Destacado debe ser un booleano.')
  ],
  validar,
  ctrl.crear
);

// PUT /api/petroglifos/:id - admin
router.put(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [
    param('id').isInt().withMessage('ID inválido'),
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
    body('descripcion').trim().notEmpty().withMessage('La descripción es obligatoria.'),
    body('texto_asistente').trim().notEmpty().withMessage('El texto del asistente es obligatorio.'),
    body('imagen_url').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('La URL de imagen es demasiado larga.'),
    body('codigo_qr').trim().notEmpty().withMessage('El código QR es obligatorio.'),
    body('categoria').optional().trim().isLength({ max: 100 }),
    body('codigo_roca').optional({ checkFalsy: true }).isLength({ max: 20 }),
    body('latitud').optional({ nullable: true, checkFalsy: true }).isFloat(),
    body('longitud').optional({ nullable: true, checkFalsy: true }).isFloat(),
    body('altitud_m').optional({ nullable: true, checkFalsy: true }).isInt(),
    body('cantidad_caras').optional({ checkFalsy: true }).isLength({ max: 10 }),
    body('profundidad_surco').optional({ checkFalsy: true }).isLength({ max: 30 }),
    body('forma_surco').optional({ checkFalsy: true }).isLength({ max: 50 }),
    body('exposicion_solar').optional({ checkFalsy: true }).isLength({ max: 50 }),
    body('orientacion').optional({ checkFalsy: true }).isLength({ max: 100 }),
    body('estado_conservacion').optional({ checkFalsy: true }).isLength({ max: 50 }),
    body('fecha_registro').optional({ checkFalsy: true }).isLength({ max: 50 }),
    body('notas').optional({ checkFalsy: true }),
    body('destacado').optional().isBoolean().withMessage('Destacado debe ser un booleano.')
  ],
  validar,
  ctrl.editar
);

// DELETE /api/petroglifos/:id - admin
router.delete(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminar
);

module.exports = router;
