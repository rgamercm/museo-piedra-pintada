/**
 * app.js — Configuración de la aplicación Express.
 * Exporta la app SIN conectar/escuchar (eso lo hace server.js),
 * para que sea fácil de importar en las pruebas (Supertest).
 */
'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { noEncontrado, manejadorErrores } = require('./middlewares/errores');

const app = express();

// Detrás de proxys de nube (Render/Railway) para que el rate-limit lea la IP real.
app.set('trust proxy', 1);

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // Desactivado para permitir scripts/estilos inline del frontend
}));

app.use((req, res, next) => {
  cors({
    origin(origin, callback) {
      // Permite herramientas sin origin (curl, Postman) y los orígenes whitelisted.
      if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      // Mismo origen (monolito: Express sirve el frontend y la API).
      // Comparación EXACTA del host: 'museo.vercel.app.evil.com' NO debe pasar.
      try {
        const host = req.get('host');
        if (host && new URL(origin).host === host) return callback(null, true);
      } catch (e) { /* origin malformado → se rechaza abajo */ }
      return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
  })(req, res, next);
});

// ── Parseo de cuerpo ───────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Límite de tasa general ─────────────────────────────────
const limiteGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutos
  max: 300,                   // 300 peticiones por IP/ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiadas peticiones. Intenta más tarde.' },
  skip: () => env.NODE_ENV === 'test',   // las pruebas automatizadas no deben chocar con el límite
});
app.use('/api', limiteGeneral);

// ── Límite estricto para autenticación (anti fuerza bruta) ──
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                    // 20 intentos de login/registro por IP/ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos de autenticación. Espera unos minutos.' },
  skip: () => env.NODE_ENV === 'test',
});
app.use('/api/auth/login', limiteAuth);
app.use('/api/auth/registro', limiteAuth);

const path = require('path');
// Servir la carpeta frontend estáticamente (monolito)
app.use(express.static(path.join(__dirname, '../../frontend')));
// Servir uploads (fotos) — solo en local. En producción las fotos viven en Supabase Storage.
if (!process.env.SUPABASE_URL) {
  app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
}

// ── Rutas de la API ────────────────────────────────────────
app.use('/api', apiRoutes);

// Fallback para SPA / Multi-page si no encuentra la ruta
// app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/index.html')));

// ── 404 y manejo de errores (al final) ─────────────────────
app.use(noEncontrado);
app.use(manejadorErrores);

module.exports = app;
