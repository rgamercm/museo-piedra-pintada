/**
 * utils/jwt.js — Firma y verificación de JSON Web Tokens.
 */
'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Firma un token con los datos públicos del usuario.
 * @param {{id:number, rol:string, nombre:string}} usuario
 */
function firmarToken(usuario) {
  const payload = { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES });
}

/** Verifica un token y devuelve el payload, o lanza error si es inválido. */
function verificarToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { firmarToken, verificarToken };
