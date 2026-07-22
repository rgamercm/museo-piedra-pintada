'use strict';

// Protección de ruta
(async function initAdmin() {
  try {
    const perfil = await window.api.auth.perfil();
    if (perfil.rol !== 'admin') {
      window.location.href = '../login.html';
    } else {
      document.getElementById('admin-name').textContent = perfil.nombre;
      cargarResumen();
    }
  } catch (e) {
    window.location.href = '../login.html';
  }
})();

// Utilidad para formatear fechas
function formatearFecha(isoStr) {
  return new Date(isoStr).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Variables globales para guardar datos actuales
let estadoGlobal = {
  petroglifos: [],
  estaciones: [],
  reservas: [],
  comentarios: [],
  preguntas: [],
  noticias: [],
  trivia: []
};

// ==========================================
// SECCIÓN: RESUMEN
// ==========================================
async function cargarResumen() {
  try {
    const petroglifos = await window.api.petroglifos.obtenerTodos();
    const reservas = await window.api.reservas.obtenerAdmin('pendiente');
    const comentarios = await window.api.comentarios.obtenerAdmin('pendiente');
    const preguntas = await window.api.preguntas.obtenerAdmin();
    const preguntasSinResponder = preguntas.filter(p => !p.respuesta);
    
    document.getElementById('stat-petroglifos').textContent = petroglifos.length;
    document.getElementById('stat-reservas').textContent = reservas.length;
    document.getElementById('stat-comentarios').textContent = comentarios.length;
    document.getElementById('stat-preguntas').textContent = preguntasSinResponder.length;
    
    // Badges en el sidebar
    document.getElementById('badge-reservas').textContent = reservas.length || '';
    document.getElementById('badge-moderacion').textContent = comentarios.length || '';
    document.getElementById('badge-preguntas').textContent = preguntasSinResponder.length || '';
  } catch (e) {
    console.error(e);
  }
}

// ==========================================
// SECCIÓN: PETROGLIFOS
// ==========================================
function _escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function pintarFilasPetroglifos(lista) {
  const tbody = document.getElementById('tbody-petroglifos');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No se encontraron petroglifos.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td style="color:var(--color-texto-3);">#${p.id}</td>
      <td><code style="color:var(--color-dorado-claro);">${_escapar(p.codigo_qr)}</code></td>
      <td>${_escapar(p.nombre)}</td>
      <td><span class="badge badge--dorado">${_escapar(p.categoria || '—')}</span></td>
      <td><div style="display:flex;gap:.4rem;flex-wrap:wrap;">
        <button class="btn btn--contorno btn--sm" onclick="abrirModalPetroglifo(${p.id})">Editar</button>
        <button class="btn btn--contorno btn--sm" onclick="window.MuseoQR?.imprimirQR('${_escapar(p.codigo_qr)}','${_escapar(p.nombre)}')">️ QR</button>
        <button class="btn btn--peligro btn--sm" onclick="eliminarPetroglifo(${p.id})">Eliminar</button>
      </div></td>
    </tr>`).join('');
}

function filtrarPetroglifos(q) {
  const t = (q || '').toLowerCase().trim();
  const lista = !t ? estadoGlobal.petroglifos : estadoGlobal.petroglifos.filter(p =>
    (p.nombre || '').toLowerCase().includes(t) ||
    (p.codigo_qr || '').toLowerCase().includes(t) ||
    (p.categoria || '').toLowerCase().includes(t)
  );
  pintarFilasPetroglifos(lista);
}
window.filtrarPetroglifos = filtrarPetroglifos;

async function cargarPetroglifos() {
  try {
    const petroglifos = await window.api.petroglifos.obtenerTodos();
    estadoGlobal.petroglifos = petroglifos;
    const conteo = document.getElementById('conteo-petroglifos');
    if (conteo) conteo.textContent = `(${petroglifos.length})`;
    pintarFilasPetroglifos(petroglifos);
    cargarEstaciones();
  } catch (e) {
    console.error(e);
  }
}

async function cargarEstaciones() {
  try {
    const estaciones = await window.api.estaciones.obtenerTodas();
    estadoGlobal.estaciones = estaciones;
    const tbody = document.getElementById('tbody-estaciones');
    tbody.innerHTML = '';
    
    if (estaciones.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No hay estaciones registradas.</td></tr>';
    } else {
      estaciones.forEach(e => {
        tbody.innerHTML += `
          <tr>
            <td style="color:var(--color-texto-3);">#${e.id}</td>
            <td>${e.nombre}</td>
            <td>${e.orden}</td>
            <td>${e.petroglifo_id || '-'}</td>
            <td>${e.lat ? e.lat + ', ' + e.lng : '-'}</td>
            <td><div style="display:flex;gap:.5rem;">
              <button class="btn btn--contorno btn--sm" onclick="abrirModalEstacion(${e.id})">Editar</button>
              <button class="btn btn--peligro btn--sm" onclick="eliminarEstacion(${e.id})">Eliminar</button>
            </div></td>
          </tr>
        `;
      });
    }
  } catch (e) {
    console.error(e);
  }
}

function abrirModalPetroglifo(id = null) {
  const modal = document.getElementById('modal-petroglifo');
  const form = document.getElementById('form-petroglifo');
  form.reset();
  document.getElementById('petroglifo-id').value = '';
  
  if (id) {
    const p = estadoGlobal.petroglifos.find(x => x.id === id);
    if (p) {
      document.getElementById('petroglifo-id').value = p.id;
      document.getElementById('petroglifo-nombre').value = p.nombre;
      document.getElementById('petroglifo-categoria').value = p.categoria;
      document.getElementById('petroglifo-codigo_qr').value = p.codigo_qr || '';
      document.getElementById('petroglifo-descripcion').value = p.descripcion;
      document.getElementById('petroglifo-texto_asistente').value = p.texto_asistente;
      
      const checkboxDestacado = document.getElementById('petroglifo-destacado');
      if (checkboxDestacado) checkboxDestacado.checked = !!p.destacado;

      document.getElementById('petroglifo-imagen_url').value = p.imagen_url || '';
      document.getElementById('petroglifo-imagen').value = '';
      // Ficha técnica
      const set = (campo, val) => { const el = document.getElementById('petroglifo-'+campo); if (el) el.value = val ?? ''; };
      set('codigo_roca', p.codigo_roca);
      set('fecha_registro', p.fecha_registro);
      set('latitud', p.latitud);
      set('longitud', p.longitud);
      set('altitud_m', p.altitud_m);
      set('cantidad_caras', p.cantidad_caras);
      set('profundidad_surco', p.profundidad_surco);
      set('forma_surco', p.forma_surco);
      set('exposicion_solar', p.exposicion_solar);
      set('orientacion', p.orientacion);
      set('estado_conservacion', p.estado_conservacion);
      set('notas', p.notas);
      
      const imgPreview = document.getElementById('petroglifo-imagen-preview');
      if (p.imagen_url) {
        let src = p.imagen_url;
        // Fix relative paths for the admin panel which is nested one level deeper (pages/admin/)
        if (src.startsWith('../')) {
          src = '../' + src;
        }
        imgPreview.src = src;
        imgPreview.style.display = 'block';
      } else {
        imgPreview.style.display = 'none';
        imgPreview.src = '';
      }
    }
  } else {
    document.getElementById('petroglifo-imagen_url').value = '';
    document.getElementById('petroglifo-imagen-preview').style.display = 'none';
  }
  modal.style.display = 'flex';
}

function cerrarModalPetroglifo() {
  document.getElementById('modal-petroglifo').style.display = 'none';
}

document.getElementById('form-petroglifo')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('petroglifo-id').value;
  const imagenInput = document.getElementById('petroglifo-imagen');
  let imagenUrl = document.getElementById('petroglifo-imagen_url').value;

  try {
    let petroglifoId = id ? parseInt(id) : null;
    const isNew = !petroglifoId;
    
    const checkboxDestacado = document.getElementById('petroglifo-destacado');
    const destacado = checkboxDestacado ? checkboxDestacado.checked : false;

    const val = (campo) => { const el = document.getElementById('petroglifo-'+campo); return el && el.value !== '' ? el.value : null; };
    const datos = {
      nombre: document.getElementById('petroglifo-nombre').value,
      categoria: document.getElementById('petroglifo-categoria').value,
      codigo_qr: document.getElementById('petroglifo-codigo_qr').value,
      descripcion: document.getElementById('petroglifo-descripcion').value,
      texto_asistente: document.getElementById('petroglifo-texto_asistente').value,
      destacado: destacado,
      imagen_url: imagenUrl || null,
      codigo_roca: val('codigo_roca'),
      fecha_registro: val('fecha_registro'),
      latitud: val('latitud'),
      longitud: val('longitud'),
      altitud_m: val('altitud_m'),
      cantidad_caras: val('cantidad_caras'),
      profundidad_surco: val('profundidad_surco'),
      forma_surco: val('forma_surco'),
      exposicion_solar: val('exposicion_solar'),
      orientacion: val('orientacion'),
      estado_conservacion: val('estado_conservacion'),
      notas: val('notas')
    };

    if (isNew) {
      // Crear petroglifo primero para tener un ID
      const nuevoPetroglifo = await window.api.petroglifos.crear(datos);
      petroglifoId = nuevoPetroglifo.id;
    }

    // Si hay una imagen seleccionada, subirla
    if (imagenInput.files && imagenInput.files[0]) {
      window.Museo?.mostrarToast('Subiendo imagen...', 'info');
      const resFoto = await window.api.fotos.subir(imagenInput.files[0], petroglifoId, null);
      datos.imagen_url = resFoto.url;
    }

    if (!isNew || (imagenInput.files && imagenInput.files[0])) {
      // Editar si no es nuevo o si es nuevo y le pusimos imagen
      await window.api.petroglifos.editar(petroglifoId, datos);
      window.Museo?.mostrarToast(isNew ? 'Petroglifo creado' : 'Petroglifo actualizado', 'exito');
    } else if (isNew) {
      window.Museo?.mostrarToast('Petroglifo creado', 'exito');
    }

    cerrarModalPetroglifo();
    cargarPetroglifos();
  } catch (error) {
    console.error(error);
  }
});

async function eliminarPetroglifo(id) {
  if (confirm('¿Estás seguro de eliminar este petroglifo?')) {
    try {
      await window.api.petroglifos.eliminar(id);
      window.Museo?.mostrarToast('Petroglifo eliminado', 'exito');
      cargarPetroglifos();
    } catch (error) {
      console.error(error);
    }
  }
}

function abrirModalEstacion(id = null) {
  const modal = document.getElementById('modal-estacion');
  const form = document.getElementById('form-estacion');
  form.reset();
  document.getElementById('estacion-id').value = '';
  
  if (id) {
    const e = estadoGlobal.estaciones.find(x => x.id === id);
    if (e) {
      document.getElementById('estacion-id').value = e.id;
      document.getElementById('estacion-nombre').value = e.nombre;
      document.getElementById('estacion-orden').value = e.orden;
      document.getElementById('estacion-petroglifo').value = e.petroglifo_id || '';
      document.getElementById('estacion-lat').value = e.lat || '';
      document.getElementById('estacion-lng').value = e.lng || '';
      document.getElementById('estacion-descripcion').value = e.descripcion || '';
    }
  }
  modal.style.display = 'flex';
}

function cerrarModalEstacion() {
  document.getElementById('modal-estacion').style.display = 'none';
}

document.getElementById('form-estacion')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('estacion-id').value;
  const pId = document.getElementById('estacion-petroglifo').value;
  const lat = document.getElementById('estacion-lat').value;
  const lng = document.getElementById('estacion-lng').value;
  
  const datos = {
    nombre: document.getElementById('estacion-nombre').value,
    orden: parseInt(document.getElementById('estacion-orden').value),
    petroglifo_id: pId ? parseInt(pId) : null,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    descripcion: document.getElementById('estacion-descripcion').value
  };
  
  try {
    if (id) {
      await window.api.estaciones.editar(id, datos);
      window.Museo?.mostrarToast('Estación actualizada', 'exito');
    } else {
      await window.api.estaciones.crear(datos);
      window.Museo?.mostrarToast('Estación creada', 'exito');
    }
    cerrarModalEstacion();
    cargarEstaciones();
  } catch (error) {
    console.error(error);
  }
});

async function eliminarEstacion(id) {
  if (confirm('¿Estás seguro de eliminar esta estación?')) {
    try {
      await window.api.estaciones.eliminar(id);
      window.Museo?.mostrarToast('Estación eliminada', 'exito');
      cargarEstaciones();
    } catch (error) {
      console.error(error);
    }
  }
}

// ==========================================
// SECCIÓN: RESERVAS
// ==========================================
async function cargarReservas() {
  try {
    const reservas = await window.api.reservas.obtenerAdmin();
    estadoGlobal.reservas = reservas;
    const container = document.getElementById('contenedor-reservas');
    container.innerHTML = '';
    
    if (reservas.length === 0) {
      container.innerHTML = '<p>No hay reservas en este momento.</p>';
      return;
    }
    
    reservas.forEach(r => {
      let badgeColor = r.estado === 'pendiente' ? 'badge--dorado' : (r.estado === 'aprobada' ? 'badge--verde' : 'badge--rojo');
      container.innerHTML += `
        <div class="info-bloque" style="background:var(--grad-card);border:1px solid var(--glass-border);border-radius:1rem;padding:1.25rem;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
            <div>
              <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem;"><span class="badge ${badgeColor} badge--punto">${r.estado.toUpperCase()}</span></div>
              <strong>${_escapar(r.institucion_nombre || 'Institución desconocida')}</strong> — ${_escapar(r.num_personas)} personas<br>
              <span style="font-size:.85rem;color:var(--color-texto-2);">Contacto: ${_escapar(r.contacto_nombre)} (${_escapar(r.contacto_telefono)}) · Fecha: ${formatearFecha(r.fecha_visita)}</span>
              ${r.notas ? `<p style="font-size:.85rem; margin-top:.5rem;"><em>Notas:</em> ${_escapar(r.notas)}</p>` : ''}
            </div>
            ${r.estado === 'pendiente' ? `
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                <button class="btn btn--primario btn--sm" onclick="cambiarEstadoReserva(${r.id}, 'aprobada')"> Aprobar</button>
                <button class="btn btn--peligro btn--sm" onclick="cambiarEstadoReserva(${r.id}, 'rechazada')"> Rechazar</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
  } catch (e) {
    console.error(e);
  }
}

async function cambiarEstadoReserva(id, estado) {
  if (confirm(`¿Marcar reserva como ${estado}?`)) {
    try {
      await window.api.reservas.cambiarEstado(id, estado);
      window.Museo?.mostrarToast(`Reserva ${estado}`, 'exito');
      cargarReservas();
      cargarResumen();
    } catch (error) {
      console.error(error);
    }
  }
}

// ==========================================
// SECCIÓN: MODERACIÓN DE COMENTARIOS
// ==========================================
async function cargarModeracion() {
  try {
    const comentarios = await window.api.comentarios.obtenerAdmin('pendiente');
    estadoGlobal.comentarios = comentarios;
    const container = document.getElementById('contenedor-moderacion');
    container.innerHTML = '';
    
    if (comentarios.length === 0) {
      container.innerHTML = '<p>No hay reseñas pendientes de moderación.</p>';
      return;
    }
    
    comentarios.forEach(c => {
      container.innerHTML += `
        <div style="background:var(--grad-card);border:1px solid var(--glass-border);border-radius:1rem;padding:1.25rem;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem;">
            <div><strong>${_escapar(c.autor_nombre || 'Anónimo')}</strong> — ${''.repeat(c.calificacion)}${''.repeat(5-c.calificacion)}<br><span style="font-size:.78rem;color:var(--color-texto-3);">Enviada el ${formatearFecha(c.creado_en)}</span></div>
            <div style="display:flex;gap:.5rem;">
              <button class="btn btn--primario btn--sm" onclick="cambiarEstadoComentario(${c.id}, 'aprobado')"> Aprobar</button>
              <button class="btn btn--peligro btn--sm" onclick="cambiarEstadoComentario(${c.id}, 'rechazado')"> Rechazar</button>
            </div>
          </div>
          <p style="font-size:.88rem;color:var(--color-texto-2);">${_escapar(c.texto)}</p>
        </div>
      `;
    });
  } catch (e) {
    console.error(e);
  }
}

async function cambiarEstadoComentario(id, estado) {
  if (confirm(`¿Marcar comentario como ${estado}?`)) {
    try {
      await window.api.comentarios.cambiarEstado(id, estado);
      window.Museo?.mostrarToast(`Comentario ${estado}`, 'exito');
      cargarModeracion();
      cargarResumen();
    } catch (error) {
      console.error(error);
    }
  }
}

// ==========================================
// SECCIÓN: PREGUNTAS Y RESPUESTAS
// ==========================================
async function cargarPreguntasAdmin() {
  try {
    const preguntas = await window.api.preguntas.obtenerAdmin();
    const pendientes = preguntas.filter(p => !p.respuesta);
    estadoGlobal.preguntas = pendientes;
    const container = document.getElementById('contenedor-preguntas-admin');
    container.innerHTML = '';
    
    if (pendientes.length === 0) {
      container.innerHTML = '<p>No hay preguntas sin responder.</p>';
      return;
    }
    
    pendientes.forEach(p => {
      // Nombre a mostrar: usuario registrado > nombre del formulario > Anónimo
      const autor = p.autor_nombre || p.nombre_visitante || 'Anónimo';
      const contacto = p.correo_visitante
        ? ` · <a href="mailto:${_escapar(p.correo_visitante)}" style="color:var(--color-dorado-claro);text-decoration:underline;">${_escapar(p.correo_visitante)}</a>`
        : '';
      container.innerHTML += `
        <div style="background:var(--grad-card);border:1px solid var(--glass-border);border-radius:1rem;padding:1.25rem;margin-bottom:1rem;">
          <p style="font-size:.9rem;color:var(--color-texto-2);margin-bottom:1rem;"><strong style="color:var(--color-dorado-claro);">${_escapar(autor)}</strong>${contacto} pregunta: "${_escapar(p.pregunta)}"</p>
          <textarea id="respuesta-${p.id}" class="form-textarea" placeholder="Escribe tu respuesta aquí..." style="min-height:80px;margin-bottom:.75rem;width:100%;"></textarea>
          <div style="display:flex;gap:.75rem;">
            <button class="btn btn--primario btn--sm" onclick="responderPregunta(${p.id})">Publicar respuesta</button>
            <button class="btn btn--peligro btn--sm" onclick="eliminarPreguntaAdmin(${p.id})">Rechazar / Eliminar</button>
          </div>
        </div>
      `;
    });
  } catch (e) {
    console.error(e);
  }
}

async function responderPregunta(id) {
  const textarea = document.getElementById(`respuesta-${id}`);
  const respuesta = textarea.value.trim();
  if (!respuesta) return window.Museo?.mostrarToast('Escribe una respuesta', 'aviso');
  
  try {
    await window.api.preguntas.responder(id, respuesta);
    window.Museo?.mostrarToast('Respuesta publicada', 'exito');
    cargarPreguntasAdmin();
    cargarResumen();
  } catch (error) {
    console.error(error);
  }
}

async function eliminarPreguntaAdmin(id) {
  if (confirm('¿Eliminar esta pregunta permanentemente?')) {
    try {
      await window.api.preguntas.eliminar(id);
      window.Museo?.mostrarToast('Pregunta eliminada', 'exito');
      cargarPreguntasAdmin();
      cargarResumen();
    } catch (error) {
      console.error(error);
    }
  }
}

// ==========================================
// SECCIÓN: NOTICIAS Y EVENTOS
// ==========================================
async function cargarNoticiasAdmin() {
  try {
    const noticias = await window.api.noticias.obtenerAdmin();
    estadoGlobal.noticias = noticias;
    const tbody = document.getElementById('tbody-noticias');
    tbody.innerHTML = '';
    
    if (noticias.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No hay noticias registradas.</td></tr>';
    } else {
      noticias.forEach(n => {
        let badge = n.activa ? '<span class="badge badge--verde">Publicada</span>' : '<span class="badge badge--rojo">Borrador</span>';
        tbody.innerHTML += `
          <tr>
            <td>${n.titulo}</td>
            <td><span class="badge badge--dorado">${n.categoria}</span></td>
            <td>${formatearFecha(n.creado_en)}</td>
            <td>${badge}</td>
            <td><div style="display:flex;gap:.5rem;">
              <button class="btn btn--contorno btn--sm" onclick="abrirModalNoticia(${n.id})">Editar</button>
              <button class="btn btn--peligro btn--sm" onclick="eliminarNoticia(${n.id})">Eliminar</button>
            </div></td>
          </tr>
        `;
      });
    }
  } catch (e) {
    console.error(e);
  }
}

function abrirModalNoticia(id = null) {
  const modal = document.getElementById('modal-noticia');
  const form = document.getElementById('form-noticia');
  form.reset();
  document.getElementById('noticia-id').value = '';
  
  if (id) {
    const n = estadoGlobal.noticias.find(x => x.id === id);
    if (n) {
      document.getElementById('noticia-id').value = n.id;
      document.getElementById('noticia-titulo').value = n.titulo;
      document.getElementById('noticia-categoria').value = n.categoria;
      document.getElementById('noticia-contenido').value = n.contenido;
      document.getElementById('noticia-activa').value = n.activa ? 'true' : 'false';
    }
  }
  modal.style.display = 'flex';
}

function cerrarModalNoticia() {
  document.getElementById('modal-noticia').style.display = 'none';
}

document.getElementById('form-noticia')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('noticia-id').value;
  const datos = {
    titulo: document.getElementById('noticia-titulo').value,
    categoria: document.getElementById('noticia-categoria').value,
    contenido: document.getElementById('noticia-contenido').value,
    imagen_url: '',
    activa: document.getElementById('noticia-activa').value === 'true'
  };
  
  try {
    if (id) {
      await window.api.noticias.editar(id, datos);
      window.Museo?.mostrarToast('Noticia actualizada', 'exito');
    } else {
      await window.api.noticias.crear(datos);
      window.Museo?.mostrarToast('Noticia creada', 'exito');
    }
    cerrarModalNoticia();
    cargarNoticiasAdmin();
  } catch (error) {
    console.error(error);
  }
});

async function eliminarNoticia(id) {
  if (confirm('¿Estás seguro de eliminar esta noticia?')) {
    try {
      await window.api.noticias.eliminar(id);
      window.Museo?.mostrarToast('Noticia eliminada', 'exito');
      cargarNoticiasAdmin();
    } catch (error) {
      console.error(error);
    }
  }
}

// ==========================================
// SECCIÓN: TRIVIA
// ==========================================
async function cargarTriviaAdmin() {
  try {
    const trivia = await window.api.trivia.obtenerTodas();
    estadoGlobal.trivia = trivia;
    const tbody = document.getElementById('tbody-trivia');
    tbody.innerHTML = '';
    
    if (trivia.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No hay preguntas de trivia.</td></tr>';
    } else {
      trivia.forEach(t => {
        tbody.innerHTML += `
          <tr>
            <td style="color:var(--color-texto-3);">#${t.id}</td>
            <td>${t.pregunta}</td>
            <td>Opción ${t.respuesta_correcta}</td>
            <td><span class="badge ${t.activa ? 'badge--verde' : 'badge--rojo'}">${t.activa ? 'Activa' : 'Inactiva'}</span></td>
            <td><div style="display:flex;gap:.5rem;">
              <button class="btn btn--contorno btn--sm" onclick="abrirModalTrivia(${t.id})">Editar</button>
              <button class="btn btn--peligro btn--sm" onclick="eliminarTrivia(${t.id})">Eliminar</button>
            </div></td>
          </tr>
        `;
      });
    }
  } catch (e) {
    console.error(e);
  }
}

function abrirModalTrivia(id = null) {
  const modal = document.getElementById('modal-trivia');
  const form = document.getElementById('form-trivia');
  form.reset();
  document.getElementById('trivia-id').value = '';
  
  if (id) {
    const p = estadoGlobal.trivia.find(x => x.id === id);
    if (p) {
      document.getElementById('trivia-id').value = p.id;
      document.getElementById('trivia-pregunta').value = p.pregunta;
      document.getElementById('trivia-opcion-a').value = p.opcion_a;
      document.getElementById('trivia-opcion-b').value = p.opcion_b;
      document.getElementById('trivia-opcion-c').value = p.opcion_c;
      document.getElementById('trivia-opcion-d').value = p.opcion_d;
      document.getElementById('trivia-correcta').value = p.respuesta_correcta;
      document.getElementById('trivia-activa').value = p.activa ? 'true' : 'false';
    }
  }
  modal.style.display = 'flex';
}

function cerrarModalTrivia() {
  document.getElementById('modal-trivia').style.display = 'none';
}

document.getElementById('form-trivia')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('trivia-id').value;
  const datos = {
    pregunta: document.getElementById('trivia-pregunta').value,
    opcion_a: document.getElementById('trivia-opcion-a').value,
    opcion_b: document.getElementById('trivia-opcion-b').value,
    opcion_c: document.getElementById('trivia-opcion-c').value,
    opcion_d: document.getElementById('trivia-opcion-d').value,
    respuesta_correcta: document.getElementById('trivia-correcta').value,
    activa: document.getElementById('trivia-activa').value === 'true'
  };
  
  try {
    if (id) {
      await window.api.trivia.editar(id, datos);
      window.Museo?.mostrarToast('Pregunta actualizada', 'exito');
    } else {
      await window.api.trivia.crear(datos);
      window.Museo?.mostrarToast('Pregunta creada', 'exito');
    }
    cerrarModalTrivia();
    cargarTriviaAdmin();
  } catch (error) {
    console.error(error);
  }
});

async function eliminarTrivia(id) {
  if (confirm('¿Estás seguro de eliminar esta pregunta de trivia?')) {
    try {
      await window.api.trivia.eliminar(id);
      window.Museo?.mostrarToast('Pregunta eliminada', 'exito');
      cargarTriviaAdmin();
    } catch (error) {
      console.error(error);
    }
  }
}

// Hook de cambio de seccion global
window.cambiarSeccion = function(id) {
  if(id === 'petroglifos') cargarPetroglifos();
  if(id === 'reservas') cargarReservas();
  if(id === 'moderacion') cargarModeracion();
  if(id === 'preguntas-admin') cargarPreguntasAdmin();
  if(id === 'noticias-admin') cargarNoticiasAdmin();
  if(id === 'trivia-admin') cargarTriviaAdmin();
  if(id === 'editor-mapa') inicializarMapaAdmin();
  if(id === 'configuracion') cargarConfiguracion();
}

async function cargarConfiguracion() {
  try {
    const config = await window.api.cliente('/api/configuracion/horario_atencion');
    if (config) {
      document.getElementById('horario-lunes').value = config.lunes || '';
      document.getElementById('horario-martes-viernes').value = config.martes_viernes || '';
      document.getElementById('horario-sabado').value = config.sabado || '';
      document.getElementById('horario-domingo').value = config.domingo || '';
      document.getElementById('horario-feriados').value = config.feriados || '';
    }
  } catch (e) {
    console.error('Error cargando horario:', e);
  }
}

async function guardarHorarioAdmin() {
  const datos = {
    lunes: document.getElementById('horario-lunes').value,
    martes_viernes: document.getElementById('horario-martes-viernes').value,
    sabado: document.getElementById('horario-sabado').value,
    domingo: document.getElementById('horario-domingo').value,
    feriados: document.getElementById('horario-feriados').value
  };
  try {
    await window.api.cliente('/api/configuracion/horario_atencion', {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
    window.Museo?.mostrarToast('Horario guardado exitosamente', 'exito');
  } catch (e) {
    console.error('Error guardando horario:', e);
    window.Museo?.mostrarToast('Error al guardar el horario', 'error');
  }
}

// -----------------------------------------------------
// LÓGICA DEL EDITOR DE MAPA ADMIN
// -----------------------------------------------------
let mapaAdmin = null;
let capaRutaAdmin = null;
let marcadorTemporalAdmin = null;
let estacionesDatosAdmin = [];
let adminGpsTracker = null;
let adminGpsLayer = null;

// Lógica de Trazado de Ruta
let modoDibujoRuta = false;
let rutaSimuladorCoordenadas = [];
let rutaSimuladorPolyline = null;
let puntosSimuladorCapa = L.layerGroup();

async function inicializarMapaAdmin() {
  if (mapaAdmin) {
    setTimeout(() => mapaAdmin.invalidateSize(), 300);
    return;
  }

  mapaAdmin = L.map('mapa-editor').setView([10.3009, -67.8877], 16);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO', maxZoom: 19
  }).addTo(mapaAdmin);

  setTimeout(() => mapaAdmin.invalidateSize(), 300);

  try {
    const resGeo = await fetch('../../assets/data/track.geojson');
    if (resGeo.ok) {
      const geojson = await resGeo.json();
      capaRutaAdmin = L.geoJSON(geojson, { style: { color: '#7ABA58', weight: 4, opacity: 0.6 } }).addTo(mapaAdmin);
      mapaAdmin.fitBounds(capaRutaAdmin.getBounds());
    }

    await cargarMarcadoresAdmin();
    await cargarRutaSimuladorAdmin();
    renderListaPuntosSimulador(); // pintar la lista aunque la ruta venga vacía
    puntosSimuladorCapa.addTo(mapaAdmin);
    
    // UI Eventos
    document.getElementById('btn-dibujar-ruta').addEventListener('click', toggleModoDibujo);
    document.getElementById('btn-limpiar-ruta').addEventListener('click', limpiarRutaDibujada);
    document.getElementById('btn-guardar-ruta').addEventListener('click', guardarRutaSimulador);
    document.getElementById('btn-agregar-poi')?.addEventListener('click', agregarPuntoManualSimulador);
    document.getElementById('btn-actualizar-ruta-sim')?.addEventListener('click', guardarRutaSimulador);
    inicializarToggleUbicaciones();
  } catch(e) {
    console.error('Error al inicializar editor de mapa:', e);
  }

  mapaAdmin.on('click', onMapClickAdmin);

  document.getElementById('btn-mi-pos-mapa').addEventListener('click', () => {
    if (capaRutaAdmin) mapaAdmin.fitBounds(capaRutaAdmin.getBounds());
  });

  document.getElementById('btn-gps-admin').addEventListener('click', () => {
    if (adminGpsTracker) {
      navigator.geolocation.clearWatch(adminGpsTracker);
      adminGpsTracker = null;
      document.getElementById('btn-gps-admin').innerHTML = '📍 Rastrear mi GPS';
      if (adminGpsLayer) { mapaAdmin.removeLayer(adminGpsLayer); adminGpsLayer = null; }
      window.Museo?.mostrarToast('Rastreo GPS detenido', 'info');
      return;
    }

    if (!navigator.geolocation) {
      window.Museo?.mostrarToast('GPS no disponible en este dispositivo', 'aviso');
      return;
    }

    document.getElementById('btn-gps-admin').innerHTML = 'Detener GPS';
    window.Museo?.mostrarToast('Buscando señal GPS...', 'info');

    adminGpsTracker = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        if (!adminGpsLayer) {
          adminGpsLayer = L.circle([latitude, longitude], { radius: 10, color: '#4080FF', fillOpacity: 0.8 }).addTo(mapaAdmin);
          mapaAdmin.setView([latitude, longitude], 19);
        } else {
          adminGpsLayer.setLatLng([latitude, longitude]);
          mapaAdmin.setView([latitude, longitude]);
        }
      },
      err => {
        console.warn(err);
        window.Museo?.mostrarToast('Error de GPS. Verifica los permisos.', 'error');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  });
}

async function cargarMarcadoresAdmin() {
  mapaAdmin.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      mapaAdmin.removeLayer(layer);
    }
  });

  estacionesDatosAdmin = await window.api.estaciones.obtenerTodas();
  
  estacionesDatosAdmin.forEach(est => {
    if (!est.latitud || !est.longitud) return;
    
    let color = '#35882F'; 
    if (est.tipo_marcador === 'parada') color = '#e6a23c';
    if (est.tipo_marcador === 'continuar') color = '#409eff';
    
    const icono = L.divIcon({
      className: '',
      html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;box-shadow:0 2px 8px rgba(0,0,0,.6);">${est.tipo_marcador === 'parada' ? 'P' : (est.tipo_marcador === 'continuar' ? '→' : '★')}</div>`,
      iconSize:[24,24], iconAnchor:[12,12]
    });
    
    L.marker([est.latitud, est.longitud], { icon: icono }).addTo(mapaAdmin)
      .bindPopup(`<b>${est.nombre}</b><br><span style="font-size:11px;color:#888;">${est.tipo_marcador}</span><br>
        <button onclick="eliminarMarcadorAdmin(${est.id})" style="margin-top:5px;background:#c33;color:white;border:none;padding:3px 6px;border-radius:4px;cursor:pointer;">Eliminar</button>`);
  });
}

