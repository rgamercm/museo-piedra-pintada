'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');

async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT * FROM noticias_eventos WHERE activa = true ORDER BY fecha_publicacion DESC`
    );
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

async function detalle(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM noticias_eventos WHERE id = $1`,
      [id]
    );
    
    if (!rows[0]) return error(res, 'Noticia no encontrada.', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

async function crear(req, res, next) {
  try {
    const { titulo, contenido, imagen_url, categoria, activa } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO noticias_eventos (titulo, contenido, imagen_url, categoria, activa)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titulo, contenido, imagen_url, categoria, activa !== undefined ? activa : true]
    );
    
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

async function editar(req, res, next) {
  try {
    const { id } = req.params;
    const { titulo, contenido, imagen_url, categoria, activa } = req.body;
    
    const { rows } = await db.query(
      `UPDATE noticias_eventos
       SET titulo = $1, contenido = $2, imagen_url = $3, categoria = $4, activa = $5
       WHERE id = $6
       RETURNING *`,
      [titulo, contenido, imagen_url, categoria, activa, id]
    );
    
    if (!rows[0]) return error(res, 'Noticia no encontrada.', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query(`DELETE FROM noticias_eventos WHERE id = $1`, [id]);
    
    if (rowCount === 0) return error(res, 'Noticia no encontrada.', 404);
    
    return exito(res, { mensaje: 'Noticia eliminada correctamente.' });
  } catch (e) {
    next(e);
  }
}

module.exports = { listar, detalle, crear, editar, eliminar };
