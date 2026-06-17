/**
 * Modelo de datos para Canchas
 * User Story 1.1: Definir modelos de datos para canchas
 */

class Cancha {
  constructor(data) {
    this.id = data.id || undefined;
    this.nombre = data.nombre || '';
    this.descripcion = data.descripcion || '';
    this.direccion = data.direccion || '';
    this.ciudad = data.ciudad || '';
    this.provincia = data.provincia || '';
    this.codigoPostal = data.codigoPostal || '';
    
    // Información de contacto
    this.telefono = data.telefono || '';
    this.email = data.email || '';
    this.responsable = data.responsable || '';
    
    // Características físicas
    this.tipo = data.tipo || 'Exterior'; // Exterior, Interior, Mixta
    this.superficie = data.superficie || 'Césped natural'; // Césped natural, Césped sintético, Tierra, Cemento
    this.dimensiones = {
      largo: data.dimensiones?.largo || 0,
      ancho: data.dimensiones?.ancho || 0,
      unidad: data.dimensiones?.unidad || 'metros'
    };
    
    // Capacidad
    this.capacidadEspectadores = data.capacidadEspectadores || 0;
    this.capacidadVestuarios = data.capacidadVestuarios || 0;
    
    // Servicios disponibles
    this.servicios = {
      vestuarios: data.servicios?.vestuarios || false,
      duchas: data.servicios?.duchas || false,
      estacionamiento: data.servicios?.estacionamiento || false,
      cafeteria: data.servicios?.cafeteria || false,
      iluminacion: data.servicios?.iluminacion || false,
      marcador: data.servicios?.marcador || false,
      sonido: data.servicios?.sonido || false,
      camaras: data.servicios?.camaras || false,
      wifi: data.servicios?.wifi || false,
      accesibilidad: data.servicios?.accesibilidad || false
    };
    
    // Ubicación geográfica
    this.coordenadas = {
      latitud: data.coordenadas?.latitud || 0,
      longitud: data.coordenadas?.longitud || 0
    };
    
    // Información de reservas
    this.precioPorHora = data.precioPorHora || 0;
    this.horariosDisponibilidad = data.horariosDisponibilidad || {
      lunes: { inicio: '08:00', fin: '22:00' },
      martes: { inicio: '08:00', fin: '22:00' },
      miercoles: { inicio: '08:00', fin: '22:00' },
      jueves: { inicio: '08:00', fin: '22:00' },
      viernes: { inicio: '08:00', fin: '22:00' },
      sabado: { inicio: '08:00', fin: '22:00' },
      domingo: { inicio: '08:00', fin: '22:00' }
    };
    
    // Estado
    this.activa = data.activa !== undefined ? data.activa : true;
    this.disponible = data.disponible !== undefined ? data.disponible : true;
    this.mantenimiento = data.mantenimiento || false;
    this.fechaFinMantenimiento = data.fechaFinMantenimiento || null;
    
    // Fechas de control
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
  }

