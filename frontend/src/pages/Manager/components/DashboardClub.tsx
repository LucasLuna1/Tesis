import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  LinearProgress,
  Badge,
  Tooltip,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  Groups,
  Edit,
  PersonAdd,
  EmojiEvents,
  Info,
  Person,
  Phone,
  Email,
  LocationOn,
  Upload,
  TrendingUp,
  SportsRugby,
  Star,
  EmojiEventsOutlined,
  PeopleOutline,
  AssignmentTurnedIn,
  Notifications
} from '@mui/icons-material';
import AgregarJugadorModal from './AgregarJugadorModal';
import InformacionClubDialog from './InformacionClubDialog';
import TorneosClubDialog from './TorneosClubDialog';
import { getImageUrl } from '../../../services/api.js';
import api from '../../../services/api';

interface DashboardClubProps {
  club: any;
  onClubActualizado: () => void;
}

const DashboardClub: React.FC<DashboardClubProps> = ({ club, onClubActualizado }) => {
  const [openAgregarJugador, setOpenAgregarJugador] = useState(false);
  const [openInfoClub, setOpenInfoClub] = useState(false);
  const [openTorneos, setOpenTorneos] = useState(false);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [loadingJugadores, setLoadingJugadores] = useState(false);
  
  // Estados para datos dinámicos
  const [ultimoPartido, setUltimoPartido] = useState<any>(null);
  const [proximoPartido, setProximoPartido] = useState<any>(null);
  const [torneosActivos, setTorneosActivos] = useState<any[]>([]);
  const [tablaPosiciones, setTablaPosiciones] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [estadisticasCalculadas, setEstadisticasCalculadas] = useState({ ganados: 0, perdidos: 0, empatados: 0, total: 0 });

  // Calcular edad a partir de fecha de nacimiento
  const calcularEdad = React.useCallback((fechaNacimiento: any): number | null => {
    if (!fechaNacimiento) return null;
    
    try {
      let fecha;
      if (fechaNacimiento.seconds) {
        fecha = new Date(fechaNacimiento.seconds * 1000);
      } else if (fechaNacimiento._seconds) {
        fecha = new Date(fechaNacimiento._seconds * 1000);
      } else {
        fecha = new Date(fechaNacimiento);
      }
      
      const hoy = new Date();
      let edad = hoy.getFullYear() - fecha.getFullYear();
      const mes = hoy.getMonth() - fecha.getMonth();
      
      if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) {
        edad--;
      }
      
      return edad;
    } catch (error) {
      return null;
    }
  }, []);

  // Cargar jugadores del club
  React.useEffect(() => {
    if (club?.id) {
      cargarJugadores();
    }
  }, [club?.id]);

  const cargarJugadores = async () => {
    try {
      setLoadingJugadores(true);
      const response = await api.get(`/managers/club/${club.id}/jugadores`);
      setJugadores(response.data.jugadores || []);
    } catch (error) {
      console.error('Error cargando jugadores:', error);
    } finally {
      setLoadingJugadores(false);
    }
  };

  // Calcular estadísticas desde los partidos reales
  const calcularEstadisticas = React.useCallback((partidosArray: any[]) => {
    let ganados = 0;
    let perdidos = 0;
    let empatados = 0;
    
    partidosArray.forEach((partido: any) => {
      if (partido.estado === 'finalizado') {
        const esLocal = partido.equipoLocalId === club.id;
        const puntosEquipo = esLocal ? partido.resultado?.puntosLocal : partido.resultado?.puntosVisitante;
        const puntosRival = esLocal ? partido.resultado?.puntosVisitante : partido.resultado?.puntosLocal;
        
        if (puntosEquipo > puntosRival) {
          ganados++;
        } else if (puntosEquipo < puntosRival) {
          perdidos++;
        } else {
          empatados++;
        }
      }
    });
    
    return { ganados, perdidos, empatados, total: ganados + perdidos + empatados };
  }, [club?.id]);

  // Cargar datos del club (partidos, torneos, etc.)
  const cargarDatosClub = React.useCallback(async () => {
    if (!club?.id) return;
    
    try {
      setLoadingDatos(true);

      // Cargar en paralelo todos los datos
      const [
        ultimoPartidoRes,
        proximoPartidoRes,
        torneosActivosRes,
        partidosRes
      ] = await Promise.all([
        api.get(`/partidos/equipo/${club.id}/ultimo`).catch(() => ({ data: null })),
        api.get(`/partidos/equipo/${club.id}/proximo`).catch(() => ({ data: null })),
        api.get(`/torneos/equipo/${club.id}/activos`).catch(() => ({ data: [] })),
        api.get(`/partidos/equipo/${club.id}?limit=50`).catch(() => ({ data: [] }))
      ]);
      
      setUltimoPartido(ultimoPartidoRes.data);
      setProximoPartido(proximoPartidoRes.data);
      setTorneosActivos(torneosActivosRes.data || []);
      const partidosData = partidosRes.data || [];
      setPartidos(partidosData);
      
      // Calcular estadísticas reales
      const stats = calcularEstadisticas(partidosData);
      setEstadisticasCalculadas(stats);
      
      // Si hay torneos activos, cargar tabla de posiciones del primero
      if (torneosActivosRes.data && torneosActivosRes.data.length > 0) {
        const torneoActivo = torneosActivosRes.data[0];
        try {
          const tablaRes = await api.get(`/torneos/${torneoActivo.id}/tabla-posiciones`);
          setTablaPosiciones(tablaRes.data.tablaPosiciones || []);

        } catch (error) {
          console.error('Error cargando tabla de posiciones:', error);
        }
      } else {
        // Si no hay torneos activos, buscar el último torneo donde participó
        try {
          const todosLosTorneosRes = await api.get(`/torneos`);
          const todosLosTorneos = todosLosTorneosRes.data || [];
          
          // Buscar torneos donde el equipo participó
          const torneosDelEquipo = todosLosTorneos.filter((t: any) => 
            t.equipos && t.equipos.includes(club.id)
          );
          
          if (torneosDelEquipo.length > 0) {
            // Ordenar por fecha y tomar el más reciente
            torneosDelEquipo.sort((a: any, b: any) => {
              const fechaA = new Date(a.fechaInicio || a.fechaCreacion);
              const fechaB = new Date(b.fechaInicio || b.fechaCreacion);
              return fechaB.getTime() - fechaA.getTime();
            });
            
            const ultimoTorneo = torneosDelEquipo[0];
            const tablaRes = await api.get(`/torneos/${ultimoTorneo.id}/tabla-posiciones`);
            setTablaPosiciones(tablaRes.data.tablaPosiciones || []);

          }
        } catch (error) {
          console.error('Error buscando último torneo:', error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos del club:', error);
    } finally {
      setLoadingDatos(false);
    }
  }, [club?.id, calcularEstadisticas]);

  React.useEffect(() => {
    cargarDatosClub();
  }, [cargarDatosClub]);

  // Agrupar jugadores por categoría
  const jugadoresPorCategoria = jugadores.reduce((acc: any, jugador: any) => {
    const categoria = jugador.categoria || 'Sin categoría';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(jugador);
    return acc;
  }, {});

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero Header del Club con gradiente */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${alpha('#1976d2', 0.1)} 0%, ${alpha('#9c27b0', 0.05)} 100%)`,
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: `radial-gradient(circle, ${alpha('#1976d2', 0.1)} 0%, transparent 70%)`,
            borderRadius: '50%',
            transform: 'translate(30%, -30%)'
          }
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: 32,
                    height: 32
                  }}
                >
                  <Upload sx={{ fontSize: 18 }} />
                </IconButton>
              }
            >
              <Avatar
                src={club.logo ? getImageUrl(club.logo) : ''}
                sx={{ 
                  width: 120, 
                  height: 120,
                  border: '4px solid white',
                  boxShadow: 3
                }}
              >
                <Groups sx={{ fontSize: 60 }} />
              </Avatar>
            </Badge>
          </Grid>
          
          <Grid item xs>
            <Typography 
              variant="h3" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #1976d2 30%, #9c27b0 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {club.nombre}
            </Typography>
            {club.club && (
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                {club.club}
              </Typography>
            )}
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {club.ciudad && (
                <Chip 
                  icon={<LocationOn />} 
                  label={club.ciudad} 
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
              {club.categorias && club.categorias.length > 0 && club.categorias.map((cat: string) => (
                <Chip 
                  key={cat}
                  label={cat} 
                  color="secondary"
                  size="small"
                />
              ))}
              <Chip 
                icon={<Star />} 
                label={club.estado || 'Activo'} 
                color="success"
                size="small"
              />
            </Box>
            {club.descripcion && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {club.descripcion}
              </Typography>
            )}
          </Grid>

          <Grid item>
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setOpenInfoClub(true)}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
              >
                Editar Club
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssignmentTurnedIn />}
                onClick={() => window.location.href = '/manager/solicitudes'}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Solicitudes
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Estadísticas Rápidas - Diseño con Gradientes Claros */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#2196f3', 0.05)} 100%)`,
              border: `1px solid ${alpha('#2196f3', 0.2)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha('#2196f3', 0.15)}`
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    Total Jugadores
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="primary.main">
                    {jugadores.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#2196f3', 0.15), color: 'primary.main' }}>
                  <PeopleOutline />
                </Avatar>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="caption" color="success.main" fontWeight="medium">
                  Activos en el club
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#4caf50', 0.1)} 0%, ${alpha('#4caf50', 0.05)} 100%)`,
              border: `1px solid ${alpha('#4caf50', 0.2)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha('#4caf50', 0.15)}`
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    Partidos Ganados
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    {estadisticasCalculadas.ganados}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#4caf50', 0.15), color: 'success.main' }}>
                  <SportsRugby />
                </Avatar>
              </Box>
              <Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(estadisticasCalculadas.ganados / Math.max(estadisticasCalculadas.total, 1)) * 100}
                  sx={{ 
                    height: 6, 
                    borderRadius: 1,
                    bgcolor: alpha('#4caf50', 0.1),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'success.main'
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {((estadisticasCalculadas.ganados / Math.max(estadisticasCalculadas.total, 1)) * 100).toFixed(0)}% efectividad
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#f44336', 0.1)} 0%, ${alpha('#f44336', 0.05)} 100%)`,
              border: `1px solid ${alpha('#f44336', 0.2)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha('#f44336', 0.15)}`
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    Partidos Perdidos
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="error.main">
                    {estadisticasCalculadas.perdidos}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#f44336', 0.15), color: 'error.main' }}>
                  <SportsRugby />
                </Avatar>
              </Box>
              <Typography variant="caption" color="text.secondary">
                De {estadisticasCalculadas.total} partidos totales
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#ff9800', 0.1)} 0%, ${alpha('#ff9800', 0.05)} 100%)`,
              border: `1px solid ${alpha('#ff9800', 0.2)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha('#ff9800', 0.15)}`
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    Torneos Activos
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="warning.main">
                    {torneosActivos.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#ff9800', 0.15), color: 'warning.main' }}>
                  <EmojiEventsOutlined />
                </Avatar>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Competiciones en curso
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Layout de dos columnas: Jugadores (izq) y Sidebar (der) */}
      <Grid container spacing={3}>
        {/* Columna Izquierda: Roster de Jugadores */}
        <Grid item xs={12} md={8}>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#2196f3', 0.05)} 100%)`,
              border: `1px solid ${alpha('#2196f3', 0.2)}`,
              transition: 'all 0.3s ease'
            }}
          >
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    Roster de Jugadores
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {jugadores.length} {jugadores.length === 1 ? 'jugador' : 'jugadores'}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PersonAdd />}
                  onClick={() => setOpenAgregarJugador(true)}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Agregar
                </Button>
              </Box>

            {loadingJugadores ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : jugadores.length === 0 ? (
              <Box 
                textAlign="center" 
                py={8}
                sx={{
                  bgcolor: alpha('#1e1e1e', 0.5),
                  borderRadius: 2,
                  border: `2px dashed ${alpha('#4285F4', 0.3)}`
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mx: 'auto', 
                    mb: 3,
                    bgcolor: alpha('#4285F4', 0.2),
                    color: '#4285F4'
                  }}
                >
                  <Person sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: 'white' }}>
                  No hay jugadores en el club
                </Typography>
                <Typography variant="body2" mb={4} sx={{ maxWidth: 400, mx: 'auto', color: 'rgba(255,255,255,0.7)' }}>
                  Comienza a construir tu equipo agregando jugadores. Podrás gestionarlos, 
                  convocarlos a partidos y más.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PersonAdd />}
                  onClick={() => setOpenAgregarJugador(true)}
                  sx={{ 
                    borderRadius: 2, 
                    px: 4,
                    bgcolor: '#4285F4',
                    '&:hover': { bgcolor: '#3367D6' }
                  }}
                >
                  Agregar Primer Jugador
                </Button>
              </Box>
            ) : (
              <>
                {Object.entries(jugadoresPorCategoria).map(([categoria, jugadores]: [string, any]) => (
                  <Box key={categoria} mb={3}>
                    {/* Header de categoría compacto */}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary',
                        px: 1,
                        mb: 1.5,
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        display: 'block'
                      }}
                    >
                      {categoria}
                    </Typography>
                    
                    {/* Grid compacto de jugadores - Diseño con foto de fondo */}
                    <Grid container spacing={2}>
                      {jugadores.map((jugador: any, index: number) => (
                        <Grid item xs={12} sm={6} md={4} key={jugador.jugadorId || index}>
                          <Card
                            elevation={0}
                            sx={{
                              borderRadius: 3,
                              border: '1px solid',
                              borderColor: 'divider',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              position: 'relative',
                              height: '100%',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 4,
                                borderColor: 'primary.main'
                              }
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
                                backgroundImage: jugador.foto 
                                  ? `url(${getImageUrl(jugador.foto)})`
                                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'blur(20px)',
                                opacity: 0.3,
                                zIndex: 0
                              }}
                            />
                            
                            {/* Contenido */}
                            <Box
                              sx={{
                                position: 'relative',
                                zIndex: 1,
                                textAlign: 'center',
                                py: 2.5,
                                px: 2
                              }}
                            >
                              {/* Foto circular */}
                              <Avatar
                                src={jugador.foto ? getImageUrl(jugador.foto) : undefined}
                                sx={{ 
                                  width: 72, 
                                  height: 72,
                                  border: '3px solid white',
                                  boxShadow: 3,
                                  mx: 'auto',
                                  mb: 1.5
                                }}
                              >
                                <Person sx={{ fontSize: 36 }} />
                              </Avatar>
                              
                              {/* Información del jugador */}
                              <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                sx={{ mb: 0.5, fontSize: '0.9rem' }}
                              >
                                {jugador.nombre} {jugador.apellido}
                              </Typography>
                              
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ display: 'block', mb: 1, fontSize: '0.75rem' }}
                              >
                                {jugador.posicion || 'Sin posición'}
                              </Typography>
                              
                              {/* Chips de info adicional */}
                              <Box display="flex" gap={0.5} justifyContent="center" flexWrap="wrap">
                                {jugador.categoria && (
                                  <Chip 
                                    label={jugador.categoria} 
                                    size="small" 
                                    color="primary"
                                    sx={{ 
                                      height: 20, 
                                      fontSize: '0.65rem',
                                      fontWeight: 'bold'
                                    }}
                                  />
                                )}
                                {jugador.fechaNacimiento && (
                                  <Chip 
                                    label={`${calcularEdad(jugador.fechaNacimiento)} años`}
                                    size="small" 
                                    variant="outlined"
                                    sx={{ 
                                      height: 20, 
                                      fontSize: '0.65rem'
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))}
              </>
            )}
            </Box>
          </Card>
        </Grid>

        {/* Columna Derecha: Sidebar con Widgets */}
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" gap={3}>
            
            {/* Widget: Último Resultado */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#2196f3', 0.05)} 100%)`,
                border: `1px solid ${alpha('#2196f3', 0.2)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${alpha('#2196f3', 0.15)}`
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                  Último Resultado
                </Typography>
                
                {!ultimoPartido ? (
                  <Box textAlign="center" py={3}>
                    <SportsRugby sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Sin partidos jugados
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      {ultimoPartido.fecha && new Date(ultimoPartido.fecha).toLocaleDateString('es', { 
                        day: 'numeric',
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </Typography>
                    <Box 
                      display="flex" 
                      justifyContent="center" 
                      alignItems="center" 
                      gap={3}
                      my={2}
                    >
                      {/* Equipo Local */}
                      <Box textAlign="center" flex={1}>
                        <Avatar 
                          src={ultimoPartido.equipoLocalId === club.id 
                            ? (club.logo ? getImageUrl(club.logo) : undefined)
                            : (ultimoPartido.equipoLocalLogo ? getImageUrl(ultimoPartido.equipoLocalLogo) : undefined)
                          }
                          sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5 }}
                        >
                          {(ultimoPartido.equipoLocal || '').charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.7rem' }}>
                          {ultimoPartido.equipoLocalId === club.id 
                            ? club.nombre?.substring(0, 10)
                            : ultimoPartido.equipoLocal?.substring(0, 10)
                          }
                        </Typography>
                      </Box>
                      
                      {/* Marcador */}
                      <Box textAlign="center">
                        <Typography 
                          variant="h4" 
                          fontWeight="bold"
                          sx={{
                            color: ultimoPartido.resultado?.puntosLocal > ultimoPartido.resultado?.puntosVisitante
                              ? (ultimoPartido.equipoLocalId === club.id ? 'success.main' : 'error.main')
                              : ultimoPartido.resultado?.puntosLocal < ultimoPartido.resultado?.puntosVisitante
                              ? (ultimoPartido.equipoVisitanteId === club.id ? 'success.main' : 'error.main')
                              : 'text.secondary'
                          }}
                        >
                          {ultimoPartido.resultado?.puntosLocal || 0} - {ultimoPartido.resultado?.puntosVisitante || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ultimoPartido.resultado?.puntosLocal === ultimoPartido.resultado?.puntosVisitante 
                            ? 'Empate'
                            : (
                              (ultimoPartido.equipoLocalId === club.id && ultimoPartido.resultado?.puntosLocal > ultimoPartido.resultado?.puntosVisitante) ||
                              (ultimoPartido.equipoVisitanteId === club.id && ultimoPartido.resultado?.puntosVisitante > ultimoPartido.resultado?.puntosLocal)
                            ) ? 'Victoria' : 'Derrota'
                          }
                        </Typography>
                      </Box>
                      
                      {/* Equipo Visitante */}
                      <Box textAlign="center" flex={1}>
                        <Avatar 
                          src={ultimoPartido.equipoVisitanteId === club.id 
                            ? (club.logo ? getImageUrl(club.logo) : undefined)
                            : (ultimoPartido.equipoVisitanteLogo ? getImageUrl(ultimoPartido.equipoVisitanteLogo) : undefined)
                          }
                          sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5 }}
                        >
                          {(ultimoPartido.equipoVisitante || '').charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.7rem' }}>
                          {ultimoPartido.equipoVisitanteId === club.id 
                            ? club.nombre?.substring(0, 10)
                            : ultimoPartido.equipoVisitante?.substring(0, 10)
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Widget: Próximo Partido */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha('#4caf50', 0.1)} 0%, ${alpha('#4caf50', 0.05)} 100%)`,
                border: `1px solid ${alpha('#4caf50', 0.2)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${alpha('#4caf50', 0.15)}`
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                  Próximo Partido
                </Typography>
                
                {!proximoPartido ? (
                  <Box textAlign="center" py={3}>
                    <SportsRugby sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Sin partidos programados
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Typography variant="body2" fontWeight="bold" gutterBottom textAlign="center">
                      {proximoPartido.equipoLocalId === club.id ? club.nombre?.toUpperCase() : proximoPartido.equipoLocal?.toUpperCase()} 
                      {' VS '}
                      {proximoPartido.equipoVisitanteId === club.id ? club.nombre?.toUpperCase() : proximoPartido.equipoVisitante?.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'center' }}>
                      {proximoPartido.fecha && new Date(proximoPartido.fecha).toLocaleDateString('es', { 
                        day: 'numeric',
                        month: 'long', 
                        year: 'numeric' 
                      })}
                      {proximoPartido.horaInicio && ` - ${proximoPartido.horaInicio}`}
                    </Typography>
                    
                    <Box display="flex" gap={2} justifyContent="space-around" mt={2}>
                      <Box textAlign="center" flex={1}>
                        <Avatar 
                          src={proximoPartido.equipoLocalId === club.id 
                            ? (club.logo ? getImageUrl(club.logo) : undefined)
                            : (proximoPartido.equipoLocalLogo ? getImageUrl(proximoPartido.equipoLocalLogo) : undefined)
                          }
                          sx={{ width: 56, height: 56, mx: 'auto', mb: 1 }}
                        >
                          {(proximoPartido.equipoLocal || '').charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.7rem' }}>
                          {proximoPartido.equipoLocalId === club.id 
                            ? 'Local'
                            : proximoPartido.equipoLocal?.substring(0, 10)
                          }
                        </Typography>
                      </Box>
                      
                      <Box display="flex" alignItems="center" justifyContent="center">
                        <Typography variant="h6" color="text.secondary" fontWeight="bold">
                          VS
                        </Typography>
                      </Box>
                      
                      <Box textAlign="center" flex={1}>
                        <Avatar 
                          src={proximoPartido.equipoVisitanteId === club.id 
                            ? (club.logo ? getImageUrl(club.logo) : undefined)
                            : (proximoPartido.equipoVisitanteLogo ? getImageUrl(proximoPartido.equipoVisitanteLogo) : undefined)
                          }
                          sx={{ width: 56, height: 56, mx: 'auto', mb: 1 }}
                        >
                          {(proximoPartido.equipoVisitante || '').charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.7rem' }}>
                          {proximoPartido.equipoVisitanteId === club.id 
                            ? 'Visitante'
                            : proximoPartido.equipoVisitante?.substring(0, 10)
                          }
                        </Typography>
                      </Box>
                    </Box>
                    
                    {proximoPartido.cancha && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                        📍 {proximoPartido.cancha.nombre || 'Cancha por definir'}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Widget: Partidos Anteriores */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha('#ff9800', 0.1)} 0%, ${alpha('#ff9800', 0.05)} 100%)`,
                border: `1px solid ${alpha('#ff9800', 0.2)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${alpha('#ff9800', 0.15)}`
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                  Partidos Anteriores
                </Typography>
                
                {partidos.filter(p => p.estado === 'finalizado').length === 0 ? (
                  <Box textAlign="center" py={3}>
                    <SportsRugby sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Sin partidos finalizados
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ 
                    maxHeight: 280, 
                    overflow: 'auto',
                    '&::-webkit-scrollbar': {
                      display: 'none'
                    },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none'
                  }}>
                    {partidos.filter(p => p.estado === 'finalizado').slice(0, 5).map((partido: any) => {
                      const esLocal = partido.equipoLocalId === club.id;
                      const rival = esLocal ? partido.equipoVisitante : partido.equipoLocal;
                      const fechaPartido = new Date(partido.fecha);
                      const gano = (esLocal && partido.resultado?.puntosLocal > partido.resultado?.puntosVisitante) ||
                                   (!esLocal && partido.resultado?.puntosVisitante > partido.resultado?.puntosLocal);
                      
                      return (
                        <Box 
                          key={partido.id}
                          sx={{ 
                            py: 1.5,
                            px: 2,
                            mb: 1,
                            borderRadius: 2,
                            bgcolor: alpha('#ff9800', 0.05),
                            border: '1px solid',
                            borderColor: alpha('#ff9800', 0.1),
                            '&:hover': {
                              bgcolor: alpha('#ff9800', 0.1),
                              borderColor: 'warning.main'
                            },
                            transition: 'all 0.2s'
                          }}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {fechaPartido.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                              </Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                vs {rival?.substring(0, 12)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {esLocal ? 'Local' : 'Visitante'}
                              </Typography>
                            </Box>
                            <Chip 
                              label={`${partido.resultado?.puntosLocal || 0}-${partido.resultado?.puntosVisitante || 0}`}
                              size="small"
                              color={gano ? 'success' : 'default'}
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Widget: Tabla de Posiciones */}
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha('#f44336', 0.1)} 0%, ${alpha('#f44336', 0.05)} 100%)`,
                border: `1px solid ${alpha('#f44336', 0.2)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${alpha('#f44336', 0.15)}`
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                  Tabla de Posiciones
                </Typography>
                {torneosActivos.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    {torneosActivos[0].nombre}
                  </Typography>
                )}
                
                {tablaPosiciones.length === 0 ? (
                  <Box textAlign="center" py={3}>
                    <EmojiEvents sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Sin datos de torneo
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ 
                      overflowX: 'auto', 
                      maxHeight: 280, 
                      overflow: 'auto',
                      '&::-webkit-scrollbar': {
                        display: 'none'
                      },
                      msOverflowStyle: 'none',
                      scrollbarWidth: 'none'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                            <th style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>Pos</th>
                            <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>Equipo</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>PJ</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>G</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>P</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(0,0,0,0.6)' }}>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tablaPosiciones.map((team: any, index: number) => {
                            const esElClub = team.equipoId === club.id || team.equipo?.id === club.id;
                            return (
                              <tr 
                                key={team.equipoId || index}
                                style={{
                                  backgroundColor: esElClub ? alpha('#f44336', 0.15) : 'transparent',
                                  borderBottom: '1px solid rgba(0,0,0,0.05)'
                                }}
                              >
                                <td style={{ padding: '8px 4px', fontSize: '0.75rem', fontWeight: esElClub ? 'bold' : 'normal', textAlign: 'center' }}>
                                  {index + 1}
                                </td>
                                <td style={{ padding: '8px 8px', fontSize: '0.75rem', fontWeight: esElClub ? 'bold' : 'normal' }}>
                                  {team.equipo?.nombre || team.nombreEquipo || 'Equipo'}
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.75rem' }}>
                                  {team.partidosJugados || 0}
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.75rem', color: '#4caf50' }}>
                                  {team.partidosGanados || 0}
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.75rem', color: '#f44336' }}>
                                  {team.partidosPerdidos || 0}
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: esElClub ? 'bold' : 'normal', color: esElClub ? '#f44336' : 'inherit' }}>
                                  {team.puntos || 0}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </Box>
                    {torneosActivos.length > 0 && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button 
                          size="small" 
                          sx={{ 
                            textTransform: 'none', 
                            fontSize: '0.75rem',
                            color: 'error.main',
                            '&:hover': {
                              bgcolor: alpha('#f44336', 0.1)
                            }
                          }}
                          onClick={() => setOpenTorneos(true)}
                        >
                          Ver tabla completa
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

          </Box>
        </Grid>
      </Grid>


      {/* Modales */}
      <AgregarJugadorModal
        open={openAgregarJugador}
        onClose={() => {
          setOpenAgregarJugador(false);
          cargarJugadores();
        }}
        clubId={club.id}
        onJugadorAgregado={() => {
          onClubActualizado();
          cargarJugadores();
        }}
      />

      <InformacionClubDialog
        open={openInfoClub}
        onClose={() => setOpenInfoClub(false)}
        club={club}
        onClubActualizado={onClubActualizado}
      />

      <TorneosClubDialog
        open={openTorneos}
        onClose={() => setOpenTorneos(false)}
        club={club}
      />
    </Container>
  );
};

export default DashboardClub;



