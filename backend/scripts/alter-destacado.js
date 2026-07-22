const { pool } = require('../src/config/db');

async function run() {
  try {
    console.log('Agregando columna destacado a petroglifos...');
    await pool.query('ALTER TABLE petroglifos ADD COLUMN IF NOT EXISTS destacado BOOLEAN NOT NULL DEFAULT FALSE;');
    
    console.log('Marcando los 9 petroglifos originales como destacados...');
    const destacados = ['Petroglifo S9R9', 'Petroglifo S9R6', 'Petroglifo S9R44', 'Petroglifo S9R51', 'Petroglifo S9R101', 'Petroglifo S9R64', 'Petroglifo S9R107', 'Petroglifo S9R73', 'Petroglifo S9R66'];
    await pool.query('UPDATE petroglifos SET destacado = TRUE WHERE nombre = ANY($1::text[])', [destacados]);
    
    console.log('Base de datos actualizada con exito.');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

run();