/**
 * Modelo de datos para Partidos
 * User Story 1.1: Definir modelos de datos para partidos
 * User Story 1.2: Registrar partidos con fecha, hora, equipos y cancha
 * User Story 1.3: Vincular partidos con árbitros principales y asistentes
 */

class Partido {
  constructor(data) {
    this.id = data.id || null;
    this.torneoId = data.torneoId || null; // ID del torneo al que pertenece
    this.categoria = data.categoria || ''; // Categoría del torneo
    this.jornada = data.jornada || 1;
    this.fase = data.fase || 'Regular'; // Regular, Eliminatorias, Final
    
    // Información básica del partido
    this.fecha = data.fecha || new Date();
    this.horaInicio = data.horaInicio || '15:00';
    this.horaFin = data.horaFin || null;
    this.duracion = data.duracion || 80; // Rugby: 80 minutos (2 tiempos de 40)
    
    // Equipos participantes (mantener como strings simples)
    this.equipoLocal = data.equipoLocal || '';
    this.equipoLocalId = data.equipoLocalId || null;
    this.equipoLocalLogo = data.equipoLocalLogo || '';
    
    this.equipoVisitante = data.equipoVisitante || '';
    this.equipoVisitanteId = data.equipoVisitanteId || null;
    this.equipoVisitanteLogo = data.equipoVisitanteLogo || '';
    
    // Árbitros asignados
    this.arbitros = {
      principal: data.arbitros?.principal || null,
      asistente1: data.arbitros?.asistente1 || null,
      asistente2: data.arbitros?.asistente2 || null,
      cuartoArbitro: data.arbitros?.cuartoArbitro || null
    };
    
    // Cancha donde se juega
    this.cancha = {
      id: data.cancha?.id || null,
      nombre: data.cancha?.nombre || '',
      direccion: data.cancha?.direccion || ''
    };
    
    // Estado del partido
    this.estado = data.estado || 'programado'; // programado, En Curso, finalizado, suspendido, cancelado
    this.razonSuspension = data.razonSuspension || '';
    
    // Resultado del partido (RUGBY)
    this.resultado = {
      puntosLocal: data.resultado?.puntosLocal || 0,
      puntosVisitante: data.resultado?.puntosVisitante || 0,
      triesLocal: data.resultado?.triesLocal || 0,
      triesVisitante: data.resultado?.triesVisitante || 0,
      conversionesLocal: data.resultado?.conversionesLocal || 0,
      conversionesVisitante: data.resultado?.conversionesVisitante || 0,
      penalesLocal: data.resultado?.penalesLocal || 0,
      penalesVisitante: data.resultado?.penalesVisitante || 0,
      dropsLocal: data.resultado?.dropsLocal || 0,
      dropsVisitante: data.resultado?.dropsVisitante || 0
    };
    
    // Tiempo del partido
    this.tiempo = {
      inicio: data.tiempo?.inicio || null,
      fin: data.tiempo?.fin || null,
      tiempoTranscurrido: data.tiempo?.tiempoTranscurrido || 0,
      tiempoExtra: data.tiempo?.tiempoExtra || 0,
      descuento: data.tiempo?.descuento || 0
    };
    
    // Incidencias del partido
    this.incidencias = data.incidencias || [];
    
    // Estadísticas del partido (RUGBY) - Simplificadas según feedback
    this.estadisticas = {
      // Ocultos para uso futuro
      _scrumsLocal: data.estadisticas?._scrumsLocal || 0,
      _scrumsVisitante: data.estadisticas?._scrumsVisitante || 0,
      _lineoutsLocal: data.estadisticas?._lineoutsLocal || 0,
      _lineoutsVisitante: data.estadisticas?._lineoutsVisitante || 0,
      // Visibles
      tarjetasAmarillasLocal: data.estadisticas?.tarjetasAmarillasLocal || 0,
      tarjetasAmarillasVisitante: data.estadisticas?.tarjetasAmarillasVisitante || 0,
      tarjetasRojasLocal: data.estadisticas?.tarjetasRojasLocal || 0,
      tarjetasRojasVisitante: data.estadisticas?.tarjetasRojasVisitante || 0,
      tarjetasAzulesLocal: data.estadisticas?.tarjetasAzulesLocal || 0,
      tarjetasAzulesVisitante: data.estadisticas?.tarjetasAzulesVisitante || 0
    };
    
    // Información adicional
    this.observaciones = data.observaciones || '';
    this.condicionesClimaticas = data.condicionesClimaticas || '';
    this.asistencia = data.asistencia || 0;
    
    // Fechas de control
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
    
    // Campos de auditoría (User Story 1.2)
    this.auditoria = {
      creadoPor: data.auditoria?.creadoPor || null,
      creadoPorNombre: data.auditoria?.creadoPorNombre || '',
      modificadoPor: data.auditoria?.modificadoPor || null,
      modificadoPorNombre: data.auditoria?.modificadoPorNombre || '',
      cerradoPor: data.auditoria?.cerradoPor || null,
      cerradoPorNombre: data.auditoria?.cerradoPorNombre || '',
      iniciadoPor: data.auditoria?.iniciadoPor || null,
      iniciadoPorNombre: data.auditoria?.iniciadoPorNombre || '',
      historialCambios: data.auditoria?.historialCambios || []
    };
  }

