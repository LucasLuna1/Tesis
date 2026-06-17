/**
 * Constantes de la aplicación
 */

import { UserType, PartidoEstado } from '@/types';

// Colores del tema
export const COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#2e7d32',
  warning: '#f57c00',
  error: '#d32f2f',
  info: '#0288d1',
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
} as const;

// Tipos de usuario
export const USER_TYPES = {
  JUGADOR: 'jugador' as UserType,
  ARBITRO: 'arbitro' as UserType,
  ORGANIZADOR: 'organizador' as UserType,
  ADMIN: 'admin' as UserType,
  USUARIO: 'usuario' as UserType
} as const;

// Estados de partido
export const PARTIDO_STATES = {
  PROGRAMADO: 'programado' as PartidoEstado,
  EN_CURSO: 'En Curso' as PartidoEstado,
  FINALIZADO: 'finalizado' as PartidoEstado,
  SUSPENDIDO: 'suspendido' as PartidoEstado,
  CANCELADO: 'cancelado' as PartidoEstado
} as const;

// Tipos de incidencia (Rugby)
export const INCIDENCIA_TYPES = {
  TRY: 'TRY',
  CONVERSION: 'CONVERSION',
  PENAL: 'PENAL',
  DROP: 'DROP',
  TARJETA_AMARILLA: 'TARJETA_AMARILLA',
  TARJETA_ROJA: 'TARJETA_ROJA',
  CAMBIO: 'CAMBIO',
  LESION: 'LESION'
} as const;

// Posiciones de jugadores (Rugby)
export const POSICIONES: readonly string[] = [
  'Pilar Izquierdo',
  'Hooker',
  'Pilar Derecho',
  'Segunda Línea',
  'Tercera Línea',
  'Medio Scrum',
  'Apertura',
  'Centro',
  'Wing Izquierdo',
  'Wing Derecho',
  'Fullback',
  'Forward',
  'Back'
] as const;

// Especialidades de árbitros
export const ESPECIALIDADES: readonly string[] = [
  'Rugby',
  'Básquet',
  'Vóley',
  'Hockey',
  'Tenis',
  'Pádel'
] as const;

// Niveles de árbitros
export const NIVELES_ARBITRO: readonly string[] = [
  'Local',
  'Regional',
  'Nacional',
  'Internacional'
] as const;

// Categorías de equipos
export const CATEGORIAS: readonly string[] = [
  'Juveniles',
  'Adultos',
  'Veteranos',
  'Femenino',
  'Mixto'
] as const;

// Divisiones
export const DIVISIONES: readonly string[] = [
  'Primera',
  'Segunda',
  'Tercera',
  'Cuarta',
  'Quinta'
] as const;

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
} as const;

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  UNAUTHORIZED: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  VALIDATION_ERROR: 'Los datos proporcionados no son válidos.',
  SERVER_ERROR: 'Error interno del servidor. Intenta más tarde.',
  TIMEOUT: 'La operación tardó demasiado tiempo.'
} as const;

// Mensajes de éxito comunes
export const SUCCESS_MESSAGES = {
  CREATED: 'Recurso creado exitosamente',
  UPDATED: 'Recurso actualizado exitosamente',
  DELETED: 'Recurso eliminado exitosamente',
  SAVED: 'Cambios guardados exitosamente'
} as const;

// Configuración de notificaciones
export const NOTIFICATION_CONFIG = {
  POSITION: 'top-right',
  DURATION: 4000,
  MAX_TOASTS: 5
} as const;

// Configuración de API
export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
} as const;
