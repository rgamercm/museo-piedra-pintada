/**
 * middlewares/errores.js — Manejo central de errores y 404.
 */
'use strict';

const env = require('../config/env');
const { error } = require('../utils/respuestas');

/** Ruta no encontrada. */
function noEncontrado(req, res) {
  return error(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
}

/** Manejador central. Debe registrarse al final, con 4 argumentos. */
function manejadorErrores(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[ERROR]', err.message);

  // Violaciones de restricción de PostgreSQL → 409 Conflicto
  if (err.code === '23505') return error(res, 'El registro ya existe (valor duplicado).', 409);
  if (err.code === '23503') return error(res, 'Referencia inválida a otro registro.', 409);
  if (err.code === '23514') return error(res, 'Un valor no cumple las reglas de la base de datos.', 422);

  const detalles = env.NODE_ENV === 'development' ? err.message : undefined;
  return error(res, 'Error interno del servidor.', 500, detalles);
}

module.exports = { noEncontrado, manejadorErrores };
