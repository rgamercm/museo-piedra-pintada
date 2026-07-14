/**
 * scripts/init-db.js — Carga db/schema.sql + db/seed.sql en la base de datos
 * apuntada por DATABASE_URL (o por las variables DB_* si no hay URL).
 *
 * Uso:  cd backend && npm run db:init
 *
 * Nota: para Supabase la vía recomendada es pegar el SQL en el SQL Editor
 * (ver PLAN-DESPLIEGUE-SUPABASE-VERCEL.md). Este script es el atajo si prefieres
 * hacerlo desde tu máquina.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const RAIZ = path.join(__dirname, '..', '..');

async function iniciar() {
  const schema = fs.readFileSync(path.join(RAIZ, 'db', 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(RAIZ, 'db', 'seed.sql'), 'utf8');

  try {
    console.log('[BD] Creando las tablas (schema.sql)...');
    await pool.query(schema);

    console.log('[BD] Cargando los datos de ejemplo (seed.sql)...');
    await pool.query(seed);

    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM estaciones');
    console.log(`[BD] Listo. Estaciones cargadas: ${rows[0].n}`);
    process.exit(0);
  } catch (e) {
    console.error('[BD] Error al inicializar:', e.message);
    process.exit(1);
  }
}

iniciar();
