import axios from 'axios';


// Configuración automática: localhost en desarrollo, Render en producción
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = process.env.REACT_APP_API_URL || (isDevelopment ? 'http://localhost:5000/api' : 'https://kani-deportes.onrender.com/api');
const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || (isDevelopment ? 'http://localhost:5000' : 'https://kani-deportes.onrender.com');


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Función helper para construir URLs de imágenes
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // Si ya es una URL completa (http/https), devolverla tal cual
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Si ya comienza con 'uploads/' (sin slash), agregarle el slash
  if (imagePath.startsWith('uploads/')) {
    return `${BACKEND_BASE_URL}/${imagePath}`;
  }
  
  // Si es una ruta relativa (/uploads/...), agregarle la URL base del backend
  if (imagePath.startsWith('/uploads/')) {
    return `${BACKEND_BASE_URL}${imagePath}`;
  }
  
  // Si no tiene /uploads/, agregarle /uploads/ y la URL base
  return `${BACKEND_BASE_URL}/uploads/${imagePath}`;
};

// Función para manejar errores de carga de imágenes (devuelve undefined para usar el fallback)
export const getImageUrlSafe = (imagePath) => {
  const url = getImageUrl(imagePath);
  // Si la URL está vacía, devolver undefined para que Avatar use su fallback
  return url || undefined;
};

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🚀 OPTIMIZACIÓN: Manejo específico de errores de quota
    if (error.response?.status === 429 || error.response?.data?.type === 'QUOTA_EXCEEDED') {
      console.error('❌ Quota de Firestore excedida');
      // El componente que recibe el error debe manejarlo con toast o alert
      error.quotaExceeded = true;
    }
    
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Solo redirigir si no estamos ya en una página de auth
      if (!currentPath.includes('/login') && !currentPath.includes('/register') && !currentPath.includes('/olvidar-contrasena')) {
        localStorage.removeItem('firebaseToken');
        // Usar setTimeout para evitar múltiples redirecciones inmediatas
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Servicios específicos
export const torneosService = {
  // 🚀 OPTIMIZACIÓN: Agregar parámetros de paginación y filtros
  getAll: (params = {}) => api.get('/torneos', { params }),
  getById: (id) => api.get(`/torneos/${id}`),
  getFixture: (id, params = {}) => api.get(`/torneos/${id}/fixture`, { params }),
  getPosiciones: (id) => api.get(`/torneos/${id}/tabla-posiciones`),
  getEstadisticas: (id) => api.get(`/torneos/${id}/estadisticas`),
  getFases: (id) => api.get(`/torneos/${id}/fases`)
};

export const jugadoresService = {
  getPerfil: (id) => api.get(`/jugadores/perfil/${id}`),
  updatePerfil: (id, data) => api.put(`/jugadores/perfil/${id}`, data),
  getEstadisticas: (id) => api.get(`/jugadores/estadisticas/${id}`),
  buscar: (params) => api.get('/jugadores/buscar', { params }),
  seguir: (jugadorId) => api.post(`/jugadores/seguir/${jugadorId}`),
  getNotificaciones: (id) => api.get(`/jugadores/notificaciones/${id}`)
};

export const arbitrosService = {
  getDisponibles: () => api.get('/arbitros/disponibles'),
  getPerfil: (id) => api.get(`/arbitros/perfil/${id}`),
  updatePerfil: (id, data) => api.put(`/arbitros/perfil/${id}`, data),
  getPartidos: (id) => api.get(`/arbitros/partidos/${id}`)
};

export const canchasService = {
  getAll: () => api.get('/canchas'),
  getById: (id) => api.get(`/canchas/${id}`),
  create: (data) => api.post('/canchas', data),
  update: (id, data) => api.put(`/canchas/${id}`, data),
  delete: (id) => api.delete(`/canchas/${id}`)
};

// Servicios de dashboard
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
  getUpcomingMatches: () => api.get('/dashboard/upcoming-matches')
};

