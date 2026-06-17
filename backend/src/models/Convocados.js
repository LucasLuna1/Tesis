/**
 * Modelo para gestión de listas de convocados
 * Permite a los managers crear listas de jugadores convocados para partidos específicos
 */

class Convocados {
  constructor(data) {
    this.id = data.id || null;
    this.partidoId = data.partidoId || null; // ID del partido
    this.equipoId = data.equipoId || null; // ID del equipo
    this.equipoNombre = data.equipoNombre || ''; // Nombre del equipo
    this.categoria = data.categoria || ''; // Categoría del partido (M14, M15, M16, etc.)
    this.fechaPartido = data.fechaPartido || null; // Fecha del partido
    this.torneoId = data.torneoId || null; // ID del torneo (opcional)
    this.torneoNombre = data.torneoNombre || ''; // Nombre del torneo (opcional)
    
    // Jugadores convocados
    this.jugadores = data.jugadores || []; // Array de objetos jugador
    
    // Información de gestión
    this.managerId = data.managerId || null; // ID del manager que creó la lista
    this.managerNombre = data.managerNombre || ''; // Nombre del manager
    this.estado = data.estado || 'borrador'; // borrador, confirmado, enviado
    
    // Auditoría
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
    this.creadoPor = data.creadoPor || null;
    this.modificadoPor = data.modificadoPor || null;
  }

  // Validar datos del convocados
  static validate(data) {
    const errors = [];
    
    if (!data.partidoId) {
      errors.push('ID del partido es requerido');
    }
    
    if (!data.equipoId) {
      errors.push('ID del equipo es requerido');
    }
    
    if (!data.categoria) {
      errors.push('Categoría es requerida');
    }
    
    if (!data.managerId) {
      errors.push('ID del manager es requerido');
    }
    
    if (!data.jugadores || !Array.isArray(data.jugadores)) {
      errors.push('Lista de jugadores es requerida');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Agregar jugador a la lista de convocados
  agregarJugador(jugador) {
    // Verificar que el jugador no esté ya en la lista
    const existe = this.jugadores.some(j => j.id === jugador.id);
    if (!existe) {
      this.jugadores.push({
        id: jugador.id,
        nombre: jugador.nombre,
        apellido: jugador.apellido,
        numero: jugador.numero || null,
        posicion: jugador.posicion || '',
        categoria: jugador.categoria || [],
        foto: jugador.foto || null,
        fechaConvocatoria: new Date(),
        esTitular: jugador.esTitular || false, // Indica si es titular o suplente
        minutoInicio: null, // Minuto en que entra al partido (null si no ha entrado)
        minutoSalida: null, // Minuto en que sale del partido (null si está jugando o no ha entrado)
        minutosJugados: 0, // Total de minutos jugados en el partido
        activo: false // Indica si está actualmente en el campo
      });
      this.fechaActualizacion = new Date();
    }
  }

  // Registrar entrada de jugador al campo
  registrarEntrada(jugadorId, minuto) {
    const jugador = this.jugadores.find(j => j.id === jugadorId);
    if (jugador) {
      jugador.minutoInicio = minuto;
      jugador.activo = true;
      this.fechaActualizacion = new Date();
    }
  }

  // Registrar salida de jugador del campo
  registrarSalida(jugadorId, minuto) {
    const jugador = this.jugadores.find(j => j.id === jugadorId);
    if (jugador && jugador.activo) {
      jugador.minutoSalida = minuto;
      jugador.activo = false;
      // Calcular minutos jugados
      const minutosJugadosEnEstaEntrada = minuto - (jugador.minutoInicio || 0);
      jugador.minutosJugados = (jugador.minutosJugados || 0) + minutosJugadosEnEstaEntrada;
      this.fechaActualizacion = new Date();
    }
  }

  // Actualizar minutos jugados de jugadores activos
  actualizarMinutosJugadores(minutoActual) {
    this.jugadores.forEach(jugador => {
      if (jugador.activo && jugador.minutoInicio !== null) {
        // Calcular minutos jugados hasta el momento actual
        jugador.minutosJugados = minutoActual - jugador.minutoInicio;
      }
    });
    this.fechaActualizacion = new Date();
  }

  // Remover jugador de la lista de convocados
  removerJugador(jugadorId) {
    this.jugadores = this.jugadores.filter(j => j.id !== jugadorId);
    this.fechaActualizacion = new Date();
  }

  // Confirmar lista de convocados
  confirmar() {
    if (this.jugadores.length === 0) {
      throw new Error('No se puede confirmar una lista sin jugadores');
    }
    
    this.estado = 'confirmado';
    this.fechaActualizacion = new Date();
  }

  // Enviar lista de convocados (marcar como enviada al árbitro)
  enviar() {
    if (this.estado !== 'confirmado') {
      throw new Error('La lista debe estar confirmada antes de ser enviada');
    }
    
    this.estado = 'enviado';
    this.fechaActualizacion = new Date();
  }

  // Obtener estadísticas de la lista
  obtenerEstadisticas() {
    return {
      totalJugadores: this.jugadores.length,
      porPosicion: this.jugadores.reduce((acc, jugador) => {
        const pos = jugador.posicion || 'Sin posición';
        acc[pos] = (acc[pos] || 0) + 1;
        return acc;
      }, {}),
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      estado: this.estado
    };
  }

  // Convertir a JSON para guardar en base de datos
  toJSON() {
    return {
      id: this.id,
      partidoId: this.partidoId,
      equipoId: this.equipoId,
      equipoNombre: this.equipoNombre,
      categoria: this.categoria,
      fechaPartido: this.fechaPartido,
      torneoId: this.torneoId,
      torneoNombre: this.torneoNombre,
      jugadores: this.jugadores,
      managerId: this.managerId,
      managerNombre: this.managerNombre,
      estado: this.estado,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      creadoPor: this.creadoPor,
      modificadoPor: this.modificadoPor
    };
  }

  // Crear desde documento de Firestore
  static fromFirestore(doc) {
    const data = doc.data();
    return new Convocados({
      id: doc.id,
      ...data
    });
  }
}

module.exports = Convocados;
