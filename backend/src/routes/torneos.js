const express = require('express');
const router = express.Router();
const estadisticasRouter = require('./torneos-estadisticas');
const { verifyFirebaseToken, verifyOrganizador, verifyAllRoles } = require('../middleware/auth');
const TorneoService = require('../services/TorneoService');
const { db } = require('../config/firebase');

// Ruta anidada para estadísticas
router.use('/:torneoId/estadisticas', estadisticasRouter);

/**
 * @route POST /api/torneos
 * @desc Crear un nuevo torneo
 * @access Private (Solo organizadores)
 */
router.post('/', verifyFirebaseToken, verifyOrganizador, async (req, res) => {
  try {
    const userId = req.user.uid;
    const torneoData = req.body;

    // 🚀 OPTIMIZACIÓN: Validación más rápida con early return
    if (!torneoData.nombre?.trim() || !torneoData.categoria?.trim()) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        camposRequeridos: ['nombre', 'categoria']
      });
    }

    const torneo = await TorneoService.createTournament(torneoData, userId);

    res.status(201).json({
      message: 'Torneo creado correctamente',
      torneo
    });

  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * @route GET /api/torneos
 * @desc Obtener todos los torneos
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    // Verificar que Firebase esté disponible
    if (!db) {
      console.error('❌ Firebase no está inicializado');
      return res.status(500).json({
        error: 'Base de datos no disponible',
        details: 'Firebase no está inicializado correctamente'
      });
    }
    
    const filtros = req.query;
    
    const torneos = await TorneoService.getTournaments(filtros);

    res.json({
      message: 'Torneos obtenidos correctamente',
      torneos,
      total: torneos.length
    });

  } catch (error) {
    
    // En caso de error, devolver datos de ejemplo para desarrollo
    const torneosEjemplo = [
      {
        id: 'torneo-1',
        nombre: 'Torneo de Verano 2024',
        categoria: 'Primera División',
        estado: 'en_curso',
        fechaInicio: new Date(),
        fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        organizadorId: 'organizador-1'
      },
      {
        id: 'torneo-2',
        nombre: 'Copa Local 2024',
        categoria: 'Segunda División',
        estado: 'planificado',
        fechaInicio: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        fechaFin: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        organizadorId: 'organizador-2'
      }
    ];
    
    res.json({
      message: 'Torneos obtenidos correctamente (datos de ejemplo)',
      torneos: torneosEjemplo,
      total: torneosEjemplo.length,
      warning: 'Usando datos de ejemplo debido a error de base de datos'
    });
  }
});

/**
 * @route GET /api/torneos/equipo/:equipoId
 * @desc Obtener torneos de un equipo
 * @access Public
 */
