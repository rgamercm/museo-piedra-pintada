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
// El informe documenta 111 rocas "en cinco montículos adyacentes". La
// agrupación real está en el PLANO dibujado por la autora; la tabla GPS del
// informe (y por tanto la BD) es poco fiable para ~30 rocas por la deriva del
// GPS bajo la selva (el informe incluso anota rocas "no in situ"). Por eso la
// pertenencia a montículo se define EXPLÍCITAMENTE por código de roca, no por
// cercanía de coordenadas.
// Centros: centroides de las rocas con GPS fiable de cada montículo.
const MONTICULOS_BASE = [
  { id: 1, nombre: 'Montículo 1', latitud: 10.300333, longitud: -67.887011 },
  { id: 2, nombre: 'Montículo 2', latitud: 10.301107, longitud: -67.886983 },
  { id: 3, nombre: 'Montículo 3', latitud: 10.301925, longitud: -67.887278 },
  { id: 4, nombre: 'Montículo 4', latitud: 10.302971, longitud: -67.888472 },
  { id: 5, nombre: 'Montículo 5', latitud: 10.304206, longitud: -67.888407 },
];

// Coordenadas del informe (Juszczyk 2023) para rocas que en la BD están sin
// coordenadas, para que también aparezcan en el mapa.
const COORDS_INFORME = {
  S9R15: [10.30305, -67.8883889], S9R34: [10.3030111, -67.8883611],
  S9R79: [10.2989861, -67.8883556], S9R90: [10.2969806, -67.8893806],
  S9R94: [10.2957333, -67.8911778], S9R103: [10.300989, -67.886972],
};

// Pertenencia roca → montículo. PROPUESTA (pendiente de revisión del museo):
// las rocas de GPS fiable dan un patrón claro por rangos; los ~30 outliers se
// asignan por secuencia de documentación y por la indicación de que S9R81
// pertenece al Montículo 2.
const MONTICULO_POR_ROCA = (() => {
  const m = {};
  const set = (a, b, id) => { for (let i = a; i <= b; i++) m['S9R' + i] = id; };
  set(1, 9, 5);       // M5 (norte)
  set(10, 43, 4);     // M4 (grande, oeste) — incluye S9R28–31, 41–42 (GPS desviado)
  set(44, 61, 3);     // M3 (centro)
  set(62, 66, 2);     // M2 (cerca del museo)
  set(67, 73, 5);     // norte lejano → M5 (por confirmar)
  set(74, 76, 4);     // → M4
  set(77, 103, 2);    // sur lejano, incluye S9R81 → M2 (por confirmar)
  set(104, 111, 1);   // M1 (sur)
  m.S9R86 = 3; m.S9R87 = 3; m.S9R88 = 3; // caen junto a M3
  return m;
})();

// Si el GPS de una roca cae más lejos que esto de su montículo asignado, se
// considera coordenada poco fiable y se reubica cerca del centro del montículo.
const RADIO_SNAP_MONTICULO_M = 120;

/**
 * Agrupa los petroglifos en los 5 montículos usando el mapeo explícito
 * MONTICULO_POR_ROCA. Las rocas con GPS lejano a su montículo se reubican en
 * un anillo alrededor del centro para que el mapa coincida con el plano; las
 * de GPS bueno conservan su posición real.
 * @returns {{monticulos: Array, fuera: Array}}
 */
function agruparEnMonticulos(estaciones) {
  const monticulos = MONTICULOS_BASE.map(m => ({ ...m, petroglifos: [] }));
  const porId = Object.fromEntries(monticulos.map(m => [m.id, m]));
  const fuera = [];
  let iSnap = 0;
  for (const est of estaciones) {
    const cod = est.petroglifo_codigo_qr || est.codigo_qr;
    const mid = MONTICULO_POR_ROCA[cod];
    const m = mid ? porId[mid] : null;
    if (!m) { est.monticulo_id = null; fuera.push(est); continue; }
    est.monticulo_id = m.id;

    let lat = parseFloat(est.latitud), lng = parseFloat(est.longitud);
    const lejos = !isFinite(lat) || !isFinite(lng) ||
      _haversine(lat, lng, m.latitud, m.longitud) > RADIO_SNAP_MONTICULO_M;
    if (lejos) {
      const ang = iSnap * 2.399963;               // ángulo áureo (reparte sin solapar)
      const r = 0.00010 + 0.00005 * (iSnap % 4);   // ~11–33 m del centro
      iSnap++;
      lat = m.latitud + r * Math.cos(ang);
      lng = m.longitud + r * Math.sin(ang);
      est.gps_reubicado = true;
    }
    est.latitud = lat; est.longitud = lng;
    m.petroglifos.push(est);
  }
  return { monticulos, fuera };
}

window.MuseoEstaciones = {
  PETROGLIFOS_POR_PARADA, UMBRAL_RUTA_M, MONTICULOS_BASE,
  COORDS_INFORME, MONTICULO_POR_ROCA, RADIO_SNAP_MONTICULO_M,
  cargarTrack, construirEstaciones, clasificarPorRuta, agruparEnMonticulos,
};
