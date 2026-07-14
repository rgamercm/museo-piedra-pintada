/**
 * server.js — Punto de entrada. Verifica la BD y levanta el servidor.
 */
'use strict';

const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

async function iniciar() {
  try {
    const ahora = await db.probarConexion();
    console.log(`[BD] Conectada (${ahora.toISOString?.() || ahora})`);
  } catch (e) {
    console.error('[BD] No se pudo conectar:', e.message);
    console.error('     Revisa las variables de entorno (.env) y que PostgreSQL esté activo.');
    // No abortamos: el server arranca igual y /api/health reportará 503.
  }

  app.listen(env.PORT, () => {
    console.log(`[API] Museo Piedra Pintada escuchando en http://localhost:${env.PORT}`);
    console.log(`[API] Entorno: ${env.NODE_ENV} · Salud: http://localhost:${env.PORT}/api/health`);
  });
}

iniciar();
