/**
 * Modelo de datos para Equipos
 * CRUD completo desde cero
 */

class Equipo {
  constructor(data) {
    // ID del documento en Firestore (autogenerado)
    this.id = data.id || null;
    
    // Información básica del equipo
    this.nombre = data.nombre || '';
    this.descripcion = data.descripcion || '';
    this.logo = data.logo || '';
    
    // Categorías del equipo (array de strings)
    this.categorias = Array.isArray(data.categorias) ? data.categorias : [];
    
    // Información del club
    this.club = data.club || '';
    this.ciudad = data.ciudad || '';
    this.pais = data.pais || 'Colombia';
    
    // Contacto
    this.telefono = data.telefono || '';
    this.email = data.email || '';
    this.sitioWeb = data.sitioWeb || '';
    
    // Información deportiva
    this.deporte = data.deporte || 'Rugby';
    this.division = data.division || 'Primera';
    this.estado = data.estado || 'activo'; // activo, inactivo, suspendido
    
    // Miembros del equipo (IDs de usuarios)
    this.jugadores = Array.isArray(data.jugadores) ? data.jugadores : [];
    this.entrenadorId = data.entrenadorId || null;
    this.asistenteEntrenadorId = data.asistenteEntrenadorId || null;
    this.delegadoId = data.delegadoId || null;
    
    // Estadísticas del equipo (específicas para Rugby)
    this.estadisticas = {
      partidosJugados: data.estadisticas?.partidosJugados || 0,
      partidosGanados: data.estadisticas?.partidosGanados || 0,
      partidosEmpatados: data.estadisticas?.partidosEmpatados || 0,
      partidosPerdidos: data.estadisticas?.partidosPerdidos || 0,
      puntosAFavor: data.estadisticas?.puntosAFavor || 0,
      puntosEnContra: data.estadisticas?.puntosEnContra || 0,
      diferenciaPuntos: data.estadisticas?.diferenciaPuntos || 0,
      triesAFavor: data.estadisticas?.triesAFavor || 0,
      triesEnContra: data.estadisticas?.triesEnContra || 0,
      tarjetasAmarillas: data.estadisticas?.tarjetasAmarillas || 0,
      tarjetasRojas: data.estadisticas?.tarjetasRojas || 0,
      posicionTabla: data.estadisticas?.posicionTabla || 0,
      rankingFairPlay: data.estadisticas?.rankingFairPlay || 0,
      // Ocultos - solo computar pero no mostrar
      _conversiones: data.estadisticas?._conversiones || 0,
      _penales: data.estadisticas?._penales || 0,
      _drops: data.estadisticas?._drops || 0
    };
    
    // Fechas de control
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
    this.creadoPor = data.creadoPor || null;
    this.actualizadoPor = data.actualizadoPor || null;
  }

  // Validar datos del equipo
  static validate(equipoData) {
    const errors = [];
    
    if (!equipoData.nombre || equipoData.nombre.trim() === '') {
      errors.push('El nombre del equipo es requerido');
    }
    
    if (!equipoData.categorias || !Array.isArray(equipoData.categorias) || equipoData.categorias.length === 0) {
      errors.push('Debe seleccionar al menos una categoría');
    }
    
    if (equipoData.email && !/\S+@\S+\.\S+/.test(equipoData.email)) {
      errors.push('El email no tiene un formato válido');
    }
    
    if (equipoData.telefono && !/^[\d\s\-\+\(\)]+$/.test(equipoData.telefono)) {
      errors.push('El teléfono no tiene un formato válido');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Convertir a JSON para guardar en Firestore
  toJSON() {
    return {
      nombre: this.nombre,
      descripcion: this.descripcion,
      logo: this.logo,
      categorias: this.categorias,
      club: this.club,
      ciudad: this.ciudad,
      pais: this.pais,
      telefono: this.telefono,
      email: this.email,
      sitioWeb: this.sitioWeb,
      deporte: this.deporte,
      division: this.division,
      estado: this.estado,
      jugadores: this.jugadores,
      entrenadorId: this.entrenadorId,
      asistenteEntrenadorId: this.asistenteEntrenadorId,
      delegadoId: this.delegadoId,
      estadisticas: this.estadisticas,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      creadoPor: this.creadoPor,
      actualizadoPor: this.actualizadoPor
    };
  }

  // Métodos para gestión de jugadores
  agregarJugador(jugadorId) {
    if (!this.jugadores.includes(jugadorId)) {
      this.jugadores.push(jugadorId);
      this.fechaActualizacion = new Date();
    }
  }

  removerJugador(jugadorId) {
    const index = this.jugadores.indexOf(jugadorId);
    if (index > -1) {
      this.jugadores.splice(index, 1);
      this.fechaActualizacion = new Date();
    }
  }

  // Métodos para estadísticas
  actualizarEstadisticas(partido) {
    this.estadisticas.partidosJugados++;
    
    if (partido.resultado === 'victoria') {
      this.estadisticas.partidosGanados++;
    } else if (partido.resultado === 'empate') {
      this.estadisticas.partidosEmpatados++;
    } else {
      this.estadisticas.partidosPerdidos++;
    }
    
    this.estadisticas.puntosAFavor += partido.puntosAFavor || 0;
    this.estadisticas.puntosEnContra += partido.puntosEnContra || 0;
    this.estadisticas.diferenciaPuntos = this.estadisticas.puntosAFavor - this.estadisticas.puntosEnContra;
    
    // Estadísticas específicas de rugby - Solo tries visible
    this.estadisticas.triesAFavor += partido.triesAFavor || 0;
    this.estadisticas.triesEnContra += partido.triesEnContra || 0;
    this.estadisticas.tarjetasAmarillas += partido.tarjetasAmarillas || 0;
    this.estadisticas.tarjetasRojas += partido.tarjetasRojas || 0;
    // Mantener ocultos
    this.estadisticas._conversiones += partido.conversiones || 0;
    this.estadisticas._penales += partido.penales || 0;
    this.estadisticas._drops += partido.drops || 0;
    
    this.fechaActualizacion = new Date();
  }

  calcularDiferenciaPuntos() {
    return this.estadisticas.puntosAFavor - this.estadisticas.puntosEnContra;
  }

  // Métodos de utilidad
  getNombreCompleto() {
    return `${this.nombre} ${this.club ? `(${this.club})` : ''}`;
  }

  getCantidadJugadores() {
    return this.jugadores.length;
  }

  isActivo() {
    return this.estado === 'activo';
  }

  // Método para actualizar datos
  actualizarDatos(nuevosDatos, usuarioId) {
    const camposPermitidos = [
      'nombre', 'descripcion', 'logo', 'categorias', 'club', 'ciudad', 'pais',
      'telefono', 'email', 'sitioWeb', 'deporte', 'division', 'estado',
      'entrenadorId', 'asistenteEntrenadorId', 'delegadoId'
    ];
    
    camposPermitidos.forEach(campo => {
      if (nuevosDatos[campo] !== undefined) {
        this[campo] = nuevosDatos[campo];
      }
    });
    
    this.fechaActualizacion = new Date();
    this.actualizadoPor = usuarioId;
  }
}

module.exports = Equipo;