  // Validaciones
  static validate(partidoData) {
    const { modelValidators } = require('../utils/validators');
    return modelValidators.partido(partidoData);
  }

  // Métodos de instancia
  toJSON() {
    return {
      id: this.id,
      torneoId: this.torneoId,
      jornada: this.jornada,
      fase: this.fase,
      fecha: this.fecha,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      duracion: this.duracion,
      equipoLocal: this.equipoLocal,
      equipoLocalId: this.equipoLocalId,
      equipoLocalLogo: this.equipoLocalLogo,
      equipoVisitante: this.equipoVisitante,
      equipoVisitanteId: this.equipoVisitanteId,
      equipoVisitanteLogo: this.equipoVisitanteLogo,
      arbitros: this.arbitros,
      cancha: this.cancha,
      estado: this.estado,
      razonSuspension: this.razonSuspension,
      resultado: this.resultado,
      tiempo: this.tiempo,
      incidencias: this.incidencias,
      estadisticas: this.estadisticas,
      observaciones: this.observaciones,
      condicionesClimaticas: this.condicionesClimaticas,
      asistencia: this.asistencia,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion
    };
  }

  // Métodos para gestión del partido
  iniciarPartido() {
    if (this.estado !== 'programado') {
      throw new Error('Solo se pueden iniciar partidos programados');
    }
    
    this.estado = 'En Curso';
    this.tiempo.inicio = new Date();
    this.fechaActualizacion = new Date();
  }

  pausarPartido() {
    if (this.estado !== 'En Curso') {
      throw new Error('Solo se pueden pausar partidos en curso');
    }
    
    // El estado permanece como 'En Curso' pero se puede controlar con el tiempo
    this.fechaActualizacion = new Date();
  }

  reanudarPartido() {
    if (this.estado !== 'En Curso') {
      throw new Error('Solo se pueden reanudar partidos en curso');
    }
    
    this.fechaActualizacion = new Date();
  }

  finalizarPartido() {
    // Permitir finalizar partidos que estén en curso, pausados o programados
    const estadosPermitidos = ['En Curso', 'programado', 'pausado'];
    if (!estadosPermitidos.includes(this.estado)) {
      throw new Error(`No se puede finalizar un partido en estado: ${this.estado}. Debe estar en curso, pausado o programado.`);
    }
    
    this.estado = 'finalizado';
    this.tiempo.fin = new Date();
    this.horaFin = new Date().toTimeString().slice(0, 5);
    
    // Calcular duración real
    if (this.tiempo.inicio && this.tiempo.fin) {
      const duracionMs = this.tiempo.fin - this.tiempo.inicio;
      this.duracion = Math.round(duracionMs / (1000 * 60));
    }
    
    this.fechaActualizacion = new Date();
  }

  suspenderPartido(razon) {
    if (this.estado === 'finalizado' || this.estado === 'cancelado') {
      throw new Error('No se puede suspender un partido finalizado o cancelado');
    }
    
    this.estado = 'suspendido';
    this.razonSuspension = razon;
    this.fechaActualizacion = new Date();
  }

  cancelarPartido(razon) {
    if (this.estado === 'finalizado') {
      throw new Error('No se puede cancelar un partido finalizado');
    }
    
    this.estado = 'cancelado';
    this.razonSuspension = razon;
    this.fechaActualizacion = new Date();
  }

  // Helper para determinar si una incidencia es del equipo local
  esEquipoLocal(incidencia) {
    // Si tiene equipoId, comparar con los IDs reales de los equipos
    if (incidencia.equipoId) {
      return incidencia.equipoId === this.equipoLocalId;
    }
    
    // Fallback a la comparación de strings
    const equipo = incidencia.equipo;
    return equipo === 'LOCAL' || equipo === 'local';
  }

