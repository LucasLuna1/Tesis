import { asText } from '../../utils/text';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  List,
  Avatar,
  ButtonGroup
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  PlayArrow,
  Visibility,
  CalendarToday,
  LocationOn
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { DateUtils } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { construirUrlImagen } from '../../utils/imageUtils';
import LogoDisplay from '../../components/common/LogoDisplay';

const MisPartidos: React.FC = () => {
  const navigate = useNavigate();
  const authContext = useAuth();
  const user = authContext?.user;
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [torneoSeleccionado, setTorneoSeleccionado] = useState<string | null>(null);
  
  // Helper para obtener el nombre del equipo (string u objeto)
  const getNombreEquipo = (equipo: any, fallback: string = 'Equipo'): string => {
    if (!equipo) return fallback;
    if (typeof equipo === 'string') return equipo;
    if (typeof equipo === 'object') return equipo.nombre || fallback;
    return fallback;
  };
  
  // Helper para obtener el nombre de la cancha (string u objeto)
  const getNombreCancha = (cancha: any, fallback: string = 'Cancha por definir'): string => {
    if (!cancha) return fallback;
    if (typeof cancha === 'string') return cancha;
    if (typeof cancha === 'object') return cancha.nombre || fallback;
    return fallback;
  };

  useEffect(() => {
    if (user?.uid) {
      cargarPartidos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const cargarPartidos = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/arbitros/partidos`);
      
      if (response.data && Array.isArray(response.data)) {
        setPartidos(response.data);
      } else {
        setPartidos([]);
      }
    } catch (error) {
      console.error('❌ Error cargando partidos:', error);
      setError('Error al cargar los partidos');
      toast.error('Error al cargar los partidos');
    } finally {
      setLoading(false);
    }
  };

  // Extraer torneos únicos de los partidos
  const torneosUnicos = useMemo(() => {
    const torneos = partidos
      .map(p => ({ id: p.torneoId, nombre: p.torneoNombre }))
      .filter(t => t.id && t.nombre);
    
    // Eliminar duplicados basado en el ID del torneo
    const torneosUnicos = torneos.reduce((acc, torneo) => {
      if (!acc.find(t => t.id === torneo.id)) {
        acc.push(torneo);
      }
      return acc;
    }, [] as Array<{id: string, nombre: string}>);
    
    return torneosUnicos;
  }, [partidos]);

  // Filtrar partidos por torneo seleccionado
  const partidosFiltrados = useMemo(() => {
    if (!torneoSeleccionado) {
      return partidos; // Mostrar todos si no hay torneo seleccionado
    }
    return partidos.filter(p => p.torneoId === torneoSeleccionado);
  }, [partidos, torneoSeleccionado]);

  // Filtrar partidos por estado
  const partidosProgramados = partidosFiltrados.filter(p => p.estado === 'programado');
  const partidosEnCurso = partidosFiltrados.filter(p => p.estado === 'En Curso' || p.estado === 'pausado');
  const partidosFinalizados = partidosFiltrados.filter(p => p.estado === 'finalizado');

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando partidos...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={cargarPartidos} sx={{ mt: 2 }}>
          Reintentar
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 3 }, mb: 4, pb: 10, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
        Mis Partidos
      </Typography>

      {/* Botones de filtrado por torneo */}
      {torneosUnicos.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 600, 
              mb: 1.5,
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Filtrar por torneo:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant={torneoSeleccionado === null ? "contained" : "outlined"}
              size="small"
              onClick={() => setTorneoSeleccionado(null)}
              sx={{ 
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.5, sm: 0.75 }
              }}
            >
              Todos los torneos
            </Button>
            {torneosUnicos.map((torneo) => (
              <Button
                key={torneo.id}
                variant={torneoSeleccionado === torneo.id ? "contained" : "outlined"}
                size="small"
                onClick={() => setTorneoSeleccionado(torneo.id)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.5, sm: 0.75 }
                }}
              >
                {torneo.nombre}
              </Button>
            ))}
          </Box>
        </Box>
      )}

      {partidos.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No tienes partidos asignados
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Los partidos asignados aparecerán aquí cuando te asignen como árbitro
          </Typography>
        </Box>
      ) : partidosFiltrados.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No hay partidos para el torneo seleccionado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Selecciona otro torneo para ver sus partidos
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Partidos Programados */}
          {partidosProgramados.length > 0 && (
            <Grid item xs={12}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                <Schedule color="info" />
                Partidos Programados ({partidosProgramados.length})
              </Typography>
              <List sx={{ p: 0 }}>
                {partidosProgramados.map((partido) => (
                  <Card key={partido.id} sx={{ mb: 2 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          {/* Equipos */}
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' }, 
                            gap: { xs: 1.5, sm: 2 }, 
                            mb: 2 
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <LogoDisplay
                                src={construirUrlImagen(partido.equipoLocalLogo)}
                                alt={getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                                size="small"
                                shape="rounded"
                                fallbackText={getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                                sx={{ 
                                  width: { xs: 32, sm: 40 }, 
                                  height: { xs: 32, sm: 40 }, 
                                  borderRadius: '50%',
                                  flexShrink: 0
                                }}
                              />
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                                  lineHeight: 1.3
                                }}
                              >
                                {getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                              </Typography>
                            </Box>
                            
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                mx: { xs: 0, sm: 1 }, 
                                color: 'text.secondary',
                                fontSize: { xs: '0.85rem', sm: '1rem' },
                                alignSelf: { xs: 'flex-start', sm: 'center' }
                              }}
                            >
                              vs
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <LogoDisplay
                                src={construirUrlImagen(partido.equipoVisitanteLogo)}
                                alt={getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                                size="small"
                                shape="rounded"
                                fallbackText={getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                                sx={{ 
                                  width: { xs: 32, sm: 40 }, 
                                  height: { xs: 32, sm: 40 }, 
                                  borderRadius: '50%',
                                  flexShrink: 0
                                }}
                              />
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                                  lineHeight: 1.3
                                }}
                              >
                                {getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {/* Fecha y cancha */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} color="action" />
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                {DateUtils.formatDateForDisplay(partido.fecha)} - {partido.horaInicio || 'No especificada'}
                              </Typography>
                            </Box>
                            {partido.cancha && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationOn sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} color="action" />
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  {getNombreCancha(partido.cancha)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          
                          {/* Chips */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {partido.torneoNombre && (
                              <Chip 
                                label={partido.torneoNombre} 
                                size="small" 
                                variant="outlined" 
                                sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                              />
                            )}
                            {partido.categoria && (
                              <Chip 
                                label={asText(partido.categoria)} 
                                size="small" 
                                color="primary" 
                                sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                              />
                            )}
                            <Chip 
                              label="Programado" 
                              color="info" 
                              size="small" 
                              sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                            />
                          </Box>
                        </Box>
                        
                        {/* Botón de acción */}
                        <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'flex-start' } }}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<PlayArrow />}
                            onClick={() => navigate(`/arbitros/partido/${partido.id}`)}
                            fullWidth
                            sx={{ 
                              minWidth: { xs: '100%', sm: 'auto' },
                              fontSize: { xs: '0.8rem', sm: '0.875rem' }
                            }}
                          >
                            Gestionar
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            </Grid>
          )}

          {/* Partidos En Curso */}
          {partidosEnCurso.length > 0 && (
            <Grid item xs={12}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                <PlayArrow color="warning" />
                Partidos En Curso ({partidosEnCurso.length})
              </Typography>
              <List sx={{ p: 0 }}>
                {partidosEnCurso.map((partido) => (
                  <Card key={partido.id} sx={{ mb: 2, border: '2px solid #ff9800' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          {/* Equipos */}
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' }, 
                            gap: { xs: 1.5, sm: 2 }, 
                            mb: 2 
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <LogoDisplay
                                src={construirUrlImagen(partido.equipoLocalLogo)}
                                alt={getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                                size="small"
                                shape="rounded"
                                fallbackText={getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                                sx={{ 
                                  width: { xs: 32, sm: 40 }, 
                                  height: { xs: 32, sm: 40 }, 
                                  borderRadius: '50%',
                                  flexShrink: 0
                                }}
                              />
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                                  lineHeight: 1.3
                                }}
                              >
                                {getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                              </Typography>
                            </Box>
                            
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                mx: { xs: 0, sm: 1 }, 
                                color: 'text.secondary',
                                fontSize: { xs: '0.85rem', sm: '1rem' },
                                alignSelf: { xs: 'flex-start', sm: 'center' }
                              }}
                            >
                              vs
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <LogoDisplay
                                src={construirUrlImagen(partido.equipoVisitanteLogo)}
                                alt={getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                                size="small"
                                shape="rounded"
                                fallbackText={getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                                sx={{ 
                                  width: { xs: 32, sm: 40 }, 
                                  height: { xs: 32, sm: 40 }, 
                                  borderRadius: '50%',
                                  flexShrink: 0
                                }}
                              />
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                                  lineHeight: 1.3
                                }}
                              >
                                {getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {/* Fecha y cancha */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} color="action" />
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                {DateUtils.formatDateForDisplay(partido.fecha)} - {partido.horaInicio || 'No especificada'}
                              </Typography>
                            </Box>
                            {partido.cancha && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationOn sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} color="action" />
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  {getNombreCancha(partido.cancha)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          
                          {/* Chips */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {partido.torneoNombre && (
                              <Chip 
                                label={partido.torneoNombre} 
                                size="small" 
                                variant="outlined" 
                                sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                              />
                            )}
                            {partido.categoria && (
                              <Chip 
                                label={asText(partido.categoria)} 
                                size="small" 
                                color="primary" 
                                sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                              />
                            )}
                            <Chip 
                              label={partido.estado === 'pausado' ? 'Pausado' : 'En Curso'} 
                              color="warning" 
                              size="small" 
                              sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                            />
                          </Box>
                        </Box>
                        
                        {/* Botón de acción */}
                        <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'flex-start' } }}>
                          <Button
                            variant="contained"
                            color="warning"
                            startIcon={<PlayArrow />}
                            onClick={() => navigate(`/arbitros/partido/${partido.id}`)}
                            fullWidth
                            sx={{ 
                              minWidth: { xs: '100%', sm: 'auto' },
                              fontSize: { xs: '0.8rem', sm: '0.875rem' }
                            }}
                          >
                            Continuar
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            </Grid>
          )}

          {/* Partidos Finalizados */}
          {partidosFinalizados.length > 0 && (
            <Grid item xs={12}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                <CheckCircle color="success" />
                Partidos Finalizados ({partidosFinalizados.length})
              </Typography>
              <List sx={{ p: 0 }}>
                {partidosFinalizados.map((partido) => (
                  <Card key={partido.id} sx={{ mb: 2 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          {/* Equipos con resultado */}
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' }, 
                            gap: { xs: 1.5, sm: 2 }, 
                            mb: 2 
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <LogoDisplay
                                src={construirUrlImagen(partido.equipoLocalLogo)}
                                alt={getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                                size="small"
                                shape="rounded"
                                fallbackText={getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                                sx={{ 
                                  width: { xs: 32, sm: 40 }, 
                                  height: { xs: 32, sm: 40 }, 
                                  borderRadius: '50%',
                                  flexShrink: 0
                                }}
                              />
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                                  lineHeight: 1.3
                                }}
                              >
                                {getNombreEquipo(partido.equipoLocal, 'Equipo Local')}
                              </Typography>
                            </Box>
                            
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                mx: { xs: 0, sm: 1 }, 
                                fontWeight: 700, 
                                color: 'primary.main',
                                fontSize: { xs: '1rem', sm: '1.25rem' },
                                alignSelf: { xs: 'flex-start', sm: 'center' }
                              }}
                            >
                              {partido.resultado?.puntosLocal || 0} - {partido.resultado?.puntosVisitante || 0}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <LogoDisplay
                                src={construirUrlImagen(partido.equipoVisitanteLogo)}
                                alt={getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                                size="small"
                                shape="rounded"
                                fallbackText={getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                                sx={{ 
                                  width: { xs: 32, sm: 40 }, 
                                  height: { xs: 32, sm: 40 }, 
                                  borderRadius: '50%',
                                  flexShrink: 0
                                }}
                              />
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                                  lineHeight: 1.3
                                }}
                              >
                                {getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {/* Fecha */}
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ mb: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                          >
                            {DateUtils.formatDateForDisplay(partido.fecha)} - {partido.horaInicio || 'No especificada'}
                          </Typography>
                          
                          {/* Chips */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {partido.torneoNombre && (
                              <Chip 
                                label={partido.torneoNombre} 
                                size="small" 
                                variant="outlined" 
                                sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                              />
                            )}
                            {partido.categoria && (
                              <Chip 
                                label={asText(partido.categoria)} 
                                size="small" 
                                color="primary" 
                                sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                              />
                            )}
                            <Chip 
                              label="Finalizado" 
                              color="success" 
                              size="small" 
                              sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                            />
                          </Box>
                        </Box>
                        
                        {/* Botón de acción */}
                        <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'flex-start' } }}>
                          <Button
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/arbitros/partido/${partido.id}`)}
                            fullWidth
                            sx={{ 
                              minWidth: { xs: '100%', sm: 'auto' },
                              fontSize: { xs: '0.8rem', sm: '0.875rem' }
                            }}
                          >
                            Ver Detalles
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default MisPartidos;
