/**
 * MUSEO ARQUEOLÓGICO PIEDRA PINTADA
 * componentes.js — Header y Footer reutilizables (inyectados vía JS)
 *
 * Detecta automáticamente la profundidad de la página actual para
 * generar rutas relativas correctas sin importar desde qué carpeta
 * se cargue el componente.
 */

'use strict';

/* ── Calcular prefijo de ruta relativa ──────────────────────
 * Si estamos en  frontend/index.html       → base = ""
 * Si estamos en  frontend/pages/*.html     → base = "../"
 * Si estamos en  frontend/pages/admin/*.html → base = "../../"
 */
function calcularBase() {
  // Contamos cuántos niveles tiene la ruta actual respecto a frontend/
  const path = window.location.pathname;
  // Normalizamos separadores y eliminamos el nombre del archivo
  const partes = path.replace(/\\/g, '/').split('/').filter(Boolean);

  // Encontrar el índice del segmento "frontend" en la ruta
  const idxFrontend = partes.findIndex(p => p === 'frontend');

  let nivelDesde = 0;
  if (idxFrontend !== -1) {
    // Número de segmentos después de "frontend" que NO son el archivo HTML
    const despues = partes.slice(idxFrontend + 1);
    // El último elemento es el archivo .html; los anteriores son carpetas
    nivelDesde = Math.max(0, despues.length - 1);
  } else {
    // Si no encontramos "frontend", inferir por la profundidad genérica
    // Contamos cuántos "/" hay después del host
    const sinProtocolo = path.replace(/^\//, '');
    const segmentos = sinProtocolo.split('/').filter(Boolean);
    nivelDesde = Math.max(0, segmentos.length - 1);
  }

  return '../'.repeat(nivelDesde);
}

/* ── Ítems de navegación ─────────────────────────────────── */
const NAV_ITEMS = [
  { href: 'index.html',           label: 'Inicio'       },
  { href: 'pages/informacion.html', label: 'Información'  },
  { href: 'pages/petroglifos.html', label: 'Petroglifos'  },
  { href: 'pages/recorrido.html',   label: 'Recorrido'    },
  { href: 'pages/noticias.html',    label: 'Noticias'     },
  { href: 'pages/preguntas.html',   label: 'Preguntas'    },
  { href: 'pages/resenas.html',     label: 'Reseñas'      },
  { href: 'pages/trivia.html',      label: 'Trivia'       },
];

function generarHeader() {
  const base = calcularBase();

  const navLinks = NAV_ITEMS.map(item =>
    `<li><a href="${base}${item.href}" class="nav__enlace">${item.label}</a></li>`
  ).join('');

  const navMovilLinks = NAV_ITEMS.map(item =>
    `<a href="${base}${item.href}" class="nav-movil__enlace">${item.label}</a>`
  ).join('');

  return `
<header class="header" role="banner">
  <div class="container header__inner">
    <div style="display: flex; align-items: center; gap: 1rem;">
      <a href="${base}index.html" aria-label="Ir al inicio" style="display: flex; align-items: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
        <img src="${base}assets/img/logo-museo.png" alt="Logo Museo Piedra Pintada" style="height: 58px; width: auto; object-fit: contain;">
      </a>
      <img src="${base}assets/img/logo-carabobo.png" alt="Logo Carabobo Te Quiero" style="height: 58px; width: auto; object-fit: contain;">
      
      <div class="logo__texto" style="border-left: 1px solid var(--glass-border); padding-left: 1rem;">
        <span class="logo__nombre">Piedra Pintada</span>
        <span class="logo__subtitulo">Museo Arqueológico</span>
      </div>
    </div>

    <nav class="nav" aria-label="Navegación principal">
      <ul class="nav__lista">${navLinks}</ul>
    </nav>

    <div class="header__acciones" id="header-acciones">
      <a href="${base}pages/reservas.html" class="btn btn--fantasma btn--sm" id="btn-reservar">Reservar visita</a>
      <a href="${base}pages/login.html"    class="btn btn--fantasma btn--sm" style="background: var(--color-fondo);" id="btn-login">Ingresar</a>
      <button class="hamburguesa" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-movil">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<nav class="nav-movil" id="nav-movil" aria-label="Menú móvil">
  ${navMovilLinks}
  <div id="nav-movil-acciones" style="display:flex;gap:1rem;margin-top:1rem;flex-wrap:wrap;justify-content:center;">
    <a href="${base}pages/reservas.html" class="btn btn--contorno">Reservar visita</a>
    <a href="${base}pages/login.html"    class="btn btn--primario">Ingresar</a>
  </div>
</nav>
  `;
}

/* ── Estado de sesión en el header ───────────────────────── */
function obtenerUsuarioSesion() {
  try {
    const crudo = localStorage.getItem('museo_usuario');
    return crudo ? JSON.parse(crudo) : null;
  } catch { return null; }
}

function cerrarSesion() {
  localStorage.removeItem('museo_token');
  localStorage.removeItem('museo_usuario');
  sessionStorage.removeItem('museo_token');
  window.Museo?.mostrarToast('Sesión cerrada', 'info');
  const base = calcularBase();
  setTimeout(() => { window.location.href = `${base}index.html`; }, 600);
}
window.cerrarSesion = cerrarSesion;

/* Rellena las acciones del header según haya o no sesión iniciada. */
function pintarEstadoSesion() {
  const base = calcularBase();
  const usuario = obtenerUsuarioSesion();
  const token = localStorage.getItem('museo_token') || sessionStorage.getItem('museo_token');
  const acciones = document.getElementById('header-acciones');
  const accionesMovil = document.getElementById('nav-movil-acciones');
  if (!acciones) return;

  const hamburguesaHTML = `
      <button class="hamburguesa" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-movil">
        <span></span><span></span><span></span>
      </button>`;

  if (usuario && token) {
    const esAdmin = usuario.rol === 'admin';
    const primerNombre = (usuario.nombre || 'Usuario').split(' ')[0];
    const enlaceAdmin = esAdmin
      ? `<a href="${base}pages/admin/dashboard.html" class="btn btn--contorno btn--sm">Panel</a>`
      : '';

    acciones.innerHTML = `
      <span class="sesion-chip" title="${usuario.correo || ''}" style="color: var(--color-fondo); border-color: rgba(13,32,73,0.3);">${primerNombre}</span>
      ${enlaceAdmin ? enlaceAdmin.replace('btn--contorno', 'btn--fantasma') : ''}
      <button class="btn btn--fantasma btn--sm" style="background: var(--color-fondo);" onclick="cerrarSesion()">Cerrar sesión</button>
      ${hamburguesaHTML}`;

    if (accionesMovil) {
      accionesMovil.innerHTML = `
        <span class="sesion-chip">${primerNombre}</span>
        ${esAdmin ? `<a href="${base}pages/admin/dashboard.html" class="btn btn--contorno">Panel Admin</a>` : ''}
        <a href="${base}pages/reservas.html" class="btn btn--contorno">Reservar visita</a>
        <button class="btn btn--primario" onclick="cerrarSesion()">Cerrar sesión</button>`;
    }
  } else {
    acciones.innerHTML = `
      <a href="${base}pages/reservas.html" class="btn btn--fantasma btn--sm" id="btn-reservar">Reservar visita</a>
      <a href="${base}pages/login.html"    class="btn btn--fantasma btn--sm" style="background: var(--color-fondo);" id="btn-login">Ingresar</a>
      ${hamburguesaHTML}`;
  }
}
window.initHeader = pintarEstadoSesion;

function generarFooter() {
  const base = calcularBase();

  return `
<footer class="footer" role="contentinfo">
  <div class="container">
    <div class="footer__grid">
      <div>
        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;">
          <div class="logo__icono" aria-hidden="true"></div>
          <div class="logo__texto">
            <span class="logo__nombre">Piedra Pintada</span>
            <span class="logo__subtitulo">Museo Arqueológico</span>
          </div>
        </div>
        <p class="footer__descripcion">
          Un viaje al corazón de la historia precolombina venezolana a través de sus petroglifos únicos en el mundo.
        </p>
      </div>
      <div>
        <h3 class="footer__titulo">Visitar</h3>
        <ul class="footer__lista">
          <li><a href="${base}pages/informacion.html"         class="footer__enlace">Cómo llegar</a></li>
          <li><a href="${base}pages/informacion.html#horario" class="footer__enlace">Horario</a></li>
          <li><a href="${base}pages/reservas.html"            class="footer__enlace">Reservas institucionales</a></li>
          <li><a href="${base}pages/recorrido.html"           class="footer__enlace">Recorrido interactivo</a></li>
          <li><a href="${base}pages/mapa.html"                class="footer__enlace">Mapa del parque</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__titulo">Explorar</h3>
        <ul class="footer__lista">
          <li><a href="${base}pages/petroglifos.html" class="footer__enlace">Catálogo de petroglifos</a></li>
          <li><a href="${base}pages/trivia.html"      class="footer__enlace">Trivia arqueológica</a></li>
          <li><a href="${base}pages/noticias.html"    class="footer__enlace">Noticias y eventos</a></li>
          <li><a href="${base}pages/resenas.html"     class="footer__enlace">Reseñas de visitantes</a></li>
          <li><a href="${base}pages/preguntas.html"   class="footer__enlace">Preguntas frecuentes</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__titulo">Contacto</h3>
        <ul class="footer__lista">
          <li><span class="footer__enlace">Parque Piedra Pintada, Venezuela</span></li>
          <li><span class="footer__enlace">+58 XXX-XXXXXXX</span></li>
          <li><span class="footer__enlace">contacto@piedrapintada.ve</span></li>
        </ul>
      </div>
    </div>
    <div class="footer__base">
      <span>© 2026 Museo Arqueológico Piedra Pintada · Todos los derechos reservados</span>
      <span>Hecho con amor para preservar nuestra historia</span>
    </div>
  </div>
</footer>
  `;
}

// Inyectar header y footer en la página
document.addEventListener('DOMContentLoaded', () => {
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (headerPlaceholder) headerPlaceholder.outerHTML = generarHeader();
  if (footerPlaceholder) footerPlaceholder.outerHTML = generarFooter();

  // Re-inicializar scripts del header después de inyectarlo
  if (typeof window.initHeader === 'function') window.initHeader();
});
