'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (solo para subir archivos)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DIRECTORIO_FOTOS = path.join(__dirname, '../../frontend/assets/img/petroglifos');

async function main() {
  console.log('Iniciando subida masiva de fotos a Supabase...');
  
  // Obtener todos los petroglifos de la BD mediante conexión directa (bypasseando PostgREST)
  const result = await db.query('SELECT id, codigo_qr, imagen_url FROM petroglifos');
  const petroglifos = result.rows;
  
  let actualizados = 0;
  let errores = 0;

  for (const petroglifo of petroglifos) {
    if (!petroglifo.codigo_qr) continue;
    
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
        const nombreOriginal = path.basename(archivoEncontrado);
        
        const ext = path.extname(nombreOriginal || '').toLowerCase() || '.jpg';
        const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const clave = `foto-${sufijo}${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos')
          .upload(clave, buffer, { contentType: tipoMime, upsert: false });

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage.from('fotos').getPublicUrl(clave);
        const url = publicUrlData.publicUrl;
        
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
