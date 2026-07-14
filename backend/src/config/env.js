/**
 * config/env.js — Carga y validación de variables de entorno.
 * Centraliza el acceso a process.env para no leerlo disperso por el código.
 */
'use strict';

require('dotenv').config();

const env = {
  NODE_ENV:   process.env.NODE_ENV   || 'development',
  PORT:       parseInt(process.env.PORT || '3000', 10),

  // Base de datos: o bien DATABASE_URL completa, o piezas sueltas.
  DATABASE_URL: process.env.DATABASE_URL || null,
  DB_HOST:    process.env.DB_HOST     || 'localhost',
  DB_PORT:    parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME:    process.env.DB_NAME     || 'museo_piedra_pintada',
  DB_USER:    process.env.DB_USER     || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',

  // Seguridad
  JWT_SECRET:  process.env.JWT_SECRET  || 'cambia-esto-en-produccion-por-un-secreto-largo',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '24h',

  // CORS: lista separada por comas de orígenes permitidos
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5500')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
};

// Aviso (no fatal) si se usa el secreto por defecto en producción.
if (env.NODE_ENV === 'production' && env.JWT_SECRET.startsWith('cambia-esto')) {
  console.warn('[ADVERTENCIA] JWT_SECRET usa el valor por defecto en producción. Configúralo.');
}

module.exports = env;