  // Validaciones
  static validate(canchaData) {
    const errors = [];
    
    if (!canchaData.nombre || canchaData.nombre.trim().length < 2) {
      errors.push('El nombre de la cancha es obligatorio y debe tener al menos 2 caracteres');
    }
    
    if (!canchaData.direccion || canchaData.direccion.trim().length < 5) {
      errors.push('La dirección es obligatoria y debe tener al menos 5 caracteres');
    }
    
    if (!canchaData.ciudad || canchaData.ciudad.trim().length < 2) {
      errors.push('La ciudad es obligatoria');
    }
    
    if (!canchaData.provincia || canchaData.provincia.trim().length < 2) {
      errors.push('La provincia es obligatoria');
    }
    
    if (!canchaData.tipo) {
      errors.push('El tipo de cancha es obligatorio');
    }
    
    if (!canchaData.superficie) {
      errors.push('El tipo de superficie es obligatorio');
    }
    
    // Las dimensiones ya no son obligatorias
    // if (canchaData.dimensiones && (canchaData.dimensiones.largo <= 0 || canchaData.dimensiones.ancho <= 0)) {
    //   errors.push('Las dimensiones de la cancha deben ser mayores a 0');
    // }
    
    if (canchaData.email && !this.isValidEmail(canchaData.email)) {
      errors.push('El email debe tener un formato válido');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Métodos de instancia
  toJSON() {
    const json = {
      nombre: this.nombre,
      descripcion: this.descripcion,
      direccion: this.direccion,
      ciudad: this.ciudad,
      provincia: this.provincia,
      codigoPostal: this.codigoPostal,
      telefono: this.telefono,
      email: this.email,
      responsable: this.responsable,
      tipo: this.tipo,
      superficie: this.superficie,
      dimensiones: this.dimensiones,
      capacidadEspectadores: this.capacidadEspectadores,
      capacidadVestuarios: this.capacidadVestuarios,
      servicios: this.servicios,
      coordenadas: this.coordenadas,
      precioPorHora: this.precioPorHora,
      horariosDisponibilidad: this.horariosDisponibilidad,
      activa: this.activa,
      disponible: this.disponible,
      mantenimiento: this.mantenimiento,
      fechaFinMantenimiento: this.fechaFinMantenimiento,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion
    };
    
    // Solo incluir el ID si existe
    if (this.id !== undefined && this.id !== null) {
      json.id = this.id;
    }
    
    return json;
  }

  // Métodos para gestión de disponibilidad
  estaDisponible(fecha, hora) {
    if (!this.activa || !this.disponible || this.estaEnMantenimiento()) {
      return false;
    }

    const diaSemana = this.getDiaSemana(fecha);
    const horarioDia = this.horariosDisponibilidad[diaSemana];
    
    if (!horarioDia) {
      return false;
    }

    return hora >= horarioDia.inicio && hora <= horarioDia.fin;
  }

  estaEnMantenimiento() {
    if (!this.mantenimiento) return false;
    if (!this.fechaFinMantenimiento) return true;
    return new Date() < new Date(this.fechaFinMantenimiento);
  }

  programarMantenimiento(fechaFin) {
    this.mantenimiento = true;
    this.fechaFinMantenimiento = fechaFin;
    this.disponible = false;
    this.fechaActualizacion = new Date();
  }

  finalizarMantenimiento() {
    this.mantenimiento = false;
    this.fechaFinMantenimiento = null;
    this.disponible = true;
    this.fechaActualizacion = new Date();
  }

  // Métodos de utilidad
  getDireccionCompleta() {
    return `${this.direccion}, ${this.ciudad}, ${this.provincia} ${this.codigoPostal}`;
  }

  getArea() {
    return this.dimensiones.largo * this.dimensiones.ancho;
  }

  getDimensionesTexto() {
    return `${this.dimensiones.largo} x ${this.dimensiones.ancho} ${this.dimensiones.unidad}`;
  }

  getDiaSemana(fecha) {
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return dias[new Date(fecha).getDay()];
  }

  // Métodos para servicios
  tieneServicio(servicio) {
    return this.servicios[servicio] === true;
  }

  agregarServicio(servicio) {
    this.servicios[servicio] = true;
    this.fechaActualizacion = new Date();
  }

  removerServicio(servicio) {
    this.servicios[servicio] = false;
    this.fechaActualizacion = new Date();
  }

  // Métodos para horarios
  actualizarHorario(dia, inicio, fin) {
    if (this.horariosDisponibilidad[dia]) {
      this.horariosDisponibilidad[dia] = { inicio, fin };
      this.fechaActualizacion = new Date();
    }
  }

  getHorariosTexto() {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    return dias.map(dia => {
      const horario = this.horariosDisponibilidad[dia];
      return `${dia}: ${horario.inicio} - ${horario.fin}`;
    }).join(', ');
  }
}

module.exports = Cancha;

