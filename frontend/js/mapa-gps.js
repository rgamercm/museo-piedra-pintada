'use strict';

// ============================================================================
// CONFIGURACIÓN DEL RECORRIDO GUIADO
// ============================================================================
const CONFIG_GPS = {
  RADIO_ACTIVACION_M: 10,      // Radio (metros) para considerar que llegaste a una parada
  RADIO_SALIDA_M: 18,          // Hay que alejarse más de esto para poder re-disparar la misma parada
  PRECISION_MAXIMA_M: 30,      // Lecturas GPS con precisión peor que esto se descartan
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
let estacionesDatos = [];
let marcadores = {}; // Diccionario id_estacion -> L.marker
let geojsonCoords = []; // Coordenadas [lng, lat] de TODA la ruta (tramos aplanados)
let idSimulador = null;
let indiceSimulador = 0;

// --- ESTADO DE NAVEGACIÓN ---
let modoNavegacion = false;
let estacionDestinoId = null;
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

  // 3. Cargar Estaciones. Prioridad: API (BD real). Si la API no responde o
  //    viene vacía, se construyen localmente desde las paradas del track,
  //    vinculando cada una con su ficha técnica (mock-data) por ID.
  try {
    estacionesDatos = await window.api.estaciones.obtenerTodas();
  } catch (e) {
    estacionesDatos = [];
  }
  if (!Array.isArray(estacionesDatos) || estacionesDatos.length === 0) {
    estacionesDatos = window.MuseoEstaciones.construirEstaciones(paradasTrack);
  }

  estacionesDatos.sort((a, b) => a.orden - b.orden);

  const historial = JSON.parse(localStorage.getItem('museo_historial') || '[]');

  estacionesDatos.forEach(est => {
    est.completada = historial.includes(est.petroglifo_id);
    if (!est.latitud || !est.longitud) return;

    let color = '#35882F'; // Verde por defecto (Pendiente)
    if (est.completada) color = '#60C080';
    if (est.tipo_marcador === 'parada') color = '#e6a23c'; // Naranja
    if (est.tipo_marcador === 'continuar') color = '#409eff'; // Azul

    const char = est.tipo_marcador === 'parada' ? 'P' : (est.tipo_marcador === 'continuar' ? '→' : (est.orden || est.id));

    const icono = L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2px solid rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;box-shadow:0 2px 8px rgba(0,0,0,.6);">${char}</div>`,
      iconSize:[30,30], iconAnchor:[15,15]
    });

    // HTML del Popup interactivo
    const imgHtml = est.petroglifo_imagen_url
      ? `<img src="${est.petroglifo_imagen_url}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">`
      : '';

    const popupHtml = `
      <div style="min-width:180px;">
        ${imgHtml}
        <h4 style="margin:0 0 5px;color:#0D2049;">${est.nombre}</h4>
        <p style="margin:0 0 10px;font-size:12px;color:#555;">${est.petroglifo_categoria || 'Petroglifo'}</p>
        <div style="display:flex;gap:5px;">
           <button onclick="escucharVoz(${est.id})" class="btn btn--primario btn--sm" style="flex:1;padding:4px;"><span style="font-size:16px;">🔊</span></button>
           <a href="petroglifo-detalle.html?qr=${est.petroglifo_codigo_qr}" class="btn btn--contorno btn--sm" style="flex:1;padding:4px;text-align:center;">Ficha</a>
        </div>
      </div>
    `;

    const marcador = L.marker([est.latitud, est.longitud], { icon: icono })
      .addTo(mapa)
      .bindPopup(popupHtml, { minWidth: 200 });

    marcadores[est.id] = marcador;
  });

  renderizarGridEstaciones(estacionesDatos);
});


