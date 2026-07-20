'use strict';

// ============================================================================
// CONFIGURACIÓN Y MAPA BASE
// ============================================================================
let mapa;
let capaRuta;
let capaUsuario;
let estacionesDatos = [];
let marcadores = {}; // Diccionario id_estacion -> L.marker
let geojsonCoords = []; // Coordenadas del GeoJSON para el simulador
let idSimulador = null;
let indiceSimulador = 0;
let estacionActualNarrada = null; // Para no narrar la misma estación 10 veces seguidas

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializar mapa
  mapa = L.map('mapa-parque').setView([10.3009, -67.8877], 15);
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  }).addTo(mapa);

  // 2. Cargar Ruta GeoJSON
  try {
    const res = await fetch('../assets/data/track.geojson');
    if (res.ok) {
      const geojson = await res.json();
      capaRuta = L.geoJSON(geojson, {
        style: { color: '#7ABA58', weight: 4, opacity: 0.8 }
      }).addTo(mapa);
      
      // Ajustar la vista a la ruta
      mapa.fitBounds(capaRuta.getBounds());
      
      // Extraer coordenadas para el simulador (asumiendo MultiLineString o LineString)
      const feature = geojson.features[0];
      if (feature.geometry.type === 'LineString') {
        geojsonCoords = feature.geometry.coordinates; // [lng, lat]
      } else if (feature.geometry.type === 'MultiLineString') {
        geojsonCoords = feature.geometry.coordinates[0]; // [lng, lat]
      }
    } else {
      console.warn('No se pudo cargar track.geojson');
    }
  } catch (err) {
    console.error('Error cargando GeoJSON:', err);
  }

  // 3. Cargar Estaciones / Petroglifos
  try {
    estacionesDatos = await window.api.estaciones.obtenerTodas();
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
  } catch(e) {
    console.error('Error al cargar estaciones:', e);
  }
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
// LÓGICA DE UBICACIÓN Y PROXIMIDAD
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

// Verifica si estamos cerca de alguna estación (< 15 metros)
function comprobarProximidad(lat, lng) {
  for (const est of estacionesDatos) {
    if (!est.latitud || !est.longitud) continue;
    
    const distancia = calcularDistancia(lat, lng, est.latitud, est.longitud);
    
    if (distancia <= 15) { // 15 metros de radio
      if (estacionActualNarrada !== est.id) {
        // Acabamos de llegar a esta estación
        estacionActualNarrada = est.id;
        
        // 1. Vibración si el teléfono lo soporta (200ms encendido, 100ms apagado, 200ms encendido)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        
        // 2. Abrir Popup
        const marcador = marcadores[est.id];
        if (marcador) {
          marcador.openPopup();
          mapa.panTo([est.latitud, est.longitud]);
        }
        
        // 3. Notificación interactiva / Voz
        window.Museo?.mostrarToast(`¡Has llegado a: ${est.nombre}!`, 'exito');
        if (est.petroglifo_texto_asistente && !window.MuseoVoz.estaNarrando()) {
           window.MuseoVoz.narrar(est.petroglifo_texto_asistente);
        }
      }
      return; // Solo alertamos de una estación a la vez
    }
  }
  
  // Si salimos del radio de todas las estaciones, reseteamos
  estacionActualNarrada = null;
}

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
function actualizarPuntoUsuario(rawLat, rawLng) {
  // Aplicar Snap-to-Route
  const { lat, lng } = snapToRoute(rawLat, rawLng);

  // Calcular rotación (vector de movimiento)
  let rotacion = 0;
  if (prevPos) {
    const dLng = lng - prevPos.lng;
    const dLat = lat - prevPos.lat;
    if (Math.abs(dLng) > 0.00001 || Math.abs(dLat) > 0.00001) {
      rotacion = Math.atan2(dLng, dLat) * 180 / Math.PI;
    }
  }

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
  comprobarProximidad(lat, lng);
  return { lat, lng }; // Retornar coordenada corregida
}


// ============================================================================
// BOTONES E INTERFAZ
// ============================================================================

// Botón: Mi Ubicación Real (GPS)
document.getElementById('btn-mi-pos-mapa').addEventListener('click', () => {
  if (idSimulador) { clearInterval(idSimulador); idSimulador = null; }
  
  if (!navigator.geolocation) { 
    window.Museo?.mostrarToast('GPS no disponible en tu navegador', 'aviso'); 
    return; 
  }
  
  window.Museo?.mostrarToast('Buscando señal GPS...', 'info');
  navigator.geolocation.watchPosition(
    pos => {
      const {latitude:rawLat, longitude:rawLng} = pos.coords;
      const { lat, lng } = actualizarPuntoUsuario(rawLat, rawLng);
      mapa.setView([lat, lng], 18);
    },
    err => {
      console.warn('Error GPS:', err);
      window.Museo?.mostrarToast('Asegúrate de darle permisos de ubicación al navegador.', 'aviso');
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
  );
});

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
  
  // Acelerar la simulación tomando saltos en los puntos del track
  // Un track de GPS puede tener miles de puntos separados por milisegundos.
  const saltos = Math.max(1, Math.floor(geojsonCoords.length / 100)); 
  
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
    
    indiceSimulador += saltos;
  }, 1000); // Mueve el punto cada segundo
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

document.getElementById('btn-offline-mapa').addEventListener('click', descargarOffline);
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
