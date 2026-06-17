/**
 * Modelo de datos para Jugadores
 * User Story 1.1: Definir modelos de datos para jugadores
 */

class Jugador {
  constructor(data) {
    this.id = data.id || null;
    this.nombre = data.nombre || '';
    this.apellido = data.apellido || '';
    this.email = data.email || '';
    this.telefono = data.telefono || '';
    this.fechaNacimiento = data.fechaNacimiento || null;
    this.dni = data.dni || '';
    this.direccion = data.direccion || '';
    this.foto = data.foto || '';
    
    // Información deportiva
    this.posicion = data.posicion || ''; // Pilar, Hooker, Segunda Línea, Tercera Línea, Medio Scrum, Apertura, Centro, Wing, Fullback
    this.altura = data.altura || 0; // en cm
    this.peso = data.peso || 0; // en kg
    this.numero = data.numero || null; // Número de camiseta (1-15 titulares, 16-23 suplentes)
    this.categoria = data.categoria || []; // Array de categorías: M14, M15, M16, etc.
    
    // Información del equipo
    this.equipoId = data.equipoId || null;
    this.equipoNombre = data.equipoNombre || '';
    this.fechaIncorporacion = data.fechaIncorporacion || new Date();
    this.titular = data.titular !== undefined ? data.titular : false;
    
    // Estadísticas personales
    this.estadisticas = {
      partidosJugados: data.estadisticas?.partidosJugados || 0,
      partidosTitular: data.estadisticas?.partidosTitular || 0,
      partidosSuplente: data.estadisticas?.partidosSuplente || 0,
      minutosJugados: data.estadisticas?.minutosJugados || 0,
      tries: data.estadisticas?.tries || 0,
      asistencias: data.estadisticas?.asistencias || 0,
      tarjetasAmarillas: data.estadisticas?.tarjetasAmarillas || 0,
      tarjetasRojas: data.estadisticas?.tarjetasRojas || 0,
      rating: data.estadisticas?.rating || 0
    };
    
    // Estado
    this.activo = data.activo !== undefined ? data.activo : true;
    this.disponible = data.disponible !== undefined ? data.disponible : true;
    this.sancionado = data.sancionado !== undefined ? data.sancionado : false;
    this.fechaFinSancion = data.fechaFinSancion || null;
    
    // Fechas de control
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
  }

  // Validaciones
  static validate(jugadorData) {
    const { modelValidators } = require('../utils/validators');
    return modelValidators.jugador(jugadorData);
  }

  static calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }

  // Métodos de instancia
  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      apellido: this.apellido,
      email: this.email,
      telefono: this.telefono,
      fechaNacimiento: this.fechaNacimiento,
      dni: this.dni,
      direccion: this.direccion,
      foto: this.foto,
      posicion: this.posicion,
      altura: this.altura,
      peso: this.peso,
      numero: this.numero,
      equipoId: this.equipoId,
      equipoNombre: this.equipoNombre,
      fechaIncorporacion: this.fechaIncorporacion,
      titular: this.titular,
      estadisticas: this.estadisticas,
      activo: this.activo,
      disponible: this.disponible,
      sancionado: this.sancionado,
      fechaFinSancion: this.fechaFinSancion,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion
    };
  }

  // Métodos para gestión de estadísticas
  jugarPartido(minutos, titular = false, tries = 0, asistencias = 0) {
    this.estadisticas.partidosJugados++;
    this.estadisticas.minutosJugados += minutos;
    
    if (titular) {
      this.estadisticas.partidosTitular++;
    } else {
      this.estadisticas.partidosSuplente++;
    }
    
    this.estadisticas.tries += tries;
    this.estadisticas.asistencias += asistencias;
    
    this.fechaActualizacion = new Date();
  }

  agregarTarjeta(tipo) {
    if (tipo === 'amarilla') {
      this.estadisticas.tarjetasAmarillas++;
    } else if (tipo === 'roja') {
      this.estadisticas.tarjetasRojas++;
    }
    this.fechaActualizacion = new Date();
  }

  actualizarRating(nuevaCalificacion) {
    const totalPartidos = this.estadisticas.partidosJugados;
    if (totalPartidos > 0) {
      this.estadisticas.rating = ((this.estadisticas.rating * (totalPartidos - 1)) + nuevaCalificacion) / totalPartidos;
    } else {
      this.estadisticas.rating = nuevaCalificacion;
    }
    this.fechaActualizacion = new Date();
  }

  // Métodos de utilidad
  getNombreCompleto() {
    return `${this.nombre} ${this.apellido}`;
  }

  getEdad() {
    return Jugador.calcularEdad(this.fechaNacimiento);
  }

  isDisponible() {
    return this.activo && this.disponible && !this.estaSancionado();
  }

  estaSancionado() {
    if (!this.sancionado) return false;
    if (!this.fechaFinSancion) return true;
    return new Date() < new Date(this.fechaFinSancion);
  }

  aplicarSancion(fechaFin) {
    this.sancionado = true;
    this.fechaFinSancion = fechaFin;
    this.disponible = false;
    this.fechaActualizacion = new Date();
  }

  levantarSancion() {
    this.sancionado = false;
    this.fechaFinSancion = null;
    this.disponible = true;
    this.fechaActualizacion = new Date();
  }
}

module.exports = Jugador;

