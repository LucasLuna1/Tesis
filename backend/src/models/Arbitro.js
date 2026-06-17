/**
 * Modelo de datos para Árbitros
 * User Story 1.1: Definir modelos de datos para árbitros
 */

class Arbitro {
  constructor(data) {
    this.id = data.id || null;
    this.nombre = data.nombre || '';
    this.apellido = data.apellido || '';
    this.email = data.email || '';
    this.telefono = data.telefono || '';
    this.fechaNacimiento = data.fechaNacimiento || null;
    this.dni = data.dni || '';
    this.direccion = data.direccion || '';
    
    // Información profesional
    this.certificacion = data.certificacion || '';
    this.especialidad = data.especialidad || 'Rugby'; // Rugby, Básquet, Vóley, etc.
    this.nivel = data.nivel || 'Local'; // Local, Regional, Nacional, Internacional
    this.fechaInicio = data.fechaInicio || new Date();
    
    // Estadísticas
    this.partidosArbitrados = data.partidosArbitrados || 0;
    this.partidosCompletados = data.partidosCompletados || 0;
    this.partidosComoPrincipal = data.partidosComoPrincipal || 0;
    this.partidosComoAsistente = data.partidosComoAsistente || 0;
    this.tarjetasAmarillas = data.tarjetasAmarillas || 0;
    this.tarjetasRojas = data.tarjetasRojas || 0;
    this.promedioTarjetasPorPartido = data.promedioTarjetasPorPartido || 0;
    this.rating = data.rating || 0;
    this.experienciaAnios = data.experienciaAnios || 0;
    
    // Estado
    this.activo = data.activo !== undefined ? data.activo : true;
    this.disponible = data.disponible !== undefined ? data.disponible : true;
    
    // Fechas de control
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
  }

  // Validaciones
  static validate(arbitroData) {
    const { modelValidators } = require('../utils/validators');
    return modelValidators.arbitro(arbitroData);
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
      certificacion: this.certificacion,
      especialidad: this.especialidad,
      nivel: this.nivel,
      fechaInicio: this.fechaInicio,
      partidosArbitrados: this.partidosArbitrados,
      partidosCompletados: this.partidosCompletados,
      partidosComoPrincipal: this.partidosComoPrincipal,
      partidosComoAsistente: this.partidosComoAsistente,
      tarjetasAmarillas: this.tarjetasAmarillas,
      tarjetasRojas: this.tarjetasRojas,
      promedioTarjetasPorPartido: this.promedioTarjetasPorPartido,
      rating: this.rating,
      experienciaAnios: this.experienciaAnios,
      activo: this.activo,
      disponible: this.disponible,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion
    };
  }

  updateRating(nuevaCalificacion) {
    // Calcular nuevo rating promedio
    const totalCalificaciones = this.partidosArbitrados;
    if (totalCalificaciones > 0) {
      this.rating = ((this.rating * (totalCalificaciones - 1)) + nuevaCalificacion) / totalCalificaciones;
    } else {
      this.rating = nuevaCalificacion;
    }
    this.fechaActualizacion = new Date();
  }

  incrementarPartidos(tipo = 'principal') {
    this.partidosArbitrados++;
    if (tipo === 'principal') {
      this.partidosComoPrincipal++;
    } else if (tipo === 'asistente') {
      this.partidosComoAsistente++;
    }
    this.fechaActualizacion = new Date();
  }
}

module.exports = Arbitro;

