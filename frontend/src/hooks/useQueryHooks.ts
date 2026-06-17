/**
 * Custom hooks con React Query
 * Hooks reutilizables para todas las llamadas a la API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS, invalidateQueries } from '../config/queryClient';
import toast from 'react-hot-toast';

// ==================== TORNEOS ====================

export const useTorneos = () => {
  return useQuery({
    queryKey: QUERY_KEYS.torneos.all,
    queryFn: async () => {
      const response = await api.get('/torneos');
      const torneosData = response.data?.torneos || response.data || [];
      return Array.isArray(torneosData) ? torneosData : [];
    },
    staleTime: QUERY_KEYS.torneos.staleTime,
    gcTime: QUERY_KEYS.torneos.gcTime,
  });
};

export const useTorneoDetail = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.torneos.detail(id),
    queryFn: async () => {
      const response = await api.get(`/torneos/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: QUERY_KEYS.torneos.staleTime,
    gcTime: QUERY_KEYS.torneos.gcTime,
  });
};

export const useCreateTorneo = () => {
  return useMutation({
    mutationFn: async (torneoData: any) => {
      const response = await api.post('/torneos', torneoData);
      return response.data;
    },
    onSuccess: () => {
      invalidateQueries.torneos();
      invalidateQueries.dashboard();
      toast.success('Torneo creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear torneo');
    },
  });
};

export const useDeleteTorneo = () => {
  return useMutation({
    mutationFn: async (torneoId: string) => {
      await api.delete(`/torneos/${torneoId}`);
    },
    onSuccess: () => {
      invalidateQueries.torneos();
      invalidateQueries.dashboard();
      toast.success('Torneo eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar torneo');
    },
  });
};

// ==================== EQUIPOS ====================

export const useEquipos = (filtros = {}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.equipos.all, filtros],
    queryFn: async () => {
      const response = await api.get('/equipos', { params: filtros });
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: QUERY_KEYS.equipos.staleTime,
    gcTime: QUERY_KEYS.equipos.gcTime,
    refetchOnMount: true, // Siempre refrescar al montar el componente
    refetchOnWindowFocus: false, // No refrescar al cambiar de ventana
  });
};

export const useEquipoDetail = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.equipos.detail(id),
    queryFn: async () => {
      const response = await api.get(`/equipos/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: QUERY_KEYS.equipos.staleTime,
    gcTime: QUERY_KEYS.equipos.gcTime,
  });
};

// ==================== JUGADORES ====================

export const useJugadores = () => {
  return useQuery({
    queryKey: QUERY_KEYS.jugadores.all,
    queryFn: async () => {
      const response = await api.get('/jugadores');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: QUERY_KEYS.jugadores.staleTime,
    gcTime: QUERY_KEYS.jugadores.gcTime,
  });
};

export const useJugadorPerfil = (id: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.jugadores.perfil(id || ''),
    queryFn: async () => {
      try {
        const response = await api.get(`/jugadores/perfil/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error cargando perfil jugador:', error);
        return null;
      }
    },
    enabled: !!id,
    staleTime: QUERY_KEYS.jugadores.staleTime,
    gcTime: QUERY_KEYS.jugadores.gcTime,
  });
};

export const useBuscarJugadores = (searchTerm: string = '', filtroPosicion: string = '') => {
  return useQuery({
    queryKey: [...QUERY_KEYS.jugadores.all, 'buscar', searchTerm, filtroPosicion],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('nombre', searchTerm);
      if (filtroPosicion) params.append('posicion', filtroPosicion);
      params.append('limit', '20');
      
      const response = await api.get(`/jugadores/buscar?${params.toString()}`);
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// ==================== ÁRBITROS ====================

export const useArbitroPerfil = (id: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.arbitros.perfil(id || ''),
    queryFn: async () => {
      try {
        const response = await api.get(`/arbitros/perfil/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error cargando perfil árbitro:', error);
        return null;
      }
    },
    enabled: !!id,
    staleTime: QUERY_KEYS.arbitros.staleTime,
    gcTime: QUERY_KEYS.arbitros.gcTime,
  });
};

// ==================== PARTIDOS ====================

export const usePartidos = () => {
  return useQuery({
    queryKey: QUERY_KEYS.partidos.all,
    queryFn: async () => {
      const response = await api.get('/partidos');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: QUERY_KEYS.partidos.staleTime,
    gcTime: QUERY_KEYS.partidos.gcTime,
  });
};

export const useProximosPartidos = () => {
  return useQuery({
    queryKey: QUERY_KEYS.partidos.proximos,
    queryFn: async () => {
      const response = await api.get('/partidos/proximos');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: QUERY_KEYS.partidos.staleTime,
    gcTime: QUERY_KEYS.partidos.gcTime,
  });
};

export const usePartidoDetail = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.partidos.detail(id),
    queryFn: async () => {
      const response = await api.get(`/partidos/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: QUERY_KEYS.partidos.staleTime,
    gcTime: QUERY_KEYS.partidos.gcTime,
  });
};

// ==================== DASHBOARD ====================

export const useDashboardStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.stats,
    queryFn: async () => {
      try {
        const response = await api.get('/dashboard/stats');
        const stats = response.data.data || response.data || {};
        return {
          torneos: stats.torneos || 0,
          partidos: stats.partidos || 0,
          jugadores: stats.jugadores || 0,
          arbitros: stats.arbitros || 0,
          equipos: stats.equipos || 0
        };
      } catch (error) {
        console.error('Error cargando stats:', error);
        return {
          torneos: 0,
          partidos: 0,
          jugadores: 0,
          arbitros: 0,
          equipos: 0
        };
      }
    },
    staleTime: QUERY_KEYS.dashboard.staleTime,
    gcTime: QUERY_KEYS.dashboard.gcTime,
  });
};

export const useDashboardActivity = () => {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.activity,
    queryFn: async () => {
      const response = await api.get('/dashboard/activity');
      return response.data.data || response.data || [];
    },
    staleTime: QUERY_KEYS.dashboard.staleTime,
    gcTime: QUERY_KEYS.dashboard.gcTime,
  });
};

export const useDashboardUpcomingMatches = () => {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.matches,
    queryFn: async () => {
      const response = await api.get('/dashboard/upcoming-matches');
      return response.data.data || response.data || [];
    },
    staleTime: QUERY_KEYS.dashboard.staleTime,
    gcTime: QUERY_KEYS.dashboard.gcTime,
  });
};

// ==================== CANCHAS ====================

export const useCanchas = () => {
  return useQuery({
    queryKey: QUERY_KEYS.canchas.all,
    queryFn: async () => {
      const response = await api.get('/canchas');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: QUERY_KEYS.canchas.staleTime,
    gcTime: QUERY_KEYS.canchas.gcTime,
  });
};

// ==================== TABLA DE POSICIONES ====================

export const useTablaPosiciones = (torneoId: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.tablaPosiciones.byTorneo(torneoId || ''),
    queryFn: async () => {
      const response = await api.get(`/torneos/${torneoId}/tabla-posiciones`);
      return response.data;
    },
    enabled: !!torneoId,
    staleTime: QUERY_KEYS.tablaPosiciones.staleTime,
    gcTime: QUERY_KEYS.tablaPosiciones.gcTime,
  });
};

// ==================== UTILIDADES ====================

/**
 * Hook para refrescar múltiples queries a la vez
 */
export const useRefreshAll = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries();
    toast.success('Datos actualizados');
  };
};

/**
 * Hook para prefetch (cargar datos antes de que se necesiten)
 */
export const usePrefetchTorneos = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.torneos.all,
      queryFn: async () => {
        const response = await api.get('/torneos');
        return response.data?.torneos || response.data || [];
      },
    });
  };
};

