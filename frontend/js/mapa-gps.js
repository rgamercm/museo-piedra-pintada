'use strict';

// ============================================================================
// CONFIGURACIÓN DEL RECORRIDO GUIADO
// ============================================================================
const CONFIG_GPS = {
  RADIO_ACTIVACION_M: 10,      // Radio (metros) para considerar que llegaste a una parada
  RADIO_SALIDA_M: 18,          // Hay que alejarse más de esto para poder re-disparar la misma parada
  PRECISION_MAXIMA_M: 55,      // Lecturas GPS con precisión peor que esto se descartan
                               // (bajo la selva el GPS del móvil ronda ±40–55 m)
  VELOCIDAD_MAXIMA_MS: 8,      // Saltos que impliquen ir a más de 8 m/s (a pie) se descartan
  COOLDOWN_NARRACION_MS: 3 * 60 * 1000, // No repetir la narración de una parada antes de 3 min
};

// El mapeo parada→petroglifo y la construcción de estaciones de respaldo
// (sin API/BD) viven en estaciones-datos.js, compartido con recorrido.html
// (Escáner QR) para que ambas páginas muestren los mismos petroglifos.

// ============================================================================
// ESTADO GLOBAL
// ============================================================================
let mapa;
let capaRuta;
let capaUsuario;
let estacionesDatos = [];           // Todos los petroglifos con coordenadas (BD)
let monticulos = [];                // Las 5 estaciones recorribles del informe 2023
let rocasFueraDeEstaciones = [];    // Petroglifos de zonas no recorribles
let monticuloSeleccionadoId = null; // Estación mostrada en el panel de petroglifos
let marcadores = {};                // id_petroglifo -> L.marker (solo rocas fuera de estaciones)
let marcadoresMonticulos = {};      // id_monticulo -> L.marker
let geojsonCoords = []; // Coordenadas [lng, lat] de TODA la ruta (tramos aplanados)
let idSimulador = null;
let indiceSimulador = 0;

// --- ESTADO DE NAVEGACIÓN ---
let modoNavegacion = false;
let estacionDestinoId = null;       // id del MONTÍCULO destino durante la navegación
let idWatchPosition = null;
let wakeLock = null;            // Screen Wake Lock (pantalla siempre encendida)
let rumboUsuario = null;        // Rumbo de movimiento del usuario (grados 0-360)
let ultimaLectura = null;       // Última lectura GPS aceptada {lat, lng, t}
let avisoPrecisionMostrado = false;

