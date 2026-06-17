import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';

export const useRolePermissions = () => {
  const { userProfile } = useAuth();
  const userRole = userProfile?.tipoUsuario;
  const userId = userProfile?.uid;

  // Permisos para Organizador
  const isOrganizador = userRole === 'organizador';
  const isAdmin = userRole === 'admin';
  const isArbitro = userRole === 'arbitro';
  const isJugador = userRole === 'jugador';
  const isManager = userRole === 'manager';
  const isUsuario = userRole === 'usuario';

  // Permisos específicos del Organizador - Memoizados para evitar recreaciones
  const canManageTorneos = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canManagePartidos = useCallback(() => isOrganizador || isAdmin || isArbitro, [isOrganizador, isAdmin, isArbitro]);
  const canCreatePartidos = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canManageEquipos = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canManageJugadores = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canManageArbitros = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canManageCanchas = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canSupervisePartidos = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canPublishNews = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canViewNews = useCallback(() => true, []); // Todos los roles pueden ver noticias
  const canManageNews = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]); // Solo organizadores pueden gestionar
  const canFollowPlayers = useCallback(() => true, []); // Todos pueden seguir jugadores
  const canFollowClubs = useCallback(() => true, []); // Todos pueden seguir clubes
  const canViewTorneos = useCallback(() => true, []); // Todos pueden ver torneos
  const canViewPartidos = useCallback(() => true, []); // Todos pueden ver partidos
  const canManageSponsors = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canGenerateReports = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);
  const canViewHistory = useCallback(() => isOrganizador || isAdmin, [isOrganizador, isAdmin]);

  // Permisos para Árbitro - Memoizados
  const canStartPartido = useCallback((partido) => {
    if (!partido || partido.estado !== 'programado') return false;
    if (isAdmin || isOrganizador) return true;
    return isArbitro && partido.arbitros?.principal?.id === userId;
  }, [isAdmin, isOrganizador, isArbitro, userId]);

  const canModifyPartido = useCallback((partido) => {
    if (!partido || partido.estado !== 'En curso') return false;
    if (isAdmin || isOrganizador) return true;
    return isArbitro && partido.arbitros?.principal?.id === userId;
  }, [isAdmin, isOrganizador, isArbitro, userId]);

  // Permisos para Jugador - Memoizados
  const canViewProfile = useCallback(() => true, []);
  const canViewStats = useCallback(() => true, []);
  const canVotePlayer = useCallback(() => isJugador || isOrganizador || isAdmin, [isJugador, isOrganizador, isAdmin]);

  // Navegación basada en roles - Memoizado
  const getRoleBasedNavigation = useMemo(() => {
    // Determinar path del perfil según tipo de usuario
    let perfilPath = `/jugadores/${userId}`;
    if (isArbitro) {
      perfilPath = `/arbitros/${userId}`;
    } else if (isOrganizador || isAdmin) {
      perfilPath = `/organizadores/${userId}`;
    } else if (isManager) {
      perfilPath = `/managers/${userId}`;
    } else if (isUsuario) {
      perfilPath = `/usuarios/${userId}`;
    }
    
    const baseItems = [
      { label: 'Dashboard', path: '/dashboard', icon: 'Home' },
      { label: 'Mi Perfil', path: perfilPath, icon: 'Person' }
    ];

    if (isOrganizador || isAdmin) {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: 'Home' },
        { type: 'divider' },
        { label: 'Torneos', path: '/torneos', icon: 'EmojiEvents' },
        { label: 'Equipos', path: '/equipos', icon: 'SportsRugby' },
        { label: 'Jugadores', path: '/jugadores', icon: 'People' },
        { type: 'divider' },
        { label: 'Patrocinadores', path: '/patrocinadores', icon: 'Business' },
        { type: 'divider' },
        { label: 'Noticias', path: '/noticias', icon: 'Article' }
      ];
    }

    if (isArbitro) {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: 'Home' },
        { type: 'divider' },
        { label: 'Mis Partidos', path: '/arbitros/mis-partidos', icon: 'Assignment' },
        { label: 'Torneos', path: '/torneos', icon: 'EmojiEvents' },
        { label: 'Equipos', path: '/equipos', icon: 'SportsRugby' },
        { type: 'divider' },
        { label: 'Patrocinadores', path: '/patrocinadores', icon: 'Business' }
      ];
    }

    if (isManager) {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: 'Home' },
        { label: 'Mi Perfil', path: '/manager/perfil', icon: 'Person' },
        { type: 'divider' },
        { label: 'Mi Club', path: '/manager/mi-club', icon: 'Groups' },
        { label: 'Torneos', path: '/torneos', icon: 'EmojiEvents' },
        { label: 'Equipos', path: '/equipos', icon: 'SportsRugby' },
        { label: 'Jugadores', path: '/jugadores', icon: 'People' },
        { label: 'Árbitros', path: '/arbitros', icon: 'Gavel' },
        { label: 'Canchas', path: '/canchas', icon: 'LocationOn' },
        { type: 'divider' },
        { label: 'Solicitudes', path: '/manager/solicitudes', icon: 'Assignment' },
        { label: 'Convocados', path: '/manager/convocados', icon: 'ListAlt' },
        { label: 'Reportes', path: '/reportes', icon: 'Assessment' },
        { label: 'Patrocinadores', path: '/patrocinadores', icon: 'Business' },
        { type: 'divider' },
        { label: 'Noticias', path: '/noticias', icon: 'Article' }
      ];
    }

    if (isJugador) {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: 'Home' },
        { label: 'Mi Perfil', path: perfilPath, icon: 'Person' },
        { label: 'divider', type: 'divider' },
        { label: 'Mi Club', path: '/jugadores/equipo', icon: 'Groups' },
        { label: 'Torneos', path: '/torneos', icon: 'EmojiEvents' },
        { label: 'Equipos', path: '/equipos', icon: 'SportsRugby' },
        { label: 'Jugadores', path: '/jugadores', icon: 'People' },
        { label: 'Árbitros', path: '/arbitros', icon: 'Gavel' },
        { label: 'Canchas', path: '/canchas', icon: 'LocationOn' },
        { type: 'divider' },
        { label: 'Mis Solicitudes', path: '/mis-solicitudes', icon: 'Assignment' },
        { label: 'Reportes', path: '/reportes', icon: 'Assessment' },
        { label: 'Patrocinadores', path: '/patrocinadores', icon: 'Business' },
        { type: 'divider' },
        { label: 'Noticias', path: '/noticias', icon: 'Article' }
      ];
    }

    if (isUsuario) {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: 'Home' },
        { label: 'Mi Perfil', path: perfilPath, icon: 'Person' },
        { type: 'divider' },
        { label: 'Torneos', path: '/torneos', icon: 'EmojiEvents' },
        { label: 'Equipos', path: '/equipos', icon: 'SportsRugby' },
        { label: 'Jugadores', path: '/jugadores', icon: 'People' },
        { label: 'Árbitros', path: '/arbitros', icon: 'Gavel' },
        { label: 'Canchas', path: '/canchas', icon: 'LocationOn' },
        { type: 'divider' },
        { label: 'Reportes', path: '/reportes', icon: 'Assessment' },
        { label: 'Patrocinadores', path: '/patrocinadores', icon: 'Business' },
        { type: 'divider' },
        { label: 'Noticias', path: '/noticias', icon: 'Article' }
      ];
    }

    return baseItems;
  }, [isOrganizador, isAdmin, isArbitro, isJugador, isManager, isUsuario, userId]);

  return useMemo(() => ({
    // Roles
    isOrganizador,
    isAdmin,
    isArbitro,
    isJugador,
    isManager,
    isUsuario,
    userRole,
    userId,

    // Permisos del Organizador
    canManageTorneos,
    canManagePartidos,
    canCreatePartidos,
    canManageEquipos,
    canManageJugadores,
    canManageArbitros,
    canManageCanchas,
    canSupervisePartidos,
    canPublishNews,
    canViewNews,
    canManageNews,
    canManageSponsors,
    canGenerateReports,
    canViewHistory,

    // Permisos del Árbitro
    canStartPartido,
    canModifyPartido,

    // Permisos del Jugador
    canViewProfile,
    canViewStats,
    canVotePlayer,

    // Permisos del Usuario (espectador)
    canFollowPlayers,
    canFollowClubs,
    canViewTorneos,
    canViewPartidos,

    // Navegación
    getRoleBasedNavigation
  }), [
    isOrganizador,
    isAdmin,
    isArbitro,
    isJugador,
    isManager,
    isUsuario,
    userRole,
    userId,
    canManageTorneos,
    canManagePartidos,
    canCreatePartidos,
    canManageEquipos,
    canManageJugadores,
    canManageArbitros,
    canManageCanchas,
    canSupervisePartidos,
    canPublishNews,
    canViewNews,
    canManageNews,
    canManageSponsors,
    canGenerateReports,
    canViewHistory,
    canStartPartido,
    canModifyPartido,
    canViewProfile,
    canViewStats,
    canVotePlayer,
    canFollowPlayers,
    canFollowClubs,
    canViewTorneos,
    canViewPartidos,
    getRoleBasedNavigation
  ]);
};
