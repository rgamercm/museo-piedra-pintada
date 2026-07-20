'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');
const { subirImagen } = require('../src/config/storage');

const DIRECTORIO_FOTOS = path.join(__dirname, '../../frontend/assets/img/petroglifos');

async function main() {
  console.log('Iniciando subida masiva de fotos a Supabase...');
  
  // Obtener todos los petroglifos de la BD
  const result = await db.query('SELECT id, codigo_qr, imagen_url FROM petroglifos');
  const petroglifos = result.rows;
  
  let actualizados = 0;
  let errores = 0;

  // Recorrer los petroglifos y buscar si hay foto local que corresponda
  for (const petroglifo of petroglifos) {
    if (!petroglifo.codigo_qr) continue;
    
    // Buscar si existe un archivo con nombre {codigo_qr}.png o {codigo_qr}.jpeg
    const extensiones = ['.png', '.jpeg', '.jpg'];
    let archivoEncontrado = null;
    
    for (const ext of extensiones) {
      const rutaPrueba = path.join(DIRECTORIO_FOTOS, `${petroglifo.codigo_qr}${ext}`);
      if (fs.existsSync(rutaPrueba)) {
        archivoEncontrado = rutaPrueba;
        break;
      }
    }

    if (archivoEncontrado) {
      console.log(`Subiendo foto para ${petroglifo.codigo_qr} (${path.basename(archivoEncontrado)})...`);
      try {
        const buffer = fs.readFileSync(archivoEncontrado);
        const tipoMime = archivoEncontrado.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        // Subir a Supabase Storage
        const { url } = await subirImagen(buffer, path.basename(archivoEncontrado), tipoMime);
        
        // Actualizar tabla
        await db.query('UPDATE petroglifos SET imagen_url = $1 WHERE id = $2', [url, petroglifo.id]);
        console.log(` ✅ Éxito: ${petroglifo.codigo_qr} -> ${url}`);
        actualizados++;
      } catch (error) {
        console.error(` ❌ Error al subir ${petroglifo.codigo_qr}:`, error.message);
        errores++;
      }
    } else {
      console.log(` ⚠️ No se encontró foto local para ${petroglifo.codigo_qr}`);
    }
  }

  console.log(`\nProceso finalizado. Total actualizados: ${actualizados}. Errores: ${errores}.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
