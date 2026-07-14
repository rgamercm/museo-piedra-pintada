/**
 * middlewares/upload.js — Recepción de imágenes en MEMORIA.
 *
 * Se usa memoryStorage (no diskStorage) porque en producción (Vercel)
 * el sistema de archivos es de solo lectura. El buffer se envía después a
 * Supabase Storage desde fotos.controller.js.
 */
'use strict';

const multer = require('multer');

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB (igual que el CHECK de la tabla fotos)
  },
  fileFilter: (req, file, cb) => {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Formato no soportado. Solo se permiten imágenes JPG, PNG, WEBP o GIF.'), false);
  },
});

module.exports = upload;
