'use strict';

/**
 * MUSEO ARQUEOLÓGICO PIEDRA PINTADA
 * estaciones-datos.js — Fuente única de las estaciones del recorrido cuando
 * la API/BD no está disponible. Deriva las paradas de las pausas del track
 * GPS (fin de cada tramo del GeoJSON) y las vincula a su ficha técnica
 * (mock-data.js) por ID. La usan tanto el Mapa GPS (mapa-gps.js) como el
 * Escáner QR (recorrido.html), para que ambos muestren los mismos
 * petroglifos posicionados aunque el backend esté caído.
 */

// PROVISIONAL: qué petroglifo corresponde a cada parada del track, en el
// mismo orden en que aparecen las pausas (fin de cada tramo del GeoJSON).
// El museo definirá el mapeo real; basta con reemplazar estos IDs (deben
// existir en MOCK_PETROGLIFOS / la BD).
const PETROGLIFOS_POR_PARADA = [
  'S9R1', 'S9R2', 'S9R3', 'S9R4', 'S9R5', 'S9R6', 'S9R7',
  'S9R8', 'S9R9', 'S9R10', 'S9R11', 'S9R12', 'S9R13', 'S9R14',
];

/**
 * Carga el track.geojson (contiene SOLO la línea del recorrido) y separa:
 *  - coords: todos los puntos [lng,lat] de la ruta, con los tramos aplanados
 *    (para dibujar la polilínea y para snap-to-route / simulador).
 *  - paradas: un punto [lng,lat,...] por cada pausa de grabación (el último
 *    punto de cada tramo del MultiLineString), que es donde se detuvo el
 *    recorrido frente a un petroglifo.
 * @param {string} rutaGeojson ruta relativa desde la página que llama
 */
async function cargarTrack(rutaGeojson = '../assets/data/track.geojson') {
  const res = await fetch(rutaGeojson);
  if (!res.ok) throw new Error('No se pudo cargar track.geojson');
  const geojson = await res.json();
  const feature = geojson.features[0];

  if (feature.geometry.type === 'LineString') {
    const coords = feature.geometry.coordinates;
    return { coords, paradas: coords.length ? [coords[coords.length - 1]] : [] };
  }
  if (feature.geometry.type === 'MultiLineString') {
    const tramos = feature.geometry.coordinates;
    return {
      coords: tramos.flat(),
      paradas: tramos.map(tramo => tramo[tramo.length - 1]),
    };
  }
  return { coords: [], paradas: [] };
}

/**
 * Construye las "estaciones" del recorrido a partir de las paradas del
 * track, vinculadas con su ficha técnica (MOCK_PETROGLIFOS) por ID.
 * Forma del objeto compatible con lo que antes devolvía la API
 * (`GET /api/estaciones`), para no tener que tocar el resto del código.
 * @param {Array<Array<number>>} paradas puntos [lng,lat,...]
 */
function construirEstaciones(paradas) {
  const fichas = window.MOCK_PETROGLIFOS || [];
  return paradas.map((punto, i) => {
    const idPetroglifo = PETROGLIFOS_POR_PARADA[i] || null;
    const ficha = fichas.find(p => p.id === idPetroglifo) || null;
    return {
      id: i + 1,
      orden: i + 1,
      nombre: ficha ? `Estación ${i + 1} · ${ficha.nombre}` : `Estación ${i + 1}`,
      latitud: punto[1],
      longitud: punto[0],
      tipo_marcador: null,
      petroglifo_id: idPetroglifo,
      petroglifo_codigo_qr: idPetroglifo,
      petroglifo_imagen_url: ficha?.imagen_url || null,
      petroglifo_categoria: ficha?.categoria || null,
      petroglifo_texto_asistente: ficha?.texto_asistente || ficha?.descripcion || null,
      petroglifo: ficha,
      completada: false,
    };
  });
}

window.MuseoEstaciones = { PETROGLIFOS_POR_PARADA, cargarTrack, construirEstaciones };
