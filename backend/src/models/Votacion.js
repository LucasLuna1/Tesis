/**
 * Modelo de datos para Votaciones de Jugador del Partido
 * User Story: Sistema de votación para jugador del partido (Rugby)
 */

class Votacion {
  constructor(data) {
    this.id = data.id || null;
    this.partidoId = data.partidoId || null;
    this.jugadorId = data.jugadorId || null;
    this.jugadorNombre = data.jugadorNombre || '';
    this.equipoId = data.equipoId || null;
    this.equipoNombre = data.equipoNombre || '';
    this.usuarioId = data.usuarioId || null; // ID del usuario que vota
    this.usuarioNombre = data.usuarioNombre || '';
    this.usuarioRol = data.usuarioRol || ''; // jugador, arbitro, etc.
    this.timestamp = data.timestamp || new Date();
    this.ipAddress = data.ipAddress || null; // Backup para validación
  }

  // Validaciones
  static validate(votacionData) {
    const errors = [];

    if (!votacionData.partidoId) {
      errors.push('El ID del partido es requerido');
    }

    if (!votacionData.jugadorId) {
      errors.push('El ID del jugador es requerido');
    }

    if (!votacionData.usuarioId) {
      errors.push('El ID del usuario es requerido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      id: this.id,
      partidoId: this.partidoId,
      jugadorId: this.jugadorId,
      jugadorNombre: this.jugadorNombre,
      equipoId: this.equipoId,
      equipoNombre: this.equipoNombre,
      usuarioId: this.usuarioId,
      usuarioNombre: this.usuarioNombre,
      usuarioRol: this.usuarioRol,
      timestamp: this.timestamp,
      ipAddress: this.ipAddress
    };
  }
}

module.exports = Votacion;
