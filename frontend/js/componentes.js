/**
 * MUSEO ARQUEOLÓGICO PIEDRA PINTADA
 * componentes.js — Header y Footer reutilizables (inyectados vía JS)
 *
 * Detecta automáticamente la profundidad de la página actual para
 * generar rutas relativas correctas sin importar desde qué carpeta
 * se cargue el componente.
 */

'use strict';

/*  Calcular prefijo de ruta relativa 
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

/*  Ítems de navegación  */
const NAV_ITEMS = [
  { href: 'index.html',           label: 'Inicio'       },
  { href: 'pages/informacion.html',        label: 'Información'        },
  { href: 'pages/guion-museologico.html',  label: 'Guion Museológico'  },
  { href: 'pages/petroglifos.html',        label: 'Petroglifos'        },
  { href: 'pages/mapa.html',        label: 'Mapa GPS'     },
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
    <a href="${base}index.html" class="logo" aria-label="Ir al inicio">
      <img src="${base}assets/img/logo-museo.png" alt="Logo Museo Piedra Pintada" style="height: 60px; width: auto; object-fit: contain;">
    </a>

    <nav class="nav" aria-label="Navegación principal">
      <ul class="nav__lista">${navLinks}</ul>
    </nav>

    <div class="header__acciones" id="header-acciones">
      <a href="${base}pages/reservas.html" class="btn btn--primario btn--sm" id="btn-reservar">Reservar visita</a>
      <a href="${base}pages/login.html"    class="btn btn--contorno btn--sm" style="color: white; border-color: rgba(255,255,255,0.4);" id="btn-login">Ingresar</a>
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

/*  Estado de sesión en el header  */
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
      <span class="sesion-chip" title="${usuario.correo || ''}" style="color: var(--color-fondo); border-color: rgba(18, 18, 18,0.3);">${primerNombre}</span>
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
      <a href="${base}pages/reservas.html" class="btn btn--primario btn--sm" id="btn-reservar">Reservar visita</a>
      <a href="${base}pages/login.html"    class="btn btn--contorno btn--sm" style="color: white; border-color: rgba(255,255,255,0.4);" id="btn-login">Ingresar</a>
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
          <img src="${base}assets/img/logo-museo.png" alt="Logo Museo Piedra Pintada" style="height: 60px; width: auto; object-fit: contain;">
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
          <li><a href="${base}pages/petroglifos.html"         class="footer__enlace">Catálogo de petroglifos</a></li>
          <li><a href="${base}pages/mapa.html"                class="footer__enlace">Recorrido GPS + Escáner QR</a></li>
          <li><a href="${base}pages/informacion.html"         class="footer__enlace">Información general</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__titulo">Explorar</h3>
        <ul class="footer__lista">
          <li><a href="${base}pages/petroglifos.html"         class="footer__enlace">Catálogo de petroglifos</a></li>
          <li><a href="${base}pages/guion-museologico.html"  class="footer__enlace">Guion Museológico</a></li>
          <li><a href="${base}pages/equipo.html"             class="footer__enlace">Nuestro equipo</a></li>
          <li><a href="${base}pages/trivia.html"             class="footer__enlace">Trivia arqueológica</a></li>
          <li><a href="${base}pages/noticias.html"    class="footer__enlace">Noticias y eventos</a></li>
          <li><a href="${base}pages/resenas.html"     class="footer__enlace">Reseñas de visitantes</a></li>
          <li><a href="${base}pages/preguntas.html"   class="footer__enlace">Preguntas frecuentes</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__titulo">Contacto</h3>
        <ul class="footer__lista">
          <li><a href="https://maps.app.goo.gl/p6FLkBs1wx7HEK2S6?g_st=iw" target="_blank" rel="noopener noreferrer" class="footer__enlace" style="line-height:1.4; display:inline-block;">Sector Tronconero Norte de Vigirima,<br>Municipio Guacara, Edo. Carabobo,<br>Venezuela</a></li>
          <li><span class="footer__enlace">contacto@piedrapintada.ve</span></li>
          <li style="margin-top: 1.5rem; display: flex; gap: 1rem; align-items: center;">
            <a href="https://www.instagram.com/museopiedrapintada/" target="_blank" rel="noopener noreferrer" aria-label="Instagram del Museo" style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:rgba(140, 115, 85, 0.1); color:var(--color-dorado-claro); transition:all 0.3s;" onmouseover="this.style.background='var(--color-dorado-claro)'; this.style.color='var(--color-fondo)';" onmouseout="this.style.background='rgba(140, 115, 85, 0.1)'; this.style.color='var(--color-dorado-claro)';">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://www.threads.com/@museopiedrapintada" target="_blank" rel="noopener noreferrer" aria-label="Threads del Museo" style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:rgba(140, 115, 85, 0.1); color:var(--color-dorado-claro); transition:all 0.3s;" onmouseover="this.style.background='var(--color-dorado-claro)'; this.style.color='var(--color-fondo)';" onmouseout="this.style.background='rgba(140, 115, 85, 0.1)'; this.style.color='var(--color-dorado-claro)';">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 7.5c-1.333 -3 -3.667 -4.5 -7 -4.5c-5 0 -8 2.5 -8 9s3.5 9 8 9s7 -3 7 -5s-1 -5 -7 -5c-2.5 0 -3 1.25 -3 2.5c0 1.5 1 2.5 2.5 2.5c2.5 0 3.5 -1.5 3.5 -5s-2 -4 -3 -4s-1.833 .333 -2.5 1"></path>
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div class="footer__base">
      <span> 2026 Museo Arqueológico Piedra Pintada · Todos los derechos reservados</span>
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
