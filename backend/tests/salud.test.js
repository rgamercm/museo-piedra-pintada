'use strict';
const request = require('supertest');
const { iniciarBDPrueba } = require('./ayuda/db-prueba');

beforeAll(() => { iniciarBDPrueba(); });
const app = require('../src/app');

describe('Salud del servicio', () => {
  test('GET /api/health responde 200 con la BD conectada', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.datos.bd).toBe('conectada');
  });

  test('Una ruta inexistente devuelve 404 con el formato { ok:false, error }', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(typeof res.body.error).toBe('string');
  });
});
