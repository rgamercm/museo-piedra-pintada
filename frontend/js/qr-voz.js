/**
 * MUSEO ARQUEOLÓGICO PIEDRA PINTADA
 * qr-voz.js — Generación de códigos QR reales + asistente de voz (español).
 *
 * QR: usa la librería qrcode.js (cargada por CDN). Genera un QR escaneable
 *     que codifica una URL del tipo:
 *       https://<dominio>/pages/petroglifo-detalle.html?qr=S9R1
 *     Al escanearlo con cualquier cámara, se abre la ficha del petroglifo.
 *
 * Voz: Web Speech API (speechSynthesis) en español. Narra el texto_asistente.
 */
'use strict';

/*  QR  */

/**
 * Construye la URL pública que codifica el QR de un petroglifo.
 * @param {string} codigoQr  p. ej. "S9R1"
 * @returns {string} URL absoluta
 */
function urlDeQr(codigoQr) {
  const origen = window.location.origin;
  return `${origen}/pages/petroglifo-detalle.html?qr=${encodeURIComponent(codigoQr)}`;
}

/**
 * Dibuja un QR escaneable dentro de un contenedor.
 * @param {HTMLElement|string} destino  elemento o su id
 * @param {string} codigoQr
 * @param {number} tamano  px (por defecto 220)
 */
function generarQR(destino, codigoQr, tamano = 220) {
  const el = typeof destino === 'string' ? document.getElementById(destino) : destino;
  if (!el) return;
  el.innerHTML = '';

  if (typeof window.QRCode === 'undefined') {
    el.innerHTML = '<p style="color:#a33;font-size:.8rem;">No se pudo cargar el generador de QR.</p>';
    return;
  }

  // eslint-disable-next-line no-new
  new window.QRCode(el, {
    text: urlDeQr(codigoQr),
    width: tamano,
    height: tamano,
    colorDark: '#0D2049',
    colorLight: '#ffffff',
    correctLevel: window.QRCode.CorrectLevel.H,
  });
}

/**
 * Abre una ventana lista para imprimir con el QR + el código, para pegar
 * en la piedra física.
 * @param {string} codigoQr
 * @param {string} nombre
 */
function imprimirQR(codigoQr, nombre) {
  const url = urlDeQr(codigoQr);
  const w = window.open('', '_blank', 'width=420,height=560');
  if (!w) { window.Museo?.mostrarToast('Permite las ventanas emergentes para imprimir.', 'aviso'); return; }
  w.document.write(`
    <html><head><title>QR ${codigoQr}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
    <style>
      body{font-family:Georgia,serif;text-align:center;padding:24px;color:#0D2049;}
      h1{font-size:20px;margin:0 0 4px;} p{margin:4px 0;color:#555;font-size:13px;}
      #qr{display:flex;justify-content:center;margin:18px 0;}
      .codigo{font-size:26px;font-weight:bold;letter-spacing:2px;margin-top:8px;}
      button{margin-top:16px;padding:8px 18px;font-size:14px;cursor:pointer;}
      @media print{button{display:none;}}
    </style></head><body>
      <h1>Museo Piedra Pintada</h1>
      <p>${nombre || ''}</p>
      <div id="qr"></div>
      <div class="codigo">${codigoQr}</div>
      <p>Escanea para escuchar la historia</p>
      <button onclick="window.print()">Imprimir</button>
      <script>
        new QRCode(document.getElementById('qr'), {
          text: ${JSON.stringify(url)}, width: 240, height: 240,
          colorDark:'#0D2049', colorLight:'#ffffff', correctLevel: QRCode.CorrectLevel.H
        });
      <\/script>
    </body></html>`);
  w.document.close();
}

/*  Voz  */

let _vozActual = null;

/** Devuelve una voz en español si existe. */
function _vozEspanol() {
  const voces = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  return voces.find(v => v.lang && v.lang.toLowerCase().startsWith('es')) || null;
}

/**
 * Narra un texto en español. Devuelve true si arrancó.
 * @param {string} texto
 * @param {{onStart?:Function,onEnd?:Function}} cb
 */
function narrar(texto, cb = {}) {
  if (!('speechSynthesis' in window)) {
    window.Museo?.mostrarToast('La síntesis de voz no está disponible en este navegador.', 'aviso');
    return false;
  }
  if (!texto || !texto.trim()) return false;

  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(texto);
  utt.lang = 'es-ES';
  utt.rate = 0.95;
  utt.pitch = 1;
  const voz = _vozEspanol();
  if (voz) utt.voice = voz;

  utt.onstart = () => cb.onStart && cb.onStart();
  utt.onend = () => { _vozActual = null; cb.onEnd && cb.onEnd(); };
  utt.onerror = () => { _vozActual = null; cb.onEnd && cb.onEnd(); };

  _vozActual = utt;
  window.speechSynthesis.speak(utt);
  return true;
}

/** ¿Está narrando ahora mismo? */
function estaNarrando() {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking;
}

/** Detiene la narración. */
function detenerVoz() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  _vozActual = null;
}

// Precargar la lista de voces (algunos navegadores la cargan async)
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
  window.speechSynthesis.getVoices();
}

window.MuseoQR = { urlDeQr, generarQR, imprimirQR };
window.MuseoVoz = { narrar, detenerVoz, estaNarrando };