async function onMapClickAdmin(e) {
  if (modoDibujoRuta) {
    rutaSimuladorCoordenadas.push({ lat: e.latlng.lat, lng: e.latlng.lng, desc: '' });
    redibujarRutaSimulador();
    return;
  }

  if (marcadorTemporalAdmin) {
    mapaAdmin.removeLayer(marcadorTemporalAdmin);
  }

  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  marcadorTemporalAdmin = L.marker([lat, lng]).addTo(mapaAdmin);
  
  const petros = await window.api.petroglifos.obtenerTodos();
  const opcionesPetros = petros.map(p => `<option value="${p.id}">${p.nombre} (${p.codigo_roca})</option>`).join('');

  const html = `
    <div style="min-width:200px;">
      <h3 style="margin-top:0;font-size:1rem;">Nuevo Marcador</h3>
      <div class="form-grupo" style="margin-bottom:8px;">
        <label style="display:block;font-size:0.8rem;">Nombre / Etiqueta</label>
        <input type="text" id="nuevo-marcador-nombre" placeholder="Ej: Mirador" style="width:100%;padding:4px;">
      </div>
      <div class="form-grupo" style="margin-bottom:8px;">
        <label style="display:block;font-size:0.8rem;">Tipo</label>
        <select id="nuevo-marcador-tipo" style="width:100%;padding:4px;" onchange="document.getElementById('caja-petro').style.display = this.value === 'petroglifo' ? 'block' : 'none'">
          <option value="parada">Parada / Descanso</option>
          <option value="continuar">Dirección / Siga</option>
          <option value="petroglifo">Petroglifo</option>
        </select>
      </div>
      <div class="form-grupo" id="caja-petro" style="display:none;margin-bottom:8px;">
        <label style="display:block;font-size:0.8rem;">Vincular Petroglifo</label>
        <select id="nuevo-marcador-petro_id" style="width:100%;padding:4px;">
          <option value="">Seleccione...</option>
          ${opcionesPetros}
        </select>
      </div>
      <button onclick="guardarMarcadorAdmin(${lat}, ${lng})" class="btn btn--primario btn--sm" style="width:100%;">Guardar Punto</button>
    </div>
  `;

  marcadorTemporalAdmin.bindPopup(html).openPopup();
}

