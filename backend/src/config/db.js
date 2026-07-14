/**
 * config/db.js — Pool de conexiones a PostgreSQL.
 * Expone `query()` para consultas parametrizadas (nunca concatenar SQL)
 * y `probarConexion()` para el arranque/healthcheck.
 */
'use strict';

const { Pool } = require('pg');
const env = require('./env');

// Si hay DATABASE_URL (típico en nube: Neon/Supabase/Render), se usa directa.
// En producción la nube suele exigir SSL.
const config = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    };

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('[BD] Error inesperado en cliente inactivo:', err.message);
});

/**
 * Ejecuta una consulta parametrizada.
 * @param {string} texto  SQL con placeholders $1, $2, ...
 * @param {Array}  params valores
 */
function query(texto, params) {
  return pool.query(texto, params);
}

/** Verifica que la BD responde (usado al arrancar y en /api/health). */
async function probarConexion() {
  const { rows } = await pool.query('SELECT NOW() AS ahora');
  return rows[0].ahora;
}

module.exports = { pool, query, probarConexion };
