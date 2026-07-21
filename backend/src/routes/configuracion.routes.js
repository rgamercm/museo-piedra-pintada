const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracion.controller');
const { verificarToken, verificarRol } = require('../middleware/auth.middleware');

// GET /api/configuracion/:clave - Público
router.get('/:clave', configuracionController.obtenerConfiguracion);

// PUT /api/configuracion/:clave - Solo Administrador
router.put('/:clave', verificarToken, verificarRol(['admin']), configuracionController.actualizarConfiguracion);

module.exports = router;
