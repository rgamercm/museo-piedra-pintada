'use strict';

const db = require('../config/db');
const { exito, error } = require('../utils/respuestas');

async function obtener(req, res, next) {
  try {
    const { rows } = await db.query('SELECT coordenadas FROM ruta_simulador WHERE id = 1');
    if (rows.length === 0) {
      return exito(res, { coordenadas: [] });
    }
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

async function guardar(req, res, next) {
  try {
    const { coordenadas } = req.body;
    
    if (!Array.isArray(coordenadas)) {
      return error(res, 'Las coordenadas deben ser un arreglo.', 400);
    }
    
    await db.query(
      `INSERT INTO ruta_simulador (id, coordenadas, actualizado_en) 
       VALUES (1, $1, CURRENT_TIMESTAMP) 
       ON CONFLICT (id) DO UPDATE SET coordenadas = EXCLUDED.coordenadas, actualizado_en = EXCLUDED.actualizado_en`,
      [JSON.stringify(coordenadas)]
    );
    
    return exito(res, { mensaje: 'Ruta guardada exitosamente.', coordenadas });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  obtener,
  guardar
};
