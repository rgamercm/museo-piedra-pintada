const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracion.controller');
const { requiereSesion, requiereRol } = require('../middlewares/auth');

// GET /api/configuracion/:clave - Público
router.get('/:clave', configuracionController.obtenerConfiguracion);

// PUT /api/configuracion/:clave - Solo Administrador
router.put('/:clave', requiereSesion, requiereRol('admin'), configuracionController.actualizarConfiguracion);

module.exports = router;
