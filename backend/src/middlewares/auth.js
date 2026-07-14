/**
 * middlewares/auth.js — Autenticación (JWT) y autorización por rol (RBAC).
 *
 *  - requiereSesion: exige un token válido. Adjunta req.usuario.
 *  - requiereRol(...roles): exige que req.usuario.rol esté entre los permitidos.
 *  - sesionOpcional: si hay token lo valida, pero no bloquea si falta.
 */
'use strict';

const { verificarToken } = require('../utils/jwt');
const { error } = require('../utils/respuestas');

/** Extrae el token del header Authorization: Bearer <token>. */
function extraerToken(req) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  return tipo === 'Bearer' && token ? token : null;
}

function requiereSesion(req, res, next) {
  const token = extraerToken(req);
  if (!token) return error(res, 'No autenticado: falta el token.', 401);
  try {
    req.usuario = verificarToken(token);
    return next();
  } catch (e) {
    return error(res, 'Token inválido o expirado.', 401);
  }
}

function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) return error(res, 'No autenticado.', 401);
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return error(res, 'No autorizado: permisos insuficientes.', 403);
    }
    return next();
  };
}

function sesionOpcional(req, res, next) {
  const token = extraerToken(req);
  if (token) {
    try { req.usuario = verificarToken(token); } catch (e) { /* se ignora */ }
  }
  return next();
}

module.exports = { requiereSesion, requiereRol, sesionOpcional };
