'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validar } = require('../middlewares/validacion');
const { requiereSesion, requiereRol } = require('../middlewares/auth');
const { tieneGroserias, tieneCaracteresSospechosos, limpiarHtml } = require('../utils/filtro');
const ctrl = require('../controllers/solicitudes_informe.controller');

const router = Router();

// GET /api/solicitudes-informe — solo admin
router.get('/', requiereSesion, requiereRol('admin'), ctrl.listar);

// POST /api/solicitudes-informe — público (form del catálogo)
router.post(
  '/',
  [
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio.')
      .isLength({ max: 120 }).withMessage('Máximo 120 caracteres.')
      .custom(v => {
        if (tieneGroserias(v)) throw new Error('El nombre contiene lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(v)) throw new Error('El nombre contiene secuencias inválidas.');
        return true;
      }),
    body('correo')
      .trim()
      .isEmail().withMessage('Correo electrónico inválido.')
      .isLength({ max: 160 }).withMessage('Correo demasiado largo.')
      .normalizeEmail(),
    body('institucion')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 200 }).withMessage('Máximo 200 caracteres.')
      .customSanitizer(v => limpiarHtml(v))
      .custom(v => {
        if (v && tieneCaracteresSospechosos(v)) throw new Error('La institución contiene secuencias inválidas.');
        return true;
      }),
    body('finalidad')
      .trim()
      .notEmpty().withMessage('La finalidad es obligatoria.')
      .isLength({ min: 10, max: 600 }).withMessage('La finalidad debe tener entre 10 y 600 caracteres.')
      .customSanitizer(v => limpiarHtml(v))
      .custom(v => {
        if (tieneGroserias(v)) throw new Error('La finalidad contiene lenguaje inapropiado.');
        if (tieneCaracteresSospechosos(v)) throw new Error('La finalidad contiene secuencias inválidas.');
        return true;
      }),
  ],
  validar,
  ctrl.crear
);

// DELETE /api/solicitudes-informe/:id — solo admin
router.delete(
  '/:id',
  requiereSesion,
  requiereRol('admin'),
  [param('id').isInt().withMessage('ID inválido')],
  validar,
  ctrl.eliminar
);

module.exports = router;
