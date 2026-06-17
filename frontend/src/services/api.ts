import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types';

// Configuración automática: localhost en desarrollo, Render en producción
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = process.env.REACT_APP_API_URL || (isDevelopment ? 'http://localhost:5000/api' : 'https://kani-deportes.onrender.com/api');
const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || (isDevelopment ? 'http://localhost:5000' : 'https://kani-deportes.onrender.com');

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Función helper para construir URLs de imágenes
export const getImageUrl = (imagePath: string): string => {
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
export const getImageUrlSafe = (imagePath: string): string | undefined => {
  const url = getImageUrl(imagePath);
  // Si la URL está vacía, devolver undefined para que Avatar use su fallback
  return url || undefined;
};

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Intentar obtener token fresco de Firebase Auth directamente
      const { auth } = await import('../config/firebase');
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Obtener token (Firebase maneja el refresco automático)
        const token = await currentUser.getIdToken();
        localStorage.setItem('firebaseToken', token);
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Si no hay usuario autenticado, usar token del localStorage si existe
        const token = localStorage.getItem('firebaseToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.warn('Error obteniendo token de Firebase:', error);
      // Fallback: usar token del localStorage
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si es un 401 y no hemos intentado refrescar el token aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Intentar refrescar el token
        const { auth } = await import('../config/firebase');
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(true); // force refresh
          localStorage.setItem('firebaseToken', freshToken);
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          
          // Reintentar la petición original con el nuevo token
          return api(originalRequest);
        } else {
          // No hay usuario autenticado, redirigir al login
          localStorage.removeItem('firebaseToken');
          window.location.href = '/login';
        }
      } catch (refreshError) {
        // Error al refrescar token, cerrar sesión
        console.error('Error refrescando token:', refreshError);
        localStorage.removeItem('firebaseToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Servicios específicos
export const torneosService = {
  getAll: (): Promise<AxiosResponse<PaginatedResponse>> => api.get('/torneos'),
  getById: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/torneos/${id}`),
  getFixture: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/torneos/${id}/fixture`),
  getPosiciones: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/torneos/${id}/tabla-posiciones`),
  getEstadisticas: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/torneos/${id}/estadisticas`),
  getFases: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/torneos/${id}/fases`)
};

export const jugadoresService = {
  getPerfil: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/jugadores/perfil/${id}`),
  updatePerfil: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> => 
    api.put(`/jugadores/perfil/${id}`, data),
  getEstadisticas: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/jugadores/estadisticas/${id}`),
  buscar: (params: any): Promise<AxiosResponse<PaginatedResponse>> => api.get('/jugadores/buscar', { params }),
  seguir: (jugadorId: string): Promise<AxiosResponse<ApiResponse>> => api.post(`/jugadores/seguir/${jugadorId}`),
  getNotificaciones: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/jugadores/notificaciones/${id}`),
  getHistorial: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/jugadores/${id}/historial`)
};

export const arbitrosService = {
  getDisponibles: (): Promise<AxiosResponse<ApiResponse>> => api.get('/arbitros/disponibles'),
  getPerfil: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/arbitros/perfil/${id}`),
  updatePerfil: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> => 
    api.put(`/arbitros/perfil/${id}`, data),
  getPartidos: (id: string): Promise<AxiosResponse<PaginatedResponse>> => api.get(`/arbitros/partidos/${id}`)
};

export const partidosService = {
  getByTorneo: (torneoId: string, params: any): Promise<AxiosResponse<PaginatedResponse>> => 
    api.get(`/partidos/torneo/${torneoId}`, { params }),
  getById: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/partidos/${id}`),
  getIncidencias: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/partidos/${id}/incidencias`),
  updateTiempo: (id: string, tiempo: number, estado: string): Promise<AxiosResponse<ApiResponse>> => 
    api.put(`/partidos/${id}/tiempo`, { tiempoTranscurrido: tiempo, estado }),
  
  // Nuevos endpoints para control del cronómetro (User Story 1.1)
  pausarCronometro: (id: string, tiempo: number, motivo?: string): Promise<AxiosResponse<ApiResponse>> => 
    api.post(`/partidos/${id}/pausar`, { 
      tiempoTranscurrido: tiempo, 
      motivo: motivo || 'Interrupción' 
    }),
  reanudarCronometro: (id: string, tiempo: number): Promise<AxiosResponse<ApiResponse>> => 
    api.post(`/partidos/${id}/reanudar`, { 
      tiempoTranscurrido: tiempo 
    }),
  getEventosCronometro: (id: string): Promise<AxiosResponse<ApiResponse>> => 
    api.get(`/partidos/${id}/eventos-cronometro`),
  getEstadisticasDuracion: (id: string): Promise<AxiosResponse<ApiResponse>> => 
    api.get(`/partidos/${id}/estadisticas-duracion`),
  actualizarTablaPosiciones: (torneoId: string): Promise<AxiosResponse<ApiResponse>> => 
    api.post(`/partidos/actualizar-tabla-posiciones/${torneoId}`)
};

