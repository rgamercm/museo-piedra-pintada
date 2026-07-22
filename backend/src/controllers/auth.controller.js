/**
 * controllers/auth.controller.js — Registro, login y perfil.
 */
'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const { firmarToken } = require('../utils/jwt');
const { exito, creado, error } = require('../utils/respuestas');

const ROUNDS = 10;

/** POST /api/auth/registro */
async function registro(req, res, next) {
  try {
    const { nombre, correo, contrasena, rol, institucion_nombre, preguntas_seguridad = [] } = req.body;

    // Solo se permite auto-registro como visitante/registrado/institucion.
    // El rol admin no se crea desde aquí (se siembra o lo asigna otro admin).
    const rolFinal = ['registrado', 'institucion'].includes(rol) ? rol : 'registrado';
    if (rolFinal === 'institucion' && !institucion_nombre) {
      return error(res, 'El rol institución requiere el nombre de la institución.', 422);
    }
    
    // Validar preguntas de seguridad (mínimo 1)
    if (!Array.isArray(preguntas_seguridad) || preguntas_seguridad.length === 0) {
      return error(res, 'Debes configurar al menos una pregunta de seguridad.', 422);
    }
    
    // Convertir las respuestas a minúsculas y limpiarlas para el almacenamiento
    const preguntasProcesadas = preguntas_seguridad.map(item => ({
      pregunta: item.pregunta.trim(),
      respuesta: item.respuesta.trim().toLowerCase()
    }));

    const hash = await bcrypt.hash(contrasena, ROUNDS);

    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, institucion_nombre, preguntas_seguridad)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, correo, rol, institucion_nombre, creado_en`,
      [nombre, correo.toLowerCase(), hash, rolFinal, institucion_nombre || null, JSON.stringify(preguntasProcesadas)]
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

/** POST /api/auth/preguntas-seguridad */
async function obtenerPreguntasSeguridad(req, res, next) {
  try {
    const { correo } = req.body;
    const { rows } = await db.query(
      `SELECT id, correo, preguntas_seguridad FROM usuarios WHERE correo = $1`,
      [correo.toLowerCase()]
    );
    const usuario = rows[0];
    
    if (!usuario || !usuario.preguntas_seguridad || usuario.preguntas_seguridad.length === 0) {
      return error(res, 'No se encontraron preguntas de seguridad para este correo.', 404);
    }
    
    // Devolver las preguntas SIN las respuestas
    const preguntas = usuario.preguntas_seguridad.map(p => p.pregunta);
    return exito(res, { preguntas, correo: usuario.correo });
  } catch (e) {
    next(e);
  }
}

/** POST /api/auth/verificar-seguridad */
async function verificarPreguntasSeguridad(req, res, next) {
  try {
    const { correo, respuestas } = req.body; // respuestas = { "pregunta1": "respuesta1", "pregunta2": "respuesta2" }
    
    const { rows } = await db.query(
      `SELECT id, correo, contrasena_hash, preguntas_seguridad FROM usuarios WHERE correo = $1`,
      [correo.toLowerCase()]
    );
    const usuario = rows[0];
    if (!usuario) return error(res, 'Petición inválida', 400);

    const guardadas = usuario.preguntas_seguridad || [];
    if (guardadas.length === 0) return error(res, 'El usuario no tiene preguntas de seguridad.', 400);
    
    let correctas = 0;
    for (const g of guardadas) {
      const respUser = (respuestas[g.pregunta] || '').trim().toLowerCase();
      if (respUser === g.respuesta) correctas++;
    }
    
    if (correctas !== guardadas.length) {
      return error(res, 'Las respuestas de seguridad son incorrectas.', 401);
    }

    // Si todo es correcto, emitimos el token de recuperación
    const secret = env.JWT_SECRET + usuario.contrasena_hash;
    const token = jwt.sign({ id: usuario.id, correo: usuario.correo }, secret, { expiresIn: '15m' });
    
    return exito(res, { token, mensaje: 'Respuestas correctas. Puedes restablecer tu contraseña.' });
  } catch (e) {
    next(e);
  }
}

/** POST /api/auth/restablecer-contrasena */
async function restablecerContrasena(req, res, next) {
  try {
    const { token, correo, nuevaContrasena } = req.body;
    
    const { rows } = await db.query(
      `SELECT id, contrasena_hash FROM usuarios WHERE correo = $1`,
      [correo.toLowerCase()]
    );
    const usuario = rows[0];
    if (!usuario) return error(res, 'Petición inválida', 400);

    const secret = env.JWT_SECRET + usuario.contrasena_hash;
    try {
      jwt.verify(token, secret);
    } catch (err) {
      return error(res, 'El enlace de recuperación es inválido o ha expirado.', 400);
    }

    const nuevoHash = await bcrypt.hash(nuevaContrasena, 10);
    await db.query(
      `UPDATE usuarios SET contrasena_hash = $1 WHERE id = $2`,
      [nuevoHash, usuario.id]
    );

    return exito(res, { mensaje: 'Contraseña actualizada correctamente.' });
  } catch (e) {
    next(e);
  }
}

module.exports = { registro, login, perfil, obtenerPreguntasSeguridad, verificarPreguntasSeguridad, restablecerContrasena };