  // Métodos para gestión de incidencias
  agregarIncidencia(incidencia) {
    // Formato limpio para Rugby (sin campos de fútbol)
    const nuevaIncidencia = {
      id: incidencia.id || Date.now().toString(),
      tipo: incidencia.tipo, // TRY, CONVERSION, PENAL, DROP, TARJETA_AMARILLA, TARJETA_ROJA, CAMBIO, LESION, INICIO, FIN
      minuto: incidencia.minuto,
      tiempo: incidencia.tiempo || '1T', // 1T, 2T
      equipoId: incidencia.equipoId || incidencia.equipo, // Soportar ambos por compatibilidad
      jugadorId: incidencia.jugadorId || '',
      jugadorNombre: incidencia.jugadorNombre || '',
      arbitroId: incidencia.arbitroId,
      descripcion: incidencia.descripcion || '',
      timestamp: incidencia.timestamp || new Date().toISOString()
    };

    // Agregar campos específicos para CAMBIO
    if (incidencia.tipo === 'CAMBIO' || incidencia.tipo === 'cambio') {
      nuevaIncidencia.jugadorSaleId = incidencia.jugadorSaleId || '';
      nuevaIncidencia.jugadorEntraId = incidencia.jugadorEntraId || '';
      // Guardar objetos completos para mostrar en la UI
      nuevaIncidencia.jugadorSale = incidencia.jugadorSale || null;
      nuevaIncidencia.jugadorEntra = incidencia.jugadorEntra || null;
    }
    
    this.incidencias.push(nuevaIncidencia);
    this.fechaActualizacion = new Date();
    
    // Actualizar resultado según el tipo de incidencia (Rugby)
    if (incidencia.tipo === 'TRY') {
      const esEquipoLocal = this.esEquipoLocal(incidencia);
      if (esEquipoLocal) {
        this.resultado.triesLocal = (this.resultado.triesLocal || 0) + 1;
        this.resultado.puntosLocal = (this.resultado.puntosLocal || 0) + 5; // Try = 5 puntos
        console.log(`✅ [Modelo] TRY LOCAL: +5 puntos. Total: ${this.resultado.puntosLocal}`);
      } else {
        this.resultado.triesVisitante = (this.resultado.triesVisitante || 0) + 1;
        this.resultado.puntosVisitante = (this.resultado.puntosVisitante || 0) + 5;
        console.log(`✅ [Modelo] TRY VISITANTE: +5 puntos. Total: ${this.resultado.puntosVisitante}`);
      }
    } else if (incidencia.tipo === 'CONVERSION') {
      const esEquipoLocal = this.esEquipoLocal(incidencia);
      if (esEquipoLocal) {
        this.resultado.conversionesLocal = (this.resultado.conversionesLocal || 0) + 1;
        this.resultado.puntosLocal = (this.resultado.puntosLocal || 0) + 2; // Conversión = 2 puntos
        console.log(`✅ [Modelo] CONVERSIÓN LOCAL: +2 puntos. Total: ${this.resultado.puntosLocal}`);
      } else {
        this.resultado.conversionesVisitante = (this.resultado.conversionesVisitante || 0) + 1;
        this.resultado.puntosVisitante = (this.resultado.puntosVisitante || 0) + 2;
        console.log(`✅ [Modelo] CONVERSIÓN VISITANTE: +2 puntos. Total: ${this.resultado.puntosVisitante}`);
      }
    } else if (incidencia.tipo === 'PENAL') {
      const esEquipoLocal = this.esEquipoLocal(incidencia);
      if (esEquipoLocal) {
        this.resultado.penalesLocal = (this.resultado.penalesLocal || 0) + 1;
        this.resultado.puntosLocal = (this.resultado.puntosLocal || 0) + 3; // Penal = 3 puntos
        console.log(`✅ [Modelo] PENAL LOCAL: +3 puntos. Total: ${this.resultado.puntosLocal}`);
      } else {
        this.resultado.penalesVisitante = (this.resultado.penalesVisitante || 0) + 1;
        this.resultado.puntosVisitante = (this.resultado.puntosVisitante || 0) + 3;
        console.log(`✅ [Modelo] PENAL VISITANTE: +3 puntos. Total: ${this.resultado.puntosVisitante}`);
      }
    } else if (incidencia.tipo === 'DROP') {
      const esEquipoLocal = this.esEquipoLocal(incidencia);
      if (esEquipoLocal) {
        this.resultado.dropsLocal = (this.resultado.dropsLocal || 0) + 1;
        this.resultado.puntosLocal = (this.resultado.puntosLocal || 0) + 3; // Drop = 3 puntos
        console.log(`✅ [Modelo] DROP LOCAL: +3 puntos. Total: ${this.resultado.puntosLocal}`);
      } else {
        this.resultado.dropsVisitante = (this.resultado.dropsVisitante || 0) + 1;
        this.resultado.puntosVisitante = (this.resultado.puntosVisitante || 0) + 3;
        console.log(`✅ [Modelo] DROP VISITANTE: +3 puntos. Total: ${this.resultado.puntosVisitante}`);
      }
    } else if (incidencia.tipo === 'tarjeta_azul') {
      const esEquipoLocal = this.esEquipoLocal(incidencia);
      if (esEquipoLocal) {
        this.estadisticas.tarjetasAzulesLocal = (this.estadisticas.tarjetasAzulesLocal || 0) + 1;
      } else {
        this.estadisticas.tarjetasAzulesVisitante = (this.estadisticas.tarjetasAzulesVisitante || 0) + 1;
      }
    }
    
    return nuevaIncidencia;
  }

