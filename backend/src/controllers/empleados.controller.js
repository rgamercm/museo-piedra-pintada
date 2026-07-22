'use strict';

const db = require('../config/db');
const { exito, error } = require('../utils/respuestas');

/**
 * Obtener todos los empleados
 */
exports.obtenerTodos = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM empleados ORDER BY orden ASC, creado_en DESC'
    );
    return exito(res, rows);
  } catch (e) {
    return error(res, 'Error al obtener empleados', 500, e.message);
  }
};

/**
 * Crear un nuevo empleado
 */
exports.crear = async (req, res) => {
  try {
    const { nombre, cargo, descripcion, imagen_url, orden, destacado } = req.body;

    const query = `
      INSERT INTO empleados (nombre, cargo, descripcion, imagen_url, orden, destacado)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const valores = [nombre, cargo, descripcion, imagen_url, orden || 0, destacado ?? true];

    const { rows } = await db.query(query, valores);
    return exito(res, rows[0], 201);
  } catch (e) {
    return error(res, 'Error al crear empleado', 500, e.message);
  }
};

/**
 * Obtener empleado por ID
 */
exports.obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM empleados WHERE id = $1', [id]);

    if (rows.length === 0) return error(res, 'Empleado no encontrado', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    return error(res, 'Error al obtener empleado', 500, e.message);
  }
};

/**
 * Actualizar empleado
 */
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cargo, descripcion, imagen_url, orden, destacado } = req.body;

    // Construir la consulta de actualización dinámicamente
    const campos = [];
    const valores = [];
    let i = 1;

    if (nombre !== undefined) { campos.push(`nombre = $${i++}`); valores.push(nombre); }
    if (cargo !== undefined) { campos.push(`cargo = $${i++}`); valores.push(cargo); }
    if (descripcion !== undefined) { campos.push(`descripcion = $${i++}`); valores.push(descripcion); }
    if (imagen_url !== undefined) { campos.push(`imagen_url = $${i++}`); valores.push(imagen_url); }
    if (orden !== undefined) { campos.push(`orden = $${i++}`); valores.push(orden); }
    if (destacado !== undefined) { campos.push(`destacado = $${i++}`); valores.push(destacado); }

    if (campos.length === 0) {
      const { rows } = await db.query('SELECT * FROM empleados WHERE id = $1', [id]);
      if (rows.length === 0) return error(res, 'Empleado no encontrado', 404);
      return exito(res, rows[0]);
    }

    valores.push(id);
    const query = `
      UPDATE empleados 
      SET ${campos.join(', ')} 
      WHERE id = $${i} 
      RETURNING *
    `;

    const { rows } = await db.query(query, valores);
    if (rows.length === 0) return error(res, 'Empleado no encontrado', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    return error(res, 'Error al actualizar empleado', 500, e.message);
  }
};

/**
 * Eliminar empleado
 */
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('DELETE FROM empleados WHERE id = $1 RETURNING id', [id]);

    if (rows.length === 0) return error(res, 'Empleado no encontrado', 404);
    
    return exito(res, { mensaje: 'Empleado eliminado correctamente' });
  } catch (e) {
    return error(res, 'Error al eliminar empleado', 500, e.message);
  }
};
