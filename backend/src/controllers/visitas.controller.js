'use strict';

const db = require('../config/db');
const { exito, error } = require('../utils/respuestas');

async function obtener(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT contador FROM visitas_sitio WHERE id = 1`
    );
    return exito(res, { visitas: rows[0] ? rows[0].contador : 0 });
  } catch (e) {
    next(e);
  }
}

async function incrementar(req, res, next) {
  try {
    const { rows } = await db.query(
      `UPDATE visitas_sitio
       SET contador = contador + 1, ultima_visita = NOW()
       WHERE id = 1
       RETURNING contador`
    );
    return exito(res, { visitas: rows[0] ? rows[0].contador : 0 });
  } catch (e) {
    next(e);
  }
}

module.exports = { obtener, incrementar };
