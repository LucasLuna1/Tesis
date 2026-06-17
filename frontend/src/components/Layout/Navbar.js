import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { NotificacionesBell } from '../Notificaciones';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../hooks/useAuth';

const Navbar = () => {
  const { toggleSidebar, sidebarOpen } = useSidebar();
  const { userProfile } = useAuth();
  const location = useLocation();

  // Función para obtener el título de la página actual
  const getPageTitle = () => {
    const path = location.pathname;
    
    // Mapeo de rutas a títulos principales (sin subtítulos)
    const titleMap = {
      '/dashboard': 'Dashboard',
      '/partidos': 'Partidos',
      '/jugadores': 'Jugadores',
      '/jugadores/buscar': 'Jugadores',
      '/usuarios': 'Usuarios',
      '/arbitros': 'Árbitros',
      '/equipos': 'Equipos',
      '/torneos': 'Torneos',
      '/reportes': 'Reportes',
      '/noticias': 'Noticias',
      '/mis-solicitudes': 'Mis Solicitudes',
      '/patrocinadores': 'Patrocinadores'
    };

    // Buscar coincidencia exacta primero
    if (titleMap[path]) {
      return titleMap[path];
    }

    // Buscar coincidencias parciales para rutas dinámicas
    for (const [route, title] of Object.entries(titleMap)) {
      if (path.startsWith(route) && route !== '/') {
        return title;
      }
    }

    // Si es una ruta de perfil, extraer el tipo
    if (path.includes('/jugadores/') && path !== '/jugadores/buscar') {
      return 'Mi Perfil';
    }
    if (path.includes('/usuarios/') && path !== '/usuarios') {
      return 'Perfil de Usuario';
    }
    if (path.includes('/arbitros/') && path !== '/arbitros') {
      return 'Mi Perfil';
    }
    if (path.includes('/organizadores/')) {
      return 'Mi Perfil';
    }

    // Si es una ruta de partido específico
    if (path.includes('/partidos/') && path !== '/partidos') {
      return 'Partido';
    }

    // Si es una ruta de torneo específico
    if (path.includes('/torneos/') && path !== '/torneos') {
      return 'Torneo';
    }

    // Si es una ruta de equipo específico
    if (path.includes('/equipos/') && path !== '/equipos') {
      return 'Equipo';
    }

    // Fallback
    return 'Kani-Deportes';
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ 
        minHeight: 64
      }}>
        {/* Botón de toggle - Solo para organizadores en desktop */}
        {userProfile?.tipoUsuario === 'organizador' && (
          <IconButton
            color="inherit"
            aria-label="toggle sidebar"
            edge="start"
            onClick={toggleSidebar}
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'block' }, // Solo en desktop para organizadores
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            {sidebarOpen ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
        )}

        {/* Botón de toggle - Mobile para todos */}
        <IconButton
          color="inherit"
          aria-label="toggle sidebar"
          edge="start"
          onClick={toggleSidebar}
          sx={{
            mr: 2,
            display: { xs: 'block', md: userProfile?.tipoUsuario === 'organizador' ? 'none' : 'block' },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {getPageTitle()}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificacionesBell />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
