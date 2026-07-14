/**
 * tests/ayuda/sesiones.js — Helpers para obtener tokens de cada rol.
 * Las credenciales vienen de db/seed.sql (contraseña "Admin1234").
 */
'use strict';

const request = require('supertest');
const app = require('../../src/app');

const CUENTAS = {
  admin:       { correo: 'admin@piedrapintada.ve', contrasena: 'Admin1234' },
  registrado:  { correo: 'maria@example.com',      contrasena: 'Admin1234' },
  institucion: { correo: 'liceo@institucion.ve',   contrasena: 'Admin1234' },
};

async function token(rol) {
  const res = await request(app).post('/api/auth/login').send(CUENTAS[rol]);
  if (!res.body.ok) throw new Error(`No se pudo iniciar sesión como ${rol}: ${res.body.error}`);
  return res.body.datos.token;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

module.exports = { token, auth, CUENTAS };
