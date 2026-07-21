const db = require('../config/db');

const configuracionController = {
  // Obtener una configuración por clave (Público)
  obtenerConfiguracion: async (req, res) => {
    try {
      const { clave } = req.params;
      const { rows } = await db.query(
        'SELECT valor FROM configuracion_sistema WHERE clave = $1',
        [clave]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Configuración no encontrada.' });
      }

      res.json(rows[0].valor);
    } catch (error) {
      console.error(`Error al obtener configuracion ${req.params.clave}:`, error);
      res.status(500).json({ error: 'Error interno al obtener configuración.' });
    }
  },

  // Actualizar una configuración (Admin)
  actualizarConfiguracion: async (req, res) => {
    try {
      const { clave } = req.params;
      const valor = req.body;

      if (!valor || typeof valor !== 'object') {
        return res.status(400).json({ error: 'El valor debe ser un objeto JSON.' });
      }

      // Upsert (Insert on conflict update)
      const { rows } = await db.query(
        `INSERT INTO configuracion_sistema (clave, valor, actualizado_en)
         VALUES ($1, $2, NOW())
         ON CONFLICT (clave) 
         DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = EXCLUDED.actualizado_en
         RETURNING valor`,
        [clave, JSON.stringify(valor)]
      );

      res.json({ mensaje: 'Configuración actualizada', valor: rows[0].valor });
    } catch (error) {
      console.error(`Error al actualizar configuracion ${req.params.clave}:`, error);
      res.status(500).json({ error: 'Error interno al actualizar configuración.' });
    }
  }
};

module.exports = configuracionController;
