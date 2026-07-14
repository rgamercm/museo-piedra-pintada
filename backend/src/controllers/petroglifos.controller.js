'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');
const { anidar } = require('../utils/anidar');

async function listar(req, res, next) {
  try {
    const { categoria, q } = req.query;
    const clausulas = [];
    const params = [];

    if (categoria) { 
      params.push(categoria); 
      clausulas.push(`categoria = $${params.length}`); 
    }
    
    if (q) { 
      params.push(`%${q}%`);   
      clausulas.push(`(nombre ILIKE $${params.length} OR descripcion ILIKE $${params.length})`); 
    }
    
    const where = clausulas.length ? 'WHERE ' + clausulas.join(' AND ') : '';
    const { rows } = await db.query(`SELECT * FROM petroglifos ${where} ORDER BY id`, params);
    
    return exito(res, rows);
  } catch (e) { 
    next(e); 
  }
}

async function detalle(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT p.*, e.id AS e_id, e.nombre AS e_nombre, e.descripcion AS e_descripcion, e.latitud AS e_latitud, e.longitud AS e_longitud
       FROM petroglifos p
       LEFT JOIN estaciones e ON e.petroglifo_id = p.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return error(res, 'Petroglifo no encontrado.', 404);

    const petroglifo = anidar(rows[0], 'e_', 'estacion');

    // Fotos asociadas al petroglifo
    const fotosQuery = await db.query(`SELECT * FROM fotos WHERE petroglifo_id = $1`, [req.params.id]);
    petroglifo.fotos = fotosQuery.rows;

    return exito(res, petroglifo);
  } catch (e) { 
    next(e); 
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, descripcion, texto_asistente, imagen_url, codigo_qr, categoria } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO petroglifos (nombre, descripcion, texto_asistente, imagen_url, codigo_qr, categoria)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, descripcion, texto_asistente, imagen_url, codigo_qr, categoria]
    );
    
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

async function editar(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, texto_asistente, imagen_url, codigo_qr, categoria } = req.body;
    
    const { rows } = await db.query(
      `UPDATE petroglifos
       SET nombre = $1, descripcion = $2, texto_asistente = $3, imagen_url = $4, codigo_qr = $5, categoria = $6
       WHERE id = $7
       RETURNING *`,
      [nombre, descripcion, texto_asistente, imagen_url, codigo_qr, categoria, id]
    );
    
    if (!rows[0]) return error(res, 'Petroglifo no encontrado.', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query(`DELETE FROM petroglifos WHERE id = $1`, [id]);
    
    if (rowCount === 0) return error(res, 'Petroglifo no encontrado.', 404);
    
    return exito(res, { mensaje: 'Petroglifo eliminado correctamente.' });
  } catch (e) {
    next(e);
  }
}

module.exports = { listar, detalle, crear, editar, eliminar };
