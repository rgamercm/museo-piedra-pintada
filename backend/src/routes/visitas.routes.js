'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/visitas.controller');

const router = Router();

// GET /api/visitas - público
router.get('/', ctrl.obtener);

// POST /api/visitas - público (para incrementar)
router.post('/', ctrl.incrementar);

module.exports = router;
