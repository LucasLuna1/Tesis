/**
 * Rutas para gestión de partidos de rugby en tiempo real
 * User Story 1.1: Como árbitro, quiero registrar los tries, conversiones, penales y drops en tiempo real
 * User Story 1.2: Como árbitro, quiero poder registrar tarjetas amarillas y rojas para jugadores
 * User Story 1.3: Como árbitro, quiero registrar lesiones ocurridas durante el partido
 * User Story 1.4: Como árbitro, quiero registrar los cambios de jugadores
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const Partido = require('../models/Partido');
const PartidoService = require('../services/PartidoService');
const { verifyFirebaseToken } = require('../middleware/auth');

// Caché en memoria para reducir consultas (TTL: 30 segundos)
const cache = new Map();
const CACHE_TTL = 30000; // 30 segundos

const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Middleware para limpiar caché después de modificaciones
const clearPartidoCache = (partidoId) => {
  clearCache(partidoId);
};

// Middleware para verificar que el usuario es árbitro
const verificarArbitro = async (req, res, next) => {
  try {
    const arbitroId = req.user.uid;
    const arbitroDoc = await db.collection('arbitros').doc(arbitroId).get();
    
    if (!arbitroDoc.exists) {
      return res.status(403).json({ error: 'Usuario no es árbitro' });
    }
    
    req.arbitroId = arbitroId;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener partido en curso del árbitro
router.get('/mi-partido', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const partidos = await PartidoService.getPartidosPorArbitro(req.arbitroId, { estado: 'En Curso' });
    
    if (partidos.length === 0) {
      return res.status(404).json({ error: 'No tienes partidos en curso' });
    }
    
    res.json(partidos[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar Try (Rugby)
router.post('/:partidoId/try', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipo, minuto, tiempo, asistencia } = req.body;
    
    if (!jugadorId || !jugadorNombre || !equipo || !minuto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    // Verificar que el árbitro puede registrar en este partido
    const puedeRegistrar = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId) ||
                          partido.arbitros.cuartoArbitro?.id === req.arbitroId;
    
    if (!puedeRegistrar) {
      return res.status(403).json({ error: 'No tienes permisos para registrar en este partido' });
    }
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }
    
    const incidencia = partido.registrarTry(
      jugadorId, 
      jugadorNombre, 
      equipo, 
      minuto, 
      tiempo || '1T', 
      asistencia,
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    res.json({
      success: true,
      incidencia,
      marcador: {
        local: partido.resultado.puntosLocal,
        visitante: partido.resultado.puntosVisitante
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar Conversión (Rugby)
router.post('/:partidoId/conversion', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipo, minuto, tiempo } = req.body;
    
    if (!jugadorId || !jugadorNombre || !equipo || !minuto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }
    
    const incidencia = partido.registrarConversion(
      jugadorId, 
      jugadorNombre, 
      equipo, 
      minuto, 
      tiempo || '1T',
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    res.json({
      success: true,
      incidencia,
      marcador: {
        local: partido.resultado.puntosLocal,
        visitante: partido.resultado.puntosVisitante
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar Penal (Rugby)
router.post('/:partidoId/penal', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipo, minuto, tiempo } = req.body;
    
    if (!jugadorId || !jugadorNombre || !equipo || !minuto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }
    
    const incidencia = partido.registrarPenal(
      jugadorId, 
      jugadorNombre, 
      equipo, 
      minuto, 
      tiempo || '1T',
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    res.json({
      success: true,
      incidencia,
      marcador: {
        local: partido.resultado.puntosLocal,
        visitante: partido.resultado.puntosVisitante
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar Drop (Rugby)
router.post('/:partidoId/drop', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipo, minuto, tiempo } = req.body;
    
    if (!jugadorId || !jugadorNombre || !equipo || !minuto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }
    
    const incidencia = partido.registrarDrop(
      jugadorId, 
      jugadorNombre, 
      equipo, 
      minuto, 
      tiempo || '1T',
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    res.json({
      success: true,
      incidencia,
      marcador: {
        local: partido.resultado.puntosLocal,
        visitante: partido.resultado.puntosVisitante
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar tarjeta amarilla
router.post('/:partidoId/tarjeta-amarilla', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipo, minuto, tiempo, motivo } = req.body;
    
    if (!jugadorId || !jugadorNombre || !equipo || !minuto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    // Verificar permisos
    const puedeRegistrar = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId) ||
                          partido.arbitros.cuartoArbitro?.id === req.arbitroId;
    
    if (!puedeRegistrar) {
      return res.status(403).json({ error: 'No tienes permisos para registrar en este partido' });
    }
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }
    
    const incidencia = partido.registrarTarjetaAmarilla(
      jugadorId, 
      jugadorNombre, 
      equipo, 
      minuto, 
      tiempo || '1T', 
      motivo, 
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    // Marcar al jugador como inactivo temporalmente (sin bin - 10 minutos)
    const equipoId = equipo === 'LOCAL' ? partido.equipoLocalId : partido.equipoVisitanteId;
    const convocadosQuery = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .where('equipoId', '==', equipoId)
      .limit(1)
      .get();

    if (!convocadosQuery.empty) {
      const convocadoDoc = convocadosQuery.docs[0];
      const convocadosData = convocadoDoc.data();

      const jugadoresActualizados = convocadosData.jugadores.map(j => {
        if (j.id === jugadorId) {
          return {
            ...j,
            activo: false, // Sale temporalmente
            enSinBin: true, // Marcado como expulsión temporal
            minutoSinBin: minuto, // Minuto en que recibió la amarilla
            minutoPuedeVolver: minuto + 10 // Puede volver en 10 minutos
          };
        }
        return j;
      });

      await convocadoDoc.ref.update({
        jugadores: jugadoresActualizados,
        fechaActualizacion: new Date()
      });
    }
    
    res.json({
      success: true,
      incidencia,
      message: 'Tarjeta amarilla registrada. Jugador expulsado temporalmente por 10 minutos.'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Autorizar regreso de jugador después de tarjeta amarilla (sin bin)
router.post('/:partidoId/autorizar-regreso', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, equipo, minutoRegreso } = req.body;
    
    if (!jugadorId || !equipo) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    const equipoId = equipo === 'LOCAL' ? partido.equipoLocalId : partido.equipoVisitanteId;
    
    // Reactivar al jugador en convocados
    const convocadosQuery = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .where('equipoId', '==', equipoId)
      .limit(1)
      .get();

    if (convocadosQuery.empty) {
      return res.status(404).json({ error: 'No se encontraron convocados para este equipo' });
    }

    const convocadoDoc = convocadosQuery.docs[0];
    const convocadosData = convocadoDoc.data();

    const jugadoresActualizados = convocadosData.jugadores.map(j => {
      if (j.id === jugadorId && j.enSinBin) {
        return {
          ...j,
          activo: true, // Vuelve al campo
          enSinBin: false,
          minutoRegreso: minutoRegreso
        };
      }
      return j;
    });

    await convocadoDoc.ref.update({
      jugadores: jugadoresActualizados,
      fechaActualizacion: new Date()
    });
    
    res.json({
      success: true,
      message: 'Jugador autorizado para regresar al campo'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar tarjeta roja
router.post('/:partidoId/tarjeta-roja', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipo, minuto, tiempo, motivo } = req.body;
    
    if (!jugadorId || !jugadorNombre || !equipo || !minuto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    // Verificar permisos
    const puedeRegistrar = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId) ||
                          partido.arbitros.cuartoArbitro?.id === req.arbitroId;
    
    if (!puedeRegistrar) {
      return res.status(403).json({ error: 'No tienes permisos para registrar en este partido' });
    }
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }
    
    const incidencia = partido.registrarTarjetaRoja(
      jugadorId, 
      jugadorNombre, 
      equipo, 
      minuto, 
      tiempo || '1T', 
      motivo, 
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    res.json({
      success: true,
      incidencia
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar tarjeta azul (lesión)
router.post('/:partidoId/tarjeta-azul', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipo, minuto, tiempo, motivoLesion } = req.body;
    
    if (!jugadorId || !jugadorNombre || !equipo || minuto === undefined) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    // Verificar permisos
    const puedeRegistrar = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId) ||
                          partido.arbitros.cuartoArbitro?.id === req.arbitroId;
    
    if (!puedeRegistrar) {
      return res.status(403).json({ error: 'No tienes permisos para registrar en este partido' });
    }
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }

    const incidencia = partido.registrarTarjetaAzul(
      jugadorId, 
      jugadorNombre, 
      equipo, 
      minuto, 
      tiempo || '1T', 
      motivoLesion, 
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    res.json({
      success: true,
      incidencia
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar cambio de jugador
router.post('/:partidoId/cambio', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorEntra, jugadorSale, equipo, minuto, tiempo } = req.body;
    
    if (!jugadorEntra || !jugadorSale || !equipo || !minuto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    // Verificar permisos
    const puedeRegistrar = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId) ||
                          partido.arbitros.cuartoArbitro?.id === req.arbitroId;
    
    if (!puedeRegistrar) {
      return res.status(403).json({ error: 'No tienes permisos para registrar en este partido' });
    }
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }
    
    // VALIDAR LÍMITE DE 8 CAMBIOS POR EQUIPO
    const cambiosRealizados = (partido.incidencias || []).filter(
      inc => (inc.tipo === 'CAMBIO' || inc.tipo === 'cambio') && inc.equipo === equipo
    );
    
    if (cambiosRealizados.length >= 8) {
      return res.status(400).json({ 
        error: 'Límite de cambios alcanzado',
        mensaje: 'Ya se realizaron 8 cambios para este equipo. No se pueden realizar más cambios según las reglas del rugby.'
      });
    }
    
    const incidencia = partido.registrarCambio(
      jugadorEntra, 
      jugadorSale, 
      equipo, 
      minuto, 
      tiempo || '1T', 
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    // ACTUALIZAR CONVOCADOS: Cambiar estado de jugadores
    const equipoId = equipo === 'LOCAL' ? partido.equipoLocalId : partido.equipoVisitanteId;
    
    const convocadosQuery = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .where('equipoId', '==', equipoId)
      .limit(1)
      .get();
    
    if (!convocadosQuery.empty) {
      const convocadoDoc = convocadosQuery.docs[0];
      const convocadosData = convocadoDoc.data();
      
      // Actualizar jugadores
      const jugadoresActualizados = convocadosData.jugadores.map(j => {
        if (j.id === jugadorSale.id) {
          // Jugador que SALE
          return {
            ...j,
            activo: false,
            minutoSalida: minuto,
            minutosJugados: (j.minutosJugados || 0) + (minuto - (j.minutoInicio || 0))
          };
        } else if (j.id === jugadorEntra.id) {
          // Jugador que ENTRA
          return {
            ...j,
            activo: true,
            minutoInicio: minuto
          };
        }
        return j;
      });
      
      await convocadoDoc.ref.update({
        jugadores: jugadoresActualizados,
        fechaActualizacion: new Date()
      });
    }
    
    // Limpiar caché
    clearPartidoCache(partidoId);
    
    res.json({
      success: true,
      incidencia
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener minutos jugados en tiempo real
router.get('/:partidoId/minutos-jugados', verifyFirebaseToken, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const cacheKey = `minutos-${partidoId}`;

    // Intentar obtener de caché
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Obtener convocados del partido - solo campos necesarios
    const convocadosSnapshot = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .select('equipoId', 'equipoNombre', 'jugadores')
      .get();

    const minutosJugados = [];

    convocadosSnapshot.docs.forEach(doc => {
      const convocados = doc.data();
      convocados.jugadores.forEach(jugador => {
        minutosJugados.push({
          id: jugador.id,
          nombre: jugador.nombre,
          apellido: jugador.apellido,
          equipoId: convocados.equipoId,
          equipoNombre: convocados.equipoNombre,
          minutoInicio: jugador.minutoInicio || null,
          minutoSalida: jugador.minutoSalida || null,
          minutosJugados: jugador.minutosJugados || 0,
          activo: jugador.activo || false,
          esTitular: jugador.esTitular || false,
          enSinBin: jugador.enSinBin || false,
          expulsado: jugador.expulsado || false
        });
      });
    });

    const response = { minutosJugados };
    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error('Error obteniendo minutos jugados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Registrar lesión
router.post('/:partidoId/lesion', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipo, minuto, tiempo, gravedad, tiempoRecuperacion, motivo } = req.body;
    
    if (!jugadorId || !jugadorNombre || !equipo || !minuto || !gravedad) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = new Partido(partidoDoc.data());
    
    // Verificar permisos
    const puedeRegistrar = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId) ||
                          partido.arbitros.cuartoArbitro?.id === req.arbitroId;
    
    if (!puedeRegistrar) {
      return res.status(403).json({ error: 'No tienes permisos para registrar en este partido' });
    }
    
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido no está en curso' });
    }
    
    const incidencia = partido.registrarLesion(
      jugadorId, 
      jugadorNombre, 
      equipo, 
      minuto, 
      tiempo || '1T', 
      gravedad, 
      tiempoRecuperacion, 
      motivo, 
      req.arbitroId
    );
    
    await db.collection('partidos').doc(partidoId).update(partido.toJSON());
    
    res.json({
      success: true,
      incidencia
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener incidencias del partido
router.get('/:partidoId/incidencias', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Verificar permisos
    const puedeVer = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitros?.cuartoArbitro?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId);
    
    if (!puedeVer) {
      return res.status(403).json({ error: 'No tienes permisos para ver este partido' });
    }
    
    res.json({
      incidencias: partido.incidencias || [],
      marcador: {
        local: partido.resultado?.puntosLocal || 0,
        visitante: partido.resultado?.puntosVisitante || 0
      },
      estado: partido.estado
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener jugadores de un equipo filtrados por categoría del partido
// IMPORTANTE: Esta ruta DEBE ir ANTES de la ruta general /jugadores para que Express la capture correctamente
router.get('/:partidoId/equipo/:equipo/jugadores/categoria', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId, equipo } = req.params;
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Verificar permisos
    const puedeVer = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitros?.cuartoArbitro?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId);
    
    if (!puedeVer) {
      return res.status(403).json({ error: 'No tienes permisos para ver este partido' });
    }
    
    // Obtener la categoría del partido
    const categoriaPartido = partido.categoria || partido.torneoNombre?.match(/M\d+/)?.[0] || 'M16';
    
    // Obtener el equipo correspondiente
    const equipoId = equipo === 'local' ? partido.equipoLocalId : partido.equipoVisitanteId;
    
    if (!equipoId) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    // Buscar jugadores del equipo que pertenezcan a la categoría del partido
    let query = db.collection('jugadores')
      .where('equipoId', '==', equipoId)
      .where('activo', '==', true);
    
    const snapshot = await query.get();
    
    let jugadores = [];
    
    snapshot.forEach(doc => {
      const jugadorData = { id: doc.id, ...doc.data() };
      
      // Filtrar por categoría (el jugador debe tener la categoría del partido)
      if (jugadorData.categoria && jugadorData.categoria.includes(categoriaPartido)) {
        jugadores.push({
          id: jugadorData.id,
          nombre: jugadorData.nombre,
          apellido: jugadorData.apellido,
          numero: jugadorData.numero,
          posicion: jugadorData.posicion,
          categoria: jugadorData.categoria,
          foto: jugadorData.foto,
          equipoId: jugadorData.equipoId,
          equipoNombre: jugadorData.equipoNombre
        });
      }
    });
    
    // Si no encontramos jugadores en la colección "jugadores", buscar en "users"
    if (jugadores.length === 0) {
      const usersQuery = db.collection('users')
        .where('equipoId', '==', equipoId)
        .where('tipoUsuario', '==', 'jugador')
        .where('activo', '==', true);
      
      const usersSnapshot = await usersQuery.get();
      
      usersSnapshot.forEach(doc => {
        const jugadorData = { id: doc.id, ...doc.data() };
        
        // Filtrar por categoría
        if (jugadorData.categoria && jugadorData.categoria.includes(categoriaPartido)) {
          jugadores.push({
            id: jugadorData.id,
            nombre: jugadorData.nombre,
            apellido: jugadorData.apellido,
            numero: null, // No requerir número
            posicion: jugadorData.posicion,
            categoria: jugadorData.categoria,
            foto: jugadorData.foto,
            equipoId: jugadorData.equipoId,
            equipoNombre: jugadorData.equipoNombre
          });
        }
      });
    }
    
    // Ordenar por nombre
    jugadores.sort((a, b) => {
      const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase();
      const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase();
      return nombreA.localeCompare(nombreB);
    });
    
    res.json(jugadores);
    
  } catch (error) {
    console.error('Error obteniendo jugadores por categoría:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener jugadores de un equipo en el partido (ruta general, debe ir DESPUÉS de /categoria)
router.get('/:partidoId/equipo/:equipo/jugadores', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId, equipo } = req.params;
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Verificar permisos
    const puedeVer = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitros?.cuartoArbitro?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId);
    
    if (!puedeVer) {
      return res.status(403).json({ error: 'No tienes permisos para ver este partido' });
    }
    
    const jugadores = equipo === 'local' ? partido.equipoLocal?.jugadores || [] : partido.equipoVisitante?.jugadores || [];
    
    res.json(jugadores);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener convocados de un equipo para un partido
router.get('/:partidoId/equipo/:equipo/convocados', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId, equipo } = req.params;
    
    // Obtener datos del partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Verificar permisos del árbitro
    const puedeVer = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitros?.cuartoArbitro?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId);
    
    if (!puedeVer) {
      return res.status(403).json({ error: 'No tienes permisos para ver este partido' });
    }
    
    // Obtener el ID del equipo
    const equipoId = equipo === 'local' ? partido.equipoLocalId : partido.equipoVisitanteId;
    
    if (!equipoId) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    // Buscar convocados del equipo para este partido
    const convocadosSnapshot = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .where('equipoId', '==', equipoId)
      .limit(1)
      .get();
    
    if (convocadosSnapshot.empty) {
      return res.status(404).json({ error: 'No se encontraron convocados para este equipo' });
    }
    
    const convocadosDoc = convocadosSnapshot.docs[0];
    const convocadosData = convocadosDoc.data();
    
    res.json({
      id: convocadosDoc.id,
      equipoId: convocadosData.equipoId,
      equipoNombre: convocadosData.equipoNombre,
      categoria: convocadosData.categoria,
      estado: convocadosData.estado,
      managerNombre: convocadosData.managerNombre,
      fechaCreacion: convocadosData.fechaCreacion,
      jugadores: convocadosData.jugadores || [],
      estadisticas: {
        totalJugadores: convocadosData.jugadores?.length || 0,
        porPosicion: convocadosData.jugadores?.reduce((acc, jugador) => {
          const pos = jugador.posicion || 'Sin posición';
          acc[pos] = (acc[pos] || 0) + 1;
          return acc;
        }, {}) || {}
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo convocados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener convocados de ambos equipos para un partido
router.get('/:partidoId/convocados', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId } = req.params;
    
    // Obtener datos del partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Verificar permisos del árbitro
    const puedeVer = (partido.arbitros?.principal?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente1?.id === req.arbitroId) ||
                    (partido.arbitros?.asistente2?.id === req.arbitroId) ||
                    (partido.arbitros?.cuartoArbitro?.id === req.arbitroId) ||
                    (partido.arbitroId === req.arbitroId);
    
    if (!puedeVer) {
      return res.status(403).json({ error: 'No tienes permisos para ver este partido' });
    }
    
    // Buscar convocados de ambos equipos
    const convocadosSnapshot = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .get();
    
    const convocados = {
      local: null,
      visitante: null
    };
    
    convocadosSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.equipoId === partido.equipoLocalId) {
        convocados.local = {
          id: doc.id,
          equipoId: data.equipoId,
          equipoNombre: data.equipoNombre,
          categoria: data.categoria,
          estado: data.estado,
          managerNombre: data.managerNombre,
          fechaCreacion: data.fechaCreacion,
          jugadores: data.jugadores || [],
          estadisticas: {
            totalJugadores: data.jugadores?.length || 0,
            porPosicion: data.jugadores?.reduce((acc, jugador) => {
              const pos = jugador.posicion || 'Sin posición';
              acc[pos] = (acc[pos] || 0) + 1;
              return acc;
            }, {}) || {}
          }
        };
      } else if (data.equipoId === partido.equipoVisitanteId) {
        convocados.visitante = {
          id: doc.id,
          equipoId: data.equipoId,
          equipoNombre: data.equipoNombre,
          categoria: data.categoria,
          estado: data.estado,
          managerNombre: data.managerNombre,
          fechaCreacion: data.fechaCreacion,
          jugadores: data.jugadores || [],
          estadisticas: {
            totalJugadores: data.jugadores?.length || 0,
            porPosicion: data.jugadores?.reduce((acc, jugador) => {
              const pos = jugador.posicion || 'Sin posición';
              acc[pos] = (acc[pos] || 0) + 1;
              return acc;
            }, {}) || {}
          }
        };
      }
    });
    
    res.json(convocados);
    
  } catch (error) {
    console.error('Error obteniendo convocados del partido:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar convocados como árbitro (en caso de imprevistos)
router.put('/:partidoId/convocados/:convocadosId', verifyFirebaseToken, verificarArbitro, async (req, res) => {
  try {
    const { partidoId, convocadosId } = req.params;
    const { jugadores, motivo } = req.body;
    const arbitroId = req.arbitroId;
    
    if (!jugadores || !Array.isArray(jugadores)) {
      return res.status(400).json({ error: 'La lista de jugadores es requerida' });
    }
    
    // Obtener datos del partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Verificar que el partido no esté iniciado
    if (partido.estado === 'En Curso' || partido.estado === 'pausado' || partido.estado === 'finalizado') {
      return res.status(400).json({ 
        error: 'No se pueden editar las listas de convocados una vez iniciado el partido',
        estado: partido.estado
      });
    }
    
    // Verificar permisos del árbitro
    const puedeEditar = (partido.arbitros?.principal?.id === arbitroId) ||
                    (partido.arbitros?.asistente1?.id === arbitroId) ||
                    (partido.arbitros?.asistente2?.id === arbitroId) ||
                    (partido.arbitroId === arbitroId) ||
                       partido.arbitros.cuartoArbitro?.id === arbitroId;
    
    if (!puedeEditar) {
      return res.status(403).json({ error: 'No tienes permisos para editar este partido' });
    }
    
    // Obtener convocados existentes
    const convocadosDoc = await db.collection('convocados').doc(convocadosId).get();
    if (!convocadosDoc.exists) {
      return res.status(404).json({ error: 'Lista de convocados no encontrada' });
    }
    
    const convocadosData = convocadosDoc.data();
    
    // Verificar que los convocados pertenecen al partido
    if (convocadosData.partidoId !== partidoId) {
      return res.status(400).json({ error: 'Los convocados no pertenecen a este partido' });
    }
    
    // Obtener datos del árbitro
    const arbitroDoc = await db.collection('arbitros').doc(arbitroId).get();
    if (!arbitroDoc.exists) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }
    
    const arbitroData = arbitroDoc.data();
    
    // Actualizar convocados
    const updateData = {
      jugadores: jugadores,
      modificadoPor: arbitroId,
      fechaActualizacion: new Date(),
      modificadoPorNombre: `${arbitroData.nombre} ${arbitroData.apellido}`,
      motivoModificacion: motivo || 'Modificación por imprevisto durante el partido',
      estado: 'modificado_arbitro'
    };
    
    await db.collection('convocados').doc(convocadosId).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Lista de convocados actualizada por el árbitro',
      convocados: {
        id: convocadosId,
        ...convocadosData,
        ...updateData
      }
    });
    
  } catch (error) {
    console.error('Error actualizando convocados como árbitro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para crear jugador (usado por árbitros)
router.post('/crear-jugador', verifyFirebaseToken, async (req, res) => {
  try {
    const { nombre, apellido, equipoId, equipoNombre, categoria } = req.body;

    if (!nombre || !apellido || !equipoId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Crear el jugador en la colección jugadores
    const nuevoJugador = {
      nombre,
      apellido,
      equipoId,
      equipoNombre: equipoNombre || '',
      categoria: categoria || 'M16',
      activo: true,
      email: '',
      estadisticas: {
        partidosJugados: 0,
        tries: 0,
        tarjetasAmarillas: 0,
        tarjetasRojas: 0,
        minutosJugados: 0
      },
      posicion: '',
      telefono: '',
      tipoUsuario: 'jugador',
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      fechaNacimiento: ''
    };

    const jugadorRef = await db.collection('jugadores').add(nuevoJugador);

    res.json({
      message: 'Jugador creado exitosamente',
      jugadorId: jugadorRef.id,
      jugador: { id: jugadorRef.id, ...nuevoJugador }
    });
  } catch (error) {
    console.error('Error creando jugador:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para iniciar partido con titulares seleccionados
router.post('/:partidoId/iniciar-con-titulares', verifyFirebaseToken, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { titularesLocal, titularesVisitante } = req.body;

    // Obtener el partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    const partido = partidoDoc.data();
    // No establecer minutoInicio aún - se establecerá cuando se INICIE el partido

    // Extraer IDs y bloques de los titulares (pueden venir como objetos {id, bloque} o como strings)
    const procesarTitulares = (titulares) => {
      if (!titulares || titulares.length === 0) return { ids: [], bloques: {} };
      
      const ids = [];
      const bloques = {};
      
      titulares.forEach(titular => {
        if (typeof titular === 'string') {
          ids.push(titular);
          bloques[titular] = 'Sin bloque';
        } else if (titular && titular.id) {
          ids.push(titular.id);
          bloques[titular.id] = titular.bloque || 'Sin bloque';
        }
      });
      
      return { ids, bloques };
    };

    const titularesLocalData = procesarTitulares(titularesLocal);
    const titularesVisitanteData = procesarTitulares(titularesVisitante);

    // Validar que los jugadores NO tengan >= 80 minutos jugados
    const validarMinutosJugadores = async (jugadoresIds) => {
      const jugadoresInvalidos = [];
      for (const jugadorId of jugadoresIds) {
        const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
        if (jugadorDoc.exists) {
          const jugadorData = jugadorDoc.data();
          const minutosJugados = jugadorData.estadisticas?.minutosJugados || 0;
          if (minutosJugados >= 80) {
            jugadoresInvalidos.push({
              id: jugadorId,
              nombre: `${jugadorData.nombre} ${jugadorData.apellido}`,
              minutosJugados
            });
          }
        }
      }
      return jugadoresInvalidos;
    };

    // Validar titulares locales
    if (titularesLocalData.ids && titularesLocalData.ids.length > 0) {
      const jugadoresInvalidosLocal = await validarMinutosJugadores(titularesLocalData.ids);
      if (jugadoresInvalidosLocal.length > 0) {
        return res.status(400).json({
          error: 'Algunos jugadores del equipo local no pueden jugar por haber alcanzado el límite de 80 minutos',
          jugadoresInvalidos: jugadoresInvalidosLocal
        });
      }
    }

    // Validar titulares visitantes
    if (titularesVisitanteData.ids && titularesVisitanteData.ids.length > 0) {
      const jugadoresInvalidosVisitante = await validarMinutosJugadores(titularesVisitanteData.ids);
      if (jugadoresInvalidosVisitante.length > 0) {
        return res.status(400).json({
          error: 'Algunos jugadores del equipo visitante no pueden jugar por haber alcanzado el límite de 80 minutos',
          jugadoresInvalidos: jugadoresInvalidosVisitante
        });
      }
    }

    // Procesar equipo local
    if (titularesLocalData.ids && titularesLocalData.ids.length > 0) {
      // Buscar o crear convocados para el equipo local
      const convocadosLocalQuery = await db.collection('convocados')
        .where('partidoId', '==', partidoId)
        .where('equipoId', '==', partido.equipoLocalId)
        .limit(1)
        .get();

      let convocadosLocalRef;
      let jugadoresLocal = [];

      if (convocadosLocalQuery.empty) {
        // No hay convocados, obtener todos los jugadores del equipo
        const jugadoresSnapshot = await db.collection('jugadores')
          .where('equipoId', '==', partido.equipoLocalId)
          .get();

        jugadoresLocal = jugadoresSnapshot.docs.map(doc => {
          const jugadorData = doc.data();
          const esTitular = titularesLocalData.ids.includes(doc.id);
          return {
            id: doc.id,
            nombre: jugadorData.nombre,
            apellido: jugadorData.apellido,
            posicion: jugadorData.posicion || '',
            numero: jugadorData.numero || null,
            foto: jugadorData.foto || null,
            esTitular: esTitular,
            bloque: esTitular ? titularesLocalData.bloques[doc.id] : null,
            minutoInicio: null, // Se establecerá cuando inicie el partido
            minutoSalida: null,
            minutosJugados: jugadorData.estadisticas?.minutosJugados || 0, // Minutos históricos del torneo
            activo: esTitular
          };
        });

        // Crear convocados
        const nuevoConvocado = {
          partidoId,
          equipoId: partido.equipoLocalId,
          equipoNombre: partido.equipoLocal,
          torneoId: partido.torneoId || '',
          categoria: partido.categoria || 'M16',
          jugadores: jugadoresLocal,
          estado: 'confirmado',
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          estadisticas: {
            totalJugadores: jugadoresLocal.length,
            titulares: titularesLocalData.ids.length,
            suplentes: jugadoresLocal.length - titularesLocalData.ids.length
          }
        };

        convocadosLocalRef = await db.collection('convocados').add(nuevoConvocado);
      } else {
        // Ya existen convocados, actualizarlos
        convocadosLocalRef = convocadosLocalQuery.docs[0].ref;
        const convocadosData = convocadosLocalQuery.docs[0].data();
        
        jugadoresLocal = convocadosData.jugadores.map(jugador => {
          const esTitular = titularesLocalData.ids.includes(jugador.id);
          return {
            ...jugador,
            esTitular: esTitular,
            bloque: esTitular ? titularesLocalData.bloques[jugador.id] : jugador.bloque,
            minutoInicio: esTitular ? null : jugador.minutoInicio, // Se establecerá al iniciar
            activo: esTitular
          };
        });

        await convocadosLocalRef.update({
          jugadores: jugadoresLocal,
          fechaActualizacion: new Date(),
          estadisticas: {
            totalJugadores: jugadoresLocal.length,
            titulares: titularesLocalData.ids.length,
            suplentes: jugadoresLocal.length - titularesLocalData.ids.length
          }
        });
      }
    }

    // Procesar equipo visitante
    if (titularesVisitanteData.ids && titularesVisitanteData.ids.length > 0) {
      const convocadosVisitanteQuery = await db.collection('convocados')
        .where('partidoId', '==', partidoId)
        .where('equipoId', '==', partido.equipoVisitanteId)
        .limit(1)
        .get();

      let convocadosVisitanteRef;
      let jugadoresVisitante = [];

      if (convocadosVisitanteQuery.empty) {
        const jugadoresSnapshot = await db.collection('jugadores')
          .where('equipoId', '==', partido.equipoVisitanteId)
          .get();

        jugadoresVisitante = jugadoresSnapshot.docs.map(doc => {
          const jugadorData = doc.data();
          const esTitular = titularesVisitanteData.ids.includes(doc.id);
          return {
            id: doc.id,
            nombre: jugadorData.nombre,
            apellido: jugadorData.apellido,
            posicion: jugadorData.posicion || '',
            numero: jugadorData.numero || null,
            foto: jugadorData.foto || null,
            esTitular: esTitular,
            bloque: esTitular ? titularesVisitanteData.bloques[doc.id] : null,
            minutoInicio: null, // Se establecerá cuando inicie el partido
            minutoSalida: null,
            minutosJugados: jugadorData.estadisticas?.minutosJugados || 0, // Minutos históricos del torneo
            activo: esTitular
          };
        });

        const nuevoConvocado = {
          partidoId,
          equipoId: partido.equipoVisitanteId,
          equipoNombre: partido.equipoVisitante,
          torneoId: partido.torneoId || '',
          categoria: partido.categoria || 'M16',
          jugadores: jugadoresVisitante,
          estado: 'confirmado',
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          estadisticas: {
            totalJugadores: jugadoresVisitante.length,
            titulares: titularesVisitanteData.ids.length,
            suplentes: jugadoresVisitante.length - titularesVisitanteData.ids.length
          }
        };

        convocadosVisitanteRef = await db.collection('convocados').add(nuevoConvocado);
      } else {
        convocadosVisitanteRef = convocadosVisitanteQuery.docs[0].ref;
        const convocadosData = convocadosVisitanteQuery.docs[0].data();
        
        jugadoresVisitante = convocadosData.jugadores.map(jugador => {
          const esTitular = titularesVisitanteData.ids.includes(jugador.id);
          return {
            ...jugador,
            esTitular: esTitular,
            bloque: esTitular ? titularesVisitanteData.bloques[jugador.id] : jugador.bloque,
            minutoInicio: esTitular ? null : jugador.minutoInicio, // Se establecerá al iniciar
            activo: esTitular
          };
        });

        await convocadosVisitanteRef.update({
          jugadores: jugadoresVisitante,
          fechaActualizacion: new Date(),
          estadisticas: {
            totalJugadores: jugadoresVisitante.length,
            titulares: titularesVisitanteData.ids.length,
            suplentes: jugadoresVisitante.length - titularesVisitanteData.ids.length
          }
        });
      }
    }

    res.json({
      message: 'Alineaciones configuradas exitosamente',
      titularesLocal: titularesLocalData.ids?.length || 0,
      titularesVisitante: titularesVisitanteData.ids?.length || 0
    });
  } catch (error) {
    console.error('Error configurando alineaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para actualizar estadísticas de jugadores después del partido
router.post('/:partidoId/actualizar-estadisticas-jugadores', verifyFirebaseToken, async (req, res) => {
  try {
    const { partidoId } = req.params;

    // Obtener el partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    const partido = partidoDoc.data();

    // Solo actualizar si el partido está finalizado
    if (partido.estado !== 'finalizado') {
      return res.status(400).json({ error: 'El partido debe estar finalizado para actualizar estadísticas' });
    }

    // Obtener la duración REAL del partido (en segundos)
    const duracionPartidoSegundos = partido.duracion || partido.tiempoTranscurrido || 0;
    const minutoFinalizacionCumulativo = Math.floor(duracionPartidoSegundos / 60);
    
    // Función para calcular minutos reales (ajustados por entretiempo)
    const calcularMinutosReales = (minutoCumulativo) => {
      if (minutoCumulativo <= 40) return minutoCumulativo;
      if (minutoCumulativo <= 50) return 40; // Durante entretiempo, congelar en 40
      return minutoCumulativo - 10; // Segundo tiempo, restar los 10 del entretiempo
    };
    
    // Calcular el minuto real de finalización (sin entretiempo)
    const minutoFinalizacionReal = calcularMinutosReales(minutoFinalizacionCumulativo);

    // Obtener convocados del partido
    const convocadosSnapshot = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .get();

    let jugadoresActualizados = 0;

    // Procesar cada convocado
    for (const convocadoDoc of convocadosSnapshot.docs) {
      const convocados = convocadoDoc.data();

      for (const jugador of convocados.jugadores) {
        // Obtener el documento del jugador
        const jugadorRef = db.collection('jugadores').doc(jugador.id);
        const jugadorDoc = await jugadorRef.get();

        if (!jugadorDoc.exists) continue;

        const jugadorData = jugadorDoc.data();
        const estadisticasActuales = jugadorData.estadisticas || {};

        // Contar incidencias del jugador en el partido
        const incidenciasJugador = (partido.incidencias || []).filter(
          inc => inc.jugadorId === jugador.id
        );

        const tries = incidenciasJugador.filter(inc => inc.tipo === 'TRY').length;
        const tarjetasAmarillas = incidenciasJugador.filter(inc => inc.tipo === 'TARJETA_AMARILLA').length;
        const tarjetasRojas = incidenciasJugador.filter(inc => inc.tipo === 'TARJETA_ROJA').length;

        // Calcular minutos jugados EN ESTE PARTIDO (excluyendo entretiempo)
        let minutosEnEstePartido = 0;
        const minutoInicio = jugador.minutoInicio;
        
        // Suplente que nunca entró al campo
        if (minutoInicio === null || minutoInicio === undefined) {
          minutosEnEstePartido = 0;
          
        } else {
          const minutoInicioReal = calcularMinutosReales(minutoInicio);
          
          // CASO 1: Salió por cambio normal (tiene minutoSalida)
          if (jugador.minutoSalida !== null && jugador.minutoSalida !== undefined) {
            const minutoSalidaReal = calcularMinutosReales(jugador.minutoSalida);
            minutosEnEstePartido = minutoSalidaReal - minutoInicioReal;
            
          // CASO 2: Expulsado por tarjeta roja
          } else if (jugador.expulsado && jugador.minutoExpulsion) {
            const minutoExpulsionReal = calcularMinutosReales(jugador.minutoExpulsion);
            minutosEnEstePartido = minutoExpulsionReal - minutoInicioReal;
            
          // CASO 3: Tarjeta amarilla (sin bin)
          } else if (jugador.enSinBin && jugador.minutoSinBin) {
            const minutoSinBinReal = calcularMinutosReales(jugador.minutoSinBin);
            
            if (jugador.minutoRegreso) {
              // Volvió al campo después del sin bin
              // Calcular: (tiempo antes de sin bin) + (tiempo después de regresar hasta finalización)
              const minutoRegresoReal = calcularMinutosReales(jugador.minutoRegreso);
              const minutosAntesSinBin = minutoSinBinReal - minutoInicioReal;
              const minutosDespuesRegreso = minutoFinalizacionReal - minutoRegresoReal;
              minutosEnEstePartido = minutosAntesSinBin + minutosDespuesRegreso;
            } else {
              // NO volvió - solo contar hasta el sin bin
              minutosEnEstePartido = minutoSinBinReal - minutoInicioReal;
            }
            
          // CASO 4: Jugó hasta el final del partido (sin cambios ni expulsiones)
          } else {
            minutosEnEstePartido = minutoFinalizacionReal - minutoInicioReal;
          }
          
          // Asegurar que no sea negativo y no mayor al minuto de finalización real
          minutosEnEstePartido = Math.max(0, Math.min(minutoFinalizacionReal, minutosEnEstePartido));
        }

        // Los minutos históricos YA están en jugador.minutosJugados (no en estadisticasActuales)
        const minutosHistoricos = estadisticasActuales.minutosJugados || 0;
        const nuevoTotalMinutos = minutosHistoricos + minutosEnEstePartido;

        // Log deshabilitado para producción
        // console.log(`📊 Actualizando ${jugador.nombre} ${jugador.apellido}:`, {
        //   minutosEnEstePartido,
        //   nuevoTotal: nuevoTotalMinutos
        // });

        // Actualizar estadísticas
        await jugadorRef.update({
          'estadisticas.partidosJugados': (estadisticasActuales.partidosJugados || 0) + 1,
          'estadisticas.tries': (estadisticasActuales.tries || 0) + tries,
          'estadisticas.tarjetasAmarillas': (estadisticasActuales.tarjetasAmarillas || 0) + tarjetasAmarillas,
          'estadisticas.tarjetasRojas': (estadisticasActuales.tarjetasRojas || 0) + tarjetasRojas,
          'estadisticas.minutosJugados': nuevoTotalMinutos,
          fechaActualizacion: new Date()
        });

        jugadoresActualizados++;
      }
    }

    res.json({
      message: 'Estadísticas actualizadas exitosamente',
      jugadoresActualizados
    });
  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
