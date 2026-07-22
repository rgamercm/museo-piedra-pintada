'use strict';

let estadoEmpleados = [];

async function cargarEmpleados() {
  try {
    const tbody = document.getElementById('tbody-empleados');
    if (!tbody) return;
    
    const empleados = await window.api.empleados.obtenerTodos();
    estadoEmpleados = empleados;
    
    if (!empleados.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No hay empleados registrados.</td></tr>';
      return;
    }
    
    tbody.innerHTML = empleados.map(e => `
      <tr>
        <td style="color:var(--color-texto-3);">#${e.id.substring(0,8)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${e.imagen_url || '../../assets/img/avatar-placeholder.png'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--color-dorado-claro);" alt="${e.nombre}">
            ${_escapar(e.nombre)}
          </div>
        </td>
        <td>${_escapar(e.cargo)}</td>
        <td>${e.orden}</td>
        <td>${e.destacado ? '<span class="badge badge--verde">Sí</span>' : '<span class="badge badge--rojo">No</span>'}</td>
        <td>
          <div style="display:flex;gap:.4rem;">
            <button class="btn btn--contorno btn--sm" onclick="abrirModalEmpleado('${e.id}')">Editar</button>
            <button class="btn btn--peligro btn--sm" onclick="eliminarEmpleado('${e.id}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error(error);
  }
}

function abrirModalEmpleado(id = null) {
  const modal = document.getElementById('modal-empleado');
  const form = document.getElementById('form-empleado');
  form.reset();
  document.getElementById('empleado-id').value = '';
  document.getElementById('empleado-imagen-url').value = '';
  document.getElementById('modal-empleado-titulo').textContent = 'Añadir Empleado';
  
  if (id) {
    const empleado = estadoEmpleados.find(e => e.id === id);
    if (empleado) {
      document.getElementById('modal-empleado-titulo').textContent = 'Editar Empleado';
      document.getElementById('empleado-id').value = empleado.id;
      document.getElementById('empleado-nombre').value = empleado.nombre;
      document.getElementById('empleado-cargo').value = empleado.cargo;
      document.getElementById('empleado-descripcion').value = empleado.descripcion || '';
      document.getElementById('empleado-orden').value = empleado.orden || 0;
      document.getElementById('empleado-destacado').checked = empleado.destacado;
      document.getElementById('empleado-imagen-url').value = empleado.imagen_url || '';
    }
  }
  
  modal.style.display = 'flex';
}

document.getElementById('form-empleado')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('empleado-id').value;
  const imagenInput = document.getElementById('empleado-imagen');
  let imagenUrl = document.getElementById('empleado-imagen-url').value;
  
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  
  try {
    // Si hay archivo, subir foto primero
    if (imagenInput.files.length > 0) {
      const resFoto = await window.api.fotos.subir(imagenInput.files[0], 'avatar');
      // Asegurar compatibilidad dependiendo de la respuesta de fotos.subir
      imagenUrl = resFoto.url || resFoto.ruta || resFoto; 
    }
    
    const datos = {
      nombre: document.getElementById('empleado-nombre').value.trim(),
      cargo: document.getElementById('empleado-cargo').value.trim(),
      descripcion: document.getElementById('empleado-descripcion').value.trim(),
      orden: parseInt(document.getElementById('empleado-orden').value) || 0,
      destacado: document.getElementById('empleado-destacado').checked,
      imagen_url: imagenUrl
    };
    
    if (id) {
      await window.api.empleados.editar(id, datos);
      window.Museo?.mostrarToast('Empleado actualizado', 'exito');
    } else {
      await window.api.empleados.crear(datos);
      window.Museo?.mostrarToast('Empleado creado', 'exito');
    }
    
    document.getElementById('modal-empleado').style.display = 'none';
    cargarEmpleados();
  } catch (error) {
    console.error(error);
    window.Museo?.mostrarToast(error.message || 'Error al guardar empleado', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
});

async function eliminarEmpleado(id) {
  if (!confirm('¿Estás seguro de eliminar este empleado?')) return;
  try {
    await window.api.empleados.eliminar(id);
    window.Museo?.mostrarToast('Empleado eliminado', 'exito');
    cargarEmpleados();
  } catch (error) {
    console.error(error);
    window.Museo?.mostrarToast(error.message || 'Error al eliminar empleado', 'error');
  }
}

// Interceptar el cambio de sección para cargar empleados cuando se visite la pestaña
const _cambiarSeccionOriginal = window.cambiarSeccion;
window.cambiarSeccion = function(id) {
  if (_cambiarSeccionOriginal) _cambiarSeccionOriginal(id);
  if (id === 'empleados') {
    cargarEmpleados();
  }
};
