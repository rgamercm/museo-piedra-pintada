'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');
const { anidarTodas } = require('../utils/anidar');

async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT * FROM recorridos ORDER BY id`
    );
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

async function detalle(req, res, next) {
  try {
    const { id } = req.params;
    
    // 1. Obtener el recorrido
    const recorridoResult = await db.query(
      `SELECT * FROM recorridos WHERE id = $1`,
      [id]
    );
    const recorrido = recorridoResult.rows[0];
    if (!recorrido) return error(res, 'Recorrido no encontrado.', 404);

    // 2. Obtener las estaciones en orden con el petroglifo asociado
    const estacionesResult = await db.query(
      `SELECT e.*, re.orden, p.id AS p_id, p.nombre AS p_nombre, p.descripcion AS p_descripcion, p.texto_asistente AS p_texto_asistente, p.imagen_url AS p_imagen_url, p.codigo_qr AS p_codigo_qr, p.categoria AS p_categoria
       FROM recorrido_estaciones re
       JOIN estaciones e ON re.estacion_id = e.id
       LEFT JOIN petroglifos p ON e.petroglifo_id = p.id
       WHERE re.recorrido_id = $1
       ORDER BY re.orden ASC`,
      [id]
    );

    recorrido.estaciones = anidarTodas(estacionesResult.rows, 'p_', 'petroglifo');

    return exito(res, recorrido);
  } catch (e) {
    next(e);
  }
}

async function crear(req, res, next) {
  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const { nombre, descripcion, activo, estaciones_ids } = req.body;

    const recorridoResult = await cliente.query(
      `INSERT INTO recorridos (nombre, descripcion, activo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre, descripcion, activo !== undefined ? activo : true]
    );
    const nuevoRecorrido = recorridoResult.rows[0];

    if (Array.isArray(estaciones_ids) && estaciones_ids.length > 0) {
      for (let i = 0; i < estaciones_ids.length; i++) {
        await cliente.query(
          `INSERT INTO recorrido_estaciones (recorrido_id, estacion_id, orden)
           VALUES ($1, $2, $3)`,
          [nuevoRecorrido.id, estaciones_ids[i], i + 1]
        );
      }
    }

    await cliente.query('COMMIT');
    return creado(res, nuevoRecorrido);
  } catch (e) {
    await cliente.query('ROLLBACK');
    next(e);
  } finally {
    cliente.release();
  }
}

async function editar(req, res, next) {
  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const { id } = req.params;
    const { nombre, descripcion, activo, estaciones_ids } = req.body;

    const recorridoResult = await cliente.query(
      `UPDATE recorridos
       SET nombre = $1, descripcion = $2, activo = $3
       WHERE id = $4
       RETURNING *`,
      [nombre, descripcion, activo, id]
    );
    const recorrido = recorridoResult.rows[0];
    
    if (!recorrido) {
      await cliente.query('ROLLBACK');
      return error(res, 'Recorrido no encontrado.', 404);
    }

    if (Array.isArray(estaciones_ids)) {
      // Borrar asociaciones anteriores
      await cliente.query(`DELETE FROM recorrido_estaciones WHERE recorrido_id = $1`, [id]);
      
      // Insertar nuevas
      for (let i = 0; i < estaciones_ids.length; i++) {
        await cliente.query(
          `INSERT INTO recorrido_estaciones (recorrido_id, estacion_id, orden)
           VALUES ($1, $2, $3)`,
          [id, estaciones_ids[i], i + 1]
        );
      }
    }

    await cliente.query('COMMIT');
    return exito(res, recorrido);
  } catch (e) {
    await cliente.query('ROLLBACK');
    next(e);
  } finally {
    cliente.release();
  }
}

async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query(`DELETE FROM recorridos WHERE id = $1`, [id]);
    
    if (rowCount === 0) return error(res, 'Recorrido no encontrado.', 404);
    
    return exito(res, { mensaje: 'Recorrido eliminado correctamente.' });
  } catch (e) {
    next(e);
  }
}

module.exports = { listar, detalle, crear, editar, eliminar };
