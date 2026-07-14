'use strict';
const request = require('supertest');
const { iniciarBDPrueba } = require('./ayuda/db-prueba');

let db;
beforeAll(() => { ({ db } = iniciarBDPrueba()); });
const app = require('../src/app');
const { token, auth } = require('./ayuda/sesiones');

describe('M4.8 · Trivia — REGRESIÓN DEL BUG B1', () => {
  test('El set público NO expone respuesta_correcta (nadie puede hacer trampa)', async () => {
    const res = await request(app).get('/api/trivia/preguntas?limite=5');
    expect(res.status).toBe(200);
    expect(res.body.datos.length).toBeGreaterThan(0);
    for (const p of res.body.datos) {
      expect(p).not.toHaveProperty('respuesta_correcta');
      expect(p.opcion_a).toBeTruthy();
    }
    // Ni siquiera en el JSON en crudo debe aparecer el campo
    expect(JSON.stringify(res.body)).not.toContain('respuesta_correcta');
  });

  test('POST /api/trivia/verificar calcula el puntaje EN EL SERVIDOR', async () => {
    const { rows } = await db.query('SELECT id, respuesta_correcta FROM preguntas_trivia ORDER BY id LIMIT 3');
    const respuestas = rows.map((r) => ({ pregunta_id: r.id, opcion: r.respuesta_correcta }));

    const res = await request(app).post('/api/trivia/verificar').send({ respuestas });
    expect(res.status).toBe(200);
    expect(res.body.datos.puntaje).toBe(3);
    expect(res.body.datos.total).toBe(3);
  });

  test('Respuestas incorrectas dan puntaje 0', async () => {
    const { rows } = await db.query('SELECT id, respuesta_correcta FROM preguntas_trivia ORDER BY id LIMIT 3');
    const incorrecta = (c) => (c === 'A' ? 'B' : 'A');
    const respuestas = rows.map((r) => ({ pregunta_id: r.id, opcion: incorrecta(r.respuesta_correcta) }));

    const res = await request(app).post('/api/trivia/verificar').send({ respuestas });
    expect(res.body.datos.puntaje).toBe(0);
  });

  test('El cliente NO puede inyectar su propio puntaje', async () => {
    const t = await token('registrado');
    const { rows } = await db.query('SELECT id, respuesta_correcta FROM preguntas_trivia ORDER BY id LIMIT 2');
    const incorrecta = (c) => (c === 'A' ? 'B' : 'A');

    const res = await request(app).post('/api/trivia/resultados').set(auth(t)).send({
      puntaje: 999, // ← intento de trampa
      total_preguntas: 2,
      respuestas_json: rows.map((r) => ({ pregunta_id: r.id, opcion: incorrecta(r.respuesta_correcta) })),
    });

    expect(res.status).toBe(201);
    expect(res.body.datos.puntaje).toBe(0); // el servidor recalcula: ignora el 999
  });

  test('Solo un admin puede crear preguntas de trivia', async () => {
    const tReg = await token('registrado');
    const sinPermiso = await request(app).post('/api/trivia/preguntas').set(auth(tReg)).send({
      pregunta: '¿?', opcion_a: 'a', opcion_b: 'b', opcion_c: 'c', opcion_d: 'd', respuesta_correcta: 'A',
    });
    expect(sinPermiso.status).toBe(403);

    const tAdmin = await token('admin');
    const conPermiso = await request(app).post('/api/trivia/preguntas').set(auth(tAdmin)).send({
      pregunta: '¿Qué es un petroglifo?', opcion_a: 'Un grabado en roca', opcion_b: 'Un mineral',
      opcion_c: 'Una pintura', opcion_d: 'Un fósil', respuesta_correcta: 'A',
    });
    expect(conPermiso.status).toBe(201);
  });
});
