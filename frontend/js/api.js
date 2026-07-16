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

  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, options);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error en la petición');
      return data.datos;
    } catch (e) {
      console.error(`API Error (${endpoint}):`, e.message);
      if (window.Museo?.mostrarToast) {
        window.Museo.mostrarToast(e.message, 'error');
      }
      throw e;
    }
  },

  // ── Módulos ──

  auth: {
    login: (correo, contrasena) => api.request('/auth/login', {
      method: 'POST',
      headers: api.getHeaders(),
      body: JSON.stringify({ correo, contrasena })
    }),
    perfil: () => api.request('/auth/perfil', {
      headers: api.getHeaders(true)
    })
  },

  petroglifos: {
    obtenerTodos: () => api.request('/petroglifos'),
    obtenerPorId: (id) => api.request(`/petroglifos/${id}`),
    crear: (datos) => api.request('/petroglifos', { method: 'POST', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    editar: (id, datos) => api.request(`/petroglifos/${id}`, { method: 'PUT', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    eliminar: (id) => api.request(`/petroglifos/${id}`, { method: 'DELETE', headers: api.getHeaders(true) })
  },

  estaciones: {
    obtenerTodas: () => api.request('/estaciones'),
    crear: (datos) => api.request('/estaciones', { method: 'POST', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    editar: (id, datos) => api.request(`/estaciones/${id}`, { method: 'PUT', headers: api.getHeaders(true), body: JSON.stringify(datos) }),
    eliminar: (id) => api.request(`/estaciones/${id}`, { method: 'DELETE', headers: api.getHeaders(true) })
  },

  noticias: {
    obtenerTodas: () => api.request('/noticias'),
    obtenerAdmin: () => api.request('/noticias/todas', { headers: api.getHeaders(true) }),
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
    obtenerAdmin: (estado) => api.request(`/comentarios?estado=${estado}`, { headers: api.getHeaders(true) }),
    crear: (datos) => api.request('/comentarios', {
      method: 'POST',
      headers: api.getHeaders(true),
      body: JSON.stringify(datos)
    }),
    cambiarEstado: (id, estado) => api.request(`/comentarios/${id}/estado`, { method: 'PATCH', headers: api.getHeaders(true), body: JSON.stringify({ estado }) })
  },

  fotos: {
    subir: async (file, petroglifo_id, comentario_id) => {
      const formData = new FormData();
      formData.append('imagen', file);
      if (petroglifo_id) formData.append('petroglifo_id', petroglifo_id);
      if (comentario_id) formData.append('comentario_id', comentario_id);
      
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

  preguntas: {
    obtenerPublicadas: () => api.request('/preguntas'),
    obtenerAdmin: () => api.request('/preguntas/pendientes', { headers: api.getHeaders(true) }),
    crear: (pregunta) => api.request('/preguntas', {
      method: 'POST',
      headers: api.getHeaders(true),
      body: JSON.stringify({ pregunta })
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
    obtener: () => api.request('/visitas'),
    incrementar: () => api.request('/visitas', { method: 'POST' })
  }
};

window.api = api;
