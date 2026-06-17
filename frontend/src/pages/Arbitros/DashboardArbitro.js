import { asText } from '../../utils/text';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  alpha
} from '@mui/material';
import {
  SportsRugby,
  Gavel,
  PlayArrow,
  Schedule,
  Assignment,
  Timer,
  TrendingUp,
  Notifications,
  CheckCircle,
  EmojiEvents
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { construirUrlImagen } from '../../utils/imageUtils';

const DashboardArbitro = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [arbitro, setArbitro] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helpers para normalizar posibles objetos a string
  const getNombreEquipo = (equipo, fallback = 'Equipo') => {
    if (!equipo) return fallback;
    if (typeof equipo === 'string') return equipo;
    if (typeof equipo === 'object') return equipo.nombre || equipo.id || fallback;
    return fallback;
  };

  const getNombreCancha = (cancha, fallback = 'Cancha por definir') => {
    if (!cancha) return fallback;
    if (typeof cancha === 'string') return cancha;
    if (typeof cancha === 'object') return cancha.nombre || cancha.id || fallback;
    return fallback;
  };

  const cargarDatosArbitro = useCallback(async () => {
    try {
      setLoading(true);
      
      const arbitroId = userProfile?.uid || userProfile?.id;
      
      if (!arbitroId) {
        setError('No se pudo obtener el ID del árbitro');
        setLoading(false);
        return;
      }
      
      // Cargar perfil completo del árbitro con estadísticas
      const perfilRes = await api.get(`/arbitros/perfil/${arbitroId}`);
      setArbitro(perfilRes.data);
      
      // Cargar próximos partidos del árbitro
      try {
        const proximosRes = await api.get(`/arbitros/${arbitroId}/partidos/proximos`);
        setPartidos(proximosRes.data || []);
      } catch (err) {
        // Si falla, dejar array vacío
        setPartidos([]);
      }
      
    } catch (error) {
      setError('Error al cargar datos del árbitro');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      cargarDatosArbitro();
    }
  }, [userProfile, cargarDatosArbitro]);

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'programado': return 'primary';
      case 'En Curso': return 'warning';
      case 'finalizado': return 'success';
      case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'programado': return <Schedule />;
      case 'En Curso': return <PlayArrow />;
      case 'finalizado': return <Assignment />;
      default: return <SportsRugby />;
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const gestionarPartido = (partidoId) => {
    navigate(`/arbitros/partido/${partidoId}/gestion`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando dashboard del árbitro...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: { xs: 2, sm: 4 }, 
        pb: { xs: 12, md: 4 },
        px: { xs: 2, sm: 3 }
      }}
    >
      {/* Header Premium con foto blur */}
      <Box
        sx={{
          position: 'relative',
          mb: 4,
          p: 4,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          minHeight: 200
        }}
      >
        {/* Fondo con foto blur */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: (arbitro?.foto || userProfile?.foto)
              ? `url(${construirUrlImagen(arbitro?.foto || userProfile?.foto)})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(25px) brightness(0.85)',
            transform: 'scale(1.1)',
            transition: 'all 0.5s ease',
            zIndex: 0
          }}
        />
        
        {/* Overlay oscuro para mejor legibilidad */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(102, 126, 234, 0.15) 100%)',
            zIndex: 0
          }}
        />
        
        {/* Efectos de luz */}
        <Box
          sx={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '40%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
            transform: 'rotate(-15deg)',
            zIndex: 0
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-30%',
            left: '-5%',
            width: '30%',
            height: '150%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            transform: 'rotate(25deg)',
            zIndex: 0
          }}
        />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            {(arbitro?.foto || userProfile?.foto) && (
              <Box
                component="img"
                src={construirUrlImagen(arbitro?.foto || userProfile?.foto)}
                alt={arbitro?.nombre || userProfile?.nombre}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  border: '4px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  objectFit: 'cover'
                }}
              />
            )}
            <Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800,
                  color: 'white',
                  textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                  mb: 1
                }}
              >
                ¡Hola, {arbitro?.nombre || userProfile?.nombre}! 👋
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'rgba(255,255,255,0.95)',
                  fontWeight: 500,
                  fontSize: { xs: '0.95rem', sm: '1.1rem' }
                }}
              >
                Árbitro {arbitro?.certificacion || 'Certificado'} • {arbitro?.experienciaAnios || 0} años de experiencia
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Estadísticas del árbitro - 4 cards horizontales */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 2,
                borderColor: 'primary.main'
              }
            }}
          >
            <CardContent>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Assignment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {arbitro?.estadisticas?.partidosArbitrados || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Partidos Arbitrados
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 2,
                borderColor: 'success.main'
              }
            }}
          >
            <CardContent>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  {arbitro?.estadisticas?.partidosCompletados || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completados
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 2,
                borderColor: 'warning.main'
              }
            }}
          >
            <CardContent>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <EmojiEvents sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h3" fontWeight="bold" color="warning.main">
                  {arbitro?.estadisticas?.tarjetasAmarillas || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tarjetas Amarillas
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 2,
                borderColor: 'error.main'
              }
            }}
          >
            <CardContent>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <TrendingUp sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h3" fontWeight="bold" color="error.main">
                  {arbitro?.estadisticas?.tarjetasRojas || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tarjetas Rojas
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Partidos programados */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">Mis Partidos Asignados</Typography>
              </Box>
              
              {partidos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <SportsRugby sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No tienes partidos asignados
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Los partidos aparecerán aquí cuando te asignen
                  </Typography>
                </Box>
              ) : (
                <List>
                  {partidos.map((partido) => (
                    <ListItem 
                      key={partido.id}
                      sx={{ 
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: 'background.paper'
                      }}
                    >
                      <ListItemIcon>
                        {getEstadoIcon(partido.estado)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle1">
                              {getNombreEquipo(partido.equipos?.local, 'Equipo Local')} vs {getNombreEquipo(partido.equipos?.visitante, 'Equipo Visitante')}
                          </Typography>
                            {partido.categoria && (
                              <Chip 
                                label={asText(partido.categoria)} 
                                color="primary"
                                size="small"
                                sx={{ mr: 0.5 }}
                              />
                            )}
                            <Chip 
                              label={String(partido.estado || '').toUpperCase()} 
                              color={getEstadoColor(partido.estado)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              📅 {formatearFecha(partido.fecha)} - {partido.hora}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              🏟️ {getNombreCancha(partido.cancha)}
                            </Typography>
                            {partido.arbitros?.asistentes?.length > 0 && (
                              <Typography variant="body2" color="text.secondary">
                                👥 {partido.arbitros.asistentes.length} árbitro(s) asistente(s)
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <CardActions>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<PlayArrow />}
                          onClick={() => gestionarPartido(partido.id)}
                          size="small"
                        >
                          {partido.estado === 'programado' ? 'Gestionar' : 
                           partido.estado === 'En Curso' ? 'Continuar' : 'Ver Detalle'}
                        </Button>
                      </CardActions>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Acciones rápidas */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                🎯 Gestión de Partidos - Panel de Control
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SportsRugby />}
                onClick={() => navigate('/arbitros/encuentros-pendientes')}
                sx={{ fontWeight: 'bold' }}
              >
                Ver Encuentros Pendientes
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Como árbitro, tienes acceso exclusivo a la gestión completa de tus partidos asignados.
              Desde aquí puedes controlar el cronómetro, registrar incidencias, actualizar resultados y finalizar partidos.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <PlayArrow sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>Iniciar Partido</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Activa el cronómetro y comienza la gestión del encuentro
                  </Typography>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                 <Card sx={{ textAlign: 'center', p: 2 }}>
                   <Gavel sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                   <Typography variant="h6" gutterBottom>Registrar Incidencias</Typography>
                   <Typography variant="body2" color="text.secondary">
                     Tries, conversiones, penales, tarjetas y otras incidencias del partido
                   </Typography>
                 </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <Assignment sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>Actualizar Resultado</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Modifica el marcador en tiempo real durante el partido
                  </Typography>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <Notifications sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>Finalizar Partido</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completa la gestión con observaciones y resumen final
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardArbitro;
