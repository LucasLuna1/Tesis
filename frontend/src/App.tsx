import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

// Componentes de Layout
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import CustomBottomNavigation from './components/Layout/BottomNavigation';

// Componentes de autenticación - cargados inmediatamente (necesarios para la primera carga)
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import OlvidarContrasena from './pages/Auth/OlvidarContrasena';
import RestablecerContrasena from './pages/Auth/RestablecerContrasena';

// Dashboard - cargado inmediatamente (ruta por defecto)
import Dashboard from './pages/Dashboard';
// (duplicado eliminado)

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import { CacheProvider } from './contexts/CacheContext';

// React Query
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './config/queryClient';

// Hooks
import { useAuth } from './contexts/AuthContext';

// Lazy-loaded pages (code splitting) - Optimización de rendimiento
// Todas las páginas excepto Login, Register y Dashboard se cargan bajo demanda
const Torneos = React.lazy(() => import('./pages/Torneos'));
const FixtureTorneo = React.lazy(() => import('./pages/Torneos/FixtureTorneo'));
const DetalleTorneo = React.lazy(() => import('./pages/DetalleTorneo'));
const FasesTorneo = React.lazy(() => import('./pages/FasesTorneo'));
const InfoTorneo = React.lazy(() => import('./pages/InfoTorneo'));

const Equipos = React.lazy(() => import('./pages/Equipos/index'));
const JugadoresEquipo = React.lazy(() => import('./pages/Equipos/JugadoresEquipo'));
const GestionEquipos = React.lazy(() => import('./pages/Equipos/GestionEquipos'));

const Jugadores = React.lazy(() => import('./pages/Jugadores'));
const PerfilJugador = React.lazy(() => import('./pages/Jugadores/PerfilJugador'));
const MiEquipo = React.lazy(() => import('./pages/Jugadores/MiEquipo'));
const MisSolicitudes = React.lazy(() => import('./pages/Jugadores/MisSolicitudes'));
const HistorialJugador = React.lazy(() => import('./pages/HistorialJugador'));

const Arbitros = React.lazy(() => import('./pages/Arbitros'));
const PerfilArbitro = React.lazy(() => import('./pages/Arbitros/PerfilArbitro'));
const DashboardArbitro = React.lazy(() => import('./pages/Arbitros/DashboardArbitro'));
const MisPartidos = React.lazy(() => import('./pages/Arbitros/MisPartidos'));
const GestionPartido = React.lazy(() => import('./pages/Arbitros/GestionPartido'));
const VisualizarPartido = React.lazy(() => import('./pages/Arbitros/VisualizarPartido'));

const PerfilOrganizador = React.lazy(() => import('./pages/Organizadores/PerfilOrganizador'));
const SolicitudesGestionEquipos = React.lazy(() => import('./pages/Organizadores/SolicitudesGestionEquipos'));

const MiClub = React.lazy(() => import('./pages/Manager/MiClub'));
const BuscarClub = React.lazy(() => import('./pages/Manager/BuscarClub'));
const GestionJugadores = React.lazy(() => import('./pages/Manager/GestionJugadores'));
const GestionSolicitudes = React.lazy(() => import('./pages/Manager/GestionSolicitudes'));
const GestionConvocados = React.lazy(() => import('./pages/Manager/GestionConvocados'));
const PerfilManager = React.lazy(() => import('./pages/Manager/PerfilManager'));

const PerfilUsuario = React.lazy(() => import('./pages/Usuarios/PerfilUsuario'));

const Noticias = React.lazy(() => import('./pages/Noticias'));
const NoticiasGestion = React.lazy(() => import('./pages/NoticiasGestion'));
const NoticiaDetalle = React.lazy(() => import('./pages/NoticiaDetalle'));

const Reportes = React.lazy(() => import('./pages/Reportes'));
const NotificacionesSeguidores = React.lazy(() => import('./pages/NotificacionesSeguidores'));
const TodasLasNotificaciones = React.lazy(() => import('./pages/Notificaciones/TodasLasNotificaciones'));

