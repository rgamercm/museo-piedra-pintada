/**
 * middlewares/validacion.js — Recolecta los errores de express-validator
 * y responde 422 con la lista, antes de llegar al controlador.
 */
'use strict';

const { validationResult } = require('express-validator');
const { error } = require('../utils/respuestas');

function validar(req, res, next) {
  const resultado = validationResult(req);
  if (!resultado.isEmpty()) {
    const detalles = resultado.array().map(e => ({ campo: e.path, mensaje: e.msg }));
    return error(res, 'Datos de entrada inválidos.', 422, detalles);
  }
  return next();
}

module.exports = { validar };
