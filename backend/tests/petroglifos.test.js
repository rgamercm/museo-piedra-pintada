'use strict';
const request = require('supertest');
const { iniciarBDPrueba } = require('./ayuda/db-prueba');

beforeAll(() => { iniciarBDPrueba(); });
const app = require('../src/app');
const { token, auth } = require('./ayuda/sesiones');

describe('M4.1 · Petroglifos y estaciones', () => {
  test('El catálogo público devuelve los 12 petroglifos del seed', async () => {
    const res = await request(app).get('/api/petroglifos');
    expect(res.status).toBe(200);
    expect(res.body.datos.length).toBe(12);
  });

  test('La lectura por código QR (QR-001) devuelve la estación con su petroglifo', async () => {
    const res = await request(app).get('/api/estaciones/qr/QR-001');
    expect(res.status).toBe(200);
    expect(res.body.datos.petroglifo.codigo_qr).toBe('QR-001');
    expect(res.body.datos.petroglifo.texto_asistente).toBeTruthy(); // lo que narra la voz
    expect(res.body.datos.latitud).toBeDefined();
  });

  test('Un código QR inexistente devuelve 404', async () => {
    const res = await request(app).get('/api/estaciones/qr/QR-999');
    expect(res.status).toBe(404);
  });

  test('Crear un petroglifo SIN ser admin devuelve 403', async () => {
    const t = await token('registrado');
    const res = await request(app).post('/api/petroglifos').set(auth(t)).send({
      nombre: 'Intruso', descripcion: 'x', texto_asistente: 'x', codigo_qr: 'QR-100',
    });
    expect(res.status).toBe(403);
  });

  test('Crear un petroglifo como admin devuelve 201 y aparece en el catálogo público', async () => {
    const t = await token('admin');
    const crear = await request(app).post('/api/petroglifos').set(auth(t)).send({
      nombre: 'El Sol Naciente', descripcion: 'Prueba', texto_asistente: 'Narración de prueba',
      codigo_qr: 'QR-013', categoria: 'Astronómico',
    });
    expect(crear.status).toBe(201);

    const publico = await request(app).get('/api/petroglifos');
    expect(publico.body.datos.length).toBe(13);
  });

  test('Un código QR duplicado devuelve 409', async () => {
    const t = await token('admin');
    const res = await request(app).post('/api/petroglifos').set(auth(t)).send({
      nombre: 'Repetido', descripcion: 'x', texto_asistente: 'x', codigo_qr: 'QR-001',
    });
    expect(res.status).toBe(409);
  });

  test('Las estaciones del seed son 12 y traen coordenadas', async () => {
    const res = await request(app).get('/api/estaciones');
    expect(res.status).toBe(200);
    expect(res.body.datos.length).toBe(12);
    expect(res.body.datos[0].latitud).toBeDefined();
  });
});
