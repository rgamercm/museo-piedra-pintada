/**
 * api/index.js — Punto de entrada para Vercel (serverless).
 *
 * backend/src/app.js exporta la app de Express SIN llamar a listen(),
 * así que se puede usar directamente como handler.
 *
 * Para correr en local se sigue usando `cd backend && npm run dev`
 * (backend/src/server.js), que sí levanta un servidor HTTP.
 */
'use strict';

module.exports = require('../backend/src/app');
