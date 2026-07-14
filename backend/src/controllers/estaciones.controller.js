'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');
const { anidar, anidarTodas } = require('../utils/anidar');

async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT e.*, p.id AS p_id, p.nombre AS p_nombre, p.descripcion AS p_descripcion, p.texto_asistente AS p_texto_asistente, p.imagen_url AS p_imagen_url, p.codigo_qr AS p_codigo_qr, p.categoria AS p_categoria
       FROM estaciones e
       LEFT JOIN petroglifos p ON e.petroglifo_id = p.id
       ORDER BY e.id`
    );
    return exito(res, anidarTodas(rows, 'p_', 'petroglifo'));
  } catch (e) {
    next(e);
  }
}

async function buscarPorQr(req, res, next) {
  try {
    const { codigo } = req.params;
    const { rows } = await db.query(
      `SELECT e.*, p.id AS p_id, p.nombre AS p_nombre, p.descripcion AS p_descripcion, p.texto_asistente AS p_texto_asistente, p.imagen_url AS p_imagen_url, p.codigo_qr AS p_codigo_qr, p.categoria AS p_categoria
       FROM estaciones e
       JOIN petroglifos p ON e.petroglifo_id = p.id
       WHERE p.codigo_qr = $1`,
      [codigo]
    );
    
    if (!rows[0]) return error(res, 'Estación o código QR no encontrado.', 404);

    return exito(res, anidar(rows[0], 'p_', 'petroglifo'));
  } catch (e) {
    next(e);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, descripcion, latitud, longitud, petroglifo_id } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO estaciones (nombre, descripcion, latitud, longitud, petroglifo_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, descripcion, latitud, longitud, petroglifo_id || null]
    );
    
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

async function editar(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, latitud, longitud, petroglifo_id } = req.body;
    
    const { rows } = await db.query(
      `UPDATE estaciones
       SET nombre = $1, descripcion = $2, latitud = $3, longitud = $4, petroglifo_id = $5
       WHERE id = $6
       RETURNING *`,
      [nombre, descripcion, latitud, longitud, petroglifo_id || null, id]
    );
    
    if (!rows[0]) return error(res, 'Estación no encontrada.', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query(`DELETE FROM estaciones WHERE id = $1`, [id]);
    
    if (rowCount === 0) return error(res, 'Estación no encontrada.', 404);
    
    return exito(res, { mensaje: 'Estación eliminada correctamente.' });
  } catch (e) {
    next(e);
  }
}

module.exports = { listar, buscarPorQr, crear, editar, eliminar };
