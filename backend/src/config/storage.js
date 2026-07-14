/**
 * config/storage.js — Almacenamiento de fotos.
 *
 * En producción (Vercel) el disco es de SOLO LECTURA: las fotos van a
 * Supabase Storage (bucket público "fotos").
 * En local, si no hay credenciales de Supabase, se guardan en backend/public/uploads
 * para no obligar a configurar nada solo para desarrollar.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || null;
const BUCKET = process.env.SUPABASE_BUCKET || 'fotos';

const usaSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

let cliente = null;
if (usaSupabase) {
  const { createClient } = require('@supabase/supabase-js');
  cliente = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

const DIR_LOCAL = path.join(__dirname, '..', '..', 'public', 'uploads');

function nombreUnico(nombreOriginal) {
  const ext = path.extname(nombreOriginal || '').toLowerCase() || '.jpg';
  const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `foto-${sufijo}${ext}`;
}

/**
 * Sube el buffer de una imagen y devuelve la URL pública.
 * @param {Buffer} buffer
 * @param {string} nombreOriginal
 * @param {string} tipoMime
 * @returns {Promise<{url: string, clave: string}>}
 */
async function subirImagen(buffer, nombreOriginal, tipoMime) {
  const clave = nombreUnico(nombreOriginal);

  if (usaSupabase) {
    const { error } = await cliente.storage
      .from(BUCKET)
      .upload(clave, buffer, { contentType: tipoMime, upsert: false });

    if (error) throw new Error(`No se pudo subir la imagen a Supabase Storage: ${error.message}`);

    const { data } = cliente.storage.from(BUCKET).getPublicUrl(clave);
    return { url: data.publicUrl, clave };
  }

  // Modo local
  if (!fs.existsSync(DIR_LOCAL)) fs.mkdirSync(DIR_LOCAL, { recursive: true });
  fs.writeFileSync(path.join(DIR_LOCAL, clave), buffer);
  return { url: `/uploads/${clave}`, clave };
}

/** Borra una imagen previamente subida. Nunca lanza: el borrado es best-effort. */
async function borrarImagen(url) {
  try {
    if (!url) return;

    if (usaSupabase) {
      const clave = url.split(`/${BUCKET}/`).pop();
      if (clave) await cliente.storage.from(BUCKET).remove([clave]);
      return;
    }

    const archivo = path.join(DIR_LOCAL, path.basename(url));
    if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
  } catch (e) {
    console.warn('[STORAGE] No se pudo borrar la imagen:', e.message);
  }
}

module.exports = { subirImagen, borrarImagen, usaSupabase };
