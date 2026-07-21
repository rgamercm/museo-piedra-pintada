require('dotenv').config();
const { pool } = require('./src/config/db');

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ruta_simulador (
        id SERIAL PRIMARY KEY,
        coordenadas JSONB NOT NULL,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO ruta_simulador (id, coordenadas) 
      VALUES (1, '[]'::jsonb) 
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Tabla creada con éxito.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

createTable();
