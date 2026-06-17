const express = require('express');
const router = express.Router();
const TorneoService = require('../services/TorneoService');
const { verifyToken } = require('../middleware/auth');

/**
 * @route GET /api/grupos/torneo/:torneoId
 * @desc Obtener grupos de un torneo
 * @access Public
 */
router.get('/torneo/:torneoId', async (req, res) => {
  try {
    const { torneoId } = req.params;
    
    // Obtener grupos del torneo
    const grupos = await TorneoService.getGruposByTorneo(torneoId);
    
    res.json({
      success: true,
      data: grupos
    });
    
  } catch (error) {
    console.error('Error obteniendo grupos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/grupos/:grupoId/tabla-posiciones
 * @desc Obtener tabla de posiciones de un grupo específico
 * @access Public
 */
router.get('/:grupoId/tabla-posiciones', async (req, res) => {
  try {
    const { grupoId } = req.params;
    
    // Obtener tabla de posiciones del grupo
    const tablaPosiciones = await TorneoService.getTablaPosicionesGrupo(grupoId);
    
    if (!tablaPosiciones) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tabla de posiciones del grupo no encontrada' 
      });
    }
    
    res.json({
      success: true,
      data: tablaPosiciones
    });
    
  } catch (error) {
    console.error('Error obteniendo tabla de posiciones del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/grupos/torneo/:torneoId/tablas-posiciones
 * @desc Obtener todas las tablas de posiciones de los grupos de un torneo
 * @access Public
 */
router.get('/torneo/:torneoId/tablas-posiciones', async (req, res) => {
  try {
    const { torneoId } = req.params;
    
    // Obtener todas las tablas de posiciones de los grupos
    const tablasPosiciones = await TorneoService.getTablasPosicionesGrupos(torneoId);
    
    res.json({
      success: true,
      data: tablasPosiciones
    });
    
  } catch (error) {
    console.error('Error obteniendo tablas de posiciones de grupos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/grupos/torneo/:torneoId/generar
 * @desc Generar grupos para un torneo existente
 * @access Public
 */
router.post('/torneo/:torneoId/generar', async (req, res) => {
  try {
    const { torneoId } = req.params;
    
    // Obtener datos del torneo
    const torneo = await TorneoService.getTournamentById(torneoId);
    if (!torneo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Torneo no encontrado' 
      });
    }

    // Verificar que el torneo tenga formato grupos-playoff
    if (torneo.formato !== 'grupos-playoff') {
      return res.status(400).json({ 
        success: false, 
        message: 'El torneo no tiene formato grupos-playoff' 
      });
    }

    // Verificar que el torneo tenga equipos
    if (!torneo.equipos || torneo.equipos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El torneo no tiene equipos asignados' 
      });
    }

    // Generar grupos
    await TorneoService.crearEstructuraGrupos(torneoId, torneo.equipos);
    
    res.json({
      success: true,
      message: 'Grupos generados exitosamente'
    });
    
  } catch (error) {
    console.error('Error generando grupos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
