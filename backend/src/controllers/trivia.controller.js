'use strict';

const db = require('../config/db');
const { exito, creado, error } = require('../utils/respuestas');

// GET /api/trivia/preguntas (Público)
// Devuelve un set aleatorio de preguntas activas
async function obtenerSetAleatorio(req, res, next) {
  try {
    const { limite = 5 } = req.query; // por defecto 5
    
    // LIMIT en PostgreSQL no acepta placeholders para ORDER BY RANDOM()
    const { rows } = await db.query(
      `SELECT id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d 
       FROM preguntas_trivia 
       WHERE activa = true 
       ORDER BY RANDOM() 
       LIMIT $1`,
       [limite]
    );
    
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// POST /api/trivia/verificar (Público/Opcional)
async function verificarRespuestas(req, res, next) {
  try {
    const { respuestas } = req.body;
    let puntaje = 0;
    const detalle = [];

    for (const item of respuestas) {
      const { pregunta_id, opcion } = item;
      const { rows } = await db.query('SELECT respuesta_correcta FROM preguntas_trivia WHERE id = $1', [pregunta_id]);
      if (rows.length > 0) {
        const correcta = rows[0].respuesta_correcta;
        const esCorrecta = (correcta === opcion);
        if (esCorrecta) puntaje++;
        detalle.push({ pregunta_id, correcta: esCorrecta, opcion_correcta: correcta });
      }
    }

    const total = respuestas.length;

    if (req.usuario) {
      await db.query(
        `INSERT INTO resultados_trivia (usuario_id, puntaje, total_preguntas, respuestas_json)
         VALUES ($1, $2, $3, $4)`,
        [req.usuario.id, puntaje, total, JSON.stringify(respuestas)]
      );
    }

    return exito(res, { puntaje, total, detalle });
  } catch (e) {
    next(e);
  }
}

// POST /api/trivia/resultados (Registrado)
async function guardarResultado(req, res, next) {
  try {
    const usuario_id = req.usuario.id;
    const { total_preguntas, respuestas_json } = req.body; // Ignoramos puntaje del cliente
    
    // Recalcular puntaje real
    let puntajeReal = 0;
    if (Array.isArray(respuestas_json)) {
      for (const item of respuestas_json) {
        const { pregunta_id, opcion } = item;
        const { rows } = await db.query('SELECT respuesta_correcta FROM preguntas_trivia WHERE id = $1', [pregunta_id]);
        if (rows.length > 0 && rows[0].respuesta_correcta === opcion) {
          puntajeReal++;
        }
      }
    }

    const { rows } = await db.query(
      `INSERT INTO resultados_trivia (usuario_id, puntaje, total_preguntas, respuestas_json)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [usuario_id, puntajeReal, total_preguntas, JSON.stringify(respuestas_json)]
    );
    
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

// --- CRUD Admin ---

// GET /api/trivia/preguntas/todas (Admin)
async function listarTodas(req, res, next) {
  try {
    const { rows } = await db.query(`SELECT * FROM preguntas_trivia ORDER BY id ASC`);
    return exito(res, rows);
  } catch (e) {
    next(e);
  }
}

// POST /api/trivia/preguntas (Admin)
async function crearPregunta(req, res, next) {
  try {
    const { pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, activa } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO preguntas_trivia (pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, activa)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, activa !== undefined ? activa : true]
    );
    
    return creado(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

// PUT /api/trivia/preguntas/:id (Admin)
async function editarPregunta(req, res, next) {
  try {
    const { id } = req.params;
    const { pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, activa } = req.body;
    
    const { rows } = await db.query(
      `UPDATE preguntas_trivia
       SET pregunta = $1, opcion_a = $2, opcion_b = $3, opcion_c = $4, opcion_d = $5, respuesta_correcta = $6, activa = $7
       WHERE id = $8
       RETURNING *`,
      [pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, activa, id]
    );
    
    if (!rows[0]) return error(res, 'Pregunta no encontrada.', 404);
    
    return exito(res, rows[0]);
  } catch (e) {
    next(e);
  }
}

// DELETE /api/trivia/preguntas/:id (Admin)
async function eliminarPregunta(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query(`DELETE FROM preguntas_trivia WHERE id = $1`, [id]);
    
    if (rowCount === 0) return error(res, 'Pregunta no encontrada.', 404);
    
    return exito(res, { mensaje: 'Pregunta eliminada correctamente.' });
  } catch (e) {
    next(e);
  }
}

module.exports = { 
  obtenerSetAleatorio, 
  verificarRespuestas,
  guardarResultado, 
  listarTodas, 
  crearPregunta, 
  editarPregunta, 
  eliminarPregunta 
};
