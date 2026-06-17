const { db } = require('../config/firebase');

class Notificacion {
  constructor(data) {
    this.id = data.id;
    this.usuarioId = data.usuarioId || data.jugadorId; // Soporte para ambos nombres
    this.jugadorId = data.jugadorId || data.usuarioId; // Mantener compatibilidad
    this.tipo = data.tipo; // 'partido', 'sancion', 'recordatorio', 'general', 'noticia_equipo', 'nuevo_seguidor'
    this.titulo = data.titulo;
    this.mensaje = data.mensaje;
    this.fecha = data.fecha || new Date();
    this.leida = data.leida || false;
    this.prioridad = data.prioridad || 'normal'; // 'alta', 'normal', 'baja'
    this.data = data.data || {}; // Datos adicionales (partidoId, torneoId, etc.)
    this.enviada = data.enviada || false;
    this.fechaEnvio = data.fechaEnvio || null;
  }

  // Crear notificación
  static async crear(notificacionData) {
    try {
      const notificacionRef = db.collection('notificaciones').doc();
      const notificacion = new Notificacion({
        id: notificacionRef.id,
        ...notificacionData
      });

      await notificacionRef.set({
        usuarioId: notificacion.usuarioId,
        jugadorId: notificacion.jugadorId, // Mantener compatibilidad
        tipo: notificacion.tipo,
        titulo: notificacion.titulo,
        mensaje: notificacion.mensaje,
        fecha: notificacion.fecha,
        leida: notificacion.leida,
        prioridad: notificacion.prioridad,
        data: notificacion.data,
        enviada: notificacion.enviada,
        fechaEnvio: notificacion.fechaEnvio
      });

      return notificacion;
    } catch (error) {
      throw new Error(`Error al crear notificación: ${error.message}`);
    }
  }