export const partidosService = {
  // 🚀 OPTIMIZACIÓN: Agregar paginación con limit y offset
  getByTorneo: (torneoId, params = {}) => api.get(`/partidos/torneo/${torneoId}`, { 
    params: {
      limit: params.limit || 20,
      offset: params.offset || 0,
      ...params
    }
  }),
  getById: (id) => api.get(`/partidos/${id}`),
  getIncidencias: (id) => api.get(`/partidos/${id}/incidencias`),
  updateTiempo: (id, tiempo, estado) => api.put(`/partidos/${id}/tiempo`, { tiempoTranscurrido: tiempo, estado }),
  updatePartido: (id, data) => api.put(`/partidos/${id}`, data),
  
  // Nuevos endpoints para control del cronómetro (User Story 1.1)
  pausarCronometro: (id, tiempo, motivo) => api.post(`/partidos/${id}/pausar`, { 
    tiempoTranscurrido: tiempo, 
    motivo: motivo || 'Interrupción' 
  }),
  reanudarCronometro: (id, tiempo) => api.post(`/partidos/${id}/reanudar`, { 
    tiempoTranscurrido: tiempo 
  }),
  getEventosCronometro: (id) => api.get(`/partidos/${id}/eventos-cronometro`),
  getEstadisticasDuracion: (id) => api.get(`/partidos/${id}/estadisticas-duracion`),
  
};

export const votosService = {
  votar: (partidoId, data) => api.post(`/votos/partido/${partidoId}`, data),
  getResultados: (partidoId) => api.get(`/votos/partido/${partidoId}`),
  getMiVoto: (partidoId) => api.get(`/votos/partido/${partidoId}/mi-voto`),
  eliminarVoto: (partidoId) => api.delete(`/votos/partido/${partidoId}`)
};

export const equiposService = {
  getAll: (params) => api.get('/equipos', { params }),
  getById: (id) => api.get(`/equipos/${id}`),
  create: (data) => api.post('/equipos', data),
  update: (id, data) => api.put(`/equipos/${id}`, data),
  delete: (id) => api.delete(`/equipos/${id}`),
  getJugadores: (id) => api.get(`/equipos/${id}/jugadores`),
  addJugador: (id, jugadorData) => api.post(`/equipos/${id}/jugadores`, jugadorData),
  removeJugador: (id, jugadorId) => api.delete(`/equipos/${id}/jugadores/${jugadorId}`)
};

export const managersService = {
  getMiClub: () => api.get('/managers/mi-club'),
  createClub: (data) => api.post('/managers/club', data),
  updateClub: (id, data) => api.put(`/managers/club/${id}`, data),
  uploadClubLogo: (id, logoFile) => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    return api.post(`/managers/club/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getJugadores: (id) => api.get(`/managers/club/${id}/jugadores`),
  addJugador: (id, jugadorData) => api.post(`/managers/club/${id}/jugadores`, jugadorData),
  removeJugador: (id, jugadorId) => api.delete(`/managers/club/${id}/jugadores/${jugadorId}`),
  getSolicitudes: () => api.get('/managers/solicitudes'),
  responderSolicitud: (id, respuesta) => api.post(`/managers/solicitudes/${id}/responder`, respuesta),
  getJugadoresDisponibles: (search) => api.get('/managers/jugadores-disponibles', { params: { search } })
};

// Servicios para gestión de equipos en torneos
export const torneosEquiposService = {
  // Agregar equipos a un torneo
  addTeams: (torneoId, equipoIds) => api.post(`/torneos/${torneoId}/equipos`, { equipoIds }),
  
  // Obtener equipos de un torneo
  getTeams: (torneoId) => api.get(`/torneos/${torneoId}/equipos`),
  
  // Remover equipos de un torneo
  removeTeams: (torneoId, equipoIds) => api.delete(`/torneos/${torneoId}/equipos`, { data: { equipoIds } })
};

// Servicios para gestión de torneos
export const torneosGestionService = {
  // Comenzar un torneo
  startTournament: (torneoId) => api.post(`/torneos/${torneoId}/comenzar`),
  
  // Obtener tabla de posiciones
  getTable: (torneoId) => api.get(`/torneos/${torneoId}/tabla-posiciones`),
  
  // Obtener equipos de un torneo para crear partidos
  getTeamsForMatches: (torneoId) => api.get(`/torneos/${torneoId}/equipos-para-partidos`),
  
  // Obtener fixture de un torneo
  getFixture: (torneoId) => api.get(`/torneos/${torneoId}/fixture`)
};


// Servicios para mapas y geolocalización
export const mapasService = {
  getCanchas: (params) => api.get('/mapas/canchas', { params }),
  getCanchasTorneo: (torneoId) => api.get(`/mapas/torneo/${torneoId}/canchas`),
  getEstadisticas: () => api.get('/mapas/estadisticas')
};
