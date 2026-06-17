/**
 * Endpoint adicional para estadísticas de torneos
 * Requerido por EstadisticasTorneo.tsx
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { db } = require('../config/firebase');
const { verifyFirebaseToken } = require('../middleware/auth');

// Obtener estadísticas completas de un torneo
router.get('/', async (req, res) => {
  try {
    const { torneoId } = req.params;

    // Obtener torneo
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const torneoData = torneoDoc.data();

    // Obtener todos los partidos del torneo (solo finalizados para estadísticas reales)
    const partidosSnapshot = await db.collection('partidos')
      .where('torneoId', '==', torneoId)
      .where('estado', '==', 'finalizado')
      .get();
    

    const estadisticasEquipos = {};
    const goleadoresMap = {};
    const tarjetasAmarillasMap = {};
    const tarjetasRojasMap = {};
    let totalTries = 0;
    let totalPuntos = 0;
    let totalTarjetasAmarillas = 0;
    let totalTarjetasRojas = 0;

    // Obtener logos de equipos desde la colección equipos
    const equiposLogoMap = new Map();
    const equiposIds = new Set();
    
    // Recopilar todos los IDs de equipos únicos
    for (const doc of partidosSnapshot.docs) {
      const partido = doc.data();
      if (partido.equipoLocalId) equiposIds.add(partido.equipoLocalId);
      if (partido.equipoVisitanteId) equiposIds.add(partido.equipoVisitanteId);
    }
    
    // Obtener logos desde la colección equipos
    for (const equipoId of equiposIds) {
      try {
        const equipoDoc = await db.collection('equipos').doc(equipoId).get();
        if (equipoDoc.exists) {
          const equipoData = equipoDoc.data();
          equiposLogoMap.set(equipoId, equipoData.logo || null);
        }
      } catch (error) {
        console.error(`Error obteniendo logo del equipo ${equipoId}:`, error);
      }
    }

    // Procesar partidos
    for (const doc of partidosSnapshot.docs) {
      const partido = doc.data();

      // Procesar equipo local
      const equipoLocalId = partido.equipoLocalId;
      if (!estadisticasEquipos[equipoLocalId]) {
        // Intentar obtener logo desde múltiples fuentes
        const logoLocal = partido.equipoLocal?.logo || 
                         partido.equipoLocalLogo || 
                         equiposLogoMap.get(equipoLocalId) || 
                         null;
        
        estadisticasEquipos[equipoLocalId] = {
          equipoId: equipoLocalId,
          equipoNombre: partido.equipoLocal?.nombre || partido.equipoLocal,
          equipoLogo: logoLocal,
          tries: 0,
          puntosAFavor: 0,
          puntosEnContra: 0,
          partidosJugados: 0,
          partidosGanados: 0,
          tarjetasAmarillas: 0,
          tarjetasRojas: 0
        };
      }

      // Procesar equipo visitante
      const equipoVisitanteId = partido.equipoVisitanteId;
      if (!estadisticasEquipos[equipoVisitanteId]) {
        // Intentar obtener logo desde múltiples fuentes
        const logoVisitante = partido.equipoVisitante?.logo || 
                              partido.equipoVisitanteLogo || 
                              equiposLogoMap.get(equipoVisitanteId) || 
                              null;
        
        estadisticasEquipos[equipoVisitanteId] = {
          equipoId: equipoVisitanteId,
          equipoNombre: partido.equipoVisitante?.nombre || partido.equipoVisitante,
          equipoLogo: logoVisitante,
          tries: 0,
          puntosAFavor: 0,
          puntosEnContra: 0,
          partidosJugados: 0,
          partidosGanados: 0,
          tarjetasAmarillas: 0,
          tarjetasRojas: 0
        };
      }

      // Actualizar estadísticas
      estadisticasEquipos[equipoLocalId].tries += partido.resultado?.triesLocal || 0;
      estadisticasEquipos[equipoLocalId].puntosAFavor += partido.resultado?.puntosLocal || 0;
      estadisticasEquipos[equipoLocalId].puntosEnContra += partido.resultado?.puntosVisitante || 0;
      estadisticasEquipos[equipoLocalId].partidosJugados++;
      estadisticasEquipos[equipoLocalId].tarjetasAmarillas += partido.estadisticas?.tarjetasAmarillasLocal || 0;
      estadisticasEquipos[equipoLocalId].tarjetasRojas += partido.estadisticas?.tarjetasRojasLocal || 0;

      estadisticasEquipos[equipoVisitanteId].tries += partido.resultado?.triesVisitante || 0;
      estadisticasEquipos[equipoVisitanteId].puntosAFavor += partido.resultado?.puntosVisitante || 0;
      estadisticasEquipos[equipoVisitanteId].puntosEnContra += partido.resultado?.puntosLocal || 0;
      estadisticasEquipos[equipoVisitanteId].partidosJugados++;
      estadisticasEquipos[equipoVisitanteId].tarjetasAmarillas += partido.estadisticas?.tarjetasAmarillasVisitante || 0;
      estadisticasEquipos[equipoVisitanteId].tarjetasRojas += partido.estadisticas?.tarjetasRojasVisitante || 0;

      if (partido.resultado?.puntosLocal > partido.resultado?.puntosVisitante) {
        estadisticasEquipos[equipoLocalId].partidosGanados++;
      } else if (partido.resultado?.puntosVisitante > partido.resultado?.puntosLocal) {
        estadisticasEquipos[equipoVisitanteId].partidosGanados++;
      }

      // Totales generales
      totalTries += (partido.resultado?.triesLocal || 0) + (partido.resultado?.triesVisitante || 0);
      totalPuntos += (partido.resultado?.puntosLocal || 0) + (partido.resultado?.puntosVisitante || 0);
      totalTarjetasAmarillas += (partido.estadisticas?.tarjetasAmarillasLocal || 0) + (partido.estadisticas?.tarjetasAmarillasVisitante || 0);
      totalTarjetasRojas += (partido.estadisticas?.tarjetasRojasLocal || 0) + (partido.estadisticas?.tarjetasRojasVisitante || 0);

      // Procesar goleadores y tarjetas por jugador
      if (partido.incidencias) {
        for (const incidencia of partido.incidencias) {
          const jugadorId = incidencia.jugadorId;
          const equipoIdDeJugador = incidencia.equipoId === equipoLocalId ? equipoLocalId : equipoVisitanteId;
          const equipoNombreDeJugador = incidencia.equipoId === equipoLocalId ? 
            estadisticasEquipos[equipoLocalId].equipoNombre : 
            estadisticasEquipos[equipoVisitanteId].equipoNombre;
          const equipoLogoDeJugador = incidencia.equipoId === equipoLocalId ? 
            estadisticasEquipos[equipoLocalId].equipoLogo : 
            estadisticasEquipos[equipoVisitanteId].equipoLogo;
          
          if (incidencia.tipo === 'TRY') {
            if (!goleadoresMap[jugadorId]) {
              goleadoresMap[jugadorId] = {
                jugadorId,
                jugadorNombre: incidencia.jugadorNombre,
                jugadorFoto: incidencia.jugadorFoto,
                equipoNombre: equipoNombreDeJugador,
                equipoLogo: equipoLogoDeJugador,
                tries: 0
              };
            }
            goleadoresMap[jugadorId].tries++;
          } else if (incidencia.tipo === 'TARJETA_AMARILLA') {
            if (!tarjetasAmarillasMap[jugadorId]) {
              tarjetasAmarillasMap[jugadorId] = {
                jugadorId,
                jugadorNombre: incidencia.jugadorNombre,
                jugadorFoto: incidencia.jugadorFoto,
                equipoNombre: equipoNombreDeJugador,
                equipoLogo: equipoLogoDeJugador,
                tarjetasAmarillas: 0
              };
            }
            tarjetasAmarillasMap[jugadorId].tarjetasAmarillas++;
          } else if (incidencia.tipo === 'TARJETA_ROJA') {
            if (!tarjetasRojasMap[jugadorId]) {
              tarjetasRojasMap[jugadorId] = {
                jugadorId,
                jugadorNombre: incidencia.jugadorNombre,
                jugadorFoto: incidencia.jugadorFoto,
                equipoNombre: equipoNombreDeJugador,
                equipoLogo: equipoLogoDeJugador,
                tarjetasRojas: 0
              };
            }
            tarjetasRojasMap[jugadorId].tarjetasRojas++;
          }
        }
      }
    }

    // Convertir a arrays y ordenar
    const equiposArray = Object.values(estadisticasEquipos)
      .sort((a, b) => b.tries - a.tries);

    const goleadoresArray = Object.values(goleadoresMap)
      .sort((a, b) => b.tries - a.tries);

    const tarjetasAmarillasArray = Object.values(tarjetasAmarillasMap)
      .sort((a, b) => b.tarjetasAmarillas - a.tarjetasAmarillas);

    const tarjetasRojasArray = Object.values(tarjetasRojasMap)
      .sort((a, b) => b.tarjetasRojas - a.tarjetasRojas);

    // Determinar mejor defensa
    const mejorDefensa = Object.values(estadisticasEquipos)
      .reduce((min, equipo) => equipo.puntosEnContra < min.puntosEnContra ? equipo : min, 
              equiposArray[0] || {});

    // Usar solo datos reales
    const goleadoresFinal = goleadoresArray;
    const tarjetasAmarillasFinal = tarjetasAmarillasArray;
    const tarjetasRojasFinal = tarjetasRojasArray;

    const resultado = {
      totales: {
        tries: totalTries,
        puntos: totalPuntos,
        tarjetasAmarillas: totalTarjetasAmarillas,
        tarjetasRojas: totalTarjetasRojas,
        partidosJugados: partidosSnapshot.size
      },
      equipos: equiposArray,
      goleadores: goleadoresFinal,
      tarjetasAmarillas: tarjetasAmarillasFinal,
      tarjetasRojas: tarjetasRojasFinal,
      mejorDefensa
    };

    res.json(resultado);

  } catch (error) {
    console.error('Error obteniendo estadísticas del torneo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;






