  // Obtener notificaciones de un jugador/usuario
  static async obtenerPorJugador(jugadorId, limite = 50, offset = 0) {
    try {
      // Usar índice de Firestore para ordenar por fecha (más eficiente)
      let notificacionesRef = db.collection('notificaciones')
        .where('usuarioId', '==', jugadorId)
        .orderBy('fecha', 'desc')
        .limit(limite);

      // Si hay offset, obtener el último documento de la página anterior
      if (offset > 0) {
        const offsetSnapshot = await db.collection('notificaciones')
          .where('usuarioId', '==', jugadorId)
          .orderBy('fecha', 'desc')
          .limit(offset)
          .get();
        
        if (!offsetSnapshot.empty) {
          const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          notificacionesRef = notificacionesRef.startAfter(lastDoc);
        }
      }

      const snapshot = await notificacionesRef.get();
      
      // Si no encuentra con usuarioId, buscar con jugadorId para compatibilidad
      if (snapshot.empty) {
        notificacionesRef = db.collection('notificaciones')
          .where('jugadorId', '==', jugadorId)
          .orderBy('fecha', 'desc')
          .limit(limite);
        
        const jugadorSnapshot = await notificacionesRef.get();
        const notificaciones = [];
        jugadorSnapshot.forEach(doc => {
          notificaciones.push({
            id: doc.id,
            ...doc.data()
          });
        });
        return notificaciones;
      }

      const notificaciones = [];
      snapshot.forEach(doc => {
        notificaciones.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return notificaciones;
    } catch (error) {
      throw new Error(`Error al obtener notificaciones: ${error.message}`);
    }
  }

  // Alias para obtener notificaciones de un usuario
  static async obtenerPorUsuario(usuarioId, limite = 50, offset = 0) {
    return this.obtenerPorJugador(usuarioId, limite, offset);
  }

  // Marcar como leída
  static async marcarComoLeida(notificacionId) {
    try {
      await db.collection('notificaciones').doc(notificacionId).update({
        leida: true
      });
      return true;
    } catch (error) {
      throw new Error(`Error al marcar notificación como leída: ${error.message}`);
    }
  }

  // Marcar todas como leídas
  static async marcarTodasComoLeidas(jugadorId) {
    try {
      const notificacionesRef = db.collection('notificaciones')
        .where('usuarioId', '==', jugadorId)
        .where('leida', '==', false);

      const snapshot = await notificacionesRef.get();
      
      if (snapshot.empty) {
        return true;
      }

      const batch = db.batch();

      snapshot.forEach(doc => {
        batch.update(doc.ref, { leida: true });
      });

      await batch.commit();
      return true;
    } catch (error) {
      throw new Error(`Error al marcar todas las notificaciones como leídas: ${error.message}`);
    }
  }

  // Obtener notificaciones no leídas
  static async obtenerNoLeidas(jugadorId) {
    try {
      // Usar índice compuesto de Firestore (usuarioId + leida + fecha)
      const notificacionesRef = db.collection('notificaciones')
        .where('usuarioId', '==', jugadorId)
        .where('leida', '==', false)
        .orderBy('fecha', 'desc');

      const snapshot = await notificacionesRef.get();
      const notificaciones = [];

      snapshot.forEach(doc => {
        notificaciones.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return notificaciones;
    } catch (error) {
      throw new Error(`Error al obtener notificaciones no leídas: ${error.message}`);
    }
  }

  // Contar notificaciones no leídas
  static async contarNoLeidas(jugadorId) {
    try {
      // Usar query compuesta más eficiente
      const notificacionesRef = db.collection('notificaciones')
        .where('usuarioId', '==', jugadorId)
        .where('leida', '==', false);

      const snapshot = await notificacionesRef.get();
      return snapshot.size;
    } catch (error) {
      throw new Error(`Error al contar notificaciones no leídas: ${error.message}`);
    }
  }

  // Eliminar notificación
  static async eliminar(notificacionId) {
    try {
      await db.collection('notificaciones').doc(notificacionId).delete();
      return true;
    } catch (error) {
      throw new Error(`Error al eliminar notificación: ${error.message}`);
    }
  }

  // Crear notificaciones masivas
  static async crearMasivas(jugadoresIds, notificacionData) {
    try {
      // Firestore batch tiene límite de 500 operaciones
      const BATCH_LIMIT = 500;
      const notificaciones = [];
      
      for (let i = 0; i < jugadoresIds.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        const jugadoresBatch = jugadoresIds.slice(i, i + BATCH_LIMIT);
        
        jugadoresBatch.forEach(jugadorId => {
          const notificacionRef = db.collection('notificaciones').doc();
          const notificacion = {
            id: notificacionRef.id,
            usuarioId: jugadorId,
            jugadorId, // Mantener compatibilidad
            ...notificacionData,
            leida: notificacionData.leida !== undefined ? notificacionData.leida : false, // Por defecto false
            enviada: notificacionData.enviada !== undefined ? notificacionData.enviada : false, // Por defecto false
            fecha: new Date()
          };

          batch.set(notificacionRef, notificacion);
          notificaciones.push(notificacion);
        });

        await batch.commit();
      }
      
      return notificaciones;
    } catch (error) {
      throw new Error(`Error al crear notificaciones masivas: ${error.message}`);
    }
  }

  // Obtener notificaciones por tipo
  static async obtenerPorTipo(jugadorId, tipo, limite = 20) {
    try {
      // Usar índice compuesto de Firestore (usuarioId + tipo + fecha)
      const notificacionesRef = db.collection('notificaciones')
        .where('usuarioId', '==', jugadorId)
        .where('tipo', '==', tipo)
        .orderBy('fecha', 'desc')
        .limit(limite);

      const snapshot = await notificacionesRef.get();
      const notificaciones = [];

      snapshot.forEach(doc => {
        notificaciones.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return notificaciones;
    } catch (error) {
      throw new Error(`Error al obtener notificaciones por tipo: ${error.message}`);
    }
  }

  // Limpiar notificaciones antiguas (más de X días)
  static async limpiarNotificacionesAntiguas(diasRetencion = 30) {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

      const notificacionesRef = db.collection('notificaciones')
        .where('fecha', '<', fechaLimite)
        .where('leida', '==', true) // Solo eliminar las leídas
        .limit(500); // Procesar en lotes de 500

      const snapshot = await notificacionesRef.get();
      
      if (snapshot.empty) {
        return { eliminadas: 0 };
      }

      const batch = db.batch();
      let contador = 0;

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        contador++;
      });

      await batch.commit();

      return {
        eliminadas: contador,
        mensaje: `Se eliminaron ${contador} notificaciones antiguas`
      };
    } catch (error) {
      throw new Error(`Error al limpiar notificaciones antiguas: ${error.message}`);
    }
  }

  // Eliminar todas las notificaciones de un usuario
  static async eliminarTodasDeUsuario(usuarioId) {
    try {
      const notificacionesRef = db.collection('notificaciones')
        .where('usuarioId', '==', usuarioId)
        .limit(500);

      const snapshot = await notificacionesRef.get();
      
      if (snapshot.empty) {
        return { eliminadas: 0 };
      }

      const batch = db.batch();
      let contador = 0;

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        contador++;
      });

      await batch.commit();

      // Si hay más de 500, llamar recursivamente
      if (snapshot.size === 500) {
        const resultado = await this.eliminarTodasDeUsuario(usuarioId);
        contador += resultado.eliminadas;
      }

      return { eliminadas: contador };
    } catch (error) {
      throw new Error(`Error al eliminar notificaciones del usuario: ${error.message}`);
    }
  }
}

module.exports = Notificacion;
