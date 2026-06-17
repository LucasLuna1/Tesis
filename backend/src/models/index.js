// Modelos de datos para el sistema de torneos

const userTypes = {
  ARBITRO: 'arbitro',
  JUGADOR: 'jugador',
  ORGANIZADOR: 'organizador',
  MANAGER: 'manager',
  ADMIN: 'admin',
  USUARIO: 'usuario'
};

const torneoStatus = {
  PLANIFICADO: 'planificado',
  EN_CURSO: 'En Curso',
  FINALIZADO: 'finalizado',
  CANCELADO: 'cancelado'
};

const partidoStatus = {
  PROGRAMADO: 'programado',
  EN_CURSO: 'En Curso',
  FINALIZADO: 'finalizado',
  SUSPENDIDO: 'suspendido',
  CANCELADO: 'cancelado'
};

const tipoIncidencia = {
  TRY: 'TRY',
  CONVERSION: 'CONVERSION',
  PENAL: 'PENAL',
  DROP: 'DROP',
  TARJETA_AMARILLA: 'TARJETA_AMARILLA',
  TARJETA_ROJA: 'TARJETA_ROJA',
  CAMBIO: 'CAMBIO',
  LESION: 'LESION'
};

// Modelos
const Convocados = require('./Convocados');

module.exports = {
  userTypes,
  torneoStatus,
  partidoStatus,
  tipoIncidencia,
  Convocados
};