router.get('/equipo/:equipoId', async (req, res) => {
  try {
    const { equipoId } = req.params;
    const resultado = await TorneoService.getTournamentsByTeam(equipoId);

    res.json({
      message: 'Torneos del equipo obtenidos correctamente',
      torneosActivos: resultado.activos,
      torneosFinalizados: resultado.finalizados,
      posiciones: resultado.posiciones,
      total: resultado.activos.length + resultado.finalizados.length
    });

  } catch (error) {
    console.error('Error obteniendo torneos del equipo:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/torneos/:id
 * @desc Obtener un torneo por ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const torneo = await TorneoService.getTournamentById(id);

    res.json({
      message: 'Torneo obtenido correctamente',
      torneo
    });

  } catch (error) {
    console.error('Error obteniendo torneo:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route PUT /api/torneos/:id
 * @desc Actualizar un torneo
 * @access Private (Solo el organizador propietario)
 */
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const updateData = req.body;

    // Validar que se envíen datos para actualizar
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No se proporcionaron datos para actualizar'
      });
    }

    const torneo = await TorneoService.updateTournament(id, updateData, userId);

    res.json({
      message: 'Torneo actualizado correctamente',
      torneo
    });

  } catch (error) {
    console.error('Error actualizando torneo:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    if (error.message.includes('No tienes permisos')) {
      return res.status(403).json({
        error: error.message
      });
    }
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/torneos/:id
 * @desc Eliminar un torneo
 * @access Private (Solo el organizador propietario)
 */
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const result = await TorneoService.deleteTournament(id, userId);

    res.json({
      message: result.message,
      torneoId: result.torneoId
    });

  } catch (error) {
    console.error('Error eliminando torneo:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    if (error.message.includes('No tienes permisos')) {
      return res.status(403).json({
        error: error.message
      });
    }
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * @route GET /api/torneos/:id/estadisticas
 * @desc Obtener estadísticas de un torneo
 * @access Public
 */
router.get('/:id/estadisticas', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await TorneoService.getTournamentStats(id);

    res.json({
      message: 'Estadísticas obtenidas correctamente',
      ...stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/torneos/:id/equipos
 * @desc Agregar equipos a un torneo
 * @access Private (Solo el organizador propietario)
 */
router.post('/:id/equipos', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const { equipoIds } = req.body;

    if (!equipoIds || !Array.isArray(equipoIds) || equipoIds.length === 0) {
      return res.status(400).json({
        error: 'Se requiere un array de IDs de equipos'
      });
    }

    const result = await TorneoService.addTeamsToTournament(id, equipoIds, userId);

    res.json({
      message: result.message,
      equiposAgregados: result.equiposAgregados,
      equiposInvalidos: result.equiposInvalidos,
      equiposTotales: result.equiposTotales,
      equiposInvalidos: result.equiposInvalidos
    });

  } catch (error) {
    console.error('Error agregando equipos al torneo:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    if (error.message.includes('No tienes permisos')) {
      return res.status(403).json({
        error: error.message
      });
    }
    res.status(400).json({
      error: error.message
        });
      }
    });
    
/**
 * @route GET /api/torneos/:id/equipos
 * @desc Obtener equipos de un torneo
 * @access Public
 */
router.get('/:id/equipos', async (req, res) => {
  try {
    const { id } = req.params;
    const equipos = await TorneoService.getTournamentTeams(id);

    res.json({
      message: 'Equipos del torneo obtenidos correctamente',
      equipos,
      total: equipos.length
    });

  } catch (error) {
    console.error('Error obteniendo equipos del torneo:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route DELETE /api/torneos/:id/equipos
 * @desc Remover equipos de un torneo
 * @access Private (Solo el organizador propietario)
 */
router.delete('/:id/equipos', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const { equipoIds } = req.body;

    if (!equipoIds || !Array.isArray(equipoIds) || equipoIds.length === 0) {
      return res.status(400).json({
        error: 'Se requiere un array de IDs de equipos'
      });
    }

    const result = await TorneoService.removeTeamsFromTournament(id, equipoIds, userId);
    
    res.json({
      message: result.message,
      equiposRemovidos: result.equiposRemovidos,
      equiposRestantes: result.equiposRestantes
    });

  } catch (error) {
    console.error('Error removiendo equipos del torneo:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    if (error.message.includes('No tienes permisos')) {
      return res.status(403).json({
        error: error.message
      });
    }
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * @route POST /api/torneos/:id/comenzar
 * @desc Comenzar un torneo
 * @access Private (Solo el organizador propietario)
 */
router.post('/:id/comenzar', verifyFirebaseToken, verifyOrganizador, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const result = await TorneoService.startTournament(id, userId);

    res.json({
      message: result.message,
      equiposParticipantes: result.equiposParticipantes,
      tablaPosiciones: result.tablaPosiciones
    });

  } catch (error) {
    console.error('Error comenzando torneo:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    if (error.message.includes('No tienes permisos')) {
      return res.status(403).json({
        error: error.message
      });
    }
    res.status(400).json({
      error: error.message
        });
      }
    });
    
/**
 * @route GET /api/torneos/:id/tabla-posiciones
 * @desc Obtener tabla de posiciones de un torneo
 * @access Public
 */
router.get('/:id/tabla-posiciones', async (req, res) => {
  try {
    const { id } = req.params;
    const tablaPosiciones = await TorneoService.getTournamentTable(id);

    res.json({
      message: 'Tabla de posiciones obtenida correctamente',
      tablaPosiciones,
      total: tablaPosiciones.length
    });

  } catch (error) {
    console.error('Error obteniendo tabla de posiciones:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/torneos/:id/equipos-para-partidos
 * @desc Obtener equipos de un torneo para crear partidos
 * @access Public
 */
router.get('/:id/equipos-para-partidos', async (req, res) => {
  try {
    const { id } = req.params;
    const equipos = await TorneoService.getTournamentTeams(id);

    // Formatear equipos para el formulario de partidos
    const equiposFormateados = equipos.map(equipo => ({
      id: equipo.id,
      nombre: equipo.nombre,
      logo: equipo.logo
    }));
    
    res.json({
      message: 'Equipos del torneo obtenidos correctamente',
      equipos: equiposFormateados,
      total: equiposFormateados.length
    });

  } catch (error) {
    console.error('Error obteniendo equipos del torneo:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/torneos/:id/fixture
 * @desc Obtener fixture de un torneo
 * @access Public
 */
router.get('/:id/fixture', async (req, res) => {
  try {
    const { id } = req.params;

    const fixture = await TorneoService.getTournamentFixture(id);

    res.json({
      message: 'Fixture del torneo obtenido correctamente',
      ...fixture
    });
  } catch (error) {
    console.error(`❌ Error en endpoint fixture para torneo ${req.params.id}:`, error);
    console.error(`❌ Error stack:`, error.stack);
    
    if (error.message.includes('Torneo no encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/torneos/:id/generar-fixture-eliminacion
 * @desc Generar fixture para torneo de eliminación directa
 * @access Private (Solo el organizador propietario)
 */
router.post('/:id/generar-fixture-eliminacion', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const result = await TorneoService.generarFixtureEliminacionDirecta(id, userId);

    res.json({
      message: result.message,
      estructuraEliminacion: result.estructuraEliminacion,
      partidosGenerados: result.partidosGenerados,
      faseActual: result.faseActual
    });

  } catch (error) {
    console.error('Error generando fixture de eliminación directa:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    if (error.message.includes('No tienes permisos')) {
      return res.status(403).json({
        error: error.message
      });
    }
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * @route POST /api/torneos/:id/progresar-fase
 * @desc Progresar a la siguiente fase de eliminación directa
 * @access Private (Solo el organizador propietario)
 */
router.post('/:id/progresar-fase', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Verificar permisos
    const torneoDoc = await db.collection('torneos').doc(id).get();
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const torneoData = torneoDoc.data();
    if (torneoData.organizadorId !== userId) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este torneo' });
    }

    const result = await TorneoService.progresarFaseEliminacionDirecta(id);

    res.json({
      message: result.message,
      faseActual: result.faseActual,
      partidosGenerados: result.partidosGenerados,
      ganadores: result.ganadores,
      campeon: result.campeon,
      subcampeon: result.subcampeon,
      clasificacionFinal: result.clasificacionFinal
    });

  } catch (error) {
    console.error('Error progresando fase:', error);
    if (error.message === 'Torneo no encontrado') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * @route GET /api/torneos/:id/fases
 * @desc Obtener fases de un torneo
 * @access Public
 */
router.get('/:id/fases', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos del torneo
    const torneoDoc = await db.collection('torneos').doc(id).get();
    
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const torneo = { id: torneoDoc.id, ...torneoDoc.data() };

    // Obtener partidos del torneo
    const partidosSnapshot = await db.collection('partidos')
      .where('torneoId', '==', id)
      .orderBy('fecha', 'asc')
      .get();

    const partidos = [];
    partidosSnapshot.forEach(doc => {
      partidos.push({ id: doc.id, ...doc.data() });
    });

    // 🚀 OPTIMIZACIÓN: Obtener equipos del torneo en paralelo
    const equipos = [];
    if (torneo.tablaPosiciones && torneo.tablaPosiciones.length > 0) {
      // Usar la tabla de posiciones del torneo
      const equipoPromises = torneo.tablaPosiciones.map(equipoStats =>
        db.collection('equipos').doc(equipoStats.equipoId).get()
      );
      
      const equipoDocs = await Promise.all(equipoPromises);
      
      equipoDocs.forEach((equipoDoc, index) => {
        if (equipoDoc.exists) {
          const equipoStats = torneo.tablaPosiciones[index];
          equipos.push({
            id: equipoStats.equipoId,
            nombre: equipoStats.nombre,
            logo: equipoStats.logo,
            estadisticas: {
              partidosJugados: equipoStats.partidosJugados || 0,
              partidosGanados: equipoStats.partidosGanados || 0,
              partidosPerdidos: equipoStats.partidosPerdidos || 0,
              partidosEmpatados: equipoStats.partidosEmpatados || 0,
              puntosAFavor: equipoStats.puntosAFavor || 0,
              puntosEnContra: equipoStats.puntosEnContra || 0,
              puntosTabla: equipoStats.puntosTabla || 0,
              diferenciaPuntos: equipoStats.diferenciaPuntos || 0,
              puntosBonus: equipoStats.puntosBonus || 0,
              bonusOfensivo: equipoStats.bonusOfensivo || 0,
              bonusDefensivo: equipoStats.bonusDefensivo || 0
            }
          });
        }
      });
    }

    // Organizar partidos por fases/grupos
    const fases = [];
    
    if (torneo.grupos && Object.keys(torneo.grupos).length > 0) {
      // Torneo con grupos
      for (const [nombreGrupo, grupoData] of Object.entries(torneo.grupos)) {
        const partidosGrupo = partidos.filter(p => p.grupo === nombreGrupo);
        
        // 🚀 OPTIMIZACIÓN: Obtener equipos del grupo en paralelo
        const equiposDelGrupo = [];
        if (grupoData.tablaPosiciones && Array.isArray(grupoData.tablaPosiciones)) {
          const equipoPromises = grupoData.tablaPosiciones.map(equipoStats =>
            db.collection('equipos').doc(equipoStats.equipoId).get()
          );
          
          const equipoDocs = await Promise.all(equipoPromises);
          
          equipoDocs.forEach((equipoDoc, index) => {
            if (equipoDoc.exists) {
              const equipoStats = grupoData.tablaPosiciones[index];
              const equipoData = equipoDoc.data();
              equiposDelGrupo.push({
                id: equipoStats.equipoId,
                nombre: equipoStats.nombreEquipo || equipoData.nombre,
                logo: equipoData.logo,
                estadisticas: {
                  partidosJugados: equipoStats.partidosJugados || 0,
                  partidosGanados: equipoStats.ganados || 0,
                  partidosPerdidos: equipoStats.perdidos || 0,
                  partidosEmpatados: equipoStats.empatados || 0,
                  puntosAFavor: equipoStats.puntosAFavor || 0,
                  puntosEnContra: equipoStats.puntosEnContra || 0,
                  puntosTotales: equipoStats.puntosTotales || 0,
                  diferencia: equipoStats.diferencia || 0,
                  bonusOfensivo: equipoStats.bonusOfensivo || 0,
                  bonusDefensivo: equipoStats.bonusDefensivo || 0
                }
              });
            }
          });
        }
        
        // Ordenar equipos por puntos (descendente) y diferencia (descendente)
        const equiposOrdenados = equiposDelGrupo.sort((a, b) => {
          // Primero por puntos totales
          if (b.estadisticas.puntosTotales !== a.estadisticas.puntosTotales) {
            return b.estadisticas.puntosTotales - a.estadisticas.puntosTotales;
          }
          // Luego por diferencia de puntos
          return b.estadisticas.diferencia - a.estadisticas.diferencia;
        });

        // Generar tabla de posiciones formateada
        const tablaPosiciones = equiposOrdenados.map((equipo, index) => {
          const posicion = index + 1;
          let emoji = '';
          if (posicion === 1) emoji = '🥇';
          else if (posicion === 2) emoji = '🥈';
          else if (posicion === 3) emoji = '🥉';
          else emoji = `${posicion}º`;

          return {
            posicion: posicion,
            emoji: emoji,
            equipo: {
              id: equipo.id,
              nombre: equipo.nombre,
              logo: equipo.logo
            },
            estadisticas: {
              partidosJugados: equipo.estadisticas.partidosJugados,
              partidosGanados: equipo.estadisticas.partidosGanados,
              partidosEmpatados: equipo.estadisticas.partidosEmpatados,
              partidosPerdidos: equipo.estadisticas.partidosPerdidos,
              puntosAFavor: equipo.estadisticas.puntosAFavor,
              puntosEnContra: equipo.estadisticas.puntosEnContra,
              diferencia: equipo.estadisticas.diferencia,
              bonusOfensivo: equipo.estadisticas.bonusOfensivo,
              bonusDefensivo: equipo.estadisticas.bonusDefensivo,
              puntosTotales: equipo.estadisticas.puntosTotales
            }
          };
        });

        const fase = {
          nombre: nombreGrupo,
          partidos: partidosGrupo.map(partido => ({
            id: partido.id,
            equipoLocal: partido.equipoLocal,
            equipoLocalId: partido.equipoLocalId,
            equipoLocalLogo: partido.equipoLocalLogo,
            equipoVisitante: partido.equipoVisitante,
            equipoVisitanteId: partido.equipoVisitanteId,
            equipoVisitanteLogo: partido.equipoVisitanteLogo,
            resultado: partido.resultado,
            estado: partido.estado,
            fecha: partido.fecha,
            horaInicio: partido.horaInicio,
            cancha: partido.cancha
          })),
          totalPartidos: partidosGrupo.length,
          partidosJugados: partidosGrupo.filter(p => p.estado === 'finalizado').length,
          partidosPendientes: partidosGrupo.filter(p => p.estado === 'programado').length,
          partidosEnCurso: partidosGrupo.filter(p => p.estado === 'En Curso').length,
          equiposClasificados: equiposDelGrupo.map(equipo => ({
            id: equipo.id,
            nombre: equipo.nombre,
            logo: equipo.logo
          })),
          tablaPosiciones: tablaPosiciones
        };
        
        fases.push(fase);
      }
    } else {
      // Torneo sin grupos (fase única)
      const fase = {
        nombre: 'Fase Regular',
        partidos: partidos.map(partido => ({
          id: partido.id,
          equipoLocal: partido.equipoLocal,
          equipoLocalId: partido.equipoLocalId,
          equipoLocalLogo: partido.equipoLocalLogo,
          equipoVisitante: partido.equipoVisitante,
          equipoVisitanteId: partido.equipoVisitanteId,
          equipoVisitanteLogo: partido.equipoVisitanteLogo,
          resultado: partido.resultado,
          estado: partido.estado,
          fecha: partido.fecha,
          horaInicio: partido.horaInicio,
          cancha: partido.cancha
        })),
        totalPartidos: partidos.length,
        partidosJugados: partidos.filter(p => p.estado === 'finalizado').length,
        partidosPendientes: partidos.filter(p => p.estado === 'programado').length,
        partidosEnCurso: partidos.filter(p => p.estado === 'En Curso').length,
        equiposClasificados: equipos.map(equipo => ({
          id: equipo.id,
          nombre: equipo.nombre,
          logo: equipo.logo
        }))
      };
      
      fases.push(fase);
    }

    res.json({
      message: 'Fases del torneo obtenidas correctamente',
      torneo: {
        id: torneo.id,
        nombre: torneo.nombre,
        categoria: torneo.categoria,
        estado: torneo.estado
      },
      fases
    });

  } catch (error) {
    console.error(`❌ Error en endpoint fases para torneo ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/torneos/equipo/:equipoId/activos
 * @desc Obtener torneos activos de un equipo
 * @access Public
 */
router.get('/equipo/:equipoId/activos', async (req, res) => {
  try {
    const equipoId = req.params.equipoId;
    

    // Buscar torneos donde el equipo participe
    const torneosSnapshot = await db.collection('torneos')
      .where('estado', 'in', ['en_curso', 'activo', 'programado'])
      .get();
    
    const torneosActivos = [];
    
    for (const doc of torneosSnapshot.docs) {
      const torneoData = doc.data();
      
      // Verificar si el equipo está en la lista de equipos del torneo
      if (torneoData.equipos && torneoData.equipos.includes(equipoId)) {
        torneosActivos.push({
          id: doc.id,
          ...torneoData
        });
      }
    }
    

    res.json(torneosActivos);
  } catch (error) {
    console.error('❌ Error obteniendo torneos activos del equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
