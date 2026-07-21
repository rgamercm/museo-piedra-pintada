const { supabase } = require('../config/supabase');

const configuracionController = {
  // Obtener una configuración por clave (Público)
  obtenerConfiguracion: async (req, res) => {
    try {
      const { clave } = req.params;
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', clave)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Configuración no encontrada.' });
        }
        throw error;
      }

      res.json(data.valor);
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

      // Upsert para actualizar o crear si no existe
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .upsert({ clave, valor, actualizado_en: new Date() })
        .select('valor')
        .single();

      if (error) throw error;

      res.json({ mensaje: 'Configuración actualizada', valor: data.valor });
    } catch (error) {
      console.error(`Error al actualizar configuracion ${req.params.clave}:`, error);
      res.status(500).json({ error: 'Error interno al actualizar configuración.' });
    }
  }
};

module.exports = configuracionController;
