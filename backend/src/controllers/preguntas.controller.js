'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');

// GET /api/preguntas (Público)
async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.pregunta, p.respuesta, p.creado_en, u.nombre as autor_nombre
       FROM preguntas_respuestas p
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.publicada = true
       ORDER BY p.creado_en DESC`
    );
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// GET /api/preguntas/pendientes (Admin)
async function listarPendientes(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.nombre as autor_nombre
       FROM preguntas_respuestas p
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.publicada = false
       ORDER BY p.creado_en ASC`
    );
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// POST /api/preguntas (Público o Registrado)
async function crear(req, res, next) {
  try {
    // Si hay sesión, usamos el usuario_id. Si no, queda null (pregunta anónima).
    const usuario_id = req.usuario ? req.usuario.id : null;
    const { pregunta } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO preguntas_respuestas (usuario_id, pregunta, publicada)
       VALUES ($1, $2, false)
       RETURNING *`,
      [usuario_id, pregunta]
    );
    
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

// PATCH /api/preguntas/:id/responder (Admin)
async function responder(req, res, next) {
  try {
    const { id } = req.params;
    const { respuesta } = req.body;
    
    const { rows } = await db.query(
      `UPDATE preguntas_respuestas
       SET respuesta = $1, publicada = true
       WHERE id = $2
       RETURNING *`,
      [respuesta, id]
    );
    
    if (!rows[0]) return error(res, 'Pregunta no encontrada.', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

// DELETE /api/preguntas/:id (Admin)
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query(`DELETE FROM preguntas_respuestas WHERE id = $1`, [id]);
    
    if (rowCount === 0) return error(res, 'Pregunta no encontrada.', 404);
    
    return exito(res, { mensaje: 'Pregunta eliminada correctamente.' });
  } catch (e) {
    next(e);
  }
}

module.exports = { listar, listarPendientes, crear, responder, eliminar };
