'use strict';

const db = require('../config/db');
const { exito, error } = require('../utils/respuestas');

/**
 * Obtener todos los empleados
 */
exports.obtenerTodos = async (req, res) => {
  try {
    const { data, error: err } = await db.client
      .from('empleados')
      .select('*')
      .order('orden', { ascending: true })
      .order('creado_en', { ascending: false });

    if (err) throw err;
    return exito(res, data);
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

    const { data, error: err } = await db.client
      .from('empleados')
      .insert([{ nombre, cargo, descripcion, imagen_url, orden: orden || 0, destacado: destacado ?? true }])
      .select()
      .single();

    if (err) throw err;
    return exito(res, data, 201);
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
    const { data, error: err } = await db.client
      .from('empleados')
      .select('*')
      .eq('id', id)
      .single();

    if (err) {
      if (err.code === 'PGRST116') return error(res, 'Empleado no encontrado', 404);
      throw err;
    }
    return exito(res, data);
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

    const campos = {};
    if (nombre !== undefined) campos.nombre = nombre;
    if (cargo !== undefined) campos.cargo = cargo;
    if (descripcion !== undefined) campos.descripcion = descripcion;
    if (imagen_url !== undefined) campos.imagen_url = imagen_url;
    if (orden !== undefined) campos.orden = orden;
    if (destacado !== undefined) campos.destacado = destacado;

    const { data, error: err } = await db.client
      .from('empleados')
      .update(campos)
      .eq('id', id)
      .select()
      .single();

    if (err) throw err;
    if (!data) return error(res, 'Empleado no encontrado', 404);
    
    return exito(res, data);
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
    const { data, error: err } = await db.client
      .from('empleados')
      .delete()
      .eq('id', id)
      .select();

    if (err) throw err;
    if (!data || data.length === 0) return error(res, 'Empleado no encontrado', 404);
    
    return exito(res, { mensaje: 'Empleado eliminado correctamente' });
  } catch (e) {
    return error(res, 'Error al eliminar empleado', 500, e.message);
  }
};
