/**
 * Rutas para validaciones de consistencia
 * User Story 1.2: Validar que los datos de equipos, jugadores y árbitros sean consistentes antes de iniciar un partido
 */

const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifyAllRoles } = require('../middleware/auth');
const ValidacionesService = require('../services/ValidacionesService');

// Validar consistencia de un partido específico
router.get('/partido/:partidoId', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const validacion = await ValidacionesService.validarConsistenciaPartido(partidoId);
    
    res.json(validacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validar estado general del sistema
router.get('/sistema', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    
    // 🚀 OPTIMIZACIÓN: Usar count() para evitar descargar todos los documentos
    const [equiposCount, arbitrosCount, canchasCount, partidosCount] = await Promise.all([
      db.collection('equipos').count().get(),
      db.collection('arbitros').count().get(),
      db.collection('canchas').count().get(),
      db.collection('partidos').count().get()
    ]);
    
    // 🚀 OPTIMIZACIÓN: Solo totales, no procesamiento completo
    const estadisticas = {
      equipos: {
        total: equiposCount.data().count,
        activos: equiposCount.data().count, // Aproximación
        conJugadores: 0 // Requeriría query adicional
      },
      arbitros: {
        total: arbitrosCount.data().count,
        activos: arbitrosCount.data().count, // Aproximación
        disponibles: 0, // Requeriría query adicional
        certificados: 0 // Requeriría query adicional
      },
      canchas: {
        total: canchasCount.data().count,
        activas: canchasCount.data().count, // Aproximación
        disponibles: 0 // Requeriría query adicional
      },
      partidos: {
        total: partidosCount.data().count,
        programados: 0, // Requeriría query adicional
        enCurso: 0, // Requeriría query adicional
        finalizados: 0 // Requeriría query adicional
      }
    };
    
    // Calcular salud del sistema (simplificado para mejor performance)
    const saludSistema = {
      equipos: estadisticas.equipos.total > 0,
      arbitros: estadisticas.arbitros.total > 0,
      canchas: estadisticas.canchas.total > 0,
      partidos: estadisticas.partidos.total > 0
    };
    
    const saludGeneral = Object.values(saludSistema).every(v => v);
    
    res.json({
      estadisticas,
      saludSistema,
      saludGeneral,
      fechaValidacion: new Date(),
      recomendaciones: generarRecomendaciones(estadisticas, saludSistema)
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función auxiliar para generar recomendaciones
function generarRecomendaciones(estadisticas, saludSistema) {
  const recomendaciones = [];
  
  if (!saludSistema.equipos) {
    recomendaciones.push('Registrar más equipos activos con jugadores');
  }
  
  if (!saludSistema.arbitros) {
    recomendaciones.push('Registrar más árbitros activos y disponibles');
  }
  
  if (!saludSistema.canchas) {
    recomendaciones.push('Registrar más canchas activas y disponibles');
  }
  
  if (estadisticas.arbitros.certificados < estadisticas.arbitros.activos) {
    recomendaciones.push('Completar certificaciones de árbitros');
  }
  
  if (estadisticas.equipos.conJugadores < estadisticas.equipos.activos) {
    recomendaciones.push('Registrar jugadores en todos los equipos activos');
  }
  
  return recomendaciones;
}

module.exports = router;
