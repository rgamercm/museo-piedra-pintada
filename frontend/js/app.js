/**
 * MUSEO ARQUEOLÓGICO PIEDRA PINTADA
 * app.js — Utilidades compartidas, navegación, animaciones
 * Fase R · Sistema de componentes base
 */

'use strict';

/*  Navegación / Header  */
const header      = document.querySelector('.header');
const hamburguesa = document.querySelector('.hamburguesa');
const navMovil    = document.querySelector('.nav-movil');
const enlacesNav  = document.querySelectorAll('.nav__enlace, .nav-movil__enlace');

// Header scroll
if (header) {
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Menú hamburguesa — delegación (el header se inyecta y re-renderiza dinámicamente)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.hamburguesa');
  if (btn) {
    const nav = document.querySelector('.nav-movil');
    if (!nav) return;
    const abierto = nav.classList.toggle('abierto');
    btn.classList.toggle('activo', abierto);
    document.body.classList.toggle('overflow-hidden', abierto);
    btn.setAttribute('aria-expanded', abierto);
    return;
  }
  // Cerrar al hacer clic en un enlace del menú móvil
  if (e.target.closest('.nav-movil a')) {
    cerrarMenuMovil();
  }
});

function cerrarMenuMovil() {
  if (!navMovil) return;
  navMovil.classList.remove('abierto');
  hamburguesa?.classList.remove('activo');
  document.body.classList.remove('overflow-hidden');
}

// Marcar enlace activo según la página actual
function marcarEnlaceActivo() {
  const ruta = window.location.pathname.split('/').pop() || 'index.html';
  enlacesNav.forEach(a => {
    const href = a.getAttribute('href') || '';
    const coincide = href === ruta || href.includes(ruta);
    a.classList.toggle('activo', coincide);
  });
}
marcarEnlaceActivo();

/*  Scroll Reveal (Intersection Observer)  */
function iniciarScrollReveal() {
  const elementos = document.querySelectorAll('.revelar');
  if (!elementos.length) return;

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visible');
        observer.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elementos.forEach(el => observer.observe(el));
}
document.addEventListener('DOMContentLoaded', iniciarScrollReveal);

/*  Toast  */
let toastContainer = null;

function obtenerContenedorToast() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Muestra un toast de notificación
 * @param {string} mensaje
 * @param {'exito'|'error'|'info'|'aviso'} tipo
 * @param {number} duracion ms
 */
function mostrarToast(mensaje, tipo = 'info', duracion = 3500) {
  const iconos = { exito: '', error: '', info: '️', aviso: '️' };
  const contenedor = obtenerContenedorToast();

  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  toast.innerHTML = `
    <span class="toast__icono">${iconos[tipo] || 'ℹ️'}</span>
    <span class="toast__msg">${mensaje}</span>
  `;
  contenedor.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('salir');
    toast.addEventListener('animationend', () => toast.remove());
  }, duracion);
}

/*  Modal  */
function abrirModal(idModal) {
  const overlay = document.getElementById(idModal);
  if (!overlay) return;
  overlay.classList.add('abierto');
  document.body.classList.add('overflow-hidden');
  overlay.querySelector('.modal__cerrar')?.focus();
}

function cerrarModal(idModal) {
  const overlay = document.getElementById(idModal);
  if (!overlay) return;
  overlay.classList.remove('abierto');
  document.body.classList.remove('overflow-hidden');
}

// Cerrar modal con Escape o clic en overlay
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.abierto').forEach(m => {
      cerrarModal(m.id);
    });
    cerrarMenuMovil();
  }
});

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    cerrarModal(e.target.id);
  }
  if (e.target.classList.contains('modal__cerrar')) {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay) cerrarModal(overlay.id);
  }
});

/*  Tabs  */
function iniciarTabs(contenedor) {
  if (!contenedor) return;
  const botones = contenedor.querySelectorAll('.tab-btn');
  const paneles = contenedor.querySelectorAll('.tab-panel');

  botones.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      botones.forEach(b => b.classList.remove('activo'));
      paneles.forEach(p => p.classList.remove('activo'));
      btn.classList.add('activo');
      paneles[i]?.classList.add('activo');
    });
  });
  // Activar primero
  botones[0]?.classList.add('activo');
  paneles[0]?.classList.add('activo');
}

/*  Contador animado  */
function animarContador(elemento, fin, duracion = 2000) {
  let inicio = 0;
  const incremento = fin / (duracion / 16);
  const timer = setInterval(() => {
    inicio += incremento;
    if (inicio >= fin) {
      inicio = fin;
      clearInterval(timer);
    }
    elemento.textContent = Math.floor(inicio).toLocaleString('es');
  }, 16);
}

function iniciarContadores() {
  const contadores = document.querySelectorAll('[data-contador]');
  if (!contadores.length) return;

  const observer = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        animarContador(el, parseInt(el.dataset.contador), 2000);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  contadores.forEach(el => observer.observe(el));
}
document.addEventListener('DOMContentLoaded', iniciarContadores);

/*  Buscador (filtro de tarjetas)  */
function iniciarBuscador(inputId, selectorTarjetas) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll(selectorTarjetas).forEach(tarjeta => {
      const texto = tarjeta.textContent.toLowerCase();
      const visible = !q || texto.includes(q);
      tarjeta.style.display = visible ? '' : 'none';
    });
  });
}

/*  Chips de filtro  */
function iniciarFiltroChips(contenedorId, selectorItems, atributo = 'data-categoria') {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  contenedor.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    contenedor.querySelectorAll('.chip').forEach(c => c.classList.remove('activo'));
    chip.classList.add('activo');

    const filtro = chip.dataset.filtro;
    document.querySelectorAll(selectorItems).forEach(item => {
      if (!filtro || filtro === 'todos') {
        item.style.display = '';
      } else {
        item.style.display = item.getAttribute(atributo) === filtro ? '' : 'none';
      }
    });
  });
}

/*  Formularios — validación básica  */
function validarFormulario(form) {
  let valido = true;
  form.querySelectorAll('[required]').forEach(campo => {
    const grupo = campo.closest('.form-grupo');
    const errorEl = grupo?.querySelector('.form-error');
    const vacio = !campo.value.trim();

    if (vacio) {
      valido = false;
      grupo?.classList.add('error');
      if (errorEl) errorEl.style.display = 'block';
    } else {
      grupo?.classList.remove('error');
      if (errorEl) errorEl.style.display = 'none';
    }

    // Validar email
    if (campo.type === 'email' && campo.value) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value);
      if (!emailOk) {
        valido = false;
        grupo?.classList.add('error');
        if (errorEl) { errorEl.textContent = 'Correo inválido'; errorEl.style.display = 'block'; }
      }
    }
  });
  return valido;
}

/*  Simular carga de datos (prototipos)  */
function simularCarga(ms = 800) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/*  Exportar utilidades  */
window.Museo = {
  mostrarToast,
  abrirModal,
  cerrarModal,
  iniciarTabs,
  iniciarBuscador,
  iniciarFiltroChips,
  validarFormulario,
  simularCarga,
  animarContador
};
