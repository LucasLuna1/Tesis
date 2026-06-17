/**
 * Rutas para gestión de seguimientos de equipos
 * Implementación del feedback: usuarios pueden seguir equipos
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyFirebaseToken } = require('../middleware/auth');
const SeguidorEquipo = require('../models/SeguidorEquipo');

// Seguir un equipo
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { equipoId } = req.body;
    const userId = req.user.uid;

    if (!equipoId) {
      return res.status(400).json({ error: 'ID del equipo requerido' });
    }

    // Verificar que el equipo existe
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = equipoDoc.data();

    // Verificar si ya sigue al equipo
    const seguimientoExistente = await db.collection('seguidores_equipos')
      .where('usuarioId', '==', userId)
      .where('equipoId', '==', equipoId)
      .get();

    if (!seguimientoExistente.empty) {
      return res.status(400).json({ error: 'Ya sigues este equipo' });
    }

    // Crear seguimiento
    const seguimiento = new SeguidorEquipo({
      usuarioId: userId,
      usuarioNombre: `${req.user.nombre} ${req.user.apellido}`,
      equipoId,
      equipoNombre: equipo.nombre,
      equipoLogo: equipo.logo
    });

    const seguimientoRef = await db.collection('seguidores_equipos').add(seguimiento.toJSON());

    // Notificar al equipo que tiene un nuevo seguidor
    try {
      const Notificacion = require('../models/Notificacion');
      
      // Obtener información del equipo para la notificación
      const equipoData = {
        id: equipoId,
        nombre: equipo.nombre,
        logo: equipo.logo
      };

      // Crear notificación para el equipo (si tiene manager)
      const managerSnapshot = await db.collection('managers')
        .where('equipoId', '==', equipoId)
        .get();

      if (!managerSnapshot.empty) {
        const manager = managerSnapshot.docs[0].data();
        const managerId = managerSnapshot.docs[0].id;

        const notificacionData = {
          usuarioId: managerId,
          tipo: 'nuevo_seguidor',
          titulo: '¡Nuevo seguidor!',
          mensaje: `${req.user.nombre} ${req.user.apellido} empezó a seguir a ${equipo.nombre}`,
          prioridad: 'normal',
          data: {
            seguidorId: userId,
            seguidorNombre: `${req.user.nombre} ${req.user.apellido}`,
            equipoId: equipoId,
            equipoNombre: equipo.nombre,
            seguimientoId: seguimientoRef.id
          }
        };

        await Notificacion.crear(notificacionData);
      }
    } catch (notifError) {
      console.error('⚠️ Error al crear notificación de nuevo seguidor:', notifError);
      // No detener el proceso si falla la notificación
    }

    res.status(201).json({
      success: true,
      seguimiento: {
        id: seguimientoRef.id,
        ...seguimiento.toJSON()
      }
    });
  } catch (error) {
    console.error('Error siguiendo equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dejar de seguir un equipo
router.delete('/:equipoId', verifyFirebaseToken, async (req, res) => {
  try {
    const { equipoId } = req.params;
    const userId = req.user.uid;

    const seguimientoSnapshot = await db.collection('seguidores_equipos')
      .where('usuarioId', '==', userId)
      .where('equipoId', '==', equipoId)
      .get();

    if (seguimientoSnapshot.empty) {
      return res.status(404).json({ error: 'No sigues este equipo' });
    }

    const seguimientoDoc = seguimientoSnapshot.docs[0];
    await db.collection('seguidores_equipos').doc(seguimientoDoc.id).delete();

    res.json({ success: true, mensaje: 'Dejaste de seguir al equipo' });
  } catch (error) {
    console.error('Error dejando de seguir equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener equipos que sigue un usuario
router.get('/mis-equipos', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const seguimientosSnapshot = await db.collection('seguidores_equipos')
      .where('usuarioId', '==', userId)
      .get();

    const equipos = [];
    seguimientosSnapshot.forEach(doc => {
      equipos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(equipos);
  } catch (error) {
    console.error('Error obteniendo equipos seguidos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar si un usuario sigue un equipo
router.get('/verifica/:equipoId', verifyFirebaseToken, async (req, res) => {
  try {
    const { equipoId } = req.params;
    const userId = req.user.uid;

    const seguimientoSnapshot = await db.collection('seguidores_equipos')
      .where('usuarioId', '==', userId)
      .where('equipoId', '==', equipoId)
      .get();

    res.json({ 
      siguiendo: !seguimientoSnapshot.empty,
      id: seguimientoSnapshot.empty ? null : seguimientoSnapshot.docs[0].id
    });
  } catch (error) {
    console.error('Error verificando seguimiento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener seguidores de un equipo (para notificaciones)
router.get('/equipo/:equipoId/seguidores', verifyFirebaseToken, async (req, res) => {
  try {
    const { equipoId } = req.params;

    const seguidoresSnapshot = await db.collection('seguidores_equipos')
      .where('equipoId', '==', equipoId)
      .get();

    const seguidores = [];
    seguidoresSnapshot.forEach(doc => {
      seguidores.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      total: seguidores.length,
      seguidores
    });
  } catch (error) {
    console.error('Error obteniendo seguidores del equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configurar notificaciones de seguimiento
router.patch('/:seguimientoId/notificaciones', verifyFirebaseToken, async (req, res) => {
  try {
    const { seguimientoId } = req.params;
    const { notificarPartidos, notificarNoticias, notificarResultados } = req.body;
    const userId = req.user.uid;

    const seguimientoDoc = await db.collection('seguidores_equipos').doc(seguimientoId).get();

    if (!seguimientoDoc.exists) {
      return res.status(404).json({ error: 'Seguimiento no encontrado' });
    }

    const seguimiento = new SeguidorEquipo({ 
      id: seguimientoDoc.id, 
      ...seguimientoDoc.data() 
    });

    // Verificar que el seguimiento pertenece al usuario
    if (seguimiento.usuarioId !== userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    seguimiento.configurarNotificaciones({
      notificarPartidos,
      notificarNoticias,
      notificarResultados
    });

    await db.collection('seguidores_equipos')
      .doc(seguimientoId)
      .update(seguimiento.toJSON());

    res.json({ success: true, seguimiento: seguimiento.toJSON() });
  } catch (error) {
    console.error('Error configurando notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


