import React from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper
} from '@mui/material';
import {
  Dashboard,
  SportsRugby,
  EmojiEvents,
  People,
  Person,
  Groups,
  Gavel,
  Assessment,
  Article,
  Assignment,
  Business,
  Home
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useRolePermissions } from '../../hooks/useRolePermissions';

const CustomBottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMuiTheme();
  const { getRoleBasedNavigation } = useRolePermissions();

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      Dashboard: <Dashboard />,
      Home: <Home />,
      SportsRugby: <SportsRugby />,
      EmojiEvents: <EmojiEvents />,
      People: <People />,
      Person: <Person />,
      Groups: <Groups />,
      Gavel: <Gavel />,
      Assessment: <Assessment />,
      Article: <Article />,
      Assignment: <Assignment />,
      Business: <Business />
    };
    return iconMap[iconName] || <Dashboard />;
  };

  // Función para acortar labels en móviles
  const getShortenedLabel = (label: string) => {
    const labelMap: { [key: string]: string } = {
      'Dashboard': 'Dashboard',
      'Fixture': 'Fixture',
      'Mi Perfil': 'Perfil',
      'Torneos': 'Torneos',
      'Equipos': 'Equipos',
      'Jugadores': 'Jugadores',
      'Usuarios': 'Usuarios',
      'Árbitros': 'Árbitros',
      'Reportes': 'Reportes',
      'Noticias': 'Noticias',
      'Mis Partidos': 'Partidos',
      'Gestionar Partido': 'Gestión',
      'Torneos Disponibles': 'Torneos',
      'Equipos Disponibles': 'Equipos',
      'Mis Solicitudes': 'Solicitudes',
      'Mi Club': 'Club'
    };
    return labelMap[label] || label;
  };

  // Bottom navigation simplificado: Torneos, Perfil, Dashboard, Jugadores/Club, Noticias
  const getBottomNavItems = () => {
    const allItems = getRoleBasedNavigation;
    
    // Buscar los elementos específicos en el orden deseado
    const torneos = allItems.find((item: any) => item.label === 'Torneos');
    const miPerfil = allItems.find((item: any) => item.label === 'Mi Perfil');
    const jugadores = allItems.find((item: any) => item.label === 'Jugadores');
    const miClub = allItems.find((item: any) => item.label === 'Mi Club');
    const noticias = allItems.find((item: any) => item.label === 'Noticias');
    const misPartidos = allItems.find((item: any) => item.label === 'Mis Partidos'); // Para árbitros
    
    // Siempre incluir Dashboard en el centro para todos los roles
    const dashboard = {
      label: 'Dashboard',
      icon: 'Dashboard',
      path: '/dashboard'
    };
    
    // Crear array en el orden específico
    // Para árbitros: Torneos, Mis Partidos, Dashboard
    // Para organizadores: Torneos, Perfil, Dashboard, Jugadores, Noticias
    // Para otros roles: Torneos, Perfil, Dashboard, Club, Noticias
    let orderedItems;
    if (misPartidos) {
      // Es un árbitro - Layout especial
      orderedItems = [torneos, misPartidos, dashboard].filter(Boolean);
    } else {
      orderedItems = [torneos, miPerfil, dashboard, jugadores || miClub, noticias].filter(Boolean);
    }
    
    return orderedItems.map((item: any) => ({
      label: getShortenedLabel(item.label),
      icon: getIconComponent(item.icon),
      path: item.path
    }));
  };
  
  const navItems = getBottomNavItems();

  // Determinar el valor actual basado en la ruta
  const currentValue = navItems.findIndex((item: any) => {
    // Solo considerar activo si es exactamente la misma ruta
    return item.path === location.pathname;
  });

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    if (navItems[newValue]) {
      navigate(navItems[newValue].path);
    }
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1000,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        // Solo mostrar en móviles
        display: { xs: 'block', md: 'none' }
      }} 
      elevation={3}
    >
      <BottomNavigation
        value={currentValue >= 0 ? currentValue : 0}
        onChange={handleChange}
        showLabels
        sx={{
          backgroundColor: theme.palette.background.paper,
          '& .MuiBottomNavigationAction-root': {
            color: theme.palette.text.secondary,
            minWidth: 'auto',
            '&.Mui-selected': {
              color: 'primary.main'
            }
          }
        }}
      >
        {navItems.map((item: any, index: number) => (
          <BottomNavigationAction
            key={index}
            label={item.label}
            icon={item.icon}
            sx={{
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.65rem',
                fontWeight: 500,
                '&.Mui-selected': {
                  fontSize: '0.7rem',
                  fontWeight: 600
                }
              }
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default CustomBottomNavigation;