  // Métodos específicos para cada tipo de incidencia (Rugby)
  registrarTry(jugadorId, jugadorNombre, equipo, minuto, tiempo, asistencia = null, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'TRY',
      jugadorId,
      jugadorNombre,
      equipo,
      minuto,
      tiempo,
      asistencia,
      arbitroId,
      descripcion: `Try de ${jugadorNombre}${asistencia ? ` (Asistencia: ${asistencia})` : ''}`
    });
  }

  registrarConversion(jugadorId, jugadorNombre, equipo, minuto, tiempo, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'CONVERSION',
      jugadorId,
      jugadorNombre,
      equipo,
      minuto,
      tiempo,
      arbitroId,
      descripcion: `Conversión de ${jugadorNombre}`
    });
  }

  registrarPenal(jugadorId, jugadorNombre, equipo, minuto, tiempo, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'PENAL',
      jugadorId,
      jugadorNombre,
      equipo,
      minuto,
      tiempo,
      arbitroId,
      descripcion: `Penal de ${jugadorNombre}`
    });
  }

  registrarDrop(jugadorId, jugadorNombre, equipo, minuto, tiempo, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'DROP',
      jugadorId,
      jugadorNombre,
      equipo,
      minuto,
      tiempo,
      arbitroId,
      descripcion: `Drop de ${jugadorNombre}`
    });
  }

  registrarTarjetaAmarilla(jugadorId, jugadorNombre, equipo, minuto, tiempo, motivo, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'tarjeta_amarilla',
      jugadorId,
      jugadorNombre,
      equipo,
      minuto,
      tiempo,
      motivo,
      arbitroId,
      descripcion: `Tarjeta amarilla a ${jugadorNombre}${motivo ? ` - ${motivo}` : ''}`
    });
  }

  registrarTarjetaRoja(jugadorId, jugadorNombre, equipo, minuto, tiempo, motivo, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'tarjeta_roja',
      jugadorId,
      jugadorNombre,
      equipo,
      minuto,
      tiempo,
      motivo,
      arbitroId,
      descripcion: `Tarjeta roja a ${jugadorNombre}${motivo ? ` - ${motivo}` : ''}`
    });
  }

  registrarTarjetaAzul(jugadorId, jugadorNombre, equipo, minuto, tiempo, motivoLesion, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'tarjeta_azul',
      jugadorId,
      jugadorNombre,
      equipo,
      minuto,
      tiempo,
      motivo: motivoLesion,
      arbitroId,
      descripcion: `Tarjeta azul (lesión) a ${jugadorNombre}${motivoLesion ? ` - ${motivoLesion}` : ''}`
    });
  }

  registrarCambio(jugadorEntra, jugadorSale, equipo, minuto, tiempo, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'cambio',
      jugadorId: jugadorEntra.id,
      jugadorNombre: jugadorEntra.nombre,
      equipo,
      minuto,
      tiempo,
      jugadorEntra: jugadorEntra,
      jugadorSale: jugadorSale,
      arbitroId,
      descripcion: `Cambio: ${jugadorSale.nombre} sale, ${jugadorEntra.nombre} entra`
    });
  }

  registrarLesion(jugadorId, jugadorNombre, equipo, minuto, tiempo, gravedad, tiempoRecuperacion, motivo, arbitroId) {
    return this.agregarIncidencia({
      tipo: 'lesion',
      jugadorId,
      jugadorNombre,
      equipo,
      minuto,
      tiempo,
      gravedad,
      tiempoRecuperacion,
      motivo,
      arbitroId,
      descripcion: `Lesión de ${jugadorNombre} - ${gravedad}${motivo ? ` (${motivo})` : ''}`
    });
  }

  // Métodos para gestión de árbitros
  asignarArbitro(tipo, arbitroId, arbitroNombre) {
    if (!['principal', 'asistente1', 'asistente2', 'cuartoArbitro'].includes(tipo)) {
      throw new Error('Tipo de árbitro inválido');
    }
    
    this.arbitros[tipo] = {
      id: arbitroId,
      nombre: arbitroNombre
    };
    
    this.fechaActualizacion = new Date();
  }

  // Métodos de auditoría (User Story 1.2)
  registrarCambio(usuarioId, usuarioNombre, accion, detalles = {}) {
    const cambio = {
      timestamp: new Date(),
      usuarioId,
      usuarioNombre,
      accion,
      detalles,
      estadoAnterior: this.estado
    };
    
    this.auditoria.historialCambios.push(cambio);
    this.auditoria.modificadoPor = usuarioId;
    this.auditoria.modificadoPorNombre = usuarioNombre;
    this.fechaActualizacion = new Date();
  }

  registrarCreacion(usuarioId, usuarioNombre) {
    this.auditoria.creadoPor = usuarioId;
    this.auditoria.creadoPorNombre = usuarioNombre;
    this.registrarCambio(usuarioId, usuarioNombre, 'CREACION', {});
  }

  registrarInicio(usuarioId, usuarioNombre) {
    this.auditoria.iniciadoPor = usuarioId;
    this.auditoria.iniciadoPorNombre = usuarioNombre;
    this.registrarCambio(usuarioId, usuarioNombre, 'INICIO', { estadoAnterior: 'programado' });
  }

  registrarCierre(usuarioId, usuarioNombre) {
    this.auditoria.cerradoPor = usuarioId;
    this.auditoria.cerradoPorNombre = usuarioNombre;
    this.registrarCambio(usuarioId, usuarioNombre, 'CIERRE', { estadoAnterior: this.estado });
  }

  removerArbitro(tipo) {
    if (tipo === 'principal') {
      throw new Error('No se puede remover el árbitro principal');
    }
    
    this.arbitros[tipo] = null;
    this.fechaActualizacion = new Date();
  }

  // Métodos para estadísticas
  actualizarEstadistica(tipo, equipo, valor) {
    if (!this.estadisticas.hasOwnProperty(tipo + equipo.charAt(0).toUpperCase() + equipo.slice(1))) {
      throw new Error('Tipo de estadística inválido');
    }
    
    this.estadisticas[tipo + equipo.charAt(0).toUpperCase() + equipo.slice(1)] = valor;
    this.fechaActualizacion = new Date();
  }

  // Métodos de utilidad
  getResultadoTexto() {
    if (this.estado !== 'finalizado') {
      return 'vs';
    }
    
    let resultado = `${this.resultado.puntosLocal} - ${this.resultado.puntosVisitante}`;
    
    return resultado;
  }

  getGanador() {
    if (this.estado !== 'finalizado') {
      return null;
    }
    
    if (this.resultado.puntosLocal > this.resultado.puntosVisitante) {
      return 'local';
    } else if (this.resultado.puntosVisitante > this.resultado.puntosLocal) {
      return 'visitante';
    }
    
    return 'empate';
  }

  getDuracionTexto() {
    if (!this.tiempo.inicio) {
      return 'No iniciado';
    }
    
    if (!this.tiempo.fin) {
      return `${this.tiempo.tiempoTranscurrido} min`;
    }
    
    return `${this.duracion} min`;
  }

  getFechaHoraCompleta() {
    const fecha = new Date(this.fecha);
    return `${fecha.toLocaleDateString()} ${this.horaInicio}`;
  }

  // Métodos para validaciones de negocio
  puedeIniciar() {
    return this.estado === 'programado' && 
           this.arbitros.principal && 
           this.equipoLocal.jugadores.length > 0 && 
           this.equipoVisitante.jugadores.length > 0;
  }

  necesitaTiempoExtra() {
    return this.estado === 'finalizado' && 
           this.resultado.puntosLocal === this.resultado.puntosVisitante &&
           this.fase === 'Eliminatorias';
  }

  tieneArbitrosCompletos() {
    return this.arbitros.principal && 
           this.arbitros.asistente1 && 
           this.arbitros.asistente2;
  }
}

module.exports = Partido;

