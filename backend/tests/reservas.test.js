'use strict';
const request = require('supertest');
const { iniciarBDPrueba } = require('./ayuda/db-prueba');

beforeAll(() => { iniciarBDPrueba(); });
const app = require('../src/app');
const { token, auth } = require('./ayuda/sesiones');

const enUnMes = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

describe('M4.3 · Reservas institucionales — REGRESIÓN DEL BUG B2', () => {
  test('Un usuario con rol institución PUEDE crear una reserva (antes fallaba siempre)', async () => {
    const t = await token('institucion');
    const res = await request(app).post('/api/reservas').set(auth(t)).send({
      contacto_nombre: 'Prof. Ramírez',
      contacto_telefono: '04141234567',
      contacto_correo: 'ramirez@institucion.ve',
      fecha_visita: enUnMes(),
      num_personas: 30,
      notas: 'Grupo de 5to año',
    });
    expect(res.status).toBe(201);
    expect(res.body.datos.institucion_nombre).toBe('Liceo Bolivariano Simón Bolívar');
    expect(res.body.datos.estado).toBe('pendiente');
  });

  test('Un número de personas inválido se rechaza con 422', async () => {
    const t = await token('institucion');
    const res = await request(app).post('/api/reservas').set(auth(t)).send({
      contacto_nombre: 'X', contacto_telefono: '04141234567', contacto_correo: 'x@y.ve',
      fecha_visita: enUnMes(), num_personas: 0,
    });
    expect(res.status).toBe(422);
  });

  test('Una fecha en el pasado se rechaza con 422', async () => {
    const t = await token('institucion');
    const res = await request(app).post('/api/reservas').set(auth(t)).send({
      contacto_nombre: 'X', contacto_telefono: '04141234567', contacto_correo: 'x@y.ve',
      fecha_visita: '2020-01-01', num_personas: 10,
    });
    expect(res.status).toBe(422);
  });

  test('Un usuario registrado no puede listar todas las reservas (403)', async () => {
    const t = await token('registrado');
    const res = await request(app).get('/api/reservas').set(auth(t));
    expect(res.status).toBe(403);
  });

  test('El admin lista las reservas y puede aprobarlas', async () => {
    const tInst = await token('institucion');
    await request(app).post('/api/reservas').set(auth(tInst)).send({
      contacto_nombre: 'Prof. Ramírez', contacto_telefono: '04141234567',
      contacto_correo: 'r@i.ve', fecha_visita: enUnMes(), num_personas: 20,
    });

    const tAdmin = await token('admin');
    const lista = await request(app).get('/api/reservas').set(auth(tAdmin));
    expect(lista.status).toBe(200);
    expect(lista.body.datos.length).toBeGreaterThan(0);

    const id = lista.body.datos[0].id;
    const aprobar = await request(app).patch(`/api/reservas/${id}/estado`).set(auth(tAdmin))
      .send({ estado: 'aprobada' });
    expect(aprobar.status).toBe(200);
    expect(aprobar.body.datos.estado).toBe('aprobada');
  });
});
