'use strict';
const request = require('supertest');
const { iniciarBDPrueba } = require('./ayuda/db-prueba');

let db;
beforeAll(() => { ({ db } = iniciarBDPrueba()); });
const app = require('../src/app');
const { token, auth } = require('./ayuda/sesiones');

describe('M3 · Autenticación y permisos', () => {
  test('El registro crea el usuario y devuelve token', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Pedro Prueba', correo: 'pedro@prueba.ve', contrasena: 'Clave1234',
    });
    expect(res.status).toBe(201);
    expect(res.body.datos.token).toBeTruthy();
  });

  test('La contraseña se guarda HASHEADA, nunca en texto plano', async () => {
    const { rows } = await db.query("SELECT contrasena_hash FROM usuarios WHERE correo = 'pedro@prueba.ve'");
    expect(rows[0].contrasena_hash).not.toBe('Clave1234');
    expect(rows[0].contrasena_hash.startsWith('$2')).toBe(true);
  });

  test('Un correo duplicado devuelve 409', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Otro', correo: 'pedro@prueba.ve', contrasena: 'Clave1234',
    });
    expect(res.status).toBe(409);
  });

  test('Datos inválidos devuelven 422', async () => {
    const res = await request(app).post('/api/auth/registro').send({ nombre: '', correo: 'no-es-correo', contrasena: '1' });
    expect(res.status).toBe(422);
  });

  test('El login correcto devuelve un token', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ correo: 'admin@piedrapintada.ve', contrasena: 'Admin1234' });
    expect(res.status).toBe(200);
    expect(res.body.datos.token).toBeTruthy();
  });

  test('El login con contraseña incorrecta falla con 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ correo: 'admin@piedrapintada.ve', contrasena: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  test('Una ruta protegida sin token devuelve 401', async () => {
    const res = await request(app).get('/api/reservas');
    expect(res.status).toBe(401);
  });

  test('Una ruta de admin con rol registrado devuelve 403', async () => {
    const t = await token('registrado');
    const res = await request(app).get('/api/trivia/preguntas/todas').set(auth(t));
    expect(res.status).toBe(403);
  });

  test('Una ruta de admin con rol admin devuelve 200', async () => {
    const t = await token('admin');
    const res = await request(app).get('/api/trivia/preguntas/todas').set(auth(t));
    expect(res.status).toBe(200);
  });
});
