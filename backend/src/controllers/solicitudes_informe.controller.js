'use strict';

/**
 * Solicitudes de descarga del informe arqueológico de K. Juszczyk (2023).
 * POST público (se llama desde el catálogo antes de abrir el Drive) y
 * listado/eliminación restringidos al panel admin.
 */

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');

// GET /api/solicitudes-informe (Admin) — lista todas, más recientes primero
async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, correo, institucion, finalidad, creado_en
         FROM solicitudes_informe
        ORDER BY creado_en DESC`
    );
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// POST /api/solicitudes-informe (Público)
async function crear(req, res, next) {
  try {
    const { nombre, correo, institucion, finalidad } = req.body || {};
    const { rows } = await db.query(
      `INSERT INTO solicitudes_informe (nombre, correo, institucion, finalidad)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, correo, institucion, finalidad, creado_en`,
      [nombre, correo, institucion || null, finalidad]
    );
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

// DELETE /api/solicitudes-informe/:id (Admin)
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query(
      `DELETE FROM solicitudes_informe WHERE id = $1`, [id]
    );
    if (!rowCount) return error(res, 'Solicitud no encontrada.', 404);
    return exito(res, { id: Number(id) });
  } catch (e) {
    next(e);
  }
}

module.exports = { listar, crear, eliminar };
