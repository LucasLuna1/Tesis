/**
 * Modelo para sistema de seguimiento de equipos
 * Permite a los usuarios seguir equipos y recibir noticias
 */

class SeguidorEquipo {
  constructor(data) {
    this.id = data.id || null;
    this.usuarioId = data.usuarioId;
    this.usuarioNombre = data.usuarioNombre || '';
    this.equipoId = data.equipoId;
    this.equipoNombre = data.equipoNombre || '';
    this.equipoLogo = data.equipoLogo || '';
    this.fechaSeguimiento = data.fechaSeguimiento || new Date();
    this.notificacionesActivas = data.notificacionesActivas !== undefined ? data.notificacionesActivas : true;
    this.notificarPartidos = data.notificarPartidos !== undefined ? data.notificarPartidos : true;
    this.notificarNoticias = data.notificarNoticias !== undefined ? data.notificarNoticias : true;
    this.notificarResultados = data.notificarResultados !== undefined ? data.notificarResultados : true;
  }

  toJSON() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      usuarioNombre: this.usuarioNombre,
      equipoId: this.equipoId,
      equipoNombre: this.equipoNombre,
      equipoLogo: this.equipoLogo,
      fechaSeguimiento: this.fechaSeguimiento,
      notificacionesActivas: this.notificacionesActivas,
      notificarPartidos: this.notificarPartidos,
      notificarNoticias: this.notificarNoticias,
      notificarResultados: this.notificarResultados
    };
  }

  activarNotificaciones() {
    this.notificacionesActivas = true;
  }

  desactivarNotificaciones() {
    this.notificacionesActivas = false;
  }

  configurarNotificaciones(config) {
    if (config.notificarPartidos !== undefined) {
      this.notificarPartidos = config.notificarPartidos;
    }
    if (config.notificarNoticias !== undefined) {
      this.notificarNoticias = config.notificarNoticias;
    }
    if (config.notificarResultados !== undefined) {
      this.notificarResultados = config.notificarResultados;
    }
  }
}

module.exports = SeguidorEquipo;


