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
async function cargarPetroglifos() {
  try {
    const petroglifos = await window.api.petroglifos.obtenerTodos();
    estadoGlobal.petroglifos = petroglifos;
    const tbody = document.getElementById('tbody-petroglifos');
    tbody.innerHTML = '';
    
    if (petroglifos.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No hay petroglifos registrados.</td></tr>';
    } else {
      petroglifos.forEach(p => {
        tbody.innerHTML += `
          <tr>
            <td style="color:var(--color-texto-3);">#${p.id}</td>
            <td>${p.nombre}</td>
            <td><span class="badge badge--dorado">${p.categoria}</span></td>
            <td><div style="display:flex;gap:.5rem;">
              <button class="btn btn--contorno btn--sm" onclick="abrirModalPetroglifo(${p.id})">Editar</button>
              <button class="btn btn--peligro btn--sm" onclick="eliminarPetroglifo(${p.id})">Eliminar</button>
            </div></td>
          </tr>
        `;
      });
    }
    
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
      document.getElementById('petroglifo-imagen_url').value = p.imagen_url || '';
      document.getElementById('petroglifo-imagen').value = '';
      
      const imgPreview = document.getElementById('petroglifo-imagen-preview');
      if (p.imagen_url) {
        imgPreview.src = p.imagen_url;
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

    const datos = {
      nombre: document.getElementById('petroglifo-nombre').value,
      categoria: document.getElementById('petroglifo-categoria').value,
      codigo_qr: document.getElementById('petroglifo-codigo_qr').value,
      descripcion: document.getElementById('petroglifo-descripcion').value,
      texto_asistente: document.getElementById('petroglifo-texto_asistente').value,
      imagen_url: imagenUrl || null
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
              <strong>${r.institucion_nombre || 'Institución desconocida'}</strong> — ${r.num_personas} personas<br>
              <span style="font-size:.85rem;color:var(--color-texto-2);">Contacto: ${r.contacto_nombre} (${r.contacto_telefono}) · Fecha: ${formatearFecha(r.fecha_visita)}</span>
              ${r.notas ? `<p style="font-size:.85rem; margin-top:.5rem;"><em>Notas:</em> ${r.notas}</p>` : ''}
            </div>
            ${r.estado === 'pendiente' ? `
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                <button class="btn btn--primario btn--sm" onclick="cambiarEstadoReserva(${r.id}, 'aprobada')">✓ Aprobar</button>
                <button class="btn btn--peligro btn--sm" onclick="cambiarEstadoReserva(${r.id}, 'rechazada')">✕ Rechazar</button>
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
            <div><strong>${c.autor_nombre || 'Anónimo'}</strong> — ${'★'.repeat(c.calificacion)}${'☆'.repeat(5-c.calificacion)}<br><span style="font-size:.78rem;color:var(--color-texto-3);">Enviada el ${formatearFecha(c.creado_en)}</span></div>
            <div style="display:flex;gap:.5rem;">
              <button class="btn btn--primario btn--sm" onclick="cambiarEstadoComentario(${c.id}, 'aprobado')">✓ Aprobar</button>
              <button class="btn btn--peligro btn--sm" onclick="cambiarEstadoComentario(${c.id}, 'rechazado')">✕ Rechazar</button>
            </div>
          </div>
          <p style="font-size:.88rem;color:var(--color-texto-2);">${c.texto}</p>
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
      container.innerHTML += `
        <div style="background:var(--grad-card);border:1px solid var(--glass-border);border-radius:1rem;padding:1.25rem;margin-bottom:1rem;">
          <p style="font-size:.9rem;color:var(--color-texto-2);margin-bottom:1rem;"><strong style="color:var(--color-dorado-claro);">${p.autor_nombre || 'Anónimo'}</strong> pregunta: "${p.pregunta}"</p>
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

// Hook de cambio de sección global
window.cambiarSeccion = function(id) {
  if(id === 'petroglifos') cargarPetroglifos();
  if(id === 'reservas') cargarReservas();
  if(id === 'moderacion') cargarModeracion();
  if(id === 'preguntas-admin') cargarPreguntasAdmin();
  if(id === 'noticias-admin') cargarNoticiasAdmin();
  if(id === 'trivia-admin') cargarTriviaAdmin();
}
