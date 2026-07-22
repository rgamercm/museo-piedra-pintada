'use strict';

/**
 * MUSEO ARQUEOLÓGICO PIEDRA PINTADA
 * api.js — Capa de servicios para conectar con el backend M4
 */

const API_URL = '/api';

const api = {
  // Manejo de tokens
  getToken() {
    return localStorage.getItem('museo_token') || sessionStorage.getItem('museo_token');
  },
  
  getHeaders(auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async request(endpoint, { silent = false, ...options } = {}) {
    const avisar = (msg) => {
      if (!silent && window.Museo?.mostrarToast) window.Museo.mostrarToast(msg, 'error');
    };

    let res;
    try {
      res = await fetch(`${API_URL}${endpoint}`, options);
    } catch (e) {
      // Fallo de red / CORS: no llegó respuesta.
      console.error(`API Error (${endpoint}): sin conexión`, e.message);
      avisar('No se pudo conectar con el servidor.');
      throw e;
    }

    // Leemos como texto y parseamos con cuidado: si el servidor devuelve una
    // página de error (HTML/texto plano, típico de un 500 en Vercel), res.json()
    // reventaría con "Unexpected token". Así lo detectamos limpiamente.
    const texto = await res.text();
    let data;
    try {
      data = texto ? JSON.parse(texto) : {};
    } catch (e) {
      console.error(`API Error (${endpoint}): respuesta no-JSON (HTTP ${res.status})`);
      avisar('El servidor no está disponible en este momento.');
      throw new Error('Respuesta no válida del servidor');
    }

    if (!res.ok || !data.ok) {
      const msg = data.error || `Error en la petición (${res.status})`;
      console.error(`API Error (${endpoint}):`, msg);
      avisar(msg);
      const errorObj = new Error(msg);
      errorObj.detalles = data.detalles;
      throw errorObj;
    }

    return data.datos;
  },

  /**
   * Petición genérica de bajo nivel. Recibe la ruta completa (p. ej.
   * '/api/ruta_simulador') y devuelve el sobre {ok, datos} tal cual.
   * No muestra toasts: el llamador decide cómo manejar el error.
   * La usan el editor de rutas del admin y el mapa GPS.
   */
  cliente: async (ruta, options = {}) => {
    const res = await fetch(ruta, {
      headers: api.getHeaders(true),
      ...options,
    });
    const texto = await res.text();
    let data;
    try {
      data = texto ? JSON.parse(texto) : {};
    } catch (e) {
      throw new Error(`Respuesta no válida del servidor (HTTP ${res.status})`);
    }
    if (!res.ok) throw new Error(data.error || `Error en la petición (${res.status})`);
    return data;
  },

  //  Módulos

  auth: {
    login: (correo, contrasena) => api.request('/auth/login', {
      method: 'POST',
      headers: api.getHeaders(),
      body: JSON.stringify({ correo, contrasena })
    }),
    registro: (datos) => api.request('/auth/registro', {
      method: 'POST',
      headers: api.getHeaders(),
      body: JSON.stringify(datos)
    }),
    obtenerPreguntasSeguridad: (correo) => api.request('/auth/preguntas-seguridad', {
      method: 'POST',
      headers: api.getHeaders(),
      body: JSON.stringify({ correo })
    }),
    verificarPreguntasSeguridad: (correo, respuestas) => api.request('/auth/verificar-seguridad', {
      method: 'POST',
      headers: api.getHeaders(),
      body: JSON.stringify({ correo, respuestas })
    }),
    restablecerContrasena: (token, correo, nuevaContrasena) => api.request('/auth/restablecer-contrasena', {
      method: 'POST',
      headers: api.getHeaders(),
      body: JSON.stringify({ token, correo, nuevaContrasena })
    }),
    perfil: () => api.request('/auth/perfil', {
      headers: api.getHeaders(true)
    })
  },

  petroglifos: {
    obtenerTodos: async () => {
      try { return await api.request('/petroglifos', { silent: true }); }
      catch (e) {
        console.log("Fallback mock data para petroglifos");
        return window.MOCK_PETROGLIFOS || [];
      }
    },
    obtenerPorId: async (id) => {
      try { return await api.request(`/petroglifos/${id}`, { silent: true }); }
      catch (e) {
        return (window.MOCK_PETROGLIFOS || []).find(p => p.id === id) || { id, nombre: id, imagen_url: `/assets/img/petroglifos/${id}.jpeg`, estacion_nombre: 'Sector 9', categoria: 'Al valle', descripcion: 'Detalle simulado.' };
      }
    },
    obtenerPorQr: (codigo) => api.request(`/petroglifos/qr/${encodeURIComponent(codigo)}`),
    crear: (datos) => api.request('/petroglifos', { method: 'POST', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    editar: (id, datos) => api.request(`/petroglifos/${id}`, { method: 'PUT', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    eliminar: (id) => api.request(`/petroglifos/${id}`, { method: 'DELETE', headers: api.getHeaders(true) })
  },

  estaciones: {
    obtenerTodas: async () => {
      try { return await api.request('/estaciones', { silent: true }); }
      catch (e) { return []; }
    },
    crear: (datos) => api.request('/estaciones', { method: 'POST', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    editar: (id, datos) => api.request(`/estaciones/${id}`, { method: 'PUT', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    eliminar: (id) => api.request(`/estaciones/${id}`, { method: 'DELETE', headers: api.getHeaders(true) })
  },

  noticias: {
    obtenerTodas: () => api.request('/noticias'),
    obtenerAdmin: () => api.request('/noticias', { headers: api.getHeaders(true) }),
    crear: (datos) => api.request('/noticias', { method: 'POST', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    editar: (id, datos) => api.request(`/noticias/${id}`, { method: 'PUT', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    eliminar: (id) => api.request(`/noticias/${id}`, { method: 'DELETE', headers: api.getHeaders(true) })
  },

  trivia: {
    obtenerPreguntas: (limite = 5) => api.request(`/trivia/preguntas?limite=${limite}`),
    obtenerTodas: () => api.request('/trivia/preguntas/todas', { headers: api.getHeaders(true) }),
    crear: (datos) => api.request('/trivia/preguntas', { method: 'POST', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    editar: (id, datos) => api.request(`/trivia/preguntas/${id}`, { method: 'PUT', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    eliminar: (id) => api.request(`/trivia/preguntas/${id}`, { method: 'DELETE', headers: api.getHeaders(true) }),
    verificar: (respuestas) => api.request('/trivia/verificar', {
      method: 'POST',
      headers: api.getHeaders(true),
      body: JSON.stringify({ respuestas })
    }),
    guardarResultado: (datos) => api.request('/trivia/resultados', {
      method: 'POST',
      headers: api.getHeaders(true),
      body: JSON.stringify(datos)
    })
  },

  comentarios: {
    obtenerAprobados: () => api.request('/comentarios'),
    obtenerAdmin: () => api.request('/comentarios/pendientes', { headers: api.getHeaders(true) }),
    crear: (datos) => api.request('/comentarios', {
      method: 'POST',
      headers: api.getHeaders(true),
      body: JSON.stringify(datos)
    }),
    cambiarEstado: (id, estado) => api.request(`/comentarios/${id}/moderar`, { method: 'PATCH', headers: api.getHeaders(true), body: JSON.stringify({ estado_moderacion: estado }) })
  },

  fotos: {
    subir: async (file, petroglifo_id, comentario_id, tipo) => {
      const formData = new FormData();
      formData.append('imagen', file);
      if (petroglifo_id) formData.append('petroglifo_id', petroglifo_id);
      if (comentario_id) formData.append('comentario_id', comentario_id);
      if (tipo) formData.append('tipo', tipo);
      
      const token = api.getToken();
      const res = await fetch(`${API_URL}/fotos`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al subir foto');
      return data.datos;
    }
  },

  empleados: {
    obtenerTodos: async () => {
      try { return await api.request('/empleados', { silent: true }); }
      catch (e) { return []; }
    },
    obtenerPorId: (id) => api.request(`/empleados/${id}`),
    crear: (datos) => api.request('/empleados', { method: 'POST', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    editar: (id, datos) => api.request(`/empleados/${id}`, { method: 'PUT', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    eliminar: (id) => api.request(`/empleados/${id}`, { method: 'DELETE', headers: api.getHeaders(true) })
  },

  preguntas: {
    obtenerPublicadas: () => api.request('/preguntas'),
    obtenerAdmin: () => api.request('/preguntas/pendientes', { headers: api.getHeaders(true) }),
    // Acepta un string (solo pregunta) o un objeto {pregunta, nombre, correo}
    crear: (datos) => api.request('/preguntas', {
      method: 'POST',
      headers: api.getHeaders(true),
      body: JSON.stringify(typeof datos === 'string' ? { pregunta: datos } : datos)
    }),
    responder: (id, respuesta) => api.request(`/preguntas/${id}/responder`, { method: 'PATCH', headers: api.getHeaders(true), body: JSON.stringify({ respuesta }) }),
    eliminar: (id) => api.request(`/preguntas/${id}`, { method: 'DELETE', headers: api.getHeaders(true) })
  },

  reservas: {
    obtenerAdmin: (estado) => api.request(`/reservas${estado ? '?estado='+estado : ''}`, { headers: api.getHeaders(true) }),
    crear: (datos) => api.request('/reservas', {
      method: 'POST',
      headers: api.getHeaders(true),
      body: JSON.stringify(datos)
    }),
    cambiarEstado: (id, estado) => api.request(`/reservas/${id}/estado`, { method: 'PATCH', headers: api.getHeaders(true), body: JSON.stringify({ estado }) })
  },

  visitas: {
    obtener: () => api.request('/visitas', { silent: true }),
    incrementar: () => api.request('/visitas', { method: 'POST', silent: true })
  }
};

window.api = api;
