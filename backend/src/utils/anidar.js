/**
 * utils/anidar.js — Convierte columnas planas de un JOIN en un objeto anidado.
 *
 * Sustituye a row_to_json(tabla.*) de PostgreSQL, que no es portable y no se puede
 * probar en memoria. El contrato de la API no cambia: el frontend sigue recibiendo
 * { ...estacion, petroglifo: { ... } }.
 */
'use strict';

/**
 * @param {object} fila         fila plana devuelta por la consulta
 * @param {string} prefijo      prefijo de las columnas de la entidad anidada (ej. 'p_')
 * @param {string} nombre       nombre de la propiedad anidada (ej. 'petroglifo')
 */
function anidar(fila, prefijo, nombre) {
  const base = {};
  const hijo = {};
  let tieneHijo = false;

  for (const [clave, valor] of Object.entries(fila)) {
    if (clave.startsWith(prefijo)) {
      const sub = clave.slice(prefijo.length);
      hijo[sub] = valor;
      if (valor !== null && valor !== undefined) tieneHijo = true;
    } else {
      base[clave] = valor;
    }
  }

  base[nombre] = tieneHijo ? hijo : null;
  return base;
}

const anidarTodas = (filas, prefijo, nombre) => filas.map((f) => anidar(f, prefijo, nombre));

module.exports = { anidar, anidarTodas };
