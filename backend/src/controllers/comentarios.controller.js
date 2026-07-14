'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');

// GET /api/comentarios (Público)
// Solo muestra los aprobados. Hacemos JOIN con usuarios para mostrar el nombre.
async function listarAprobados(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.texto, c.calificacion, c.creado_en, u.nombre as autor_nombre 
       FROM comentarios_resenas c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.estado_moderacion = 'aprobado'
       ORDER BY c.creado_en DESC`
    );
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// GET /api/comentarios/pendientes (Admin)
async function listarPendientes(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.nombre as autor_nombre 
       FROM comentarios_resenas c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.estado_moderacion = 'pendiente'
       ORDER BY c.creado_en ASC`
    );
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// POST /api/comentarios (Registrado / Institucion)
async function crear(req, res, next) {
  try {
    const usuario_id = req.usuario.id;
    const { texto, calificacion } = req.body;
    
    // Por defecto se inserta como 'pendiente' (definido en el DEFAULT de la BD, o forzado aquí)
    const { rows } = await db.query(
      `INSERT INTO comentarios_resenas (usuario_id, texto, calificacion, estado_moderacion)
       VALUES ($1, $2, $3, 'pendiente')
       RETURNING *`,
      [usuario_id, texto, calificacion || 5]
    );
    
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

// PATCH /api/comentarios/:id/moderar (Admin)
async function moderar(req, res, next) {
  try {
    const { id } = req.params;
    const { estado_moderacion } = req.body; // 'aprobado' o 'rechazado'
    
    const { rows } = await db.query(
      `UPDATE comentarios_resenas SET estado_moderacion = $1 WHERE id = $2 RETURNING *`,
      [estado_moderacion, id]
    );
    
    if (!rows[0]) return error(res, 'Comentario no encontrado.', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

module.exports = { listarAprobados, listarPendientes, crear, moderar };
