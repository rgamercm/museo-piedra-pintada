'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');

// GET /api/reservas (Admin)
async function listar(req, res, next) {
  try {
    const { estado } = req.query;
    let queryText = `SELECT * FROM reservas`;
    let params = [];
    
    if (estado) {
      queryText += ` WHERE estado = $1`;
      params.push(estado);
    }
    
    queryText += ` ORDER BY fecha_visita ASC`;
    const { rows } = await db.query(queryText, params);
    
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// GET /api/reservas/mias (Institucion)
async function listarMias(req, res, next) {
  try {
    const usuario_id = req.usuario.id;
    const { rows } = await db.query(
      `SELECT * FROM reservas WHERE usuario_id = $1 ORDER BY fecha_visita ASC`,
      [usuario_id]
    );
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// POST /api/reservas (Institución)
async function crear(req, res, next) {
  try {
    const usuario_id = req.usuario.id;
    
    // Obtener institucion_nombre de la BD
    const userRes = await db.query('SELECT institucion_nombre FROM usuarios WHERE id = $1', [usuario_id]);
    const institucion_nombre = userRes.rows[0]?.institucion_nombre;

    if (!institucion_nombre) {
      return error(res, 'El usuario no tiene una institución asociada.', 422);
    }

    const { contacto_nombre, contacto_telefono, contacto_correo, fecha_visita, num_personas, notas } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO reservas (usuario_id, institucion_nombre, contacto_nombre, contacto_telefono, contacto_correo, fecha_visita, num_personas, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [usuario_id, institucion_nombre, contacto_nombre, contacto_telefono, contacto_correo, fecha_visita, num_personas, notas || null]
    );
    
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

// PATCH /api/reservas/:id/estado (Admin)
async function cambiarEstado(req, res, next) {
  try {
    const { id } = req.params;
    const { estado } = req.body; // 'aprobada' o 'rechazada'
    
    const { rows } = await db.query(
      `UPDATE reservas SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, id]
    );
    
    if (!rows[0]) return error(res, 'Reserva no encontrada.', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

module.exports = { listar, listarMias, crear, cambiarEstado };
