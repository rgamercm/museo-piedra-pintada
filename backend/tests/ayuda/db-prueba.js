/**
 * tests/ayuda/db-prueba.js
 * Monta una base de datos PostgreSQL EN MEMORIA (pg-mem), carga db/schema.sql
 * y db/seed.sql, y reemplaza el pool real de src/config/db.js.
 * No requiere tener PostgreSQL instalado.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { newDb } = require('pg-mem');

const RAIZ = path.join(__dirname, '..', '..', '..');

function leerSQL(archivo) {
  return fs.readFileSync(path.join(RAIZ, 'db', archivo), 'utf8');
}

/** Inicia pg-mem con el esquema + seed reales y parchea src/config/db.js */
function iniciarBDPrueba() {
  const mem = newDb({ autoCreateForeignKeyIndices: true });

  // Funciones que pg-mem no trae de fábrica
  const { DataType } = require('pg-mem');

  mem.public.registerFunction({
    name: 'now',
    returns: DataType.timestamp,
    implementation: () => new Date(),
  });

  // pg-mem no trae random(); la usamos en ORDER BY RANDOM() del set de trivia.
  mem.public.registerFunction({
    name: 'random',
    returns: DataType.float,
    implementation: () => Math.random(),
    impure: true,
  });

  mem.public.none(adaptar(leerSQL('schema.sql')));
  mem.public.none(adaptar(leerSQL('seed.sql')));

  // Adaptador que emula el driver `pg`: soporta consultas parametrizadas ($1, $2...)
  // exactamente igual que PostgreSQL real.
  const { Pool } = mem.adapters.createPg();
  const poolMem = new Pool();

  const db = require('../../src/config/db');
  db.query = (texto, params) => poolMem.query(texto, params);
  db.probarConexion = async () => new Date();

  return { mem, db };
}

/**
 * pg-mem no implementa algunas cosas de PostgreSQL real (precisión de DECIMAL,
 * CHAR(n), CURRENT_DATE dentro de CHECK). Adaptamos SOLO la copia en memoria:
 * db/schema.sql NO se modifica. La validación contra Postgres real se hace aparte
 * (ver PLAN-PRUEBAS.md, nivel 2).
 */
function adaptar(sql) {
  return sql
    .replace(/DECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'DECIMAL')
    .replace(/NUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'DECIMAL')
    .replace(/CHAR\s*\(\s*1\s*\)/gi, 'TEXT')
    .replace(/CHECK\s*\(\s*fecha_visita\s*>=\s*CURRENT_DATE\s*\)/gi, '');
}

module.exports = { iniciarBDPrueba };