export const votosService = {
  votar: (partidoId: string, data: any): Promise<AxiosResponse<ApiResponse>> => 
    api.post(`/votos/partido/${partidoId}`, data),
  getResultados: (partidoId: string): Promise<AxiosResponse<ApiResponse>> => 
    api.get(`/votos/partido/${partidoId}`),
  getMiVoto: (partidoId: string): Promise<AxiosResponse<ApiResponse>> => 
    api.get(`/votos/partido/${partidoId}/mi-voto`),
  eliminarVoto: (partidoId: string): Promise<AxiosResponse<ApiResponse>> => 
    api.delete(`/votos/partido/${partidoId}`)
};

export const canchasService = {
  getAll: (): Promise<AxiosResponse<ApiResponse>> => api.get('/canchas'),
  getById: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/canchas/${id}`),
  create: (data: any): Promise<AxiosResponse<ApiResponse>> => api.post('/canchas', data),
  update: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> => api.put(`/canchas/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<ApiResponse>> => api.delete(`/canchas/${id}`)
};

export const dashboardService = {
  getStats: (): Promise<AxiosResponse<ApiResponse>> => api.get('/dashboard/stats'),
  getActivity: (): Promise<AxiosResponse<ApiResponse>> => api.get('/dashboard/activity'),
  getUpcomingMatches: (): Promise<AxiosResponse<ApiResponse>> => api.get('/dashboard/upcoming-matches')
};

export const equiposService = {
  getAll: (params: any): Promise<AxiosResponse<PaginatedResponse>> => api.get('/equipos', { params }),
  getById: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/equipos/${id}`),
  create: (data: any): Promise<AxiosResponse<ApiResponse>> => api.post('/equipos', data),
  update: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> => api.put(`/equipos/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<ApiResponse>> => api.delete(`/equipos/${id}`),
  getJugadores: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/equipos/${id}/jugadores`),
  addJugador: (id: string, jugadorData: any): Promise<AxiosResponse<ApiResponse>> => api.post(`/equipos/${id}/jugadores`, jugadorData),
  removeJugador: (id: string, jugadorId: string): Promise<AxiosResponse<ApiResponse>> => api.delete(`/equipos/${id}/jugadores/${jugadorId}`)
};

export const managersService = {
  getMiClub: (): Promise<AxiosResponse<ApiResponse>> => api.get('/managers/mi-club'),
  createClub: (data: any): Promise<AxiosResponse<ApiResponse>> => api.post('/managers/club', data),
  updateClub: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> => api.put(`/managers/club/${id}`, data),
  uploadClubLogo: (id: string, logoFile: File): Promise<AxiosResponse<ApiResponse>> => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    return api.post(`/managers/club/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getJugadores: (id: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/managers/club/${id}/jugadores`),
  addJugador: (id: string, jugadorData: any): Promise<AxiosResponse<ApiResponse>> => api.post(`/managers/club/${id}/jugadores`, jugadorData),
  removeJugador: (id: string, jugadorId: string): Promise<AxiosResponse<ApiResponse>> => api.delete(`/managers/club/${id}/jugadores/${jugadorId}`),
  getSolicitudes: (): Promise<AxiosResponse<ApiResponse>> => api.get('/managers/solicitudes'),
  responderSolicitud: (id: string, respuesta: any): Promise<AxiosResponse<ApiResponse>> => api.post(`/managers/solicitudes/${id}/responder`, respuesta),
  getJugadoresDisponibles: (search: string): Promise<AxiosResponse<ApiResponse>> => api.get('/managers/jugadores-disponibles', { params: { search } })
};

export const torneosEquiposService = {
  addTeams: (torneoId: string, equipoIds: string[]): Promise<AxiosResponse<ApiResponse>> => api.post(`/torneos/${torneoId}/equipos`, { equipoIds }),
  getTeams: (torneoId: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/torneos/${torneoId}/equipos`),
  removeTeams: (torneoId: string, equipoIds: string[]): Promise<AxiosResponse<ApiResponse>> => api.delete(`/torneos/${torneoId}/equipos`, { data: { equipoIds } })
};

export const torneosGestionService = {
  startTournament: (torneoId: string): Promise<AxiosResponse<ApiResponse>> => api.post(`/torneos/${torneoId}/comenzar`),
  getTable: (torneoId: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/torneos/${torneoId}/tabla-posiciones`),
  getFixtureEquipos: (torneoId: string): Promise<AxiosResponse<ApiResponse>> => api.get(`/torneos/${torneoId}/equipos-para-partidos`)
};

export const mapasService = {
  getCanchas: (params?: { torneoId?: string; categoria?: string; activas?: boolean }): Promise<AxiosResponse<ApiResponse>> => 
    api.get('/mapas/canchas', { params }),
  getCanchasTorneo: (torneoId: string): Promise<AxiosResponse<ApiResponse>> => 
    api.get(`/mapas/torneo/${torneoId}/canchas`),
  getEstadisticas: (): Promise<AxiosResponse<ApiResponse>> => 
    api.get('/mapas/estadisticas')
};
