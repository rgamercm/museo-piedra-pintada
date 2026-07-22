'use strict';

// Diccionario de malas palabras comunes (groserías)
const MALAS_PALABRAS = [
  'puto', 'puta', 'mierda', 'coño', 'marico', 'marica', 'huevon', 'guevon',
  'cabron', 'cabrona', 'pendejo', 'pendeja', 'zorra', 'perra', 'maldito',
  'maldita', 'cojon', 'cojones', 'mamawebo', 'mamaguevo', 'mamagüevo',
  'verga', 'mmg', 'cdlm', 'ctm', 'putazo', 'putaza'
];

/**
 * Verifica si un texto contiene alguna grosería
 * @param {string} texto 
 * @returns {boolean} true si tiene groserías
 */
function tieneGroserias(texto) {
  if (!texto) return false;
  // Normalizar: pasar a minúsculas y quitar acentos para la comparación
  const textoNormalizado = texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Quita tildes

  // Expresión regular que busca las palabras enteras
  for (const palabra of MALAS_PALABRAS) {
    const regex = new RegExp(`\\b${palabra}\\b`, 'i');
    if (regex.test(textoNormalizado)) {
      return true;
    }
  }
  return false;
}

/**
 * Verifica si el texto tiene secuencias de caracteres repetidos extraños
 * o posibles intentos de inyección de código
 * @param {string} texto 
 * @returns {boolean} true si es sospechoso
 */
function tieneCaracteresSospechosos(texto) {
  if (!texto) return false;
  
  // Detecta 5 o más caracteres especiales seguidos (ej. !!!!!, ????@#$)
  if (/[^\w\s\.,\-áéíóúÁÉÍÓÚñÑüÜ]{5,}/.test(texto)) return true;
  
  // Detecta etiquetas HTML evidentes (<script>, <iframe>, <img)
  if (/<\/?[\w\s="/.':;#-\/\?]+>/i.test(texto)) return true;

  // Detecta intentos burdos de inyección SQL (' OR '1'='1)
  if (/(\b(OR|AND|UNION|SELECT|DROP|DELETE|UPDATE|INSERT)\b[^a-z]+(1|true|'1'|'a'))/i.test(texto)) return true;

  return false;
}

/**
 * Elimina etiquetas HTML de un string (Sanitización básica)
 * @param {string} texto 
 * @returns {string} texto limpio
 */
function limpiarHtml(texto) {
  if (!texto) return '';
  return texto
    .replace(/<[^>]*>?/gm, '') // Quita tags
    .replace(/javascript:/gi, ''); // Quita intentos de js en links
}

module.exports = {
  tieneGroserias,
  tieneCaracteresSospechosos,
  limpiarHtml
};
