import { QueryClient } from '@tanstack/react-query';

// Configuración optimizada de React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configuración general optimizada para velocidad
      staleTime: 5 * 60 * 1000, // 5 minutos - datos son "frescos"
      gcTime: 10 * 60 * 1000, // 10 minutos - mantener en caché
      refetchOnWindowFocus: false, // NO refrescar al volver (mejora performance)
      refetchOnReconnect: true, // Solo refrescar cuando se recupera conexión
      refetchOnMount: false, // NO refrescar al montar si hay datos en caché
      retry: 2, // Solo 2 reintentos si falla
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Espera exponencial
      networkMode: 'online', // Solo ejecutar cuando hay conexión
    },
    mutations: {
      retry: 1, // Solo 1 reintento para mutaciones
      networkMode: 'online',
    },
  },
});

// Configuraciones específicas por tipo de dato
export const QUERY_KEYS = {
  // Datos estáticos (5-10 min)
  equipos: {
    all: ['equipos'],
    detail: (id: string) => ['equipos', id],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  jugadores: {
    all: ['jugadores'],
    detail: (id: string) => ['jugadores', id],
    perfil: (id: string) => ['jugadores', 'perfil', id],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  arbitros: {
    all: ['arbitros'],
    detail: (id: string) => ['arbitros', id],
    perfil: (id: string) => ['arbitros', 'perfil', id],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  
  // Datos semi-dinámicos (2-3 min)
  torneos: {
    all: ['torneos'],
    detail: (id: string) => ['torneos', id],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  dashboard: {
    stats: ['dashboard', 'stats'],
    activity: ['dashboard', 'activity'],
    matches: ['dashboard', 'matches'],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  canchas: {
    all: ['canchas'],
    detail: (id: string) => ['canchas', id],
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  
  // Datos dinámicos (30 seg - 1 min)
  partidos: {
    all: ['partidos'],
    detail: (id: string) => ['partidos', id],
    proximos: ['partidos', 'proximos'],
    live: (id: string) => ['partidos', 'live', id],
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 3 * 60 * 1000,
  },
  tablaPosiciones: {
    byTorneo: (torneoId: string) => ['tabla-posiciones', torneoId],
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
  },
  
  // Datos muy dinámicos (10-30 seg)
  partidosLive: {
    detail: (id: string) => ['partidos-live', id],
    incidencias: (id: string) => ['partidos-live', id, 'incidencias'],
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000, // 2 minutos
  },
} as const;

// Utilidades para invalidar y refrescar caché
export const invalidateQueries = {
  // Invalidar todos los torneos
  torneos: async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.torneos.all });
    return queryClient.refetchQueries({ queryKey: QUERY_KEYS.torneos.all });
  },
  
  // Invalidar un torneo específico
  torneo: async (id: string) => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.torneos.detail(id) });
    return queryClient.refetchQueries({ queryKey: QUERY_KEYS.torneos.detail(id) });
  },
  
  // Invalidar todos los equipos
  equipos: async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipos.all });
    return queryClient.refetchQueries({ queryKey: QUERY_KEYS.equipos.all });
  },
  
  // Invalidar un equipo específico
  equipo: async (id: string) => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipos.detail(id) });
    return queryClient.refetchQueries({ queryKey: QUERY_KEYS.equipos.detail(id) });
  },
  
  // Invalidar jugadores
  jugadores: async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jugadores.all });
    return queryClient.refetchQueries({ queryKey: QUERY_KEYS.jugadores.all });
  },
  
  // Invalidar árbitros
  arbitros: async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.arbitros.all });
    return queryClient.refetchQueries({ queryKey: QUERY_KEYS.arbitros.all });
  },
  
  // Invalidar dashboard
  dashboard: async () => {
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    return queryClient.refetchQueries({ queryKey: ['dashboard'] });
  },
  
  // Invalidar partidos
  partidos: async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partidos.all });
    return queryClient.refetchQueries({ queryKey: QUERY_KEYS.partidos.all });
  },
  
  // Invalidar tabla de posiciones
  tablaPosiciones: async (torneoId: string) => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tablaPosiciones.byTorneo(torneoId) });
    return queryClient.refetchQueries({ queryKey: QUERY_KEYS.tablaPosiciones.byTorneo(torneoId) });
  },
};

export default queryClient;

