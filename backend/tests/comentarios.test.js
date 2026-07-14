'use strict';
const request = require('supertest');
const { iniciarBDPrueba } = require('./ayuda/db-prueba');

beforeAll(() => { iniciarBDPrueba(); });
const app = require('../src/app');
const { token, auth } = require('./ayuda/sesiones');

describe('M4.4 · Reseñas y moderación', () => {
  test('Sin sesión no se puede dejar una reseña (401)', async () => {
    const res = await request(app).post('/api/comentarios').send({ texto: 'Hola', calificacion: 5 });
    expect(res.status).toBe(401);
  });

  test('Con sesión se crea la reseña y queda PENDIENTE de moderación', async () => {
    const t = await token('registrado');
    const res = await request(app).post('/api/comentarios').set(auth(t))
      .send({ texto: 'Un lugar impresionante, muy bien conservado.', calificacion: 5 });
    expect(res.status).toBe(201);
    expect(res.body.datos.estado_moderacion).toBe('pendiente');
  });

  test('El listado público NO muestra la reseña recién creada (sigue pendiente)', async () => {
    const t = await token('registrado');
    const creada = await request(app).post('/api/comentarios').set(auth(t))
      .send({ texto: 'Reseña que debe quedar oculta hasta ser aprobada.', calificacion: 4 });
    const id = creada.body.datos.id;

    const res = await request(app).get('/api/comentarios');
    expect(res.status).toBe(200);
    expect(res.body.datos.some((c) => c.id === id)).toBe(false);
  });

  test('Un usuario normal no puede ver las reseñas pendientes (403)', async () => {
    const t = await token('registrado');
    const res = await request(app).get('/api/comentarios/pendientes').set(auth(t));
    expect(res.status).toBe(403);
  });

  test('El admin aprueba la reseña y entonces sí aparece en público', async () => {
    const tAdmin = await token('admin');
    const pendientes = await request(app).get('/api/comentarios/pendientes').set(auth(tAdmin));
    expect(pendientes.status).toBe(200);
    expect(pendientes.body.datos.length).toBeGreaterThan(0);
    const id = pendientes.body.datos[0].id;

    const moderar = await request(app).patch(`/api/comentarios/${id}/moderar`).set(auth(tAdmin))
      .send({ estado_moderacion: 'aprobado' });
    expect(moderar.status).toBe(200);

    const publico = await request(app).get('/api/comentarios');
    expect(publico.body.datos.some((c) => c.id === id)).toBe(true);
  });
});
