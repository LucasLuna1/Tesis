// Tipos de usuario
export interface User {
  uid: string;
  email: string;
  nombre?: string;
  apellido?: string;
  tipoUsuario: UserType;
  foto?: string;
  fechaCreacion: Date;
}

export type UserType = 'jugador' | 'arbitro' | 'organizador' | 'manager' | 'admin' | 'usuario';

// Tipos de jugador
export interface Jugador extends User {
  posicion: string; // Posiciones de rugby
  altura: number;
  peso: number;
  numero?: number; // 1-15 titulares, 16-23 suplentes
  equipoId?: string;
  equipoNombre?: string;
  fechaIncorporacion: Date;
  titular: boolean;
  estadisticas: EstadisticasJugador;
  activo: boolean;
  disponible: boolean;
  sancionado: boolean;
  fechaFinSancion?: Date;
}

export interface EstadisticasJugador {
  partidosJugados: number;
  partidosTitular: number;
  partidosSuplente: number;
  minutosJugados: number;
  tries: number; // Ensayos
  conversiones: number; // Conversiones
  penales: number; // Penales convertidos
  drops: number; // Drops
  asistencias: number;
  placajes: number; // Tackles
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  rating: number;
}

// Tipos de árbitro
export interface Arbitro extends User {
  telefono?: string;
  fechaNacimiento?: Date;
  dni: string;
  direccion?: string;
  certificacion: string;
  especialidad: string;
  nivel: 'Local' | 'Regional' | 'Nacional' | 'Internacional';
  fechaInicio: Date;
  partidosArbitrados: number;
  partidosComoPrincipal: number;
  partidosComoAsistente: number;
  rating: number;
  activo: boolean;
  disponible: boolean;
}

// Tipos de manager
export interface Manager extends User {
  telefono?: string;
  fechaNacimiento?: string;
  clubId: string | null;
  activo: boolean;
}

// Tipos de usuario (espectador)
export interface UsuarioComun extends User {
  telefono?: string;
  fechaNacimiento?: string;
  activo: boolean;
}

