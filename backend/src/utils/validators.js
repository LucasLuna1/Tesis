/**
 * Utilidades de validación centralizadas
 */

// Importar función de validación de email desde helpers
const { isValidEmail } = require('./helpers');

// Validaciones comunes
const validators = {
  email: isValidEmail,

  dni: (dni) => {
    return dni && dni.trim().length >= 7;
  },

  nombre: (nombre) => {
    return nombre && nombre.trim().length >= 2;
  },

  telefono: (telefono) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return !telefono || phoneRegex.test(telefono.replace(/\s/g, ''));
  },

  edad: (fechaNacimiento, min = 16, max = 50) => {
    if (!fechaNacimiento) return false;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad >= min && edad <= max;
  }
};

// Validadores específicos por modelo
const modelValidators = {
  jugador: (data) => {
    const errors = [];
    
    if (!validators.nombre(data.nombre)) {
      errors.push('El nombre es obligatorio y debe tener al menos 2 caracteres');
    }
    
    if (!validators.nombre(data.apellido)) {
      errors.push('El apellido es obligatorio y debe tener al menos 2 caracteres');
    }
    
    if (!validators.email(data.email)) {
      errors.push('El email es obligatorio y debe tener un formato válido');
    }
    
    if (!validators.dni(data.dni)) {
      errors.push('El DNI es obligatorio y debe tener al menos 7 caracteres');
    }
    
    if (!validators.edad(data.fechaNacimiento)) {
      errors.push('La edad debe estar entre 16 y 50 años');
    }
    
    if (!data.posicion) {
      errors.push('La posición es obligatoria');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  arbitro: (data) => {
    const errors = [];
    
    if (!validators.nombre(data.nombre)) {
      errors.push('El nombre es obligatorio y debe tener al menos 2 caracteres');
    }
    
    if (!validators.nombre(data.apellido)) {
      errors.push('El apellido es obligatorio y debe tener al menos 2 caracteres');
    }
    
    if (!validators.email(data.email)) {
      errors.push('El email es obligatorio y debe tener un formato válido');
    }
    
    if (!validators.dni(data.dni)) {
      errors.push('El DNI es obligatorio y debe tener al menos 7 caracteres');
    }
    
    if (!data.especialidad) {
      errors.push('La especialidad es obligatoria');
    }
    
    if (!data.certificacion) {
      errors.push('La certificación es obligatoria');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  equipo: (data) => {
    const errors = [];
    
    if (!validators.nombre(data.nombre)) {
      errors.push('El nombre del equipo es obligatorio y debe tener al menos 2 caracteres');
    }
    
    if (!data.deporte) {
      errors.push('El deporte es obligatorio');
    }
    
    if (!data.categoria) {
      errors.push('La categoría es obligatoria');
    }
    
    if (data.jugadores && data.jugadores.length < 5) {
      errors.push('El equipo debe tener al menos 5 jugadores');
    }
    
    if (data.email && !validators.email(data.email)) {
      errors.push('El email debe tener un formato válido');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  partido: (data) => {
    const errors = [];
    
    if (!data.fecha) {
      errors.push('La fecha del partido es obligatoria');
    }
    
    if (!data.horaInicio) {
      errors.push('La hora de inicio es obligatoria');
    }
    
    if (!data.equipoLocal?.id || !data.equipoLocal?.nombre) {
      errors.push('El equipo local es obligatorio');
    }
    
    if (!data.equipoVisitante?.id || !data.equipoVisitante?.nombre) {
      errors.push('El equipo visitante es obligatorio');
    }
    
    if (data.equipoLocal?.id === data.equipoVisitante?.id) {
      errors.push('Los equipos local y visitante no pueden ser el mismo');
    }
    
    if (!data.cancha?.id || !data.cancha?.nombre) {
      errors.push('La cancha es obligatoria');
    }
    
    if (!data.arbitros?.principal) {
      errors.push('El árbitro principal es obligatorio');
    }
    
    // Validar que la fecha no sea en el pasado (excepto para partidos ya jugados)
    if (data.fecha && data.estado === 'programado') {
      const fechaPartido = new Date(data.fecha);
      const ahora = new Date();
      if (fechaPartido < ahora) {
        errors.push('La fecha del partido no puede ser en el pasado');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  votacion: (data) => {
    const errors = [];
    
    if (!data.partidoId) {
      errors.push('El ID del partido es obligatorio');
    }
    
    if (!data.votanteId) {
      errors.push('El ID del votante es obligatorio');
    }
    
    if (!data.jugadorVotadoId) {
      errors.push('El ID del jugador votado es obligatorio');
    }
    
    if (!data.jugadorVotadoNombre) {
      errors.push('El nombre del jugador votado es obligatorio');
    }
    
    if (!data.categoria) {
      errors.push('La categoría de votación es obligatoria');
    }
    
    const categoriasValidas = ['destacado', 'fair_play', 'liderazgo', 'deportividad', 'esfuerzo'];
    if (data.categoria && !categoriasValidas.includes(data.categoria)) {
      errors.push('La categoría debe ser una de: ' + categoriasValidas.join(', '));
    }
    
    if (data.puntuacion && (data.puntuacion < 1 || data.puntuacion > 5)) {
      errors.push('La puntuación debe estar entre 1 y 5');
    }
    
    if (data.motivo && data.motivo.length > 500) {
      errors.push('El motivo no puede exceder los 500 caracteres');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

module.exports = {
  validators,
  modelValidators
};
