const { admin } = require('../config/firebase');
const Notificacion = require('../models/Notificacion');

class NotificacionesService {
  // Enviar notificación push
  static async enviarNotificacionPush(jugadorId, notificacion) {
    try {
      // 🚀 OPTIMIZACIÓN: Buscar token FCM en paralelo desde 'jugadores' y 'users'
      const dbRef = admin.firestore();
      let fcmToken = null;

      const [jugadorDoc, userDoc] = await Promise.all([
        dbRef.collection('jugadores').doc(jugadorId).get(),
        dbRef.collection('users').doc(jugadorId).get()
      ]);

      if (jugadorDoc.exists) {
        const jugadorData = jugadorDoc.data();
        fcmToken = jugadorData?.fcmToken || null;
      }
      if (!fcmToken && userDoc.exists) {
        const userData = userDoc.data();
        fcmToken = userData?.fcmToken || null;
      }

      if (!fcmToken) {
        // No hay token, no se puede enviar push
        return false;
      }

      const message = {
        token: fcmToken,
        notification: {
          title: notificacion.titulo,
          body: notificacion.mensaje
        },
        data: {
          tipo: notificacion.tipo,
          notificacionId: notificacion.id,
          ...notificacion.data
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);

      // Marcar como enviada en la base de datos
      await admin.firestore().collection('notificaciones').doc(notificacion.id).update({
        enviada: true,
        fechaEnvio: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error al enviar notificación push:', error);
      return false;
    }
  }

  // Registrar token FCM de un jugador
  static async registrarTokenFCM(jugadorId, fcmToken) {
    try {
      const dbRef = admin.firestore();
      const fecha = new Date();

      // Guardar/actualizar en 'jugadores'
      const jugadorRef = dbRef.collection('jugadores').doc(jugadorId);
      const jugadorDoc = await jugadorRef.get();
      if (jugadorDoc.exists) {
        await jugadorRef.update({ fcmToken, ultimaActualizacionToken: fecha });
      } else {
        await jugadorRef.set({ fcmToken, ultimaActualizacionToken: fecha }, { merge: true });
      }

      // Guardar/actualizar también en 'users' para compatibilidad
      const userRef = dbRef.collection('users').doc(jugadorId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        await userRef.update({ fcmToken, ultimaActualizacionToken: fecha });
      } else {
        await userRef.set({ fcmToken, ultimaActualizacionToken: fecha }, { merge: true });
      }
      return true;
    } catch (error) {
      throw new Error(`Error al registrar token FCM: ${error.message}`);
    }
  }

  // Crear notificación de partido próximo
  static async notificarPartidoProximo(partidoId, jugadoresIds) {
    try {
      // Obtener datos del partido
      const partidoDoc = await admin.firestore().collection('partidos').doc(partidoId).get();
      
      if (!partidoDoc.exists) {
        throw new Error('Partido no encontrado');
      }

      const partidoData = partidoDoc.data();
      const fechaPartido = partidoData.fecha.toDate();
      const horaPartido = new Date(fechaPartido.getTime() - (24 * 60 * 60 * 1000)); // 24 horas antes

      const notificacionData = {
        tipo: 'partido',
        titulo: 'Próximo Partido',
        mensaje: `Tu partido contra ${partidoData.equipoVisitante?.nombre || 'Equipo Visitante'} es mañana a las ${fechaPartido.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        prioridad: 'alta',
        data: {
          partidoId: partidoId,
          torneoId: partidoData.torneoId,
          fechaPartido: fechaPartido
        }
      };

      // Programar notificación para 24 horas antes del partido
      const notificaciones = await Notificacion.crearMasivas(jugadoresIds, {
        ...notificacionData,
        fecha: horaPartido
      });

      // Enviar notificaciones push inmediatamente si es necesario
      for (const notificacion of notificaciones) {
        await this.enviarNotificacionPush(notificacion.jugadorId, notificacion);
      }

      return notificaciones;
    } catch (error) {
      throw new Error(`Error al crear notificación de partido: ${error.message}`);
    }
  }

  // Procesar notificaciones programadas
  static async procesarNotificacionesProgramadas() {
    try {
      const ahora = new Date();
      // Usar índice compuesto (enviada + fecha) para mejor rendimiento
      const notificacionesRef = admin.firestore()
        .collection('notificaciones')
        .where('enviada', '==', false)
        .where('fecha', '<=', ahora)
        .orderBy('fecha', 'asc')
        .limit(100); // Procesar máximo 100 a la vez

      const snapshot = await notificacionesRef.get();
      const notificaciones = [];

      for (const doc of snapshot.docs) {
        const notificacion = { id: doc.id, ...doc.data() };
        notificaciones.push(notificacion);

        // Enviar notificación push (usar usuarioId preferentemente)
        const userId = notificacion.usuarioId || notificacion.jugadorId;
        await this.enviarNotificacionPush(userId, notificacion);
      }

      return notificaciones;
    } catch (error) {
      throw new Error(`Error al procesar notificaciones programadas: ${error.message}`);
    }
  }

  // Obtener estadísticas de notificaciones
  static async obtenerEstadisticas(jugadorId) {
    try {
      const notificacionesRef = admin.firestore()
        .collection('notificaciones')
        .where('usuarioId', '==', jugadorId);

      const snapshot = await notificacionesRef.get();
      
      const estadisticas = {
        total: snapshot.size,
        leidas: 0,
        noLeidas: 0,
        porTipo: {}
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.leida) {
          estadisticas.leidas++;
        } else {
          estadisticas.noLeidas++;
        }

        if (!estadisticas.porTipo[data.tipo]) {
          estadisticas.porTipo[data.tipo] = 0;
        }
        estadisticas.porTipo[data.tipo]++;
      });

      return estadisticas;
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
}

module.exports = NotificacionesService;