// Registro de disparos por estación: id -> { narradaEn: timestamp, dentro: bool }
const registroParadas = {};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializar mapa
  mapa = L.map('mapa-parque').setView([10.3009, -67.8877], 15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  }).addTo(mapa);

  // 2a. Ruta personalizada del simulador (dibujada en el panel admin).
  //     Si existe en la BD, su trazado tiene prioridad sobre el GeoJSON
  //     para la línea del mapa y el recorrido del simulador.
  let rutaCargada = false;
  try {
    const resApi = await window.api.cliente('/api/ruta_simulador');
    if (resApi.datos && Array.isArray(resApi.datos.coordenadas) && resApi.datos.coordenadas.length > 0) {
      geojsonCoords = resApi.datos.coordenadas; // ya está en [lng, lat]

      // Convertir a [lat, lng] para Leaflet Polyline
      const latLngs = geojsonCoords.map(c => [c[1], c[0]]);
      capaRuta = L.polyline(latLngs, {
        color: '#7ABA58', weight: 4, opacity: 0.8, dashArray: '10, 10'
      }).addTo(mapa);
      mapa.fitBounds(capaRuta.getBounds());
      rutaCargada = true;
    }
  } catch (e) {
    console.warn('No hay ruta personalizada del simulador');
  }

  // 2b. Línea del recorrido desde el GeoJSON.
  //     El archivo contiene SOLO la ruta (MultiLineString). Los fines de cada
  //     tramo son las pausas de la grabación = paradas frente a un petroglifo,
  //     así que las paradas se derivan de aquí SIEMPRE (aunque haya ruta
  //     personalizada, que no trae esa información).
  let paradasTrack = [];
  try {
    const { coords: coordsTrack, paradas } = await window.MuseoEstaciones.cargarTrack();
    paradasTrack = paradas;

    if (!rutaCargada && coordsTrack.length > 1) {
      geojsonCoords = coordsTrack;
      const latLngs = coordsTrack.map(c => [c[1], c[0]]);
      capaRuta = L.polyline(latLngs, { color: '#7ABA58', weight: 4, opacity: 0.8 }).addTo(mapa);
      mapa.fitBounds(capaRuta.getBounds());
    }
  } catch (err) {
    console.error('Error cargando GeoJSON:', err);
  }

  // 3. Cargar TODOS los petroglifos (BD real, 110). Se usa el catálogo de
  //    petroglifos —no la tabla estaciones, que solo tiene 99— para que
  //    aparezcan todas las rocas documentadas. Si la API falla, respaldo local.
  let rocas = [];
  try {
    rocas = await window.api.petroglifos.obtenerTodos();
  } catch (e) {
    rocas = [];
  }
  if (!Array.isArray(rocas) || rocas.length === 0) {
    rocas = window.MuseoEstaciones.construirEstaciones(paradasTrack);
  }

  // Normalizar la forma (petroglifo del catálogo o estación de respaldo) a los
  // campos planos petroglifo_* que usa esta página. Rellena las coordenadas
  // faltantes con las del informe (COORDS_INFORME) para que también se ubiquen.
  const COORDS = window.MuseoEstaciones.COORDS_INFORME;
  estacionesDatos = rocas.map((p, i) => {
    const ficha = p.petroglifo || null;
    const cod = p.codigo_qr || p.petroglifo_codigo_qr || ficha?.codigo_qr || null;
    let lat = parseFloat(p.latitud), lng = parseFloat(p.longitud);
    if ((!isFinite(lat) || !isFinite(lng)) && cod && COORDS[cod]) {
      lat = COORDS[cod][0]; lng = COORDS[cod][1];
    }
    return {
      id: p.id ?? (i + 1),
      nombre: p.nombre,
      latitud: lat,
      longitud: lng,
      petroglifo_id: p.petroglifo_id ?? p.id ?? cod,
      petroglifo_codigo_qr: cod,
      petroglifo_imagen_url: p.imagen_url || p.petroglifo_imagen_url || ficha?.imagen_url || null,
      petroglifo_categoria: p.categoria || p.petroglifo_categoria || ficha?.categoria || null,
      petroglifo_texto_asistente: p.texto_asistente || p.petroglifo_texto_asistente
        || ficha?.texto_asistente || p.descripcion || null,
    };
  });

  // Orden: primero las del sendero en sentido de la caminata, luego el resto
  // por cercanía al sendero.
  estacionesDatos.sort((a, b) => {
    if (a.enRuta !== b.enRuta) return a.enRuta ? -1 : 1;
    if (a.enRuta) return a.ordenRuta - b.ordenRuta;
    return (a.distARuta || 0) - (b.distARuta || 0);
  });

  const historial = JSON.parse(localStorage.getItem('museo_historial') || '[]');
  estacionesDatos.forEach(est => { est.completada = historial.includes(est.petroglifo_id); });

  // 4. Agrupar los petroglifos en las 5 estaciones recorribles (montículos)
  //    según el plano del informe AmerGraph 2023. Las rocas de las otras
  //    zonas del parque (estaciones no recorribles) se muestran atenuadas.
  const agrupado = window.MuseoEstaciones.agruparEnMonticulos(estacionesDatos);
  monticulos = agrupado.monticulos;
  rocasFueraDeEstaciones = agrupado.fuera;

  // Ordenar las estaciones según el sentido de la caminata en el sendero y
  // ordenar los petroglifos de cada una igual (por su posición en el camino).
  window.MuseoEstaciones.clasificarPorRuta(monticulos, geojsonCoords);
  monticulos.sort((a, b) => (a.posEnRuta || 0) - (b.posEnRuta || 0));
  monticulos.forEach((m, i) => {
    m.ordenRecorrido = i + 1;
    m.petroglifos.sort((a, b) => (a.posEnRuta || 0) - (b.posEnRuta || 0));
  });

  const visitados = JSON.parse(localStorage.getItem('museo_monticulos') || '[]');
  monticulos.forEach(m => { m.completada = visitados.includes(m.id); });

  // 5. Marcadores: uno grande por estación (montículo)…
  monticulos.forEach(m => {
    marcadoresMonticulos[m.id] = crearMarcadorMonticulo(m);
  });

  // …y puntos grises pequeños para las rocas fuera de las estaciones
  // recorribles (documentadas, pero el tour no llega hasta ellas).
  rocasFueraDeEstaciones.forEach(est => {
    if (!isFinite(est.latitud) || !isFinite(est.longitud)) return;
    const icono = L.divIcon({
      className: '',
      html: `<div style="width:12px;height:12px;border-radius:50%;background:#777;opacity:.5;border:2px solid rgba(0,0,0,.4);"></div>`,
      iconSize:[12,12], iconAnchor:[6,6]
    });
    const marcador = L.marker([est.latitud, est.longitud], { icon: icono })
      .addTo(mapa)
      .bindPopup(`
        <div style="min-width:170px;">
          <h4 style="margin:0 0 5px;color:#0D2049;">${est.nombre}</h4>
          <p style="margin:0 0 8px;font-size:11px;color:#a06a2c;">⚠ Zona fuera de las estaciones recorribles</p>
          <div style="display:flex;gap:5px;">
            <button onclick="escucharVoz(${est.id})" class="btn btn--primario btn--sm" style="flex:1;padding:4px;">🔊</button>
            <a href="petroglifo-detalle.html?qr=${est.petroglifo_codigo_qr}" class="btn btn--contorno btn--sm" style="flex:1;padding:4px;text-align:center;">Ficha</a>
          </div>
        </div>`, { minWidth: 180 });
    marcadores[est.id] = marcador;
  });

  renderizarEstacionesRecorrido();
  // Estación inicial seleccionada: la primera pendiente del recorrido
  const primera = monticulos.find(m => !m.completada) || monticulos[0];
  if (primera) seleccionarMonticulo(primera.id, { pan: false, scroll: false });
});

/** Crea (o re-crea) el marcador de una estación en el mapa. */
function crearMarcadorMonticulo(m) {
  if (marcadoresMonticulos[m.id]) mapa.removeLayer(marcadoresMonticulos[m.id]);

  const color = m.completada ? '#60C080' : (m.id === monticuloSeleccionadoId ? '#9BD07A' : '#35882F');
  const icono = L.divIcon({
    className: '',
    html: `<div style="width:44px;height:44px;border-radius:50%;background:${color};border:3px solid rgba(255,255,255,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.7);line-height:1;">
             <span style="font-size:15px;font-weight:800;color:white;">${m.ordenRecorrido}</span>
             <span style="font-size:8px;font-weight:600;color:rgba(255,255,255,.9);">${m.petroglifos.length} 🗿</span>
           </div>`,
    iconSize:[44,44], iconAnchor:[22,22]
  });

  const popupHtml = `
    <div style="min-width:190px;">
      <h4 style="margin:0 0 4px;color:#0D2049;">Estación ${m.ordenRecorrido} · ${m.nombre}</h4>
      <p style="margin:0 0 10px;font-size:12px;color:#555;">${m.petroglifos.length} petroglifos documentados en este montículo</p>
      <div style="display:flex;gap:5px;">
        <button onclick="escucharEstacion(${m.id})" class="btn btn--primario btn--sm" style="flex:1;padding:4px;">🔊</button>
        <button onclick="seleccionarMonticulo(${m.id}, {scroll:true})" class="btn btn--contorno btn--sm" style="flex:1;padding:4px;">Ver petroglifos</button>
      </div>
    </div>`;

  const marcador = L.marker([m.latitud, m.longitud], { icon: icono, zIndexOffset: 500 })
    .addTo(mapa)
    .bindPopup(popupHtml, { minWidth: 200 });
  marcador.on('click', () => seleccionarMonticulo(m.id, { pan: false }));
  marcadoresMonticulos[m.id] = marcador;
  return marcador;
}