// Tipos de equipo
export interface Equipo {
  id: string;
  nombre: string;
  abreviatura?: string;
  descripcion?: string;
  foto?: string;
  colores: {
    principal: string;
    secundario: string;
  };
  club?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  web?: string;
  deporte: string;
  categoria: string;
  division: string;
  jugadores: string[];
  entrenador?: string;
  asistenteEntrenador?: string;
  delegado?: string;
  estadisticas: EstadisticasEquipo;
  activo: boolean;
  inscrito: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface EstadisticasEquipo {
  partidosJugados: number;
  partidosGanados: number;
  partidosEmpatados: number;
  partidosPerdidos: number;
  puntosFavor: number; // Puntos a favor
  puntosContra: number; // Puntos en contra
  puntos: number; // Puntos en la tabla (4 por victoria, 2 por empate)
  triesFavor: number; // Tries a favor
  triesContra: number; // Tries en contra
  tarjetasAmarillas: number;
  tarjetasRojas: number;
}

// Tipos de partido
export interface Partido {
  id: string;
  torneoId?: string;
  jornada: number;
  fase: 'Regular' | 'Eliminatorias' | 'Final';
  fecha: Date;
  horaInicio: string;
  horaFin?: string;
  duracion: number;
  equipoLocal: EquipoPartido;
  equipoVisitante: EquipoPartido;
  arbitros: ArbitrosPartido;
  cancha: CanchaPartido;
  estado: PartidoEstado;
  razonSuspension?: string;
  resultado: ResultadoPartido;
  tiempo: TiempoPartido;
  incidencias: Incidencia[];
  estadisticas: EstadisticasPartido;
  observaciones?: string;
  condicionesClimaticas?: string;
  asistencia: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  auditoria: AuditoriaPartido;
}

export interface EquipoPartido {
  id: string;
  nombre: string;
  jugadores: JugadorPartido[];
}

export interface JugadorPartido {
  id: string;
  nombre: string;
  apellido: string;
  numero: number;
  titular: boolean;
}

export interface ArbitrosPartido {
  principal?: ArbitroPartido;
  asistente1?: ArbitroPartido;
  asistente2?: ArbitroPartido;
  cuartoArbitro?: ArbitroPartido;
}

export interface ArbitroPartido {
  id: string;
  nombre: string;
}

export interface CanchaPartido {
  id: string;
  nombre: string;
  direccion: string;
}

export type PartidoEstado = 'programado' | 'En Curso' | 'finalizado' | 'suspendido' | 'cancelado';

export interface ResultadoPartido {
  puntosLocal: number;
  puntosVisitante: number;
  triesLocal: number;
  triesVisitante: number;
  conversionesLocal: number;
  conversionesVisitante: number;
  penalesLocal: number; // Penales convertidos
  penalesVisitante: number;
  dropsLocal: number;
  dropsVisitante: number;
}

export interface TiempoPartido {
  inicio?: Date;
  fin?: Date;
  tiempoTranscurrido: number;
  tiempoExtra: number;
  descuento: number;
}

export interface EstadisticasPartido {
  scrumsLocal: number; // Scrums
  scrumsVisitante: number;
  lineoutsLocal: number; // Lineouts
  lineoutsVisitante: number;
  maulesLocal: number; // Mauls
  maulesVisitante: number;
  rucksLocal: number; // Rucks
  rucksVisitante: number;
  penalesCometidosLocal: number; // Penales cometidos
  penalesCometidosVisitante: number;
  tarjetasAmarillasLocal: number;
  tarjetasAmarillasVisitante: number;
  tarjetasRojasLocal: number;
  tarjetasRojasVisitante: number;
}

export interface AuditoriaPartido {
  creadoPor?: string;
  creadoPorNombre?: string;
  modificadoPor?: string;
  modificadoPorNombre?: string;
  cerradoPor?: string;
  cerradoPorNombre?: string;
  iniciadoPor?: string;
  iniciadoPorNombre?: string;
  historialCambios: CambioPartido[];
}

export interface CambioPartido {
  timestamp: Date;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  detalles: Record<string, any>;
  estadoAnterior: string;
}

// Tipos de incidencia
export interface Incidencia {
  id: string;
  tipo: TipoIncidencia;
  minuto: number;
  tiempo: '1T' | '2T' | '1ET' | '2ET' | 'Penales';
  jugadorId: string;
  jugadorNombre: string;
  equipo: 'local' | 'visitante';
  descripcion: string;
  timestamp: Date;
  arbitroId: string;
  asistencia?: string;
  jugadorEntra?: JugadorPartido;
  jugadorSale?: JugadorPartido;
  gravedad?: 'leve' | 'moderada' | 'grave';
  tiempoRecuperacion?: number;
  motivo?: string;
}

export type TipoIncidencia = 'TRY' | 'CONVERSION' | 'PENAL' | 'DROP' | 'TARJETA_AMARILLA' | 'TARJETA_ROJA' | 'CAMBIO' | 'LESION';

// Tipos de cancha
export interface Cancha {
  id: string;
  nombre: string;
  direccion: string;
  capacidad: number;
  tipoSuperficie: string;
  iluminacion: boolean;
  vestuarios: boolean;
  activa: boolean;
  disponible: boolean;
  mantenimiento: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

// Tipos de torneo
export interface Torneo {
  id: string;
  nombre: string;
  descripcion?: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: 'planificado' | 'En Curso' | 'finalizado' | 'cancelado';
  tipo: 'Liga' | 'Copa' | 'Eliminatoria';
  categoria: string;
  division: string;
  equipos: string[];
  partidos: string[];
  organizadorId: string;
  organizadorNombre: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

// Tipos de API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

// Tipos de formularios
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  tipoUsuario: UserType;
  datosPerfil: Partial<Jugador | Arbitro>;
}

export interface PartidoForm {
  equipoLocal: string;
  equipoVisitante: string;
  cancha: string;
  arbitro: string;
  fecha: string;
  hora: string;
  tipoPartido: string;
}

// Tipos de contexto
export interface AuthContextType {
  user: any | null; // Firebase User
  userProfile: (Jugador | Arbitro | Manager | User) | null;
  loading: boolean;
  setUserProfile: (profile: (Jugador | Arbitro | Manager | User) | null) => void;
  logout: () => Promise<void>;
}

export interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  theme: any;
}

export interface SidebarContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

// Tipos de hooks
export interface UseApiDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: any;
  refetch: () => void;
}

export interface UseApiMutationReturn<T> {
  mutate: (data: any) => Promise<T>;
  loading: boolean;
  error: any;
}

// Tipos de navegación
export interface NavigationItem {
  label: string;
  icon: string;
  path: string;
  permission?: () => boolean;
}

// Tipos de estadísticas del dashboard
export interface DashboardStats {
  torneos: number;
  partidos: number;
  jugadores: number;
  arbitros: number;
}

// Tipos de actividad reciente
export interface RecentActivity {
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Tipos de partidos próximos
export interface UpcomingMatch {
  id: string;
  home: string;
  away: string;
  date: string;
  time: string;
  cancha: string;
}
