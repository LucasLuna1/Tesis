const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { db } = require('../config/firebase');
const Votacion = require('../models/Votacion');

/**
 * @route POST /api/votos/partido/:partidoId
 * @desc Registrar voto para jugador del partido
 * @access Private (Jugadores y Árbitros autenticados)
 */
router.post('/partido/:partidoId', verifyFirebaseToken, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const { jugadorId, jugadorNombre, equipoId, equipoNombre } = req.body;
    const usuarioId = req.user.uid;
    const usuarioEmail = req.user.email;

    // Validar datos requeridos
    if (!jugadorId) {
      return res.status(400).json({
        error: 'El ID del jugador es requerido'
      });
    }

    // Verificar que el partido existe
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({
        error: 'Partido no encontrado'
      });
    }

    const partidoData = partidoDoc.data();

    // Verificar que el partido esté en curso o finalizado (no programado)
    if (partidoData.estado === 'programado') {
      return res.status(400).json({
        error: 'No se puede votar en un partido que aún no ha comenzado'
      });
    }

    // Verificar que el usuario no haya votado ya en este partido
    const votosExistentes = await db.collection('votaciones')
      .where('partidoId', '==', partidoId)
      .where('usuarioId', '==', usuarioId)
      .get();

    if (!votosExistentes.empty) {
      return res.status(400).json({
        error: 'Ya has votado en este partido',
        votoExistente: votosExistentes.docs[0].data()
      });
    }

    // Obtener información del usuario
    const usuarioDoc = await db.collection('usuarios').doc(usuarioId).get();
    const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : {};

    // Crear el voto
    const votacionRef = db.collection('votaciones').doc();
    const votacionId = votacionRef.id;

    const votacion = new Votacion({
      id: votacionId,
      partidoId,
      jugadorId,
      jugadorNombre: jugadorNombre || 'Desconocido',
      equipoId: equipoId || null,
      equipoNombre: equipoNombre || '',
      usuarioId,
      usuarioNombre: usuarioData.nombre || usuarioEmail || 'Usuario',
      usuarioRol: usuarioData.rol || 'jugador',
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress
    });

    // Validar votación
    const validation = Votacion.validate(votacion);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Datos de votación inválidos',
        detalles: validation.errors
      });
    }

    // Guardar en Firestore
    await votacionRef.set(votacion.toJSON());

    res.status(201).json({
      message: 'Voto registrado correctamente',
      votacion: votacion.toJSON()
    });

  } catch (error) {
    console.error('Error registrando voto:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * @route GET /api/votos/partido/:partidoId
 * @desc Obtener resultados de votación de un partido
 * @access Public
 */
router.get('/partido/:partidoId', async (req, res) => {
  try {
    const { partidoId } = req.params;
    const usuarioId = req.user?.uid || null; // Usuario autenticado (opcional)

    // Verificar que el partido existe
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({
        error: 'Partido no encontrado'
      });
    }

    // Obtener todos los votos del partido
    const votosSnapshot = await db.collection('votaciones')
      .where('partidoId', '==', partidoId)
      .get();

    const votos = votosSnapshot.docs.map(doc => doc.data());

    // Contar votos por jugador
    const votosPorJugador = {};
    votos.forEach(voto => {
      if (!votosPorJugador[voto.jugadorId]) {
        votosPorJugador[voto.jugadorId] = {
          jugadorId: voto.jugadorId,
          jugadorNombre: voto.jugadorNombre,
          equipoId: voto.equipoId,
          equipoNombre: voto.equipoNombre,
          votos: 0
        };
      }
      votosPorJugador[voto.jugadorId].votos++;
    });

    // Convertir a array y ordenar por votos
    const resultados = Object.values(votosPorJugador)
      .sort((a, b) => b.votos - a.votos);

    // Determinar ganador (si hay empate, hay múltiples ganadores)
    const maxVotos = resultados.length > 0 ? resultados[0].votos : 0;
    const ganadores = resultados.filter(r => r.votos === maxVotos);

    // Verificar si el usuario actual ya votó
    let haVotado = false;
    let votoUsuario = null;
    if (usuarioId) {
      const votoUsuarioDoc = votos.find(v => v.usuarioId === usuarioId);
      if (votoUsuarioDoc) {
        haVotado = true;
        votoUsuario = {
          jugadorId: votoUsuarioDoc.jugadorId,
          jugadorNombre: votoUsuarioDoc.jugadorNombre,
          timestamp: votoUsuarioDoc.timestamp
        };
      }
    }

    res.json({
      message: 'Resultados de votación obtenidos correctamente',
      partidoId,
      totalVotos: votos.length,
      resultados,
      ganadores,
      hayEmpate: ganadores.length > 1,
      usuarioHaVotado: haVotado,
      votoUsuario
    });

  } catch (error) {
    console.error('Error obteniendo resultados de votación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/votos/partido/:partidoId
 * @desc Eliminar voto del usuario en un partido (cambiar voto)
 * @access Private
 */
router.delete('/partido/:partidoId', verifyFirebaseToken, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const usuarioId = req.user.uid;

    // Buscar el voto del usuario
    const votosSnapshot = await db.collection('votaciones')
      .where('partidoId', '==', partidoId)
      .where('usuarioId', '==', usuarioId)
      .get();

    if (votosSnapshot.empty) {
      return res.status(404).json({
        error: 'No tienes un voto registrado en este partido'
      });
    }

    // Eliminar el voto
    const votoDoc = votosSnapshot.docs[0];
    await votoDoc.ref.delete();

    res.json({
      message: 'Voto eliminado correctamente',
      votoEliminado: votoDoc.data()
    });

  } catch (error) {
    console.error('Error eliminando voto:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * @route GET /api/votos/partido/:partidoId/mi-voto
 * @desc Obtener el voto del usuario actual en un partido
 * @access Private
 */
router.get('/partido/:partidoId/mi-voto', verifyFirebaseToken, async (req, res) => {
  try {
    const { partidoId } = req.params;
    const usuarioId = req.user.uid;

    // Buscar el voto del usuario
    const votosSnapshot = await db.collection('votaciones')
      .where('partidoId', '==', partidoId)
      .where('usuarioId', '==', usuarioId)
      .get();

    if (votosSnapshot.empty) {
      return res.json({
        message: 'No has votado en este partido',
        haVotado: false,
        voto: null
      });
    }

    const voto = votosSnapshot.docs[0].data();

    res.json({
      message: 'Voto obtenido correctamente',
      haVotado: true,
      voto
    });

  } catch (error) {
    console.error('Error obteniendo voto del usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

module.exports = router;