const VotacionPartido = React.lazy(() => import('./pages/Votacion').then(module => ({ default: module.VotacionPartido })));
const GestionCanchas = React.lazy(() => import('./pages/Canchas/GestionCanchas'));
const JugadorFecha = React.lazy(() => import('./pages/JugadorFecha'));
const DetallePartido = React.lazy(() => import('./pages/DetallePartido'));
const FixtureCompleto = React.lazy(() => import('./pages/FixtureCompleto'));
const Patrocinadores = React.lazy(() => import('./pages/Patrocinadores'));

// Componente interno que usa el contexto de la sidebar
const AppContent: React.FC = React.memo(() => {
  const { user, loading } = useAuth();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { theme } = useTheme();

  // 🔄 Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          backgroundColor: theme.palette.background.default
        }}>
          <div style={{ 
            fontSize: '1.2rem', 
            marginBottom: '20px',
            color: theme.palette.text.primary 
          }}>
            Verificando autenticación...
          </div>
        </div>
      </MuiThemeProvider>
    );
  }

  if (user) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <div className="App" style={{ 
          maxWidth: '100vw', 
          overflowX: 'hidden',
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh'
        }}>
          <Navbar />
          <div style={{ display: 'flex', maxWidth: '100vw', overflowX: 'hidden' }}>
            <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />
            <Box component="main" sx={{
              flex: 1,
              padding: 0,
              pt: 8, // 64px
              pb: { xs: 10, md: 0 }, // 80px en móviles, 0 en desktop
              minWidth: 0,
              maxWidth: '100%',
              width: '100%',
              overflowX: 'hidden',
              position: 'relative',
              backgroundColor: 'background.default'
            }}>
            <React.Suspense fallback={
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '200px',
                p: 3
              }}>
                <div>Cargando...</div>
              </Box>
            }>
            <Routes>
              {/* Rutas públicas - Solo redirigir si NO está autenticado */}
              <Route 
                path="/login"
                element={!user ? <Login /> : <Navigate to="/dashboard" />}
              />
              <Route 
                path="/register"
                element={!user ? <Register /> : <Navigate to="/dashboard" />}
              />
              <Route 
                path="/olvidar-contrasena"
                element={!user ? <OlvidarContrasena /> : <Navigate to="/dashboard" />}
              />
              <Route 
                path="/restablecer-contrasena"
                element={!user ? <RestablecerContrasena /> : <Navigate to="/dashboard" />}
              />
              
              {/* Rutas protegidas */}
              <Route 
                path="/dashboard" 
                element={<Dashboard />} 
              />
              <Route 
                path="/torneos" 
                element={<Torneos />} 
              />
              <Route 
                path="/torneos/:id" 
                element={<DetalleTorneo />} 
              />
              <Route 
                path="/torneos/:id/fixture" 
                element={<FixtureTorneo />} 
              />
              <Route 
                path="/torneos/:id/fases" 
                element={<FasesTorneo />} 
              />
              {/* Ruta de mapas eliminada */}
              <Route 
                path="/equipos" 
                element={<Equipos />}
              />
              <Route 
                path="/equipos/:id/jugadores" 
                element={<JugadoresEquipo />} 
              />
              <Route 
                path="/notificaciones/seguidores" 
                element={<NotificacionesSeguidores />} 
              />
              <Route 
                path="/notificaciones" 
                element={<TodasLasNotificaciones />} 
              />
              <Route 
                path="/mis-solicitudes" 
                element={<MisSolicitudes />} 
              />
              <Route 
                path="/jugadores" 
                element={<Jugadores />} 
              />
              <Route 
                path="/jugadores/equipo" 
                element={<MiEquipo />} 
              />
              <Route 
                path="/jugadores/:id" 
                element={<PerfilJugador />} 
              />
              <Route 
                path="/organizadores/:id" 
                element={<PerfilOrganizador />} 
              />
              <Route 
                path="/organizadores/solicitudes-gestion" 
                element={<SolicitudesGestionEquipos />} 
              />
              <Route 
                path="/usuarios/:id" 
                element={<PerfilUsuario />} 
              />
              <Route 
                path="/arbitros" 
                element={<Arbitros />} 
              />
              <Route 
                path="/arbitros/:id" 
                element={<PerfilArbitro />} 
              />
              <Route 
                path="/arbitros/dashboard" 
                element={<DashboardArbitro />} 
              />
              <Route 
                path="/partidos" 
                element={<Navigate to="/torneos" />} 
              />
              <Route 
                path="/arbitros/mis-partidos" 
                element={<MisPartidos />} 
              />
              <Route 
                path="/arbitros/partido/:id" 
                element={<GestionPartido />} 
              />
              <Route 
                path="/partidos/:id" 
                element={<VisualizarPartido />} 
              />
              
              {/* Rutas del Manager */}
              <Route 
                path="/manager/mi-club" 
                element={<MiClub />} 
              />
              <Route 
                path="/manager/buscar-club" 
                element={<BuscarClub />} 
              />
              <Route 
                path="/manager/jugadores" 
                element={<GestionJugadores />} 
              />
              <Route 
                path="/manager/solicitudes" 
                element={<GestionSolicitudes />} 
              />
              <Route 
                path="/manager/convocados" 
                element={<GestionConvocados />} 
              />
              <Route 
                path="/manager/perfil" 
                element={<PerfilManager />} 
              />
              
              <Route 
                path="/reportes" 
                element={<Reportes />} 
              />
              
              {/* Rutas principales */}
              <Route 
                path="/noticias" 
                element={<Noticias />} 
              />
              <Route 
                path="/noticias/:id" 
                element={<NoticiaDetalle />} 
              />
              <Route 
                path="/noticias/gestion" 
                element={<NoticiasGestion />} 
              />
              <Route 
                path="/jugador-fecha" 
                element={<JugadorFecha />} 
              />
              
              {/* Ruta por defecto */}
              <Route 
                path="/" 
                element={<Navigate to="/dashboard" />} 
              />
              <Route 
                path="/votacion/:partidoId" 
                element={<VotacionPartido />} 
              />
              
              {/* Rutas de información adicional */}
              <Route 
                path="/jugadores/:id/historial" 
                element={<HistorialJugador />} 
              />
              <Route 
                path="/torneos/:id/info" 
                element={<InfoTorneo />} 
              />
              <Route 
                path="/partidos/:id" 
                element={<DetallePartido />} 
              />
              <Route 
                path="/fixture" 
                element={<FixtureCompleto />} 
              />
              <Route 
                path="/canchas" 
                element={<GestionCanchas />} 
              />
              <Route 
                path="/patrocinadores" 
                element={<Patrocinadores />} 
              />
            </Routes>
            </React.Suspense>
            </Box>
        </div>
        
          {/* Bottom Navigation para móviles */}
          <CustomBottomNavigation />
        </div>
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/olvidar-contrasena" element={<OlvidarContrasena />} />
        <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </MuiThemeProvider>
  );
});

