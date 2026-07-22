'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');
const { subirImagen, borrarImagen } = require('../config/storage');

// GET /api/fotos
async function listar(req, res, next) {
  try {
    const { petroglifo_id, comentario_id } = req.query;
    let queryText = `SELECT f.*, u.nombre as autor_nombre 
                     FROM fotos f 
                     LEFT JOIN usuarios u ON f.usuario_id = u.id`;
    let params = [];
    let conditions = [];

    if (petroglifo_id) {
      params.push(petroglifo_id);
      conditions.push(`f.petroglifo_id = $${params.length}`);
    }
    
    if (comentario_id) {
      params.push(comentario_id);
      conditions.push(`f.comentario_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ` + conditions.join(' AND ');
    }
    
    queryText += ` ORDER BY f.creado_en DESC`;

    const { rows } = await db.query(queryText, params);
    
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// POST /api/fotos
async function subir(req, res, next) {
  let subida = null;
  try {
    if (!req.file) {
      return error(res, 'No se ha proporcionado ninguna imagen.', 400);
    }

    const { petroglifo_id, comentario_id, tipo } = req.body;
    const usuario_id = req.usuario.id;

    if (!petroglifo_id && !comentario_id && tipo !== 'avatar') {
      return error(res, 'La foto debe estar asociada a un petroglifo o a un comentario.', 400);
    }

    // 1) Subir primero al almacenamiento (Supabase Storage o disco local).
    subida = await subirImagen(req.file.buffer, req.file.originalname, req.file.mimetype);

    // Si es un avatar u otro archivo suelto, devolvemos solo la URL sin insertarlo en la tabla fotos
    if (tipo === 'avatar') {
      return creado(res, { url: subida.url });
    }

    // 2) Solo si la subida funcionó y no es avatar, guardamos la fila en la base de datos.
    const { rows } = await db.query(
      `INSERT INTO fotos (url, tipo_mime, tamano_bytes, comentario_id, petroglifo_id, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [subida.url, req.file.mimetype, req.file.size, comentario_id || null, petroglifo_id || null, usuario_id]
    );

    return creado(res, rows[0]);
  } catch (e) {
    // Si falló la base de datos, no dejamos la imagen huérfana en el almacenamiento.
    if (subida) await borrarImagen(subida.url);
    next(e);
  }
}

// DELETE /api/fotos/:id
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    
    // Buscar la foto para obtener su ruta
    const fotoResult = await db.query(`SELECT * FROM fotos WHERE id = $1`, [id]);
    const foto = fotoResult.rows[0];
    
    if (!foto) return error(res, 'Foto no encontrada.', 404);

    // Solo un admin o el creador de la foto puede borrarla
    if (req.usuario.rol !== 'admin' && req.usuario.id !== foto.usuario_id) {
      return error(res, 'No tienes permisos para eliminar esta foto.', 403);
    }
    
    // Eliminar de BD
    await db.query(`DELETE FROM fotos WHERE id = $1`, [id]);
    
    // Eliminar la imagen del almacenamiento
    await borrarImagen(foto.url);
    
    return exito(res, { mensaje: 'Foto eliminada correctamente.' });
  } catch (e) {
    next(e);
  }
}

module.exports = { listar, subir, eliminar };
