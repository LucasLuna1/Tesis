import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Divider,
  Stack,
  alpha,
  Badge
} from '@mui/material';
import {
  Groups,
  Person,
  EmojiEvents,
  Assignment,
  SportsRugby,
  Add,
  TrendingUp,
  TrendingDown,
  Notifications,
  CalendarToday,
  PersonAdd,
  EmojiEventsOutlined,
  ArrowForward,
  Speed,
  Star,
  LocalFireDepartment,
  Timeline as TimelineIcon,
  LocationOn
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getImageUrl } from '../../services/api';
import toast from 'react-hot-toast';

const DashboardManager: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [solicitudesGestion, setSolicitudesGestion] = useState<any[]>([]);
  const [proximosPartidos, setProximosPartidos] = useState<any[]>([]);
  const [ultimosPartidos, setUltimosPartidos] = useState<any[]>([]);
  const [torneosActivos, setTorneosActivos] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [colorDominante, setColorDominante] = useState<string>('#1976d2');

  // Función para extraer color dominante de una imagen
  const extraerColorDominante = useCallback((imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0;
        let count = 0;
        
        // Muestrear cada 10 píxeles para mejor performance
        for (let i = 0; i < data.length; i += 40) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        // Oscurecer un poco el color para el fondo
        const factor = 0.6;
        r = Math.floor(r * factor);
        g = Math.floor(g * factor);
        b = Math.floor(b * factor);
        
        const colorHex = `rgb(${r}, ${g}, ${b})`;
        setColorDominante(colorHex);

      } catch (error) {
        console.error('Error extrayendo color:', error);
      }
    };
    
    img.onerror = () => {

    };
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar club del manager
      const clubResponse = await api.get('/managers/mi-club');
      if (clubResponse.data.club) {
        const clubData = clubResponse.data.club;
        setClub(clubData);
        
        // Cargar datos en paralelo
        const [
          solicitudesRes,
          solicitudesGestionRes,
          proximosPartidosRes,
          ultimosPartidosRes,
          torneosActivosRes,
          jugadoresRes
        ] = await Promise.all([
          api.get('/managers/solicitudes').catch(() => ({ data: { solicitudes: [] } })),
          api.get('/managers/solicitudes-gestion').catch(() => ({ data: { solicitudes: [] } })),
          api.get(`/partidos/equipo/${clubData.id}/proximo`).catch(() => ({ data: null })),
          api.get(`/partidos/equipo/${clubData.id}/ultimo`).catch(() => ({ data: null })),
          api.get(`/torneos/equipo/${clubData.id}/activos`).catch(() => ({ data: [] })),
          api.get(`/managers/club/${clubData.id}/jugadores`).catch(() => ({ data: { jugadores: [] } }))
        ]);
        
        setSolicitudes(solicitudesRes.data.solicitudes || []);
        setSolicitudesGestion(solicitudesGestionRes.data.solicitudes || []);
        setProximosPartidos(proximosPartidosRes.data ? [proximosPartidosRes.data] : []);
        setUltimosPartidos(ultimosPartidosRes.data ? [ultimosPartidosRes.data] : []);
        setTorneosActivos(torneosActivosRes.data || []);
        setJugadores(jugadoresRes.data.jugadores || []);
        
        // Extraer color dominante del logo
        if (clubData.logo) {
          const logoUrl = getImageUrl(clubData.logo);
          extraerColorDominante(logoUrl);
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar información');
    } finally {
      setLoading(false);
    }
  }, [extraerColorDominante]);

  useEffect(() => {
    cargarDatos();
    
    // Recargar datos cuando el usuario regrese a esta página
    const handleFocus = () => {
      cargarDatos();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [cargarDatos]);

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando Dashboard...
        </Typography>
      </Container>
    );
  }

  // Si no tiene club, redirigir a crear club
  if (!club) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha('#d32f2f', 0.05)} 0%, ${alpha('#d32f2f', 0.02)} 100%)`,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              boxShadow: '0 8px 32px rgba(211,47,47,0.3)'
            }}
          >
            <Groups sx={{ fontSize: 60, color: 'white' }} />
          </Box>
          
          <Typography variant="h3" fontWeight={700} gutterBottom>
            ¡Bienvenido, Manager!
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Para comenzar, crea tu club o solicita gestionar uno existente
          </Typography>
          
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => navigate('/manager/mi-club')}
              sx={{ 
                px: 4, 
                py: 1.5,
                borderRadius: 2.5,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                boxShadow: '0 4px 16px rgba(211,47,47,0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(211,47,47,0.5)'
                },
                transition: 'all 0.3s'
              }}
            >
              Ir a Mi Club
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/manager/buscar-club')}
              sx={{ 
                px: 4, 
                py: 1.5,
                borderRadius: 2.5,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s'
              }}
            >
              Buscar Club
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const totalSolicitudesPendientes = solicitudes.length + solicitudesGestion.length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero Header Moderno - Diseño Adaptativo al Logo */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${colorDominante} 0%, ${alpha(colorDominante, 0.85)} 50%, ${alpha(colorDominante, 0.7)} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: alpha(colorDominante, 0.4),
          transition: 'background 0.6s ease-in-out, border-color 0.6s ease-in-out',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(colorDominante, 0.3)} 0%, transparent 70%)`,
            filter: 'blur(40px)',
            transition: 'background 0.6s ease-in-out'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-30%',
            left: '-5%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(colorDominante, 0.2)} 0%, transparent 70%)`,
            filter: 'blur(40px)',
            transition: 'background 0.6s ease-in-out'
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={club.logo ? getImageUrl(club.logo) : ''}
                  sx={{ 
                    width: 100, 
                    height: 100,
                    border: '4px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    bgcolor: 'background.paper'
                  }}
                >
                  <Groups sx={{ fontSize: 50 }} />
                </Avatar>
                {/* Badge decorativo */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                    border: '3px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(76,175,80,0.4)'
                  }}
                >
                  <Star sx={{ fontSize: 18, color: 'white' }} />
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs>
              <Typography 
                variant="h3" 
                fontWeight={700} 
                sx={{ 
                  color: 'white',
                  mb: 1,
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {club.nombre}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                {club.ciudad && (
                  <Chip 
                    label={club.ciudad}
                    size="small"
                    icon={<LocationOn sx={{ fontSize: 16, color: 'rgba(255,255,255,0.9)' }} />}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.25)'
                      }
                    }}
                  />
                )}
                {club.categorias && club.categorias.slice(0, 3).map((cat: string) => (
                  <Chip 
                    key={cat}
                    label={cat}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.25)'
                      }
                    }}
                  />
                ))}
                {club.categorias && club.categorias.length > 3 && (
                  <Chip 
                    label={`+${club.categorias.length - 3}`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.25)'
                      }
                    }}
                  />
                )}
              </Box>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                Dashboard de Gestión
              </Typography>
            </Grid>

            <Grid item>
              <Stack spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/manager/mi-club')}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2.5,
                    px: 3,
                    boxShadow: '0 4px 20px rgba(255,255,255,0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.95)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 24px rgba(255,255,255,0.4)'
                    },
                    transition: 'all 0.3s'
                  }}
                >
                  Ver Mi Club
                </Button>
                {totalSolicitudesPendientes > 0 && (
                  <Badge badgeContent={totalSolicitudesPendientes} color="error">
                    <Button
                      variant="outlined"
                      size="medium"
                      startIcon={<Notifications />}
                      onClick={() => navigate('/manager/solicitudes')}
                      sx={{
                        borderColor: 'rgba(255,255,255,0.5)',
                        color: 'white',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 2,
                        borderWidth: 2,
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.15)',
                          borderWidth: 2
                        }
                      }}
                    >
                      Solicitudes
                    </Button>
                  </Badge>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Alertas y Notificaciones */}
      {totalSolicitudesPendientes > 0 && (
        <Alert 
          severity="warning" 
          icon={<Notifications />}
          sx={{ 
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'warning.main',
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          action={
            <Button 
              color="warning" 
              size="small"
              onClick={() => navigate('/manager/solicitudes')}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Ver Todas
            </Button>
          }
        >
          <Typography fontWeight={600}>
            Tienes {totalSolicitudesPendientes} solicitud{totalSolicitudesPendientes !== 1 ? 'es' : ''} pendiente{totalSolicitudesPendientes !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="body2">
            {solicitudes.length > 0 && `${solicitudes.length} de jugadores`}
            {solicitudes.length > 0 && solicitudesGestion.length > 0 && ' y '}
            {solicitudesGestion.length > 0 && `${solicitudesGestion.length} de managers`}
          </Typography>
        </Alert>
      )}

      {/* Estadísticas Principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#2196f3', 0.05)} 100%)`,
              border: `1px solid ${alpha('#2196f3', 0.2)}`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: `0 12px 32px ${alpha('#2196f3', 0.2)}`,
                borderColor: 'primary.main'
              }
            }}
            onClick={() => navigate('/manager/mi-club')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                    Total Jugadores
                  </Typography>
                  <Typography variant="h2" fontWeight="bold" color="primary.main">
                    {jugadores.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#2196f3', 0.15), color: 'primary.main', width: 56, height: 56 }}>
                  <Person sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box display="flex" alignItems="center" gap={0.5}>
                <TrendingUp sx={{ fontSize: 18, color: 'success.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Activos en el club
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#4caf50', 0.1)} 0%, ${alpha('#4caf50', 0.05)} 100%)`,
              border: `1px solid ${alpha('#4caf50', 0.2)}`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: `0 12px 32px ${alpha('#4caf50', 0.2)}`,
                borderColor: 'success.main'
              }
            }}
            onClick={() => navigate('/manager/mi-club')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                    Partidos Ganados
                  </Typography>
                  <Typography variant="h2" fontWeight="bold" color="success.main">
                    {club.estadisticas?.partidosGanados || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#4caf50', 0.15), color: 'success.main', width: 56, height: 56 }}>
                  <SportsRugby sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box>
                <LinearProgress 
                  variant="determinate" 
                  value={((club.estadisticas?.partidosGanados || 0) / Math.max((club.estadisticas?.partidosJugados || 1), 1)) * 100}
                  sx={{ 
                    height: 8, 
                    borderRadius: 1,
                    bgcolor: alpha('#4caf50', 0.1),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'success.main',
                      borderRadius: 1
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {((club.estadisticas?.partidosGanados || 0) / Math.max((club.estadisticas?.partidosJugados || 1), 1) * 100).toFixed(0)}% efectividad
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#ff9800', 0.1)} 0%, ${alpha('#ff9800', 0.05)} 100%)`,
              border: `1px solid ${alpha('#ff9800', 0.2)}`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: `0 12px 32px ${alpha('#ff9800', 0.2)}`,
                borderColor: 'warning.main'
              }
            }}
            onClick={() => navigate('/torneos')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                    Torneos Activos
                  </Typography>
                  <Typography variant="h2" fontWeight="bold" color="warning.main">
                    {torneosActivos.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#ff9800', 0.15), color: 'warning.main', width: 56, height: 56 }}>
                  <EmojiEvents sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box display="flex" alignItems="center" gap={0.5}>
                <Star sx={{ fontSize: 18, color: 'warning.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Competiciones en curso
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#9c27b0', 0.1)} 0%, ${alpha('#9c27b0', 0.05)} 100%)`,
              border: `1px solid ${alpha('#9c27b0', 0.2)}`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: `0 12px 32px ${alpha('#9c27b0', 0.2)}`,
                borderColor: 'secondary.main'
              }
            }}
            onClick={() => navigate('/manager/solicitudes')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                    Solicitudes
                  </Typography>
                  <Typography variant="h2" fontWeight="bold" sx={{ color: '#9c27b0' }}>
                    {totalSolicitudesPendientes}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#9c27b0', 0.15), color: '#9c27b0', width: 56, height: 56 }}>
                  <Assignment sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box display="flex" alignItems="center" gap={0.5}>
                {totalSolicitudesPendientes > 0 ? (
                  <>
                    <LocalFireDepartment sx={{ fontSize: 18, color: 'error.main' }} />
                    <Typography variant="caption" color="error.main" fontWeight="medium">
                      Requieren atención
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary" fontWeight="medium">
                    Sin solicitudes pendientes
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Layout de 2 Columnas */}
      <Grid container spacing={3}>
        {/* Columna Izquierda */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {/* Próximos Partidos */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: `linear-gradient(135deg, ${alpha('#4caf50', 0.05)} 0%, ${alpha('#4caf50', 0.02)} 100%)`,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(76,175,80,0.3)'
                    }}
                  >
                    <CalendarToday sx={{ fontSize: 20, color: 'white' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Próximos Partidos
                  </Typography>
                </Box>
                <Button 
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/torneos')}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Ver todos
                </Button>
              </Box>
              
              <CardContent sx={{ p: 3 }}>
                {proximosPartidos.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <SportsRugby sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No hay partidos programados
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      Los próximos partidos aparecerán aquí
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {proximosPartidos.map((partido: any) => {
                      const esLocal = partido.equipoLocalId === club.id;
                      const rival = esLocal ? partido.equipoVisitante : partido.equipoLocal;
                      const rivalLogo = esLocal ? partido.equipoVisitanteLogo : partido.equipoLocalLogo;
                      
                      return (
                        <Paper
                          key={partido.id}
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            background: `linear-gradient(135deg, ${alpha('#4caf50', 0.03)} 0%, ${alpha('#4caf50', 0.01)} 100%)`,
                            transition: 'all 0.3s',
                            '&:hover': {
                              borderColor: 'success.main',
                              boxShadow: `0 4px 20px ${alpha('#4caf50', 0.15)}`,
                              transform: 'translateX(4px)'
                            }
                          }}
                        >
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={5}>
                              <Box display="flex" alignItems="center" gap={2}>
                                <Avatar
                                  src={club.logo ? getImageUrl(club.logo) : undefined}
                                  sx={{ width: 48, height: 48 }}
                                >
                                  {club.nombre?.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {club.nombre}
                                  </Typography>
                                  <Chip 
                                    label={esLocal ? "Local" : "Visitante"}
                                    size="small"
                                    color={esLocal ? "success" : "info"}
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                  />
                                </Box>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} sm={2}>
                              <Box textAlign="center">
                                <Typography variant="h5" fontWeight="bold" color="text.secondary">
                                  VS
                                </Typography>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} sm={5}>
                              <Box display="flex" alignItems="center" gap={2} justifyContent="flex-end">
                                <Box textAlign="right">
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {rival}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {partido.fecha && new Date(partido.fecha).toLocaleDateString('es', { 
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                    {partido.horaInicio && ` - ${partido.horaInicio}`}
                                  </Typography>
                                </Box>
                                <Avatar
                                  src={rivalLogo ? getImageUrl(rivalLogo) : undefined}
                                  sx={{ width: 48, height: 48 }}
                                >
                                  {rival?.charAt(0)}
                                </Avatar>
                              </Box>
                            </Grid>
                          </Grid>
                          
                          {partido.cancha && (
                            <Box mt={2} pt={2} borderTop={1} borderColor="divider">
                              <Typography variant="caption" color="text.secondary">
                                📍 {partido.cancha.nombre || 'Cancha por definir'} • {partido.torneoNombre || 'Torneo'}
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Últimos Resultados */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: `linear-gradient(135deg, ${alpha('#2196f3', 0.05)} 0%, ${alpha('#2196f3', 0.02)} 100%)`,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(33,150,243,0.3)'
                    }}
                  >
                    <TimelineIcon sx={{ fontSize: 20, color: 'white' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Últimos Resultados
                  </Typography>
                </Box>
              </Box>
              
              <CardContent sx={{ p: 3 }}>
                {ultimosPartidos.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <SportsRugby sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No hay partidos finalizados
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      Los resultados aparecerán aquí
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {ultimosPartidos.map((partido: any) => {
                      const esLocal = partido.equipoLocalId === club.id;
                      const rival = esLocal ? partido.equipoVisitante : partido.equipoLocal;
                      const rivalLogo = esLocal ? partido.equipoVisitanteLogo : partido.equipoLocalLogo;
                      const puntosEquipo = esLocal ? partido.resultado?.puntosLocal : partido.resultado?.puntosVisitante;
                      const puntosRival = esLocal ? partido.resultado?.puntosVisitante : partido.resultado?.puntosLocal;
                      const gano = puntosEquipo > puntosRival;
                      const empate = puntosEquipo === puntosRival;
                      
                      return (
                        <Paper
                          key={partido.id}
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: gano ? 'success.main' : (empate ? 'warning.main' : 'error.main'),
                            background: gano 
                              ? `linear-gradient(135deg, ${alpha('#4caf50', 0.08)} 0%, ${alpha('#4caf50', 0.02)} 100%)`
                              : empate
                              ? `linear-gradient(135deg, ${alpha('#ff9800', 0.08)} 0%, ${alpha('#ff9800', 0.02)} 100%)`
                              : `linear-gradient(135deg, ${alpha('#f44336', 0.08)} 0%, ${alpha('#f44336', 0.02)} 100%)`,
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateX(4px)',
                              boxShadow: `0 4px 20px ${alpha(gano ? '#4caf50' : (empate ? '#ff9800' : '#f44336'), 0.2)}`
                            }
                          }}
                        >
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={4}>
                              <Box display="flex" alignItems="center" gap={2}>
                                <Avatar
                                  src={club.logo ? getImageUrl(club.logo) : undefined}
                                  sx={{ width: 48, height: 48 }}
                                >
                                  {club.nombre?.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {club.nombre}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {esLocal ? "Local" : "Visitante"}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} sm={4}>
                              <Box textAlign="center">
                                <Typography 
                                  variant="h3" 
                                  fontWeight="bold"
                                  sx={{
                                    color: gano ? 'success.main' : (empate ? 'warning.main' : 'error.main')
                                  }}
                                >
                                  {puntosEquipo} - {puntosRival}
                                </Typography>
                                <Chip 
                                  label={gano ? "Victoria" : (empate ? "Empate" : "Derrota")}
                                  size="small"
                                  color={gano ? "success" : (empate ? "warning" : "error")}
                                  sx={{ mt: 1, fontWeight: 700 }}
                                />
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} sm={4}>
                              <Box display="flex" alignItems="center" gap={2} justifyContent="flex-end">
                                <Box textAlign="right">
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {rival}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {partido.fecha && new Date(partido.fecha).toLocaleDateString('es', { 
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </Typography>
                                </Box>
                                <Avatar
                                  src={rivalLogo ? getImageUrl(rivalLogo) : undefined}
                                  sx={{ width: 48, height: 48 }}
                                >
                                  {rival?.charAt(0)}
                                </Avatar>
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Acciones Rápidas Modernizadas */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: `linear-gradient(135deg, ${alpha('#d32f2f', 0.05)} 0%, ${alpha('#d32f2f', 0.02)} 100%)`,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="h6" fontWeight={600}>
                  Acciones Rápidas
                </Typography>
              </Box>
              
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<PersonAdd />}
                      onClick={() => navigate('/manager/mi-club')}
                      sx={{
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        borderWidth: 2,
                        justifyContent: 'flex-start',
                        '&:hover': {
                          borderWidth: 2,
                          transform: 'translateX(4px)',
                          bgcolor: alpha('#2196f3', 0.05)
                        },
                        transition: 'all 0.3s'
                      }}
                    >
                      Agregar Jugador
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<Assignment />}
                      onClick={() => navigate('/manager/solicitudes')}
                      sx={{
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        borderWidth: 2,
                        justifyContent: 'flex-start',
                        '&:hover': {
                          borderWidth: 2,
                          transform: 'translateX(4px)',
                          bgcolor: alpha('#ff9800', 0.05)
                        },
                        transition: 'all 0.3s'
                      }}
                    >
                      Gestionar Solicitudes
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<EmojiEvents />}
                      onClick={() => navigate('/torneos')}
                      sx={{
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        borderWidth: 2,
                        justifyContent: 'flex-start',
                        '&:hover': {
                          borderWidth: 2,
                          transform: 'translateX(4px)',
                          bgcolor: alpha('#4caf50', 0.05)
                        },
                        transition: 'all 0.3s'
                      }}
                    >
                      Ver Torneos
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<SportsRugby />}
                      onClick={() => navigate('/partidos')}
                      sx={{
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        borderWidth: 2,
                        justifyContent: 'flex-start',
                        '&:hover': {
                          borderWidth: 2,
                          transform: 'translateX(4px)',
                          bgcolor: alpha('#9c27b0', 0.05)
                        },
                        transition: 'all 0.3s'
                      }}
                    >
                      Ver Partidos
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Columna Derecha - Sidebar */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Rendimiento del Equipo */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: `linear-gradient(135deg, ${alpha('#9c27b0', 0.05)} 0%, ${alpha('#9c27b0', 0.02)} 100%)`
              }}
            >
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: `linear-gradient(135deg, ${alpha('#9c27b0', 0.1)} 0%, ${alpha('#9c27b0', 0.05)} 100%)`,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: '#9c27b0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(156,39,176,0.3)'
                    }}
                  >
                    <Speed sx={{ fontSize: 18, color: 'white' }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Rendimiento
                  </Typography>
                </Box>
              </Box>
              
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" fontWeight={600}>
                        Victorias
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight={700}>
                        {club.estadisticas?.partidosGanados || 0} / {club.estadisticas?.partidosJugados || 0}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={((club.estadisticas?.partidosGanados || 0) / Math.max((club.estadisticas?.partidosJugados || 1), 1)) * 100}
                      sx={{ 
                        height: 10, 
                        borderRadius: 2,
                        bgcolor: alpha('#4caf50', 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'success.main',
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>

                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" fontWeight={600}>
                        Derrotas
                      </Typography>
                      <Typography variant="body2" color="error.main" fontWeight={700}>
                        {club.estadisticas?.partidosPerdidos || 0} / {club.estadisticas?.partidosJugados || 0}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={((club.estadisticas?.partidosPerdidos || 0) / Math.max((club.estadisticas?.partidosJugados || 1), 1)) * 100}
                      sx={{ 
                        height: 10, 
                        borderRadius: 2,
                        bgcolor: alpha('#f44336', 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'error.main',
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>

                  <Divider />

                  <Box display="flex" justifyContent="space-around" pt={1}>
                    <Box textAlign="center">
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {club.estadisticas?.partidosGanados || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ganados
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box textAlign="center">
                      <Typography variant="h4" fontWeight="bold" color="text.secondary">
                        {club.estadisticas?.partidosEmpatados || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Empatados
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box textAlign="center">
                      <Typography variant="h4" fontWeight="bold" color="error.main">
                        {club.estadisticas?.partidosPerdidos || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Perdidos
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Torneos Activos */}
            {torneosActivos.length > 0 && (
              <Card 
                elevation={0}
                sx={{ 
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: `linear-gradient(135deg, ${alpha('#ff9800', 0.05)} 0%, ${alpha('#ff9800', 0.02)} 100%)`
                }}
              >
                <Box 
                  sx={{ 
                    px: 3, 
                    py: 2,
                    background: `linear-gradient(135deg, ${alpha('#ff9800', 0.1)} 0%, ${alpha('#ff9800', 0.05)} 100%)`,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: 'warning.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(255,152,0,0.3)'
                      }}
                    >
                      <EmojiEvents sx={{ fontSize: 18, color: 'white' }} />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Torneos en Curso
                    </Typography>
                  </Box>
                </Box>
                
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={1.5}>
                    {torneosActivos.slice(0, 3).map((torneo: any) => (
                      <Box
                        key={torneo.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: 'warning.main',
                            bgcolor: alpha('#ff9800', 0.05),
                            transform: 'translateX(4px)'
                          }
                        }}
                        onClick={() => navigate('/torneos')}
                      >
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          {torneo.nombre}
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          <Chip 
                            label={torneo.categoria}
                            size="small"
                            color="warning"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Chip 
                            label={torneo.estado || 'Activo'}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Box>
                    ))}
                    {torneosActivos.length > 3 && (
                      <Button
                        size="small"
                        endIcon={<ArrowForward />}
                        onClick={() => navigate('/torneos')}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Ver {torneosActivos.length - 3} más
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Info del Club */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: `linear-gradient(135deg, ${alpha('#2196f3', 0.05)} 0%, ${alpha('#2196f3', 0.02)} 100%)`,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Información del Club
                </Typography>
              </Box>
              
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      JUGADORES
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {jugadores.length}
                    </Typography>
                  </Box>
                  
                  <Divider />
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      CATEGORÍAS
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                      {club.categorias && club.categorias.map((cat: string) => (
                        <Chip 
                          key={cat}
                          label={cat}
                          size="small"
                          sx={{
                            height: 24,
                            fontWeight: 600,
                            bgcolor: alpha('#2196f3', 0.1),
                            color: 'primary.main'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Divider />

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => navigate('/manager/mi-club')}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      py: 1.5,
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                      boxShadow: '0 4px 12px rgba(33,150,243,0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(33,150,243,0.4)'
                      },
                      transition: 'all 0.3s'
                    }}
                  >
                    Ir al Club Completo
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardManager;
