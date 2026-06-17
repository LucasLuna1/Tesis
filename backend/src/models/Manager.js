/**
 * Modelo de datos para Managers y sus Clubes
 * Un Manager gestiona un club (equipo) con jugadores
 */

class Manager {
  constructor(data) {
    this.id = data.id || null;
    this.uid = data.uid; // Firebase Auth ID
    this.nombre = data.nombre || '';
    this.apellido = data.apellido || '';
    this.email = data.email || '';
    this.telefono = data.telefono || '';
    this.foto = data.foto || '';
    this.clubId = data.clubId || null; // ID del club que gestiona
    this.tipoUsuario = 'manager';
    this.activo = data.activo !== undefined ? data.activo : true;
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
  }
}

class Club {
  constructor(data) {
    this.id = data.id || null;
    this.nombre = data.nombre || '';
    this.direccion = data.direccion || '';
    this.ciudad = data.ciudad || '';
    this.provincia = data.provincia || '';
    this.codigoPostal = data.codigoPostal || '';
    this.telefono = data.telefono || '';
    this.email = data.email || '';
    this.foto = data.foto || ''; // Logo del club
    this.descripcion = data.descripcion || '';
    
    // Manager del club
    this.managerId = data.managerId || null;
    this.managerNombre = data.managerNombre || '';
    
    // Jugadores del club (lista con categorías)
    this.jugadores = data.jugadores || []; // Array de { jugadorId, nombre, categoria, fechaIngreso }
    
    // Torneos
    this.torneos = data.torneos || []; // Array de torneoIds
    this.torneosActivos = data.torneosActivos || [];
    this.torneosFinalizados = data.torneosFinalizados || [];
    
    // Estadísticas
    this.estadisticas = {
      totalJugadores: data.estadisticas?.totalJugadores || 0,
      torneosJugados: data.estadisticas?.torneosJugados || 0,
      partidosGanados: data.estadisticas?.partidosGanados || 0,
      partidosPerdidos: data.estadisticas?.partidosPerdidos || 0,
      partidosEmpatados: data.estadisticas?.partidosEmpatados || 0
    };
    
    this.activo = data.activo !== undefined ? data.activo : true;
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
  }
}

class SolicitudClub {
  constructor(data) {
    this.id = data.id || null;
    this.clubId = data.clubId;
    this.jugadorId = data.jugadorId;
    this.jugadorNombre = data.jugadorNombre || '';
    this.jugadorEmail = data.jugadorEmail || '';
    this.categoria = data.categoria || '';
    this.mensaje = data.mensaje || '';
    this.estado = data.estado || 'pendiente'; // pendiente, aceptada, rechazada
    this.fechaSolicitud = data.fechaSolicitud || new Date();
    this.fechaRespuesta = data.fechaRespuesta || null;
    this.respondidoPor = data.respondidoPor || null;
  }
}

module.exports = {
  Manager,
  Club,
  SolicitudClub
};