// Componente para el Toaster con soporte de tema
const ToasterWithTheme: React.FC = React.memo(() => {
  const { darkMode } = useTheme();
  
  const toastOptions = React.useMemo(() => ({
    duration: 4000,
    style: {
      background: darkMode ? '#2d2d2d' : '#ffffff',
      color: darkMode ? '#e0e0e0' : '#000000',
      border: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`,
    },
    success: {
      iconTheme: {
        primary: darkMode ? '#60a5fa' : '#1976d2',
        secondary: darkMode ? '#2d2d2d' : '#ffffff',
      },
    },
    error: {
      iconTheme: {
        primary: darkMode ? '#f87171' : '#d32f2f',
        secondary: darkMode ? '#2d2d2d' : '#ffffff',
      },
    },
  }), [darkMode]);
  
  return (
    <Toaster 
      position="top-right"
      toastOptions={toastOptions}
    />
  );
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CustomThemeProvider>
        <CacheProvider>
          <AuthProvider>
            <SidebarProvider>
              <Router>
                <ToasterWithTheme />
                <AppContent />
                {/* React Query DevTools - solo visible en desarrollo */}
                <ReactQueryDevtools initialIsOpen={false} />
              </Router>
            </SidebarProvider>
          </AuthProvider>
        </CacheProvider>
      </CustomThemeProvider>
    </QueryClientProvider>
  );
};

export default App;