// ============================================================================
// LÓGICA DE VOZ Y POPUPS
// ============================================================================
window.escucharVoz = function(idEstacion) {
  const est = estacionesDatos.find(e => e.id === idEstacion);
  if (est && est.petroglifo_texto_asistente) {
    window.Museo?.mostrarToast(`Reproduciendo audio: ${est.nombre}`, 'info');
    window.MuseoVoz.detenerVoz();
    window.MuseoVoz.narrar(est.petroglifo_texto_asistente);
  } else {
    window.Museo?.mostrarToast('No hay narración para este petroglifo.', 'aviso');
  }
};

/** Texto que narra el bot al llegar (o al pedir audio) de una estación. */
function textoNarracionEstacion(m) {
  const codigos = m.petroglifos.slice(0, 4).map(p => p.petroglifo_codigo_qr || p.nombre).join(', ');
  const resto = m.petroglifos.length > 4 ? `, entre otros` : '';
  return `Estación ${m.ordenRecorrido} del recorrido: ${m.nombre}. ` +
    `En este montículo se documentaron ${m.petroglifos.length} petroglifos, como ${codigos}${resto}. ` +
    `Revisa el panel de la página para ver cada roca y escuchar su historia.`;
}

window.escucharEstacion = function(idMonticulo) {
  const m = monticulos.find(x => x.id === idMonticulo);
  if (!m) return;
  window.Museo?.mostrarToast(`Reproduciendo audio: ${m.nombre}`, 'info');
  window.MuseoVoz.detenerVoz();
  window.MuseoVoz.narrar(textoNarracionEstacion(m));
};

/**
 * Selecciona una estación (montículo): resalta su marcador y su tarjeta, y
 * llena el apartado "Petroglifos de la estación" con sus rocas adyacentes.
 */
