import { asText } from '../../utils/text';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  SportsRugby,
  Schedule,
  People,
  Edit,
  EmojiEvents
} from '@mui/icons-material';
import api, { torneosService } from '../../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCache } from '../../contexts/CacheContext';
import { useTheme } from '@mui/material/styles';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { construirUrlImagen } from '../../utils/imageUtils';
import EditarPartidoDialog from '../../components/Partidos/EditarPartidoDialog';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { DateUtils } from '../../utils/dateUtils';

const FixtureTorneo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile: contextUserProfile } = useAuth();
  const cache = useCache();
  const { darkMode } = useCustomTheme();
  // const theme = useTheme(); // No se usa actualmente
  const [torneo, setTorneo] = useState(null);
  const [fixture, setFixture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 🚀 OPTIMIZACIÓN: Navegación por jornadas - Solo mostrar una a la vez
  const [jornadaActual, setJornadaActual] = useState(1); // Número de jornada actual (comienza en 1)
  const [totalJornadas, setTotalJornadas] = useState(0); // Total de jornadas del torneo
  
  // Estados para edición de partidos
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [partidoToEdit, setPartidoToEdit] = useState(null);
  const [canchas, setCanchas] = useState([]);
  const [arbitros, setArbitros] = useState([]);
  
  // Estados para nombres de canchas y árbitros
  const [canchasMap, setCanchasMap] = useState({});
  const [arbitrosMap, setArbitrosMap] = useState({});
  
  // Estados para modal de información del partido
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [partidoInfo, setPartidoInfo] = useState(null);

  const loadTorneo = useCallback(async () => {
    try {
      setLoading(true);



      // 🚀 OPTIMIZACIÓN: Verificar caché primero
      const cacheKeyTorneo = `torneo_${id}`;
      const cacheKeyFixture = `fixture_${id}`;
      
      const cachedTorneo = cache.get(cacheKeyTorneo);
      const cachedFixture = cache.get(cacheKeyFixture);
      
      if (cachedTorneo && cachedFixture) {
        setTorneo(cachedTorneo);
        setFixture(cachedFixture);
        setTotalJornadas(cachedFixture.length);
        setLoading(false);
        
        // Cargar canchas y árbitros en segundo plano (no bloquean la UI)
        Promise.all([
          api.get('/canchas').catch(() => ({ data: [] })),
          api.get('/arbitros').catch(() => ({ data: [] }))
        ]).then(([canchasRes, arbitrosRes]) => {
          const canchasData = canchasRes.data || [];
          const arbitrosData = arbitrosRes.data || [];
          
          setCanchas(canchasData);
          setArbitros(arbitrosData);
          
          // Crear mapas de IDs a nombres para acceso rápido
          const canchasMapTemp = {};
          canchasData.forEach(cancha => {
            canchasMapTemp[cancha.id] = cancha.nombre;
          });
          setCanchasMap(canchasMapTemp);
          
          const arbitrosMapTemp = {};
          arbitrosData.forEach(arbitro => {
            arbitrosMapTemp[arbitro.id] = `${arbitro.nombre} ${arbitro.apellido}`;
          });
          setArbitrosMap(arbitrosMapTemp);



        });
        return;
      }
      
      // Cargar torneo, fixture, canchas y árbitros
      const [torneoRes, fixtureRes, canchasRes, arbitrosRes] = await Promise.all([
        torneosService.getById(id),
        torneosService.getFixture(id),
        api.get('/canchas').catch(() => ({ data: [] })),
        api.get('/arbitros').catch(() => ({ data: [] }))
      ]);




      setTorneo(torneoRes.data);
      
      const canchasData = canchasRes.data || [];
      const arbitrosData = arbitrosRes.data || [];
      
      setCanchas(canchasData);
      setArbitros(arbitrosData);
      
      // Crear mapas de IDs a nombres para acceso rápido
      const canchasMapTemp = {};
      canchasData.forEach(cancha => {
        canchasMapTemp[cancha.id] = cancha.nombre;
      });
      setCanchasMap(canchasMapTemp);
      
      const arbitrosMapTemp = {};
      arbitrosData.forEach(arbitro => {
        arbitrosMapTemp[arbitro.id] = `${arbitro.nombre} ${arbitro.apellido}`;
      });
      setArbitrosMap(arbitrosMapTemp);



      // 🚀 OPTIMIZACIÓN: Guardar en caché (60 segundos)
      cache.set(cacheKeyTorneo, torneoRes.data, 60000);
      
      // Procesar fixture
      const fixtureData = fixtureRes.data;



      if (fixtureData && fixtureData.fixture && Array.isArray(fixtureData.fixture)) {
        setFixture(fixtureData.fixture);
        setTotalJornadas(fixtureData.fixture.length);
        // 🚀 OPTIMIZACIÓN: Guardar fixture en caché (120 segundos - cambia menos frecuentemente)
        cache.set(cacheKeyFixture, fixtureData.fixture, 120000);
      } else {
        setFixture([]);
        setTotalJornadas(0);
      }
      
    } catch (error) {
      
      // 🚀 OPTIMIZACIÓN: Manejo de errores de quota
      if (error.response?.status === 429 || error.response?.data?.type === 'QUOTA_EXCEEDED') {
        setError('Se ha alcanzado el límite de consultas. Por favor, espera unos minutos e intenta de nuevo.');
        toast.error('Límite de consultas alcanzado. Intenta más tarde.', { duration: 5000 });
      } else {
        setError('Error al cargar el torneo');
        toast.error('Error al cargar el torneo');
      }
    } finally {
      setLoading(false);
    }
  }, [id, cache]);

  useEffect(() => {
    loadTorneo();
  }, [id, loadTorneo]);


  // Funciones para edición de partidos
  const handleEditPartido = (partido) => {
    setPartidoToEdit(partido);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setPartidoToEdit(null);
  };
  
  // Funciones para información del partido
  const handlePartidoClick = (partido) => {
    const partidoId = partido._id || partido.id;
    if (partidoId) {
      navigate(`/partidos/${partidoId}`);
    }
  };

  const handleCloseInfoDialog = () => {
    setOpenInfoDialog(false);
    setPartidoInfo(null);
  };

  const handlePartidoUpdated = () => {
    // 🚀 OPTIMIZACIÓN: Invalidar caché antes de recargar
    cache.invalidate(`torneo_${id}`);
    cache.invalidate(`fixture_${id}`);
    // Recargar los datos del torneo
    loadTorneo();
  };
  
  // 🚀 OPTIMIZACIÓN: Funciones de navegación entre jornadas
  const handleJornadaAnterior = () => {
    if (jornadaActual > 1) {
      setJornadaActual(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleJornadaSiguiente = () => {
    if (jornadaActual < totalJornadas) {
      setJornadaActual(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Verificar si el usuario es organizador usando el contexto
  const isOrganizador = contextUserProfile?.tipoUsuario === 'organizador';

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'En Curso':
        return 'success';
      case 'planificado':
        return 'info';
      case 'finalizado':
        return 'success';
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'En Curso':
        return 'En Curso';
      case 'planificado':
        return 'Planificado';
      case 'finalizado':
        return 'Finalizado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* 🚀 OPTIMIZACIÓN: Skeleton loader en lugar de spinner genérico */}
        <SkeletonLoader variant="fixture" count={2} />
      </Container>
    );
  }

  if (error || !torneo) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          {error || 'Torneo no encontrado'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header del Torneo */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1">
              {torneo.nombre}
            </Typography>
            <Button
              variant="text"
              size="small"
              sx={{ mt: 1, textTransform: 'none' }}
              onClick={() => navigate(`/torneos/${id}/info`)}
            >
              Ver información completa del torneo
            </Button>
          </Box>
          <Chip
            label={getEstadoText(torneo.estado)}
            color={getEstadoColor(torneo.estado)}
            size="large"
          />
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SportsRugby sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                      <strong>Categoría:</strong> {asText(torneo.categoria)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Schedule sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                <strong>Fecha:</strong> {new Date(torneo.fechaInicio).toLocaleDateString()} - {new Date(torneo.fechaFin).toLocaleDateString()}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <People sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                <strong>Organizador:</strong> {torneo.organizadorNombre || 'Sistema'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Fixture */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
          Fixture
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => navigate(`/torneos/${id}/fases`)}
          startIcon={<EmojiEvents />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
              backgroundColor: 'primary.main',
              color: 'white'
            }
          }}
        >
          Ver Fases
        </Button>
      </Box>
      
      {(!fixture || !Array.isArray(fixture) || fixture.length === 0) ? (
        <Alert severity="info">
          No hay partidos programados en este torneo.
        </Alert>
      ) : (
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          {/* 🚀 OPTIMIZACIÓN: Mostrar solo la jornada actual */}
          {fixture.length > 0 && fixture[jornadaActual - 1] && (
            <Box key={fixture[jornadaActual - 1].jornada} sx={{ mb: 6, px: { xs: 1, sm: 2 } }}>
              <Typography variant="h6" gutterBottom sx={{ 
                color: 'primary.main', 
                borderBottom: '2px solid', 
                borderColor: 'primary.main',
                pb: 1,
                mb: 3
              }}>
                Jornada {fixture[jornadaActual - 1].jornada}
              </Typography>
              
              <Grid container spacing={3} justifyContent="center">
                {fixture[jornadaActual - 1].partidos.map((partido) => (
                  <Grid item xs={12} md={6} key={partido.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        borderRadius: 2,
                        border: '2px solid transparent',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => handlePartidoClick(partido)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Chip
                            label={partido.estado}
                            size="small"
                            color={partido.estado === 'finalizado' ? 'success' : partido.estado === 'En Curso' ? 'warning' : 'default'}
                            sx={{ fontSize: '0.75rem' }}
                          />
                          {isOrganizador && (
                            <Tooltip title="Editar partido">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPartido(partido);
                                }}
                                color="primary"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                        
                        {/* Equipos en formato compacto */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            {(partido.equipoLocalLogo || (typeof partido.equipoLocal === 'object' && partido.equipoLocal?.logo)) ? (
                              <img 
                                src={construirUrlImagen(partido.equipoLocalLogo || partido.equipoLocal?.logo)} 
                                alt={typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre : partido.equipoLocal} 
                                style={{ 
                                  width: 87, 
                                  height: 87, 
                                  objectFit: 'contain',
                                  borderRadius: '8px',
                                  backgroundColor: '#f5f5f5',
                                  marginBottom: '8px'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Box sx={{ 
                                width: 87, 
                                height: 87, 
                                backgroundColor: '#f5f5f5', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                color: '#666',
                                fontWeight: 'bold',
                                marginBottom: '8px'
                              }}>
                                {(typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre?.charAt(0) : partido.equipoLocal?.charAt(0)) || 'L'}
                              </Box>
                            )}
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 'bold', 
                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: { xs: '120px', sm: '150px' },
                                minWidth: 0
                              }}
                              title={typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Equipo Local' : partido.equipoLocal || 'Equipo Local'}
                            >
                              {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Equipo Local' : partido.equipoLocal || 'Equipo Local'}
                            </Typography>
                          </Box>
                          
                          <Typography variant="h5" sx={{ mx: 3, fontWeight: 'bold', color: 'primary.main', fontSize: '1.3rem' }}>
                            {partido.estado === 'finalizado' ? 
                              `${partido.resultado?.puntosLocal || 0} - ${partido.resultado?.puntosVisitante || 0}` : 
                              'VS'}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            {(partido.equipoVisitanteLogo || (typeof partido.equipoVisitante === 'object' && partido.equipoVisitante?.logo)) ? (
                              <img 
                                src={construirUrlImagen(partido.equipoVisitanteLogo || partido.equipoVisitante?.logo)} 
                                alt={typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre : partido.equipoVisitante} 
                                style={{ 
                                  width: 87, 
                                  height: 87, 
                                  objectFit: 'contain',
                                  borderRadius: '8px',
                                  backgroundColor: '#f5f5f5',
                                  marginBottom: '8px'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Box sx={{ 
                                width: 87, 
                                height: 87, 
                                backgroundColor: '#f5f5f5', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                color: '#666',
                                fontWeight: 'bold',
                                marginBottom: '8px'
                              }}>
                                {(typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre?.charAt(0) : partido.equipoVisitante?.charAt(0)) || 'V'}
                              </Box>
                            )}
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 'bold', 
                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: { xs: '120px', sm: '150px' },
                                minWidth: 0
                              }}
                              title={typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Equipo Visitante' : partido.equipoVisitante || 'Equipo Visitante'}
                            >
                              {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Equipo Visitante' : partido.equipoVisitante || 'Equipo Visitante'}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Información del partido modernizada */}
                        <Stack spacing={1} sx={{ 
                          mt: 2, 
                          p: 2, 
                          bgcolor: darkMode ? '666' : 'grey.50', 
                          borderRadius: 2 
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 24, 
                              height: 24, 
                              borderRadius: '50%', 
                              bgcolor: 'primary.main', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '12px'
                            }}>
                              📅
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                              {DateUtils.formatDateForDisplay(partido.fecha)} - {partido.hora || 'Hora no definida'}
                            </Typography>
                          </Box>
                          
                          {partido.canchaId && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: '50%', 
                                bgcolor: 'secondary.main', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '12px'
                              }}>
                                📍
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                {canchasMap[partido.canchaId] || partido.canchaId}
                              </Typography>
                            </Box>
                          )}
                          
                          {partido.arbitroId && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: '50%', 
                                bgcolor: 'warning.main', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '12px'
                              }}>
                                👨‍⚖️
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                {arbitrosMap[partido.arbitroId] || partido.arbitroId}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        
                        {partido.estado === 'En Curso' && (
                          <Button
                            size="small"
                            variant="contained"
                            sx={{ mt: 1, width: '100%' }}
                            onClick={() => navigate(`/partidos/${partido.id}/live`)}
                          >
                            Ver En Vivo
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      )}
      
      {/* Dialog para editar partido */}
      <EditarPartidoDialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        partido={partidoToEdit}
        canchas={canchas}
        arbitros={arbitros}
        onPartidoUpdated={handlePartidoUpdated}
      />
      
      {/* Dialog para información del partido */}
      <Dialog 
        open={openInfoDialog} 
        onClose={handleCloseInfoDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Información del Partido
            </Typography>
            {isOrganizador && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Edit />}
                onClick={() => {
                  setOpenInfoDialog(false);
                  // Usar setTimeout para asegurar que el modal se cierre antes de abrir el de edición
                  setTimeout(() => {
                    handleEditPartido(partidoInfo);
                  }, 100);
                }}
              >
                Editar
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {partidoInfo && (
            <Box sx={{ pt: 2 }}>
              {/* Estado del partido */}
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={partidoInfo.estado}
                  color={partidoInfo.estado === 'finalizado' ? 'success' : 
                         partidoInfo.estado === 'En Curso' ? 'warning' : 
                         partidoInfo.estado === 'programado' ? 'info' : 'default'}
                  size="large"
                />
              </Box>
              
              {/* Información de los equipos */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={5}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Equipo Local
                    </Typography>
                    {(partidoInfo.equipoLocalLogo || (typeof partidoInfo.equipoLocal === 'object' && partidoInfo.equipoLocal?.logo)) ? (
                      <img 
                        src={construirUrlImagen(partidoInfo.equipoLocalLogo || partidoInfo.equipoLocal?.logo)} 
                        alt={typeof partidoInfo.equipoLocal === 'object' ? partidoInfo.equipoLocal?.nombre : partidoInfo.equipoLocal} 
                        style={{ 
                          width: 80, 
                          height: 80, 
                          objectFit: 'contain',
                          borderRadius: '8px',
                          backgroundColor: '#f5f5f5',
                          marginBottom: '8px'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {typeof partidoInfo.equipoLocal === 'object' ? partidoInfo.equipoLocal?.nombre || 'Equipo Local' : partidoInfo.equipoLocal || 'Equipo Local'}
                    </Typography>
                    {partidoInfo.estado === 'finalizado' && (
                      <Typography variant="h3" color="primary" sx={{ mt: 1 }}>
                        {partidoInfo.resultado?.puntosLocal || 0}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%' 
                  }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {partidoInfo.estado === 'finalizado' ? 
                        'vs' : 
                        'VS'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={5}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Equipo Visitante
                    </Typography>
                    {(partidoInfo.equipoVisitanteLogo || (typeof partidoInfo.equipoVisitante === 'object' && partidoInfo.equipoVisitante?.logo)) ? (
                      <img 
                        src={construirUrlImagen(partidoInfo.equipoVisitanteLogo || partidoInfo.equipoVisitante?.logo)} 
                        alt={typeof partidoInfo.equipoVisitante === 'object' ? partidoInfo.equipoVisitante?.nombre : partidoInfo.equipoVisitante} 
                        style={{ 
                          width: 80, 
                          height: 80, 
                          objectFit: 'contain',
                          borderRadius: '8px',
                          backgroundColor: '#f5f5f5',
                          marginBottom: '8px'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {typeof partidoInfo.equipoVisitante === 'object' ? partidoInfo.equipoVisitante?.nombre || 'Equipo Visitante' : partidoInfo.equipoVisitante || 'Equipo Visitante'}
                    </Typography>
                    {partidoInfo.estado === 'finalizado' && (
                      <Typography variant="h3" color="primary" sx={{ mt: 1 }}>
                        {partidoInfo.resultado?.puntosVisitante || 0}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
              
              {/* Detalles del partido */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: darkMode ? 'grey.800' : '#f5f5f5', 
                    borderRadius: 1,
                    border: darkMode ? '1px solid' : 'none',
                    borderColor: darkMode ? 'grey.700' : 'transparent'
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      📅 Fecha y Hora
                    </Typography>
                    <Typography variant="body1" color={darkMode ? 'text.primary' : 'text.primary'}>
                      {DateUtils.formatFullDateForDisplay(partidoInfo.fecha)}
                    </Typography>
                    <Typography variant="body1" color={darkMode ? 'text.primary' : 'text.primary'}>
                      {partidoInfo.hora || 'No especificada'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: darkMode ? 'grey.800' : '#f5f5f5', 
                    borderRadius: 1,
                    border: darkMode ? '1px solid' : 'none',
                    borderColor: darkMode ? 'grey.700' : 'transparent'
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      📍 Cancha
                    </Typography>
                    <Typography variant="body1" color={darkMode ? 'text.primary' : 'text.primary'}>
                      {partidoInfo.canchaId ? (canchasMap[partidoInfo.canchaId] || partidoInfo.canchaId) : 'Por asignar'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: darkMode ? 'grey.800' : '#f5f5f5', 
                    borderRadius: 1,
                    border: darkMode ? '1px solid' : 'none',
                    borderColor: darkMode ? 'grey.700' : 'transparent'
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      👨‍⚖️ Árbitro
                    </Typography>
                    <Typography variant="body1" color={darkMode ? 'text.primary' : 'text.primary'}>
                      {partidoInfo.arbitroId ? (arbitrosMap[partidoInfo.arbitroId] || partidoInfo.arbitroId) : 'Por asignar'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: darkMode ? 'grey.800' : '#f5f5f5', 
                    borderRadius: 1,
                    border: darkMode ? '1px solid' : 'none',
                    borderColor: darkMode ? 'grey.700' : 'transparent'
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      📊 Jornada
                    </Typography>
                    <Typography variant="body1" color={darkMode ? 'text.primary' : 'text.primary'}>
                      Jornada {partidoInfo.jornada || 1}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {/* Estadísticas del partido si está finalizado */}
              {partidoInfo.estado === 'finalizado' && partidoInfo.estadisticas && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Estadísticas del Partido
                  </Typography>
                  <Grid container spacing={2}>
                  </Grid>
                </Box>
              )}
              
              {/* Botón para ver en vivo si está en curso */}
              {partidoInfo.estado === 'En Curso' && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => {
                      setOpenInfoDialog(false);
                      navigate(`/partidos/${partidoInfo.id}/live`);
                    }}
                  >
                    Ver En Vivo
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInfoDialog}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Indicador de jornada actual */}
      {totalJornadas > 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 3, 
          mb: 2
        }}>
          <Chip 
            label={`Jornada ${jornadaActual} de ${totalJornadas}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      )}

      {/* Botones de navegación */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 2, 
        mt: 2, 
        mb: 2,
        px: 2
      }}>
        <Button
          variant="outlined"
          size="large"
          sx={{
            minWidth: 120,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 'bold',
            borderRadius: 2,
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
              transform: 'translateY(-2px)',
              boxShadow: 3
            }
          }}
          onClick={handleJornadaAnterior}
          disabled={jornadaActual <= 1}
        >
          ← Anteriores
        </Button>
        
        <Button
          variant="contained"
          size="large"
          sx={{
            minWidth: 120,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 'bold',
            borderRadius: 2,
            boxShadow: 2,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4
            }
          }}
          onClick={handleJornadaSiguiente}
          disabled={jornadaActual >= totalJornadas}
        >
          Siguientes →
        </Button>
      </Box>
    </Container>
  );
};

export default FixtureTorneo;