// ============================================================================
// LÓGICA DE VOZ Y POPUPS
// ============================================================================
window.escucharVoz = function(idEstacion) {
  const est = estacionesDatos.find(e => e.id === idEstacion);
  if (est && est.petroglifo_texto_asistente) {
    window.Museo?.mostrarToast(`Reproduciendo audio: ${est.nombre}`, 'info');
    window.MuseoVoz.narrar(est.petroglifo_texto_asistente);
  } else {
    window.Museo?.mostrarToast('No hay narración para esta estación.', 'aviso');
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

function comprobarProximidad(lat, lng) {
  const ahora = Date.now();
  let candidata = null;
  let distCandidata = Infinity;

  for (const est of estacionesDatos) {
    if (!est.latitud || !est.longitud) continue;

    const distancia = calcularDistancia(lat, lng, est.latitud, est.longitud);
    const reg = registroParadas[est.id] || (registroParadas[est.id] = { narradaEn: 0, dentro: false });

    if (distancia <= CONFIG_GPS.RADIO_ACTIVACION_M) {
      // Puede haber paradas con radios solapados (a metros una de otra):
      // atendemos siempre la MÁS CERCANA al usuario.
      if (distancia < distCandidata) {
        candidata = est;
        distCandidata = distancia;
      }
    } else if (reg.dentro && distancia > CONFIG_GPS.RADIO_SALIDA_M) {
      // Para "salir" de una parada hay que alejarse más allá del radio de
      // salida (evita parpadeos dentro/fuera por el ruido del GPS).
      reg.dentro = false;
    }
  }

  if (candidata) {
    // Histéresis + cooldown: solo se dispara al ENTRAR al radio, y no se
    // repite aunque el usuario se quede parado frente al petroglifo.
    const reg = registroParadas[candidata.id];
    const enCooldown = (ahora - reg.narradaEn) < CONFIG_GPS.COOLDOWN_NARRACION_MS;
    if (!reg.dentro && !enCooldown) {
      reg.dentro = true;
      reg.narradaEn = ahora;
      alLlegarAParada(candidata, lat, lng, distCandidata);
    }
  }
}

/** Flujo completo al entrar al radio de una parada. */
function alLlegarAParada(est, lat, lng, distancia) {
  // 1. Vibración si el teléfono lo soporta
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  // 2. Abrir su tarjeta (popup) en el mapa
  const marcador = marcadores[est.id];
  if (marcador) {
    marcador.openPopup();
    mapa.panTo([est.latitud, est.longitud]);
  }

  // 3. Marcar como visitada (registro persistente) y refrescar la UI
  est.completada = true;
  if (est.petroglifo_id) {
    const historial = JSON.parse(localStorage.getItem('museo_historial') || '[]');
    if (!historial.includes(est.petroglifo_id)) {
      historial.push(est.petroglifo_id);
      localStorage.setItem('museo_historial', JSON.stringify(historial));
    }
  }
  renderizarGridEstaciones(estacionesDatos);

  // 4. Notificación + narración con referencia espacial
  window.Museo?.mostrarToast(`¡Has llegado a: ${est.nombre}!`, 'exito');

  if (est.petroglifo_texto_asistente && !window.MuseoVoz.estaNarrando()) {
    const referencia = referenciaEspacial(lat, lng, est);
    const metros = Math.max(1, Math.round(distancia));
    const texto = `${referencia} se encuentra ${est.nombre}, a unos ${metros} metros. ${est.petroglifo_texto_asistente}`;
    window.MuseoVoz.narrar(texto);
  }

  // 5. En modo navegación: avanzar automáticamente a la siguiente pendiente
  if (modoNavegacion && est.id === estacionDestinoId) {
    const pendientes = estacionesDatos.filter(e => !e.completada);
    if (pendientes.length > 0) {
      estacionDestinoId = pendientes[0].id;
    } else {
      window.Museo?.mostrarToast('¡Felicidades, has completado todo el recorrido!', 'exito');
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
  // Aplicar Snap-to-Route
  const { lat, lng } = snapToRoute(rawLat, rawLng);

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

  // Buscar primera estación no completada
  const pendientes = estacionesDatos.filter(e => !e.completada);
  if (pendientes.length > 0) {
    estacionDestinoId = pendientes[0].id;
  } else {
    window.Museo?.mostrarToast('¡Ya completaste todas las estaciones!', 'info');
    estacionDestinoId = estacionesDatos[0]?.id; // Guiar al inicio si terminó
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
  const destino = estacionesDatos.find(e => e.id === estacionDestinoId);
  if (!destino) return;

  const dist = calcularDistancia(lat, lng, destino.latitud, destino.longitud);
  const distEl = document.getElementById('nav-distancia');
  const nombreEl = document.getElementById('nav-prox-nombre');
  const direccionEl = document.getElementById('nav-direccion');

  distEl.textContent = Math.round(dist) + ' m';

  if (dist < CONFIG_GPS.RADIO_ACTIVACION_M) {
    distEl.style.color = '#80D090';
    nombreEl.textContent = '¡Has llegado!';
    if (direccionEl) direccionEl.textContent = destino.nombre;
  } else {
    distEl.style.color = 'var(--color-dorado)';
    nombreEl.textContent = destino.nombre;
    // Referencia espacial en vivo hacia la próxima parada
    if (direccionEl) direccionEl.textContent = referenciaEspacial(lat, lng, destino);
  }
}

document.getElementById('btn-ya-llegue').addEventListener('click', () => {
  if (!estacionDestinoId) return;

  // Marcar como completada en UI (fallback manual si el GPS no disparó)
  const est = estacionesDatos.find(e => e.id === estacionDestinoId);
  if (est) est.completada = true;

  // Guardar en localStorage
  const historial = JSON.parse(localStorage.getItem('museo_historial') || '[]');
  if (est?.petroglifo_id && !historial.includes(est.petroglifo_id)) {
    historial.push(est.petroglifo_id);
    localStorage.setItem('museo_historial', JSON.stringify(historial));
  }

  renderizarGridEstaciones(estacionesDatos);

  // Pasar a la siguiente
  const pendientes = estacionesDatos.filter(e => !e.completada);
  if (pendientes.length > 0) {
    estacionDestinoId = pendientes[0].id;
    window.Museo?.mostrarToast(`Dirígete a: ${pendientes[0].nombre}`, 'info');
  } else {
    window.Museo?.mostrarToast('¡Felicidades, has completado todo el recorrido!', 'exito');
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

function renderizarGridEstaciones(estaciones) {
  const grid = document.getElementById('grid-estaciones-mapa');
  grid.innerHTML = estaciones.map(est => `
    <button onclick="mapa.setView([${est.latitud || 10.3009},${est.longitud || -67.8877}],18); if(marcadores[${est.id}]) marcadores[${est.id}].openPopup();"
      style="background:var(--grad-card);border:1px solid ${est.completada?'rgba(60,160,80,.3)':'var(--glass-border)'};border-radius:.75rem;padding:.85rem;text-align:left;cursor:pointer;transition:all .2s;width:100%;font-family:inherit;"
      onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''"
      id="est-mapa-btn-${est.id}">
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.25rem;">
        <div style="width:24px;height:24px;border-radius:50%;background:${est.completada?'rgba(60,160,80,.3)':'rgba(122, 186, 88,.15)'};border:1px solid ${est.completada?'rgba(60,160,80,.5)':'rgba(122, 186, 88,.3)'};display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:${est.completada?'#80D090':'var(--color-dorado-claro)'};flex-shrink:0;">${est.completada?'✓':(est.orden || est.id)}</div>
        <span style="font-size:.85rem;font-weight:600;color:var(--color-texto);">${est.nombre}</span>
      </div>
      <div style="font-size:.72rem;color:var(--color-texto-3);">${est.completada?'✅ Visitada':'⏳ Pendiente'}</div>
    </button>
  `).join('');
}
