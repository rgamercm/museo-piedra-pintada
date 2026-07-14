'use strict';
const request = require('supertest');
const { iniciarBDPrueba } = require('./ayuda/db-prueba');

beforeAll(() => { iniciarBDPrueba(); });
const app = require('../src/app');
const { token, auth } = require('./ayuda/sesiones');

describe('M4.7 / M4.6 / M4.9 · Noticias, preguntas y contador de visitas', () => {
  test('Las noticias públicas se listan sin token', async () => {
    const res = await request(app).get('/api/noticias');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.datos)).toBe(true);
  });

  test('Un visitante no puede publicar noticias (403)', async () => {
    const t = await token('registrado');
    const res = await request(app).post('/api/noticias').set(auth(t))
      .send({ titulo: 'Falsa', contenido: 'x' });
    expect(res.status).toBe(403);
  });

  test('El admin publica una noticia y aparece en el listado público', async () => {
    const t = await token('admin');
    const crear = await request(app).post('/api/noticias').set(auth(t)).send({
      titulo: 'Nueva ruta guiada los domingos',
      contenido: 'El museo abre una ruta guiada por el valle todos los domingos.',
      publicado: true,
    });
    expect(crear.status).toBe(201);

    const publico = await request(app).get('/api/noticias');
    expect(publico.body.datos.some((n) => n.titulo === 'Nueva ruta guiada los domingos')).toBe(true);
  });

  test('Cualquiera puede enviar una pregunta al museo', async () => {
    const res = await request(app).post('/api/preguntas').send({ pregunta: '¿Cuál es el horario los feriados?' });
    expect([200, 201]).toContain(res.status);
  });

  test('El contador de visitas registra e informa el total', async () => {
    const registrar = await request(app).post('/api/visitas');
    expect([200, 201]).toContain(registrar.status);

    const total = await request(app).get('/api/visitas');
    expect(total.status).toBe(200);
    expect(total.body.ok).toBe(true);
  });
});