window.guardarMarcadorAdmin = async function(lat, lng) {
  const nombre = document.getElementById('nuevo-marcador-nombre').value;
  const tipo = document.getElementById('nuevo-marcador-tipo').value;
  const petroglifo_id = document.getElementById('nuevo-marcador-petro_id').value;

  if (!nombre) {
    window.Museo?.mostrarToast('El nombre es obligatorio', 'error');
    return;
  }

  const datos = {
    nombre,
    descripcion: `Marcador de tipo ${tipo}`,
    latitud: lat,
    longitud: lng,
    tipo_marcador: tipo,
    petroglifo_id: (tipo === 'petroglifo' && petroglifo_id) ? parseInt(petroglifo_id) : null
  };

  try {
    await window.api.estaciones.crear(datos);
    window.Museo?.mostrarToast('Marcador guardado', 'exito');
    mapaAdmin.closePopup();
    if (marcadorTemporalAdmin) mapaAdmin.removeLayer(marcadorTemporalAdmin);
    await cargarMarcadoresAdmin();
  } catch(e) {
    window.Museo?.mostrarToast('Error al guardar', 'error');
  }
};

window.eliminarMarcadorAdmin = async function(id) {
  if(!confirm('¿Seguro que deseas eliminar este marcador?')) return;
  try {
    await window.api.estaciones.eliminar(id);
    window.Museo?.mostrarToast('Eliminado', 'exito');
    await cargarMarcadoresAdmin();
  } catch(e) {
    window.Museo?.mostrarToast('Error al eliminar', 'error');
  }
};

