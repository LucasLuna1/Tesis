import React, { useEffect } from 'react';
import {
  Drawer,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Tooltip,
  useTheme,
  useMediaQuery,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Dashboard,
  SportsRugby,
  People,
  Gavel,
  TrendingUp,
  History,
  EmojiEvents,
  Groups,
  Assessment,
  Article,
  Assignment,
  Person,
  PersonAdd,
  DarkMode,
  LightMode,
  Logout,
  LocationOn,
  Home,
  Business,
  Notifications,
  EditNote,
  Star,
  Group
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import { auth } from '../../config/firebase';

const Sidebar = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, user } = useAuth();
  const { getRoleBasedNavigation } = useRolePermissions();
  const { darkMode, toggleDarkMode } = useCustomTheme();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [avatarKey, setAvatarKey] = React.useState(0);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  
  
  // Constantes para los anchos del sidebar - ajustadas según segunda imagen
  const drawerWidth = 250; // Ancho expandido similar a primera imagen
  const collapsedWidth = 65; // Ancho colapsado como segunda imagen (60-70px)
  
  // 🔄 Escuchar evento de actualización de foto de perfil
  useEffect(() => {
    const handlePhotoUpdate = () => {
      // Forzar re-render del Avatar cambiando la key
      setAvatarKey(prev => prev + 1);
    };
    
    window.addEventListener('profile-photo-updated', handlePhotoUpdate);
    return () => window.removeEventListener('profile-photo-updated', handlePhotoUpdate);
  }, []);


  // Controlar el scroll del body cuando el sidebar está abierto en mobile
  useEffect(() => {
    if (isMobile && open) {
      // Prevenir scroll del body cuando el sidebar está abierto
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Restaurar scroll del body cuando el sidebar está cerrado
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    // Cleanup: restaurar scroll cuando el componente se desmonta
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isMobile, open]);

  // Prevenir propagación del scroll del sidebar a la página principal
  useEffect(() => {
    const handleWheel = (e) => {
      const target = e.target;
      const scrollableElement = target.closest('[data-scrollable-sidebar]');
      
      if (scrollableElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
        const isAtTop = scrollTop === 0;
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;
        
        // Si estamos en el tope y scrolleamos hacia arriba, o en el fondo y scrolleamos hacia abajo,
        // prevenir que el evento se propague a la página principal
        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // Agregar listener con passive: false para poder usar preventDefault
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);


  const getMenuItemsForUser = React.useCallback(() => {
    // getRoleBasedNavigation ya es un array, no una función
    const roleBasedItems = getRoleBasedNavigation;
    
    // Mostrar TODOS los elementos tanto en desktop como en mobile
    const itemsToShow = roleBasedItems;
    
    // Convertir los items del hook a formato del sidebar
    return itemsToShow.map(item => {
      // Si es un divider, retornarlo como tal
      if (item.type === 'divider') {
        return { type: 'divider' };
      }
      // Si no, retornar el item normal
      return {
        text: item.label,
        icon: getIconComponent(item.icon),
        path: item.path
      };
    });
  }, [getRoleBasedNavigation]);

  const getIconComponent = (iconName) => {
    const iconMap = {
      Dashboard: <Dashboard />,
      Home: <Home />,
      SportsRugby: <SportsRugby />,
      EmojiEvents: <EmojiEvents />,
      Groups: <Groups />,
      People: <People />,
      Gavel: <Gavel />,
      Assessment: <Assessment />,
      Article: <Article />,
      Assignment: <Assignment />,
      Person: <Person />,
      PersonAdd: <PersonAdd />,
      TrendingUp: <TrendingUp />,
      History: <History />,
      LocationOn: <LocationOn />,
      ListAlt: <Assignment />,
      Business: <Business />,
      Notifications: <Notifications />,
      EditNote: <EditNote />,
      Star: <Star />,
      Group: <Group />
    };
    return iconMap[iconName] || <Dashboard />;
  };

  const handleNavigation = React.useCallback((path) => {
    navigate(path);
    // En mobile, cerrar el drawer después de navegar
    if (isMobile) {
      onToggle();
    }
  }, [navigate, isMobile, onToggle]);

  // Función para obtener la URL correcta del perfil según el rol
  const getProfileUrl = React.useCallback(() => {
    const userId = userProfile?.id || user?.uid;
    const userType = userProfile?.tipoUsuario;
    
    switch (userType) {
      case 'organizador':
      case 'admin':
        return `/organizadores/${userId}`;
      case 'arbitro':
        return `/arbitros/${userId}`;
      case 'manager':
        return `/manager/${userId}`;
      case 'usuario':
        return `/usuarios/${userId}`;
      case 'jugador':
      default:
        return `/jugadores/${userId}`;
    }
  }, [userProfile?.id, userProfile?.tipoUsuario, user?.uid]);

  const handleLogoutClick = React.useCallback(() => {
    // En mobile, cerrar el sidebar primero
    if (isMobile) {
      onToggle();
    }
    setShowLogoutModal(true);
  }, [isMobile, onToggle]);

  const handleLogoutConfirm = React.useCallback(async () => {
    try {
      // Cerrar sesión usando Firebase Auth
      await auth.signOut();
      
      // Limpiar datos locales
      localStorage.removeItem('firebaseToken');
      sessionStorage.clear();
      
      // Navegar al login
      navigate('/login');
      
      // En mobile, cerrar el drawer después de logout
      if (isMobile) {
        onToggle();
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aunque haya error, navegar al login
      navigate('/login');
      if (isMobile) {
        onToggle();
      }
    } finally {
      setShowLogoutModal(false);
    }
  }, [navigate, isMobile, onToggle]);

  const handleLogoutCancel = React.useCallback(() => {
    setShowLogoutModal(false);
  }, []);

  return (
    <>
       {/* Drawer para Desktop */}
       <Drawer
         variant="permanent"
         sx={{
           width: open ? drawerWidth : collapsedWidth,
           flexShrink: 0,
           transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
           display: { xs: 'none', md: 'block' },
           [`& .MuiDrawer-paper`]: {
             width: open ? drawerWidth : collapsedWidth,
             boxSizing: 'border-box',
             position: 'fixed', // Fijo en la pantalla, no scrollea con el contenido
             top: 64, // Posición desde arriba (altura del navbar)
             left: 0,
             height: 'calc(100vh - 64px)', // Altura fija: altura de ventana menos navbar
             transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease',
             overflowX: 'hidden',
             overflowY: 'hidden', // Sin scroll en el paper, solo en el contenedor interno
             display: { xs: 'none', md: 'block' },
             backgroundColor: muiTheme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
             boxShadow: open ? 3 : 1,
           },
         }}
       >
         {renderDrawerContent()}
       </Drawer>

                                                                                                                                                                                                                               {/* Drawer para Mobile */}
           <SwipeableDrawer
             open={open && isMobile}
             onClose={onToggle}
             onOpen={() => {}}
             disableSwipeToOpen={true}
             transitionDuration={{ enter: 200, exit: 200 }}
             swipeAreaWidth={0}
             ModalProps={{
               keepMounted: false,
               disableScrollLock: true,
               closeAfterTransition: true,
             }}
                         sx={{
               display: { xs: 'block', md: 'none' },
               zIndex: 1400,
               '& .MuiDrawer-paper': {
                 position: 'relative',
                 boxSizing: 'border-box',
                 width: '80%',
                 maxWidth: 320,
                 backgroundColor: muiTheme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
                 height: '100vh',
                 overflow: 'hidden',
               },
             }}
                   >
            {renderMobileDrawerContent()}
          </SwipeableDrawer>

      {/* Modal de confirmación para cerrar sesión */}
      <Dialog
        open={showLogoutModal}
        onClose={handleLogoutCancel}
        maxWidth="sm"
        fullWidth
        sx={{
          zIndex: 1500, // Mayor que el sidebar (1400)
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: muiTheme.palette.mode === 'dark' 
              ? '0 8px 32px rgba(0, 0, 0, 0.5)' 
              : '0 8px 32px rgba(0, 0, 0, 0.15)',
            background: muiTheme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: muiTheme.palette.mode === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            textAlign: 'center',
            pb: 1,
            color: muiTheme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
            fontWeight: 600,
            fontSize: '1.5rem'
          }}
        >
          ¿Estás seguro de cerrar sesión?
        </DialogTitle>
        
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Box sx={{ mb: 3, mt: 2 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                borderRadius: '50%',
                background: muiTheme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
                  : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: muiTheme.palette.mode === 'dark'
                  ? '0 8px 24px rgba(255, 107, 107, 0.25)'
                  : '0 8px 24px rgba(255, 107, 107, 0.15)',
              }}
            >
              <Logout sx={{ fontSize: 40, color: 'white' }} />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions 
          sx={{ 
            p: 3, 
            pt: 1,
            gap: 2,
            justifyContent: 'center'
          }}
        >
          <Button
            onClick={handleLogoutCancel}
            variant="outlined"
            size="large"
            sx={{
              minWidth: 120,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: muiTheme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'rgba(0, 0, 0, 0.2)',
              color: muiTheme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
              '&:hover': {
                borderColor: muiTheme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.5)' 
                  : 'rgba(0, 0, 0, 0.4)',
                backgroundColor: muiTheme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.05)',
              }
            }}
          >
            Cancelar
          </Button>
          
          <Button
            onClick={handleLogoutConfirm}
            variant="contained"
            size="large"
            sx={{
              minWidth: 120,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
              boxShadow: muiTheme.palette.mode === 'dark'
                ? '0 4px 16px rgba(255, 107, 107, 0.3)'
                : '0 4px 16px rgba(255, 107, 107, 0.2)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ff5252 0%, #e53935 100%)',
                boxShadow: muiTheme.palette.mode === 'dark'
                  ? '0 6px 20px rgba(255, 107, 107, 0.4)'
                  : '0 6px 20px rgba(255, 107, 107, 0.3)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              }
            }}
          >
            Cerrar Sesión
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  function renderDrawerContent() {
    return (
      <>

        {/* Contenedor scrolleable - Navegación completa */}
        <Box data-scrollable-sidebar sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          pb: open ? 13 : 12, // Padding inferior para la sección fija
          overflowY: 'auto', // Permitir scroll
          // Ocultar scrollbar por defecto
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'transparent',
            borderRadius: '4px',
          },
          // Mostrar scrollbar al hacer hover
          '&:hover': {
            scrollbarWidth: 'thin', // Firefox
            scrollbarColor: muiTheme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.3) transparent' 
              : 'rgba(0, 0, 0, 0.2) transparent',
            '&::-webkit-scrollbar-thumb': {
              background: muiTheme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'rgba(0, 0, 0, 0.2)',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: muiTheme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.5)' 
                : 'rgba(0, 0, 0, 0.4)',
            },
          },
        }}>
          {/* Lista de navegación */}
          <List sx={{ flex: 1, py: open ? 1.5 : 1, '& .MuiListItem-root': { mb: 0.5 } }}>
            {/* Sección del perfil - DENTRO del scroll */}
            <ListItem disablePadding>
              <Tooltip title={!open ? 'Mi Perfil' : ''} placement="right">
                <ListItemButton
                  onClick={() => navigate(getProfileUrl())}
                  sx={{
                    height: open ? 80 : 60, // Altura fija en lugar de minHeight
                    maxHeight: open ? 80 : 60, // Altura máxima fija
                    justifyContent: open ? 'flex-start' : 'center',
                    px: open ? 2.5 : 1.5,
                    py: open ? 2 : 1.5,
                    mx: 1,
                    borderRadius: 2,
                    flexDirection: open ? 'row' : 'column',
                    alignItems: 'center',
                    gap: open ? 2 : 1,
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    overflow: 'hidden', // Evitar que el contenido se desborde
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <Avatar 
                    key={avatarKey}
                    src={userProfile?.foto || user?.photoURL || ''} 
                    sx={{ 
                      width: open ? 50 : 40, 
                      height: open ? 50 : 40,
                      transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      }
                    }}
                  >
                    {userProfile?.nombre?.charAt(0) || user?.displayName?.charAt(0) || 'U'}
                  </Avatar>
                  {open && (
                    <Box sx={{
                      opacity: open ? 1 : 0,
                      transform: open ? 'translateX(0)' : 'translateX(-10px)',
                      transition: 'opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s, transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s',
                      flex: 1,
                      minWidth: 0, // Permitir que el contenido se encoja
                      overflow: 'hidden', // Evitar desbordamiento
                    }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600, 
                          fontSize: '1rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%'
                        }}
                      >
                        {userProfile?.nombre && userProfile?.apellido 
                          ? `${userProfile.nombre} ${userProfile.apellido}` 
                          : userProfile?.nombre || user?.displayName || 'Usuario'}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%'
                        }}
                      >
                        {userProfile?.tipoUsuario?.charAt(0).toUpperCase() + userProfile?.tipoUsuario?.slice(1)}
                      </Typography>
                    </Box>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
            
            {/* Línea divisoria */}
            <Divider sx={{ my: 1, mx: 2 }} />
            
            {getMenuItemsForUser().map((item, index) => (
              <React.Fragment key={item.type === 'divider' ? `divider-${index}` : item.text}>
                {item.type === 'divider' ? (
                  <Divider sx={{ my: 1.5, mx: 2 }} />
                ) : (
                  <ListItem disablePadding>
                    <Tooltip title={!open ? item.text : ''} placement="right">
                      <ListItemButton
                        selected={location.pathname === item.path}
                        onClick={() => handleNavigation(item.path)}
                        sx={{
                          minHeight: 50,
                          justifyContent: open ? 'flex-start' : 'center',
                          px: open ? 2.5 : 1.5,
                          py: 1.5,
                          mx: 1,
                          borderRadius: 2,
                          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                          '&.Mui-selected': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText',
                            transform: 'translateX(4px)',
                            marginRight: open ? '15px' : '8px',
                            ...(open ? {} : { marginLeft: '5px' }),
                            '&:hover': {
                              backgroundColor: 'primary.main',
                              transform: 'translateX(6px)',
                            },
                            '& .MuiListItemIcon-root': {
                              color: 'primary.contrastText',
                            },
                          },
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            transform: 'translateX(2px)',
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: open ? 2.5 : 'auto',
                            justifyContent: 'center',
                            fontSize: '24px',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.text}
                          sx={{
                            opacity: open ? 1 : 0,
                            transform: open ? 'translateX(0)' : 'translateX(-10px)',
                            transition: 'opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s, transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            minWidth: open ? 'auto' : 0,
                          }}
                        />
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                )}
              </React.Fragment>
            ))}
            
            {/* Items invisibles para dar espacio extra y generar scroll */}
            <ListItem sx={{ height: 50, visibility: 'hidden' }} />
            <ListItem sx={{ height: 50, visibility: 'hidden' }} />
          </List>
        </Box> {/* Cierre del contenedor scrolleable */}
        
        {/* Sección fija - Modo y Cerrar Sesión */}
        <Box sx={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: open ? drawerWidth : collapsedWidth,
          backgroundColor: muiTheme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: muiTheme.palette.mode === 'dark'
            ? '0px -4px 12px rgba(0, 0, 0, .5)' // Sombra hacia arriba (oscuro)
            : '0px -4px 12px rgba(0, 0, 0, .15)', // Sombra hacia arriba (claro)
          transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
          zIndex: 2,
          // Padding inferior extra para móviles
          paddingBottom: { xs: 3, md: 0 }
        }}>
          <List sx={{ py: 0.5 }}>
            {/* Modo Oscuro */}
            <ListItem disablePadding>
              <Tooltip title={!open ? (darkMode ? 'Modo Claro' : 'Modo Oscuro') : ''} placement="right">
                <ListItemButton 
                  onClick={toggleDarkMode}
                  sx={{ 
                    minHeight: 50,
                    justifyContent: open ? 'flex-start' : 'center',
                    px: open ? 2.5 : 1.5,
                    py: 1.5,
                    mx: 1,
                    borderRadius: 2,
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2.5 : 'auto',
                      justifyContent: 'center',
                      fontSize: '24px',
                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    }}
                  >
                    {darkMode ? <LightMode /> : <DarkMode />}
                  </ListItemIcon>
                  <ListItemText 
                    primary={darkMode ? 'Modo Claro' : 'Modo Oscuro'}
                    sx={{
                      opacity: open ? 1 : 0,
                      transform: open ? 'translateX(0)' : 'translateX(-10px)',
                      transition: 'opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s, transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      minWidth: open ? 'auto' : 0,
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
            
            {/* Cerrar Sesión */}
            <ListItem disablePadding>
              <Tooltip title={!open ? 'Cerrar Sesión' : ''} placement="right">
                <ListItemButton 
                  onClick={handleLogoutClick}
                  sx={{ 
                    minHeight: 50,
                    justifyContent: open ? 'flex-start' : 'center',
                    px: open ? 2.5 : 1.5,
                    py: 1.5,
                    mx: 1,
                    mb: { xs: 3, md: 1 }, // Más espacio abajo en móviles
                    borderRadius: 2,
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    '&:hover': {
                      backgroundColor: 'error.light',
                      color: 'error.contrastText',
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2.5 : 'auto',
                      justifyContent: 'center',
                      color: 'inherit',
                      fontSize: '24px',
                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    }}
                  >
                    <Logout />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Cerrar Sesión"
                    sx={{
                      opacity: open ? 1 : 0,
                      transform: open ? 'translateX(0)' : 'translateX(-10px)',
                      transition: 'opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s, transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      minWidth: open ? 'auto' : 0,
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          </List>
        </Box>
      </>
    );
  }

  function renderMobileDrawerContent() {
    return (
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Contenedor scrolleable - Navegación completa */}
        <Box data-scrollable-sidebar sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto', // Permitir scroll
          // Ocultar scrollbar por defecto
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'transparent',
            borderRadius: '4px',
          },
          // Mostrar scrollbar al hacer hover
          '&:hover': {
            scrollbarWidth: 'thin', // Firefox
            scrollbarColor: muiTheme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.3) transparent' 
              : 'rgba(0, 0, 0, 0.2) transparent',
            '&::-webkit-scrollbar-thumb': {
              background: muiTheme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'rgba(0, 0, 0, 0.2)',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: muiTheme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.5)' 
                : 'rgba(0, 0, 0, 0.4)',
            },
          },
        }}>
          {/* Lista de navegación */}
          <List sx={{ flex: 1, py: 2, pb: 12 }}>
            {/* Sección del perfil - DENTRO del scroll */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate(getProfileUrl())}
                sx={{
                  height: 80, // Altura fija en lugar de minHeight
                  maxHeight: 80, // Altura máxima fija
                  px: 3,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden', // Evitar que el contenido se desborde
                  gap: 2,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Avatar 
                  key={avatarKey}
                  src={userProfile?.foto || user?.photoURL || ''} 
                  sx={{ width: 60, height: 60 }}
                >
                  {userProfile?.nombre?.charAt(0) || user?.displayName?.charAt(0) || 'U'}
                </Avatar>
                <Box sx={{ 
                  flex: 1,
                  minWidth: 0, // Permitir que el contenido se encoja
                  overflow: 'hidden', // Evitar desbordamiento
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%'
                    }}
                  >
                    {userProfile?.nombre || user?.displayName || 'Usuario'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%'
                    }}
                  >
                    {userProfile?.tipoUsuario?.charAt(0).toUpperCase() + userProfile?.tipoUsuario?.slice(1)}
                  </Typography>
                </Box>
              </ListItemButton>
            </ListItem>
            
            {/* Línea divisoria */}
            <Divider sx={{ my: 1, mx: 2 }} />
            
            {getMenuItemsForUser().map((item, index) => (
              <React.Fragment key={item.type === 'divider' ? `divider-mobile-${index}` : item.text}>
                {item.type === 'divider' ? (
                  <Divider sx={{ my: 1.5, mx: 2 }} />
                ) : (
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={location.pathname === item.path}
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        minHeight: 56,
                        px: 3,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                          },
                          '& .MuiListItemIcon-root': {
                            color: 'primary.contrastText',
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 48 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  </ListItem>
                )}
              </React.Fragment>
            ))}
            
            {/* Items invisibles para dar espacio extra y generar scroll */}
            <ListItem sx={{ height: 56, visibility: 'hidden' }} />
            <ListItem sx={{ height: 56, visibility: 'hidden' }} />
          </List>
        </Box> {/* Cierre del contenedor scrolleable */}
        
        {/* Sección fija - Modo y Cerrar Sesión */}
        <Box sx={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: { xs: '80vw', md: '100%' },
          maxWidth: { xs: 320, md: 'none' },
          backgroundColor: muiTheme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: muiTheme.palette.mode === 'dark'
            ? '0px -4px 12px rgba(0, 0, 0, 0.5)' // Sombra hacia arriba (oscuro)
            : '0px -4px 12px rgba(0, 0, 0, 0.15)', // Sombra hacia arriba (claro)
          zIndex: 1402,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)' // Considerar el área segura en mobile
        }}>
          <List>
            {/* Modo Oscuro */}
            <ListItem disablePadding>
              <ListItemButton 
                onClick={toggleDarkMode}
                sx={{ px: 3, py: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 48 }}>
                  {darkMode ? <LightMode /> : <DarkMode />}
                </ListItemIcon>
                <ListItemText primary={darkMode ? 'Modo Claro' : 'Modo Oscuro'} />
              </ListItemButton>
            </ListItem>
            
            {/* Cerrar Sesión */}
            <ListItem disablePadding>
              <ListItemButton 
                onClick={handleLogoutClick}
                sx={{ 
                  px: 3, 
                  py: 2,
                  '&:hover': {
                    backgroundColor: 'error.light',
                    color: 'error.contrastText',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 48, color: 'inherit' }}>
                  <Logout />
                </ListItemIcon>
                <ListItemText primary="Cerrar Sesión" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Box>
    );
  }
};

export default Sidebar;