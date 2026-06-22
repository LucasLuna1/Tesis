/**
 * Rutas para gestión de notificaciones
 * Sistema completo de notificaciones para usuarios
 */

const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const Notificacion = require('../models/Notificacion');
const NotificacionesService = require('../services/NotificacionesService');

// Obtener todas las notificaciones del usuario
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, offset = 0 } = req.query;

    const notificaciones = await Notificacion.obtenerPorUsuario(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      notificaciones,
      total: notificaciones.length,
      hasMore: notificaciones.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener notificaciones no leídas
router.get('/no-leidas', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const notificaciones = await Notificacion.obtenerNoLeidas(userId);

    res.json({
      notificaciones,
      total: notificaciones.length
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones no leídas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener CONTADOR de notificaciones no leídas (usado por la campana)
router.get('/no-leidas/contador', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const contador = await Notificacion.contarNoLeidas(userId);

    res.json({ contador });
  } catch (error) {
    console.error('Error contando notificaciones no leídas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener notificaciones por tipo
router.get('/tipo/:tipo', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { tipo } = req.params;
    const { limit = 20 } = req.query;

    const notificaciones = await Notificacion.obtenerPorTipo(
      userId,
      tipo,
      parseInt(limit)
    );

    res.json({
      notificaciones,
      total: notificaciones.length
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones por tipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marcar una notificación como leída
router.patch('/:id/marcar-leida', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Verificar que la notificación pertenece al usuario
    const notificaciones = await Notificacion.obtenerPorUsuario(userId, 1000, 0);
    const notificacion = notificaciones.find(n => n.id === id);

    if (!notificacion) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await Notificacion.marcarComoLeida(id);

    res.json({ 
      success: true, 
      mensaje: 'Notificación marcada como leída' 
    });
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marcar todas las notificaciones como leídas
router.patch('/marcar-todas-leidas', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    await Notificacion.marcarTodasComoLeidas(userId);

    res.json({ 
      success: true, 
      mensaje: 'Todas las notificaciones marcadas como leídas' 
    });
  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar una notificación
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Verificar que la notificación pertenece al usuario
    const notificaciones = await Notificacion.obtenerPorUsuario(userId, 1000, 0);
    const notificacion = notificaciones.find(n => n.id === id);

    if (!notificacion) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await Notificacion.eliminar(id);

    res.json({ 
      success: true, 
      mensaje: 'Notificación eliminada' 
    });
  } catch (error) {
    console.error('Error eliminando notificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Registrar token FCM para notificaciones push
router.post('/registrar-token', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ error: 'Token FCM requerido' });
    }

    await NotificacionesService.registrarTokenFCM(userId, fcmToken);

    res.json({ 
      success: true, 
      mensaje: 'Token FCM registrado exitosamente' 
    });
  } catch (error) {
    console.error('Error registrando token FCM:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas de notificaciones
router.get('/estadisticas/resumen', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const estadisticas = await NotificacionesService.obtenerEstadisticas(userId);

    res.json(estadisticas);
  } catch (error) {
    console.error('Error obteniendo estadísticas de notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear notificación de prueba (solo para desarrollo)
router.post('/test', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { titulo, mensaje, tipo = 'general' } = req.body;

    const notificacion = await Notificacion.crear({
      usuarioId: userId,
      tipo,
      titulo: titulo || 'Notificación de prueba',
      mensaje: mensaje || 'Este es un mensaje de prueba del sistema de notificaciones',
      prioridad: 'normal',
      data: {
        test: true
      }
    });

    res.status(201).json({
      success: true,
      mensaje: 'Notificación de prueba creada',
      notificacion
    });
  } catch (error) {
    console.error('Error creando notificación de prueba:', error);
    res.status(500).json({ error: error.message });
  }
});

// Limpiar notificaciones antiguas del usuario
router.delete('/limpiar-antiguas', verifyFirebaseToken, async (req, res) => {
  try {
    const { diasRetencion = 30 } = req.query;
    
    const resultado = await Notificacion.limpiarNotificacionesAntiguas(
      parseInt(diasRetencion)
    );

    res.json({
      success: true,
      ...resultado
    });
  } catch (error) {
    console.error('Error limpiando notificaciones antiguas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar todas las notificaciones del usuario
router.delete('/eliminar-todas', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const resultado = await Notificacion.eliminarTodasDeUsuario(userId);

    res.json({
      success: true,
      mensaje: `Se eliminaron ${resultado.eliminadas} notificaciones`,
      ...resultado
    });
  } catch (error) {
    console.error('Error eliminando todas las notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