// --- LOGICA DE RUTA SIMULADOR ---

// Normaliza un punto de interés desde la BD a { lat, lng, desc }. Acepta el
// formato nuevo {lng, lat, descripcion} y el antiguo [lng, lat] (sin desc).
function normalizarPuntoPOI(c) {
  if (Array.isArray(c)) return { lat: +c[1], lng: +c[0], desc: '' };
  return { lat: +c.lat, lng: +c.lng, desc: c.descripcion || c.desc || '' };
}

async function cargarRutaSimuladorAdmin() {
  try {
    const res = await window.api.cliente(`/api/ruta_simulador`);
    if (res.datos && Array.isArray(res.datos.coordenadas) && res.datos.coordenadas.length > 0) {
      rutaSimuladorCoordenadas = res.datos.coordenadas.map(normalizarPuntoPOI);
      redibujarRutaSimulador();
    }
  } catch(e) {
    console.error('Error cargando puntos de interés', e);
  }
}

function redibujarRutaSimulador() {
  puntosSimuladorCapa.clearLayers();
  renderListaPuntosSimulador(); // mantener la lista en sync con el mapa

  // Los puntos de interés NO son un recorrido: se muestran como marcadores
  // sueltos (estrella dorada), sin línea que los conecte. El recorrido oficial
  // es la línea verde (track.geojson) que ya se dibuja aparte.
  if (rutaSimuladorPolyline) {
    mapaAdmin.removeLayer(rutaSimuladorPolyline);
    rutaSimuladorPolyline = null;
  }

  if (rutaSimuladorCoordenadas.length === 0) return;

  rutaSimuladorCoordenadas.forEach((p, i) => {
    const icono = L.divIcon({
      className: '',
      html: `<div style="width:24px;height:24px;border-radius:50%;background:#E0A94B;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-size:12px;color:#3a2a00;">★</div>`,
      iconSize: [24, 24], iconAnchor: [12, 12],
    });
    const tip = p.desc ? `Punto ${i + 1}: ${p.desc}` : `Punto de interés ${i + 1}`;
    L.marker([p.lat, p.lng], { icon: icono }).bindTooltip(tip).addTo(puntosSimuladorCapa);
  });
}

