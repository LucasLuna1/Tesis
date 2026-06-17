import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook para verificar permisos de usuario
 * User Story 1.1: Validar que solo árbitros o staff autorizados puedan gestionar partidos
 */
export const usePermissions = () => {
  const { user } = useContext(AuthContext);

  const canManagePartidos = () => {
    if (!user) return false;
    
    // Detectar si es árbitro basándose en email o displayName
    const esArbitroPorEmail = user.email?.includes('arbitro') || 
                             user.displayName?.toLowerCase().includes('arbitro') ||
                             user.email?.includes('referee') ||
                             user.displayName?.toLowerCase().includes('referee');
    
    // Solo árbitros, organizadores y administradores pueden gestionar partidos
    return ['arbitro', 'organizador', 'admin'].includes(user.tipoUsuario) || esArbitroPorEmail;
  };

  const canCreatePartidos = () => {
    if (!user) return false;
    
    // Solo árbitros activos, organizadores y administradores pueden crear partidos
    if (user.tipoUsuario === 'arbitro') {
      return user.activo && user.certificacion;
    }
    
    return ['organizador', 'admin'].includes(user.tipoUsuario);
  };

  const canStartPartido = (partido) => {
    if (!user || !partido) return false;
    
    // Detectar si es árbitro basándose en email o displayName (fallback)
    const esArbitroPorEmail = user.email?.includes('arbitro') || 
                             user.displayName?.toLowerCase().includes('arbitro') ||
                             user.email?.includes('referee') ||
                             user.displayName?.toLowerCase().includes('referee');
    
    // Solo el árbitro principal puede iniciar el partido
    if (user.tipoUsuario === 'arbitro' || esArbitroPorEmail) {
      // Verificar todas las posibles estructuras de árbitro
      return partido.arbitroPrincipalId === user.uid || 
             partido.arbitros?.principal?.id === user.uid ||
             partido.arbitroId === user.uid ||
             esArbitroPorEmail; // Si es árbitro por email, permitir iniciar
    }
    
    // Staff autorizado puede iniciar cualquier partido
    return ['organizador', 'admin'].includes(user.tipoUsuario);
  };

  const canModifyPartido = (partido) => {
    if (!user || !partido) return false;
    
    // Detectar si es árbitro basándose en email o displayName (fallback)
    const esArbitroPorEmail = user.email?.includes('arbitro') || 
                             user.displayName?.toLowerCase().includes('arbitro') ||
                             user.email?.includes('referee') ||
                             user.displayName?.toLowerCase().includes('referee');
    
    // Solo el árbitro principal puede modificar el partido
    if (user.tipoUsuario === 'arbitro' || esArbitroPorEmail) {
      // Verificar todas las posibles estructuras de árbitro
      return partido.arbitroPrincipalId === user.uid || 
             partido.arbitros?.principal?.id === user.uid ||
             partido.arbitroId === user.uid ||
             esArbitroPorEmail; // Si es árbitro por email, permitir modificar
    }
    
    // Staff autorizado puede modificar cualquier partido
    return ['organizador', 'admin'].includes(user.tipoUsuario);
  };

  const canViewAuditTrail = () => {
    if (!user) return false;
    
    // Todos los usuarios autorizados pueden ver la trazabilidad
    return ['arbitro', 'organizador', 'admin'].includes(user.tipoUsuario);
  };

  const isArbitro = () => {
    return user?.tipoUsuario === 'arbitro';
  };

  const isStaff = () => {
    return ['organizador', 'admin'].includes(user?.tipoUsuario);
  };

  const isAdmin = () => {
    return user?.tipoUsuario === 'admin';
  };

  return {
    canManagePartidos,
    canCreatePartidos,
    canStartPartido,
    canModifyPartido,
    canViewAuditTrail,
    isArbitro,
    isStaff,
    isAdmin,
    user
  };
};
