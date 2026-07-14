/**
 * utils/respuestas.js — Formato uniforme de respuestas de la API.
 * Todas las respuestas siguen { ok, datos } o { ok, error, detalles }.
 */
'use strict';

function exito(res, datos = null, codigo = 200) {
  return res.status(codigo).json({ ok: true, datos });
}

function creado(res, datos = null) {
  return res.status(201).json({ ok: true, datos });
}

function error(res, mensaje, codigo = 400, detalles = undefined) {
  const cuerpo = { ok: false, error: mensaje };
  if (detalles !== undefined) cuerpo.detalles = detalles;
  return res.status(codigo).json(cuerpo);
}

module.exports = { exito, creado, error };