// Lista editable de los puntos de la ruta del simulador (entrada por coords).
// rutaSimuladorCoordenadas almacena pares [lat, lng] (orden Leaflet).
function renderListaPuntosSimulador() {
  const cont = document.getElementById('lista-poi-sim');
  const contador = document.getElementById('poi-contador');
  if (!cont) return;
  if (contador) contador.textContent = `${rutaSimuladorCoordenadas.length} punto(s)`;

  if (rutaSimuladorCoordenadas.length === 0) {
    cont.innerHTML = '<span style="font-size:.8rem;color:var(--color-texto-2);">Aún no hay puntos. Agrega coordenadas o traza con “Dibujar Ruta”.</span>';
    return;
  }

  const ult = rutaSimuladorCoordenadas.length - 1;
  const esc = (s) => (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  cont.innerHTML = rutaSimuladorCoordenadas.map((p, i) => `
    <div style="display:flex;flex-direction:column;gap:.4rem;background:rgba(0,0,0,.2);border:1px solid var(--glass-border);border-radius:.5rem;padding:.4rem .5rem;">
      <div style="display:flex;align-items:center;gap:.5rem;">
        <span style="min-width:1.5rem;height:1.5rem;display:flex;align-items:center;justify-content:center;background:#E0A94B;color:#3a2a00;border-radius:50%;font-size:.72rem;font-weight:700;flex:none;">${i + 1}</span>
        <span style="flex:1;font-size:.8rem;font-family:monospace;color:var(--color-texto);">Lat ${(+p.lat).toFixed(6)}, Lng ${(+p.lng).toFixed(6)}</span>
        <button title="Subir" onclick="moverPuntoSimulador(${i}, -1)" style="background:none;border:none;color:${i === 0 ? '#555' : '#E0A94B'};cursor:${i === 0 ? 'default' : 'pointer'};font-size:1rem;padding:0 .2rem;" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button title="Bajar" onclick="moverPuntoSimulador(${i}, 1)" style="background:none;border:none;color:${i === ult ? '#555' : '#E0A94B'};cursor:${i === ult ? 'default' : 'pointer'};font-size:1rem;padding:0 .2rem;" ${i === ult ? 'disabled' : ''}>▼</button>
        <button title="Eliminar" onclick="eliminarPuntoSimulador(${i})" style="background:none;border:none;color:#F09090;cursor:pointer;font-size:1rem;padding:0 .2rem;">✕</button>
      </div>
      <input type="text" value="${esc(p.desc)}" placeholder="Descripción (opcional)" onchange="actualizarDescPOI(${i}, this.value)"
        style="width:100%;padding:.35rem .5rem;border-radius:.4rem;border:1px solid var(--glass-border);background:rgba(0,0,0,.25);color:var(--color-texto);font-size:.78rem;">
    </div>`).join('');
}

function agregarPuntoManualSimulador() {
  const latEl = document.getElementById('poi-lat');
  const lngEl = document.getElementById('poi-lng');
  const descEl = document.getElementById('poi-desc');
  const lat = parseFloat(latEl.value);
  const lng = parseFloat(lngEl.value);

  if (!isFinite(lat) || !isFinite(lng)) {
    window.Museo?.mostrarToast('Ingresa una latitud y longitud válidas', 'aviso');
    return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    window.Museo?.mostrarToast('Coordenadas fuera de rango (lat ±90, lng ±180)', 'aviso');
    return;
  }

  rutaSimuladorCoordenadas.push({ lat, lng, desc: (descEl?.value || '').trim() });
  redibujarRutaSimulador();
  latEl.value = '';
  lngEl.value = '';
  if (descEl) descEl.value = '';
  latEl.focus();
  if (mapaAdmin) mapaAdmin.panTo([lat, lng]);
  window.Museo?.mostrarToast(`Punto ${rutaSimuladorCoordenadas.length} agregado`, 'exito');
}

// Actualiza la descripción de un punto desde el input inline de la lista.
window.actualizarDescPOI = function (i, valor) {
  if (i < 0 || i >= rutaSimuladorCoordenadas.length) return;
  rutaSimuladorCoordenadas[i].desc = (valor || '').trim();
  // Refrescar solo el tooltip del mapa (sin re-render de la lista para no perder foco)
  puntosSimuladorCapa.clearLayers();
  rutaSimuladorCoordenadas.forEach((p, k) => {
    const icono = L.divIcon({
      className: '',
      html: `<div style="width:24px;height:24px;border-radius:50%;background:#E0A94B;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-size:12px;color:#3a2a00;">★</div>`,
      iconSize: [24, 24], iconAnchor: [12, 12],
    });
    const tip = p.desc ? `Punto ${k + 1}: ${p.desc}` : `Punto de interés ${k + 1}`;
    L.marker([p.lat, p.lng], { icon: icono }).bindTooltip(tip).addTo(puntosSimuladorCapa);
  });
};

// Expuestas globalmente para los onclick del listado renderizado.
window.eliminarPuntoSimulador = function (i) {
  if (i < 0 || i >= rutaSimuladorCoordenadas.length) return;
  rutaSimuladorCoordenadas.splice(i, 1);
  redibujarRutaSimulador();
};

window.moverPuntoSimulador = function (i, dir) {
  const j = i + dir;
  if (i < 0 || j < 0 || i >= rutaSimuladorCoordenadas.length || j >= rutaSimuladorCoordenadas.length) return;
  const tmp = rutaSimuladorCoordenadas[i];
  rutaSimuladorCoordenadas[i] = rutaSimuladorCoordenadas[j];
  rutaSimuladorCoordenadas[j] = tmp;
  redibujarRutaSimulador();
};

function toggleModoDibujo() {
  modoDibujoRuta = !modoDibujoRuta;
  const btnDibujar = document.getElementById('btn-dibujar-ruta');
  const btnGuardar = document.getElementById('btn-guardar-ruta');
  const btnLimpiar = document.getElementById('btn-limpiar-ruta');
  const txtInstrucciones = document.getElementById('instrucciones-mapa');

  if (modoDibujoRuta) {
    btnDibujar.innerHTML = '❌ Cancelar';
    btnDibujar.classList.replace('btn--contorno', 'btn--rojo');
    btnGuardar.style.display = 'inline-block';
    btnLimpiar.style.display = 'inline-block';
    txtInstrucciones.innerHTML = '<strong>Marcar en el mapa:</strong> Haz clic para agregar puntos de interés. NO cambia el recorrido (línea verde); solo resalta lugares.';
    document.getElementById('mapa-editor').style.cursor = 'crosshair';
  } else {
    btnDibujar.innerHTML = '✏️ Marcar en el mapa';
    btnDibujar.classList.replace('btn--rojo', 'btn--contorno');
    btnGuardar.style.display = 'none';
    btnLimpiar.style.display = 'none';
    txtInstrucciones.innerHTML = '<strong>Modo Marcadores:</strong> Haz clic en cualquier parte del mapa para añadir un nuevo punto (Parada, Dirección o Petroglifo).';
    document.getElementById('mapa-editor').style.cursor = '';
    cargarRutaSimuladorAdmin(); // recargar original
  }
}

function limpiarRutaDibujada() {
  rutaSimuladorCoordenadas = [];
  redibujarRutaSimulador();
}

async function guardarRutaSimulador() {
  if (rutaSimuladorCoordenadas.length === 0 &&
      !confirm('No hay puntos de interés. ¿Guardar y quitar todos los puntos del mapa?')) {
    return;
  }

  // Guardar como objetos {lng, lat, descripcion} (orden GeoJSON en lng/lat).
  const coordenadas = rutaSimuladorCoordenadas.map(p => ({
    lng: p.lng, lat: p.lat, descripcion: p.desc || ''
  }));

  try {
    const res = await window.api.cliente('/api/ruta_simulador', {
      method: 'PUT',
      body: JSON.stringify({ coordenadas })
    });

    if (res.ok) {
      window.Museo?.mostrarToast('Puntos de interés guardados', 'exito');
      if (modoDibujoRuta) toggleModoDibujo(); // Salir del modo marcar solo si estaba activo
    }
  } catch(e) {
    console.error(e);
    window.Museo?.mostrarToast('Error al guardar los puntos de interés', 'error');
  }
}

// --- Permiso: mostrar ubicaciones exactas de petroglifos en el Mapa GPS ---
async function inicializarToggleUbicaciones() {
  const chk = document.getElementById('toggle-ubic-petroglifos');
  const txt = document.getElementById('toggle-ubic-petroglifos-txt');
  if (!chk || chk.dataset.listo === '1') return; // evitar doble-cableado
  chk.dataset.listo = '1';

  const pintar = (on) => { if (txt) txt.textContent = on ? 'Activado' : 'Desactivado'; };

  // Cargar estado actual (404 = nunca configurado => desactivado)
  try {
    const cfg = await window.api.cliente('/api/configuracion/ubicaciones_petroglifos');
    chk.checked = !!(cfg && cfg.habilitado);
  } catch (e) {
    chk.checked = false;
  }
  pintar(chk.checked);

  chk.addEventListener('change', async () => {
    const habilitado = chk.checked;
    pintar(habilitado);
    try {
      await window.api.cliente('/api/configuracion/ubicaciones_petroglifos', {
        method: 'PUT',
        body: JSON.stringify({ habilitado })
      });
      window.Museo?.mostrarToast(
        habilitado ? 'Los visitantes ya pueden ver la ubicación exacta' : 'Ubicación exacta oculta para los visitantes',
        'exito'
      );
    } catch (e) {
      console.error('Error guardando permiso de ubicaciones', e);
      window.Museo?.mostrarToast('No se pudo guardar el permiso', 'error');
      chk.checked = !habilitado; // revertir
      pintar(chk.checked);
    }
  });
}

