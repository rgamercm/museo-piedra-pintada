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

// ── Clasificación de estaciones respecto al sendero ──────────────────────
// Un petroglifo "pasa por el recorrido" si está a menos de este umbral del
// sendero. Se aumentó a 150m para asegurar que S9R81 y otros importantes entren.
const UMBRAL_RUTA_M = 150;

function _haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Anota cada estación con su relación al sendero:
 *  - distARuta:  metros al punto más cercano del sendero
 *  - posEnRuta:  metros recorridos desde el inicio hasta ese punto (para
 *                ordenar las paradas en el sentido de la caminata)
 *  - enRuta:     true si distARuta <= UMBRAL_RUTA_M
 *  - ordenRuta:  1..N solo para las estaciones en ruta, en orden de camino
 * Muta y devuelve el mismo array.
 * @param {Array} estaciones objetos con latitud/longitud (número o string)
 * @param {Array<Array<number>>} coordsRuta puntos [lng,lat] del sendero aplanado
 */
function clasificarPorRuta(estaciones, coordsRuta) {
  if (!Array.isArray(coordsRuta) || coordsRuta.length < 2) return estaciones;

  // Longitud acumulada del sendero en cada vértice
  const acum = [0];
  for (let i = 1; i < coordsRuta.length; i++) {
    acum.push(acum[i - 1] + _haversine(
      coordsRuta[i - 1][1], coordsRuta[i - 1][0], coordsRuta[i][1], coordsRuta[i][0]
    ));
  }

  for (const est of estaciones) {
    const lat = parseFloat(est.latitud), lng = parseFloat(est.longitud);
    if (!isFinite(lat) || !isFinite(lng)) { est.enRuta = false; continue; }

    let mejorDist = Infinity, mejorPos = 0;
    for (let i = 0; i < coordsRuta.length - 1; i++) {
      const ax = coordsRuta[i][0], ay = coordsRuta[i][1];
      const bx = coordsRuta[i + 1][0], by = coordsRuta[i + 1][1];
      const dx = bx - ax, dy = by - ay;
      const t = (dx === 0 && dy === 0) ? 0 :
        Math.max(0, Math.min(1, ((lng - ax) * dx + (lat - ay) * dy) / (dx * dx + dy * dy)));
      const px = ax + t * dx, py = ay + t * dy;
      const d = _haversine(lat, lng, py, px);
      if (d < mejorDist) {
        mejorDist = d;
        mejorPos = acum[i] + t * (acum[i + 1] - acum[i]);
      }
    }
    est.distARuta = mejorDist;
    est.posEnRuta = mejorPos;
    est.enRuta = mejorDist <= UMBRAL_RUTA_M;
  }

  estaciones
    .filter(e => e.enRuta)
    .sort((a, b) => a.posEnRuta - b.posEnRuta)
    .forEach((e, i) => { e.ordenRuta = i + 1; });

  return estaciones;
}

// ── Montículos: estaciones del recorrido (informe K. Juszczyk, AmerGraph 2023) ──
// El plano del informe agrupa las rocas documentadas en 2022 en montículos.
// El recorrido guiado usa las 5 estaciones RECORRIBLES del plano; las rocas
// de las otras zonas del parque (extremo norte y sur) pertenecen a las 2
// estaciones no recorribles y quedan fuera del tour.
// Centros: centroides de las rocas de la BD dentro de cada polígono del plano.
const MONTICULOS_BASE = [
  { id: 1, nombre: 'Montículo 1', latitud: 10.30034, longitud: -67.88703 },
  { id: 2, nombre: 'Montículo 2', latitud: 10.30113, longitud: -67.88699 },
  { id: 3, nombre: 'Montículo 3', latitud: 10.30193, longitud: -67.88727 },
  { id: 4, nombre: 'Montículo 4', latitud: 10.30293, longitud: -67.88852 },
  { id: 5, nombre: 'Montículo 5', latitud: 10.30421, longitud: -67.88843 },
];

// Una roca pertenece al montículo más cercano si está dentro de este radio;
// más lejos se considera de una zona no recorrible del parque.
const RADIO_MONTICULO_M = 140;

/**
 * Agrupa las estaciones/petroglifos en los 5 montículos recorribles.
 * Anota cada estación con monticulo_id (o null si queda fuera).
 * @returns {{monticulos: Array, fuera: Array}} montículos con su lista
 *          de petroglifos, y las rocas fuera de las estaciones recorribles.
 */
function agruparEnMonticulos(estaciones) {
  const monticulos = MONTICULOS_BASE.map(m => ({ ...m, petroglifos: [] }));
  const fuera = [];
  for (const est of estaciones) {
    const lat = parseFloat(est.latitud), lng = parseFloat(est.longitud);
    if (!isFinite(lat) || !isFinite(lng)) { est.monticulo_id = null; fuera.push(est); continue; }
    let mejor = null, mejorDist = Infinity;
    for (const m of monticulos) {
      const d = _haversine(lat, lng, m.latitud, m.longitud);
      if (d < mejorDist) { mejorDist = d; mejor = m; }
    }
    if (mejor && mejorDist <= RADIO_MONTICULO_M) {
      est.monticulo_id = mejor.id;
      mejor.petroglifos.push(est);
    } else {
      est.monticulo_id = null;
      fuera.push(est);
    }
  }
  return { monticulos, fuera };
}

window.MuseoEstaciones = {
  PETROGLIFOS_POR_PARADA, UMBRAL_RUTA_M, MONTICULOS_BASE, RADIO_MONTICULO_M,
  cargarTrack, construirEstaciones, clasificarPorRuta, agruparEnMonticulos,
};