window.seleccionarMonticulo = function(idMonticulo, opts = {}) {
  const { pan = true, scroll = false } = opts;
  const m = monticulos.find(x => x.id === idMonticulo);
  if (!m) return;

  const anterior = monticuloSeleccionadoId;
  monticuloSeleccionadoId = m.id;

  // Refrescar solo los marcadores afectados (color de "actual")
  if (anterior && anterior !== m.id) {
    const mAnt = monticulos.find(x => x.id === anterior);
    if (mAnt) crearMarcadorMonticulo(mAnt);
  }
  crearMarcadorMonticulo(m);

  if (pan) mapa.setView([m.latitud, m.longitud], 18);

  renderizarEstacionesRecorrido();
  renderizarPanelPetroglifos(m);

  if (scroll) {
    document.getElementById('panel-monticulo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};


// ============================================================================
// GEOMETRÍA: DISTANCIA, RUMBO Y REFERENCIA ESPACIAL
// ============================================================================

// Fórmula de Haversine para distancia en metros entre dos coordenadas
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Rumbo (bearing) en grados 0-360 desde el punto 1 hacia el punto 2
function calcularRumbo(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
}

/**
 * Convierte el ángulo entre el rumbo del usuario y la dirección al petroglifo
 * en una referencia hablada: "Frente a ti", "A tu derecha", etc.
 * Si aún no conocemos el rumbo del usuario, devuelve una frase neutra.
 */
function referenciaEspacial(lat, lng, est) {
  if (rumboUsuario === null) return 'Muy cerca de ti';

  const rumboAlPunto = calcularRumbo(lat, lng, est.latitud, est.longitud);
  // Diferencia normalizada a [-180, 180]
  let dif = ((rumboAlPunto - rumboUsuario + 540) % 360) - 180;

  if (dif >= -35 && dif <= 35)   return 'Frente a ti';
  if (dif > 35 && dif < 145)     return 'A tu derecha';
  if (dif < -35 && dif > -145)   return 'A tu izquierda';
  return 'Detrás de ti';
}


// ============================================================================
// DETECCIÓN DE PROXIMIDAD (RADIO + COOLDOWN + REGISTRO DE VISITADOS)
// ============================================================================

/**
 * Radio de llegada de una estación (montículo). Cubre la distancia entre el
 * sendero y el centro del montículo, con un margen, para que la estación se
 * anuncie al pasar caminando por su punto más cercano del camino.
 */
function radioLlegadaMonticulo(m) {
  return Math.min(60, Math.max(30, (m.distARuta || 0) + 15));
}

function comprobarProximidad(lat, lng) {
  const ahora = Date.now();
  let candidata = null;
  let distCandidata = Infinity;

  for (const m of monticulos) {
    const distancia = calcularDistancia(lat, lng, m.latitud, m.longitud);
    const reg = registroParadas[m.id] || (registroParadas[m.id] = { narradaEn: 0, dentro: false });
    const radio = radioLlegadaMonticulo(m);

    if (distancia <= radio) {
      // Si dos estaciones se solapan, atendemos la MÁS CERCANA al usuario.
      if (distancia < distCandidata) {
        candidata = m;
        distCandidata = distancia;
      }
    } else if (reg.dentro && distancia > radio + 15) {
      // Histéresis de salida: hay que alejarse bastante para poder
      // re-disparar la misma estación (evita parpadeos por ruido del GPS).
      reg.dentro = false;
    }
  }

  if (candidata) {
    const reg = registroParadas[candidata.id];
    const enCooldown = (ahora - reg.narradaEn) < CONFIG_GPS.COOLDOWN_NARRACION_MS;
    if (!reg.dentro && !enCooldown) {
      reg.dentro = true;
      reg.narradaEn = ahora;
      alLlegarAEstacion(candidata, lat, lng, distCandidata);
    }
  }
}

/** Marca una estación como visitada y persiste el registro. */
function marcarMonticuloVisitado(m) {
  m.completada = true;
  const visitados = JSON.parse(localStorage.getItem('museo_monticulos') || '[]');
  if (!visitados.includes(m.id)) {
    visitados.push(m.id);
    localStorage.setItem('museo_monticulos', JSON.stringify(visitados));
  }
  crearMarcadorMonticulo(m);
}

/** Flujo completo al entrar al radio de una estación (montículo). */
function alLlegarAEstacion(m, lat, lng, distancia) {
  // 1. Vibración si el teléfono lo soporta
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  // 2. Marcar visitada, seleccionar y mostrar sus petroglifos en el panel
  marcarMonticuloVisitado(m);
  seleccionarMonticulo(m.id, { pan: true });
  marcadoresMonticulos[m.id]?.openPopup();

  // 3. Notificación + narración de la estación con referencia espacial
  window.Museo?.mostrarToast(`¡Has llegado a la Estación ${m.ordenRecorrido}: ${m.nombre}!`, 'exito');

  if (!window.MuseoVoz.estaNarrando()) {
    const referencia = referenciaEspacial(lat, lng, m);
    window.MuseoVoz.narrar(`${referencia} está la ${textoNarracionEstacion(m)}`);
  }

  // 4. En modo navegación: avanzar automáticamente a la siguiente pendiente
  if (modoNavegacion && m.id === estacionDestinoId) {
    const pendientes = monticulos.filter(x => !x.completada);
    if (pendientes.length > 0) {
      estacionDestinoId = pendientes[0].id;
    } else {
      window.Museo?.mostrarToast('¡Felicidades, has completado las 5 estaciones del recorrido!', 'exito');
    }
  }
}


// ============================================================================
// FILTROS DE GPS (PRECISIÓN Y SALTOS ERRÓNEOS)
// ============================================================================

/**
 * Valida una lectura del GPS antes de usarla.
 * Descarta lecturas imprecisas (accuracy alta) y saltos imposibles a pie.
 * @returns {boolean} true si la lectura es confiable
 */
function lecturaConfiable(pos) {
  const { accuracy, latitude, longitude } = pos.coords;

  // Filtro 1: precisión reportada por el dispositivo
  if (typeof accuracy === 'number' && accuracy > CONFIG_GPS.PRECISION_MAXIMA_M) {
    if (!avisoPrecisionMostrado) {
      avisoPrecisionMostrado = true;
      window.Museo?.mostrarToast(`Señal GPS imprecisa (±${Math.round(accuracy)} m). Buscando mejor señal…`, 'aviso');
    }
    return false;
  }

  // Filtro 2: salto imposible (teletransporte) respecto a la última lectura buena
  if (ultimaLectura) {
    const dt = (pos.timestamp - ultimaLectura.t) / 1000;
    if (dt > 0) {
      const d = calcularDistancia(ultimaLectura.lat, ultimaLectura.lng, latitude, longitude);
      if (d / dt > CONFIG_GPS.VELOCIDAD_MAXIMA_MS) return false;
    }
  }

  avisoPrecisionMostrado = false;
  ultimaLectura = { lat: latitude, lng: longitude, t: pos.timestamp };
  return true;
}


// ============================================================================
// SNAP-TO-ROUTE Y PUNTO DEL USUARIO
// ============================================================================

let prevPos = null;

// NOTA: snapToRoute() y proyectarPuntoEnSegmento() ya NO se usan para el punto
// del usuario (mostramos la posición real). Se conservan por si se quisiera
// dibujar el progreso a lo largo del sendero en el futuro.
// Matemática para pegar el GPS al sendero (Snap to route)
function proyectarPuntoEnSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return { x: ax + t * dx, y: ay + t * dy };
}

function snapToRoute(lat, lng) {
  if (!geojsonCoords || geojsonCoords.length < 2) return { lat, lng };
  let minDist = Infinity;
  let snapped = { lat, lng };

  for (let i = 0; i < geojsonCoords.length - 1; i++) {
    const a = { x: geojsonCoords[i][0], y: geojsonCoords[i][1] };
    const b = { x: geojsonCoords[i+1][0], y: geojsonCoords[i+1][1] };
    const p = { x: lng, y: lat };

    const proj = proyectarPuntoEnSegmento(p.x, p.y, a.x, a.y, b.x, b.y);
    const distSq = (proj.x - p.x)**2 + (proj.y - p.y)**2;

    if (distSq < minDist) {
      minDist = distSq;
      snapped = { lat: proj.y, lng: proj.x };
    }
  }
  return snapped;
}

// Actualizar posición del usuario en el mapa (Flecha direccional)
function actualizarPuntoUsuario(rawLat, rawLng, headingGps = null) {
  // El indicador "Tu posición" debe mostrar la ubicación REAL de la persona.
  // Antes se aplicaba snapToRoute(), que proyectaba el punto sobre la línea del
  // sendero: el punto azul quedaba pegado al trazado del recorrido y no donde
  // el usuario realmente está. Usamos las coordenadas crudas del GPS.
  const lat = rawLat, lng = rawLng;

  // Rumbo del usuario: preferimos el heading del GPS (si el dispositivo lo da
  // y se está moviendo); si no, lo derivamos del vector de movimiento.
  if (typeof headingGps === 'number' && !Number.isNaN(headingGps)) {
    rumboUsuario = headingGps;
  } else if (prevPos) {
    const dLng = lng - prevPos.lng;
    const dLat = lat - prevPos.lat;
    if (Math.abs(dLng) > 0.00001 || Math.abs(dLat) > 0.00001) {
      rumboUsuario = (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;
    }
  }
  const rotacion = rumboUsuario ?? 0;

  const svgFlecha = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotacion}deg); transition: transform 0.3s;">
      <circle cx="20" cy="20" r="16" fill="rgba(64,128,255,0.3)" />
      <circle cx="20" cy="20" r="8" fill="#4080FF" stroke="white" stroke-width="2"/>
      <polygon points="20,4 26,14 14,14" fill="#4080FF" />
    </svg>
  `;

  const iconoNavegacion = L.divIcon({
    className: '',
    html: svgFlecha,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  if (!capaUsuario) {
    capaUsuario = L.marker([lat, lng], { icon: iconoNavegacion }).addTo(mapa);
  } else {
    capaUsuario.setLatLng([lat, lng]);
    capaUsuario.setIcon(iconoNavegacion);
  }

  prevPos = { lat, lng };

  // La detección de proximidad corre SIEMPRE (con o sin modo navegación);
  // el panel inferior solo se refresca durante la navegación activa.
  comprobarProximidad(lat, lng);
  if (modoNavegacion) {
    actualizarPanelNavegacion(lat, lng);
  }

  return { lat, lng }; // Retornar coordenada corregida
}

// ============================================================================
// SCREEN WAKE LOCK (PANTALLA ENCENDIDA DURANTE EL TRAYECTO)
// ============================================================================

async function solicitarWakeLock() {
  if (!('wakeLock' in navigator)) return; // No soportado: se degrada sin romper
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    console.warn('No se pudo activar el Wake Lock:', e.message);
  }
}

function liberarWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

// El sistema libera el Wake Lock al cambiar de pestaña/bloquear; lo re-pedimos
// al volver si la navegación sigue activa.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && modoNavegacion) {
    solicitarWakeLock();
  }
});

// ============================================================================
// NAVEGACIÓN ACTIVA (ESTILO GOOGLE MAPS)
// ============================================================================

function iniciarNavegacion() {
  modoNavegacion = true;
  document.getElementById('panel-navegacion').classList.add('activo');
  document.getElementById('modal-normas').classList.remove('activo');

  // Buscar primera estación (montículo) no visitada, en orden de caminata
  const pendientes = monticulos.filter(m => !m.completada);
  if (pendientes.length > 0) {
    estacionDestinoId = pendientes[0].id;
  } else {
    window.Museo?.mostrarToast('¡Ya completaste las 5 estaciones!', 'info');
    estacionDestinoId = monticulos[0]?.id;
  }

  solicitarWakeLock();
  arrancarRastreoGps();
}

function detenerNavegacion() {
  modoNavegacion = false;
  document.getElementById('panel-navegacion').classList.remove('activo');
  if (idWatchPosition !== null) {
    navigator.geolocation.clearWatch(idWatchPosition);
    idWatchPosition = null;
  }
  if (idSimulador !== null) {
    clearInterval(idSimulador);
    idSimulador = null;
  }
  liberarWakeLock();
  window.MuseoVoz?.detenerVoz();
}

function actualizarPanelNavegacion(lat, lng) {
  if (!estacionDestinoId) return;
  const destino = monticulos.find(m => m.id === estacionDestinoId);
  if (!destino) return;

  const dist = calcularDistancia(lat, lng, destino.latitud, destino.longitud);
  const distEl = document.getElementById('nav-distancia');
  const nombreEl = document.getElementById('nav-prox-nombre');
  const direccionEl = document.getElementById('nav-direccion');

  distEl.textContent = Math.round(dist) + ' m';

  if (dist < radioLlegadaMonticulo(destino)) {
    distEl.style.color = '#80D090';
    nombreEl.textContent = '¡Has llegado!';
    if (direccionEl) direccionEl.textContent = `Estación ${destino.ordenRecorrido} · ${destino.nombre}`;
  } else {
    distEl.style.color = 'var(--color-dorado)';
    nombreEl.textContent = `Estación ${destino.ordenRecorrido} · ${destino.nombre}`;
    // Referencia espacial en vivo hacia la próxima estación
    if (direccionEl) direccionEl.textContent = referenciaEspacial(lat, lng, destino);
  }
}

document.getElementById('btn-ya-llegue').addEventListener('click', () => {
  if (!estacionDestinoId) return;

  // Marcar visitada manualmente (fallback si el GPS no disparó)
  const m = monticulos.find(x => x.id === estacionDestinoId);
  if (m) {
    marcarMonticuloVisitado(m);
    seleccionarMonticulo(m.id);
  }

  // Pasar a la siguiente estación pendiente
  const pendientes = monticulos.filter(x => !x.completada);
  if (pendientes.length > 0) {
    estacionDestinoId = pendientes[0].id;
    window.Museo?.mostrarToast(`Dirígete a la Estación ${pendientes[0].ordenRecorrido}: ${pendientes[0].nombre}`, 'info');
  } else {
    window.Museo?.mostrarToast('¡Felicidades, has completado las 5 estaciones del recorrido!', 'exito');
    detenerNavegacion();
  }
});

document.getElementById('btn-salir-nav').addEventListener('click', detenerNavegacion);

// ============================================================================
// MODAL DE NORMAS
// ============================================================================
document.getElementById('btn-iniciar-navegacion').addEventListener('click', () => {
  document.getElementById('modal-normas').classList.add('activo');
});

document.getElementById('btn-cerrar-modal').addEventListener('click', () => {
  document.getElementById('modal-normas').classList.remove('activo');
});

document.getElementById('check-normas').addEventListener('change', (e) => {
  const btn = document.getElementById('btn-aceptar-normas');
  if (e.target.checked) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
  }
});

document.getElementById('btn-aceptar-normas').addEventListener('click', iniciarNavegacion);


// ============================================================================
// RASTREO GPS EN TIEMPO REAL
// ============================================================================

function arrancarRastreoGps() {
  if (idSimulador) { clearInterval(idSimulador); idSimulador = null; }
  if (idWatchPosition) { navigator.geolocation.clearWatch(idWatchPosition); idWatchPosition = null; }

  if (!navigator.geolocation) {
    window.Museo?.mostrarToast('GPS no disponible en tu navegador', 'aviso');
    return;
  }

  window.Museo?.mostrarToast('Buscando señal GPS y activando rastreo...', 'info');
  idWatchPosition = navigator.geolocation.watchPosition(
    pos => {
      // Filtro de precisión y saltos antes de mover nada en pantalla
      if (!lecturaConfiable(pos)) return;

      const { latitude: rawLat, longitude: rawLng, heading } = pos.coords;
      const { lat, lng } = actualizarPuntoUsuario(rawLat, rawLng, heading);
      mapa.setView([lat, lng], 18);
    },
    err => {
      console.warn('Error GPS:', err);
      window.Museo?.mostrarToast('Asegúrate de darle permisos de ubicación al navegador.', 'aviso');
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

// Botón: Mi Ubicación Real (GPS)
document.getElementById('btn-mi-pos-mapa').addEventListener('click', arrancarRastreoGps);

// Botón: Simulador (Dev)
document.getElementById('btn-simular-gps').addEventListener('click', () => {
  if (geojsonCoords.length === 0) {
    window.Museo?.mostrarToast('El GeoJSON aún no carga o no tiene coordenadas válidas.', 'aviso');
    return;
  }

  if (idSimulador) {
    clearInterval(idSimulador);
    idSimulador = null;
    window.Museo?.mostrarToast('Simulador detenido', 'info');
    return;
  }

  // Detener el rastreo GPS real: si sigue activo, cada lectura devuelve el
  // marcador a la ubicación real y produce "tirones" contra el simulador.
  if (idWatchPosition !== null) {
    navigator.geolocation.clearWatch(idWatchPosition);
    idWatchPosition = null;
  }

  window.Museo?.mostrarToast('Simulador iniciado. Recorriendo la ruta...', 'exito');
  indiceSimulador = 0;

  // Recorrer TODOS los puntos del track (aplanado) sin saltarse las paradas.
  idSimulador = setInterval(() => {
    if (indiceSimulador >= geojsonCoords.length) {
      clearInterval(idSimulador);
      idSimulador = null;
      window.Museo?.mostrarToast('Simulador finalizado. Llegaste al final.', 'exito');
      return;
    }

    // GeoJSON es [lng, lat]
    const rawLng = geojsonCoords[indiceSimulador][0];
    const rawLat = geojsonCoords[indiceSimulador][1];

    // Al simulador le pasamos algo "ligeramente desviado" para probar el Snap-to-Route
    const jitterLat = rawLat + (Math.random() - 0.5) * 0.0002;
    const jitterLng = rawLng + (Math.random() - 0.5) * 0.0002;

    const { lat, lng } = actualizarPuntoUsuario(jitterLat, jitterLng);

    // Mantener la cámara centrada suavemente en el usuario simulado
    mapa.panTo([lat, lng]);

    indiceSimulador += 1;
  }, 600); // Punto a punto para no saltarse el radio de ninguna parada
});


// ============================================================================
// SOPORTE OFFLINE Y GRID
// ============================================================================

function descargarOffline() {
  window.Museo?.mostrarToast('💾 Descargando tiles de mapa... (Modo PWA)', 'info');
  // Aquí llamaremos al Service Worker a través de postMessage para precachear el Bounding Box de la ruta
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      action: 'precache-mapa',
      bounds: capaRuta ? capaRuta.getBounds() : null
    });
  }

  setTimeout(() => {
    document.getElementById('offline-status').innerHTML = `
      <span style="font-size:1.3rem;">✅</span>
      <div>
        <div style="font-size:.85rem;font-weight:600;color:#80D090;">Mapa descargado</div>
        <div style="font-size:.78rem;color:var(--color-texto-2);">Puedes usar el recorrido sin internet.</div>
      </div>
    `;
    window.Museo?.mostrarToast('✅ Mapa guardado para uso offline', 'exito');
  }, 2000);
}

document.getElementById('btn-offline-mapa')?.addEventListener('click', descargarOffline);
document.getElementById('btn-descargar-mapa-2').addEventListener('click', descargarOffline);

/** Tarjeta de una estación (montículo) en la fila de estaciones. */
function tarjetaMonticulo(m) {
  const activa = m.id === monticuloSeleccionadoId;
  return `
    <button onclick="seleccionarMonticulo(${m.id})"
      style="background:var(--grad-card);border:1px solid ${activa ? 'rgba(140,115,85,.55)' : (m.completada ? 'rgba(60,160,80,.3)' : 'var(--glass-border)')};border-radius:.75rem;padding:.85rem;text-align:left;cursor:pointer;transition:all .2s;width:100%;font-family:inherit;${activa ? 'box-shadow:0 0 0 1px rgba(140,115,85,.4);' : ''}"
      onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''"
      id="monticulo-btn-${m.id}">
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.25rem;">
        <div style="width:28px;height:28px;border-radius:50%;background:${m.completada?'rgba(60,160,80,.3)':'rgba(122, 186, 88,.15)'};border:1px solid ${m.completada?'rgba(60,160,80,.5)':'rgba(122, 186, 88,.3)'};display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:${m.completada?'#80D090':'var(--color-dorado-claro)'};flex-shrink:0;">${m.completada?'✓':m.ordenRecorrido}</div>
        <span style="font-size:.9rem;font-weight:600;color:var(--color-texto);">${m.nombre}</span>
      </div>
      <div style="font-size:.74rem;color:var(--color-texto-3);">🗿 ${m.petroglifos.length} petroglifos · ${m.completada?'✅ Visitada':'⏳ Pendiente'}</div>
    </button>
  `;
}

/** Fila con las 5 estaciones recorribles. */
function renderizarEstacionesRecorrido() {
  const grid = document.getElementById('grid-estaciones-mapa');
  if (!grid) return;
  grid.innerHTML = monticulos.map(m => tarjetaMonticulo(m)).join('');
  actualizarProgresoMapa();
}

/** Tarjeta de un petroglifo dentro del panel de la estación seleccionada. */
function tarjetaPetroglifo(est, resaltado = false) {
  const img = est.petroglifo_imagen_url
    ? `<img src="${est.petroglifo_imagen_url}" alt="${est.nombre}" loading="lazy" style="width:100%;height:110px;object-fit:cover;border-radius:.5rem;margin-bottom:.6rem;" onerror="this.style.display='none'">`
    : '';
  return `
    <div id="petro-card-${est.id}" style="background:var(--grad-card);border:1px solid ${resaltado ? 'var(--color-dorado)' : 'var(--glass-border)'};border-radius:.75rem;padding:.85rem;">
      ${img}
      <div style="font-size:.85rem;font-weight:600;color:var(--color-texto);margin-bottom:.2rem;">${est.nombre}</div>
      <div style="font-size:.72rem;color:var(--color-texto-3);margin-bottom:.6rem;">${est.petroglifo_categoria || 'Petroglifo'}${est.completada ? ' · ✅ Escuchado' : ''}</div>
      <div style="display:flex;gap:.4rem;">
        <button onclick="escucharVoz(${est.id})" class="btn btn--primario btn--sm" style="flex:1;padding:.35rem;justify-content:center;">🔊 Escuchar</button>
        <a href="petroglifo-detalle.html?qr=${est.petroglifo_codigo_qr}" class="btn btn--contorno btn--sm" style="flex:1;padding:.35rem;justify-content:center;">Ficha</a>
      </div>
    </div>
  `;
}

/** Apartado "Petroglifos de la estación": rocas adyacentes al montículo. */
function renderizarPanelPetroglifos(m, idResaltado = null) {
  const panel = document.getElementById('panel-monticulo');
  const titulo = document.getElementById('panel-monticulo-titulo');
  const nota = document.getElementById('panel-monticulo-nota');
  const grid = document.getElementById('grid-petroglifos-monticulo');
  if (!panel || !grid) return;

  panel.style.display = '';
  if (titulo) titulo.textContent = `Estación ${m.ordenRecorrido} · ${m.nombre}`;
  if (nota) nota.textContent = `${m.petroglifos.length} petroglifos documentados en esta zona del recorrido. Toca "Escuchar" para que el asistente narre cada roca.`;

  grid.innerHTML = m.petroglifos.length
    ? m.petroglifos.map(p => tarjetaPetroglifo(p, p.id === idResaltado)).join('')
    : `<div style="grid-column:1/-1;text-align:center;padding:1.5rem;color:var(--color-texto-3);">No hay petroglifos registrados en esta estación.</div>`;

  if (idResaltado) {
    document.getElementById(`petro-card-${idResaltado}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Buscador: localiza un petroglifo por código QR o nombre, selecciona su
// estación y resalta su tarjeta. Si la roca está fuera de las estaciones
// recorribles, la muestra en el mapa con su punto gris.
document.getElementById('buscar-estacion')?.addEventListener('input', e => {
  const term = e.target.value.toLowerCase().trim();
  if (term.length < 3) return;

  const est = estacionesDatos.find(x =>
    (x.petroglifo_codigo_qr || '').toLowerCase() === term ||
    (x.nombre || '').toLowerCase().includes(term)
  );
  if (!est) return;

  if (est.monticulo_id) {
    seleccionarMonticulo(est.monticulo_id, { pan: true });
    const m = monticulos.find(x => x.id === est.monticulo_id);
    if (m) renderizarPanelPetroglifos(m, est.id);
  } else if (isFinite(est.latitud)) {
    mapa.setView([est.latitud, est.longitud], 18);
    marcadores[est.id]?.openPopup();
    window.Museo?.mostrarToast(`${est.nombre} está fuera de las estaciones recorribles del tour.`, 'info');
  }
});

/** Barra "Visitadas X/5" de las estaciones del recorrido. */
function actualizarProgresoMapa() {
  const barra = document.getElementById('barra-progreso-mapa');
  const texto = document.getElementById('texto-progreso-mapa');
  if (!barra || !texto) return;
  const total = monticulos.length;
  const completas = monticulos.filter(m => m.completada).length;
  barra.style.width = (total ? Math.round(completas / total * 100) : 0) + '%';
  texto.textContent = `${completas}/${total}`;
}


// ============================================================================
// ESCÁNER QR INTEGRADO (antes vivía en recorrido.html)
// ============================================================================

let qrFrameId = null;
let qrStream = null;

function abrirEscanerQR() {
  document.getElementById('modal-qr').classList.add('activo');
}

function cerrarEscanerQR() {
  detenerCamaraQR();
  document.getElementById('modal-qr').classList.remove('activo');
}

function detenerCamaraQR() {
  if (qrFrameId) { cancelAnimationFrame(qrFrameId); clearTimeout(qrFrameId); qrFrameId = null; }
  if (qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
    qrStream = null;
  }
  const video = document.getElementById('qr-video');
  if (video) { video.srcObject = null; video.style.display = 'none'; }
  const ph = document.getElementById('qr-placeholder');
  if (ph) ph.style.display = '';
  const linea = document.getElementById('qr-linea');
  if (linea) linea.style.display = 'none';
}

/** Busca la estación cuyo código QR coincide con el contenido escaneado.
 *  Acepta el código pelado ("S9R81") o una URL que lo contenga. Se extrae el
 *  código con regex para evitar falsos positivos (S9R1 dentro de S9R11). */
function estacionPorCodigoQR(contenido) {
  const texto = String(contenido || '').trim();
  const exacta = estacionesDatos.find(e => e.petroglifo_codigo_qr === texto);
  if (exacta) return exacta;
  const m = texto.match(/S\d+R\d+/i);
  if (!m) return null;
  const codigo = m[0].toUpperCase();
  return estacionesDatos.find(e => (e.petroglifo_codigo_qr || '').toUpperCase() === codigo) || null;
}

/** Flujo al escanear el QR de un petroglifo: estar frente a la roca implica
 *  estar en su estación, así que se marca la estación como visitada, se
 *  muestran sus petroglifos adyacentes y se narra la roca escaneada. */
function procesarEscaneoQR(est) {
  cerrarEscanerQR();
  window.Museo?.mostrarToast(`QR escaneado: ${est.nombre}`, 'exito');

  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  // Registrar la roca como escuchada
  est.completada = true;
  if (est.petroglifo_id) {
    const historial = JSON.parse(localStorage.getItem('museo_historial') || '[]');
    if (!historial.includes(est.petroglifo_id)) {
      historial.push(est.petroglifo_id);
      localStorage.setItem('museo_historial', JSON.stringify(historial));
    }
  }

  // Seleccionar su estación, marcarla visitada y resaltar la tarjeta
  if (est.monticulo_id) {
    const m = monticulos.find(x => x.id === est.monticulo_id);
    if (m) {
      marcarMonticuloVisitado(m);
      seleccionarMonticulo(m.id, { pan: true, scroll: true });
      renderizarPanelPetroglifos(m, est.id);

      // Si era el destino de la navegación, avanzar a la siguiente
      if (modoNavegacion && m.id === estacionDestinoId) {
        const pendientes = monticulos.filter(x => !x.completada);
        if (pendientes.length > 0) estacionDestinoId = pendientes[0].id;
      }
    }
  } else if (isFinite(est.latitud)) {
    mapa.setView([est.latitud, est.longitud], 18);
    marcadores[est.id]?.openPopup();
  }

  // Narrar la roca escaneada
  if (est.petroglifo_texto_asistente) {
    window.MuseoVoz?.detenerVoz();
    window.MuseoVoz?.narrar(est.petroglifo_texto_asistente);
  }
}

document.getElementById('btn-abrir-qr')?.addEventListener('click', abrirEscanerQR);
document.getElementById('btn-cerrar-qr')?.addEventListener('click', cerrarEscanerQR);
document.getElementById('modal-qr')?.addEventListener('click', e => {
  if (e.target.id === 'modal-qr') cerrarEscanerQR();
});

document.getElementById('btn-activar-camara')?.addEventListener('click', async () => {
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('qr-video');
    const canvas = document.getElementById('qr-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    video.srcObject = qrStream;
    video.setAttribute('playsinline', true);
    video.play();

    video.style.display = '';
    document.getElementById('qr-placeholder').style.display = 'none';
    document.getElementById('qr-linea').style.display = '';
    window.Museo?.mostrarToast('Cámara activa — apunta al código QR del petroglifo', 'info');

    const escanearFrame = () => {
      if (!qrStream) return; // cámara detenida
      if (video.readyState === video.HAVE_ENOUGH_DATA && window.jsQR) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const codigo = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

        if (codigo && codigo.data) {
          const est = estacionPorCodigoQR(codigo.data);
          if (est) {
            procesarEscaneoQR(est);
            return;
          }
          window.Museo?.mostrarToast('Código QR no reconocido como petroglifo del museo.', 'aviso');
          qrFrameId = setTimeout(() => { qrFrameId = requestAnimationFrame(escanearFrame); }, 2000);
          return;
        }
      }
      qrFrameId = requestAnimationFrame(escanearFrame);
    };

    qrFrameId = requestAnimationFrame(escanearFrame);
  } catch (e) {
    window.Museo?.mostrarToast('No se pudo acceder a la cámara. Verifica los permisos.', 'aviso');
  }
});

// Demo sin cámara: escanea la primera roca pendiente de la próxima estación
document.getElementById('btn-simular-qr')?.addEventListener('click', () => {
  const monticuloPendiente = monticulos.find(m => !m.completada) || monticulos[0];
  const roca = monticuloPendiente?.petroglifos.find(p => !p.completada) || monticuloPendiente?.petroglifos[0];
  if (!roca) {
    window.Museo?.mostrarToast('No hay petroglifos para simular el escaneo.', 'info');
    return;
  }
  procesarEscaneoQR(roca);
});
