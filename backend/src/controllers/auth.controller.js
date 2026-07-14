/**
 * controllers/auth.controller.js — Registro, login y perfil.
 */
'use strict';

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { firmarToken } = require('../utils/jwt');
const { exito, creado, error } = require('../utils/respuestas');

const ROUNDS = 10;

/** POST /api/auth/registro */
async function registro(req, res, next) {
  try {
    const { nombre, correo, contrasena, rol, institucion_nombre } = req.body;

    // Solo se permite auto-registro como visitante/registrado/institucion.
    // El rol admin no se crea desde aquí (se siembra o lo asigna otro admin).
    const rolFinal = ['registrado', 'institucion'].includes(rol) ? rol : 'registrado';
    if (rolFinal === 'institucion' && !institucion_nombre) {
      return error(res, 'El rol institución requiere el nombre de la institución.', 422);
    }

    const hash = await bcrypt.hash(contrasena, ROUNDS);

    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, institucion_nombre)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, correo, rol, institucion_nombre, creado_en`,
      [nombre, correo.toLowerCase(), hash, rolFinal, institucion_nombre || null]
    );

    const usuario = rows[0];
    const token = firmarToken(usuario);
    return creado(res, { usuario, token });
  } catch (e) {
    next(e); // el duplicado de correo (23505) lo traduce el manejador central
  }
}

/** POST /api/auth/login */
async function login(req, res, next) {
  try {
    const { correo, contrasena } = req.body;

    const { rows } = await db.query(
      `SELECT id, nombre, correo, contrasena_hash, rol, institucion_nombre
       FROM usuarios WHERE correo = $1`,
      [correo.toLowerCase()]
    );

    const usuario = rows[0];
    // Mensaje genérico para no revelar si el correo existe.
    if (!usuario) return error(res, 'Credenciales inválidas.', 401);

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!coincide) return error(res, 'Credenciales inválidas.', 401);

    delete usuario.contrasena_hash;
    const token = firmarToken(usuario);
    return exito(res, { usuario, token });
  } catch (e) {
    next(e);
  }
}

/** GET /api/auth/perfil (requiere sesión) */
async function perfil(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, correo, rol, institucion_nombre, creado_en
       FROM usuarios WHERE id = $1`,
      [req.usuario.id]
    );
    if (!rows[0]) return error(res, 'Usuario no encontrado.', 404);
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

module.exports = { registro, login, perfil };
