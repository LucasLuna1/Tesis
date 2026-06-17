import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  alpha,
  LinearProgress,
  Badge as MuiBadge,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  SportsRugby,
  Person,
  Phone,
  LocationOn,
  Groups,
  TrendingUp,
  EmojiEventsOutlined,
  EmojiEvents,
  PeopleOutline,
  Star,
  Email,
  ExitToApp,
  Warning
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { getImageUrl } from '../../services/api.js';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Jugador {
  jugadorId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  foto: string;
  posicion: string;
  categoria: string;
  numero?: number;
}

interface Equipo {
  id: string;
  nombre: string;
  logo: string;
  ciudad: string;
  pais: string;
  descripcion: string;
  club?: string;
}

const MiEquipo: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openExitDialog, setOpenExitDialog] = useState(false);
  const [exitingClub, setExitingClub] = useState(false);
  
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

  const cargarMiEquipo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userProfile?.uid) {
        setError('No se encontró información del jugador');
        return;
      }

      // Obtener información del jugador para encontrar su equipo
      const jugadorResponse = await api.get(`/jugadores/perfil/${userProfile.uid}`);
      const jugador = jugadorResponse.data;
      
      if (!jugador.equipoId) {
        setError('No perteneces a ningún equipo actualmente');
        setEquipo(null);
        setJugadores([]);
        return;
      }

      // Cargar información del equipo
      const equipoResponse = await api.get(`/equipos/${jugador.equipoId}`);
      const equipoData = equipoResponse.data;
      
      // Verificar que el jugador esté en la lista de jugadores del equipo
      if (!equipoData.jugadores || !equipoData.jugadores.includes(userProfile.uid)) {
        setError('No perteneces a ningún equipo actualmente');
        setEquipo(null);
        setJugadores([]);
        return;
      }
      
      setEquipo(equipoData);
      
      // Cargar jugadores del equipo
      const jugadoresResponse = await api.get(`/equipos/${jugador.equipoId}/jugadores`);
      setJugadores(jugadoresResponse.data.jugadores || []);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al cargar información del equipo';
      
      // Si el error indica que no pertenece al equipo, limpiar el estado
      if (errorMessage.includes('no pertenece') || error.response?.status === 404) {
        setError('No perteneces a ningún equipo actualmente');
        setEquipo(null);
        setJugadores([]);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [userProfile?.uid]);

  useEffect(() => {
    cargarMiEquipo();
  }, [cargarMiEquipo]);

  // Calcular estadísticas desde los partidos reales
  const calcularEstadisticas = useCallback((partidosArray: any[]) => {
    let ganados = 0;
    let perdidos = 0;
    let empatados = 0;
    
    partidosArray.forEach((partido: any) => {
      if (partido.estado === 'finalizado') {
        const esLocal = partido.equipoLocalId === equipo?.id;
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
  }, [equipo?.id]);

  // Cargar datos del club (partidos, torneos, etc.)
  const cargarDatosEquipo = useCallback(async () => {
    if (!equipo?.id) return;
    
    try {
      setLoadingDatos(true);
      
      // Cargar en paralelo todos los datos
      const [
        ultimoPartidoRes,
        proximoPartidoRes,
        torneosActivosRes,
        partidosRes
      ] = await Promise.all([
        api.get(`/partidos/equipo/${equipo.id}/ultimo`).catch(() => ({ data: null })),
        api.get(`/partidos/equipo/${equipo.id}/proximo`).catch(() => ({ data: null })),
        api.get(`/torneos/equipo/${equipo.id}/activos`).catch(() => ({ data: [] })),
        api.get(`/partidos/equipo/${equipo.id}?limit=50`).catch(() => ({ data: [] }))
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
          // Error al cargar tabla de posiciones
        }
      } else {
        // Si no hay torneos activos, buscar el último torneo donde participó
        try {
          const todosLosTorneosRes = await api.get(`/torneos`);
          const todosLosTorneos = todosLosTorneosRes.data || [];
          
          // Buscar torneos donde el equipo participó
          const torneosDelEquipo = todosLosTorneos.filter((t: any) => 
            t.equipos && t.equipos.includes(equipo.id)
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
          // Error buscando último torneo
        }
      }
      
    } catch (error) {
      // Error cargando datos del equipo
    } finally {
      setLoadingDatos(false);
    }
  }, [equipo?.id, calcularEstadisticas]);

  useEffect(() => {
    if (equipo?.id) {
      cargarDatosEquipo();
    }
  }, [equipo?.id, cargarDatosEquipo]);

  const handleSalirDelClub = async () => {
    try {
      setExitingClub(true);
      
      if (!equipo?.id) {
        toast.error('No se pudo identificar el equipo');
        return;
      }

      // Llamar al endpoint para salir del club
      await api.delete(`/equipos/${equipo.id}/jugadores/${userProfile?.uid}`);
      
      toast.success('Has salido del club exitosamente');
      setOpenExitDialog(false);
      
      // Limpiar el estado inmediatamente
      setEquipo(null);
      setJugadores([]);
      setError('No perteneces a ningún equipo actualmente');
      setExitingClub(false);
      
      // Esperar un momento y luego recargar para asegurar que el backend esté actualizado
      setTimeout(async () => {
        await cargarMiEquipo();
      }, 500);
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Error al salir del club';
      
      // Si el error indica que ya no pertenece al equipo, es porque ya salió
      if (errorMsg.includes('no pertenece')) {
        toast.success('Has salido del club exitosamente');
        setOpenExitDialog(false);
        setEquipo(null);
        setJugadores([]);
        setError('No perteneces a ningún equipo actualmente');
        setExitingClub(false);
      } else {
        toast.error(errorMsg);
        setExitingClub(false);
      }
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando mi equipo...
        </Typography>
      </Container>
    );
  }

  if (error || !equipo) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#9c27b0', 0.05)} 100%)`,
            border: `2px dashed ${alpha('#2196f3', 0.3)}`
          }}
        >
          {/* Ícono grande */}
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              bgcolor: alpha('#2196f3', 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 3
            }}
          >
            <Groups sx={{ fontSize: 64, color: 'primary.main' }} />
          </Box>

          {/* Título principal */}
          <Typography 
            variant="h4" 
            fontWeight="bold" 
            gutterBottom
            sx={{
              background: 'linear-gradient(45deg, #1976d2 30%, #9c27b0 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            ¿Buscas Equipo?
          </Typography>

          {/* Descripción */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            Actualmente no perteneces a ningún equipo. Explora los equipos disponibles y solicita unirte al que más te guste.
          </Typography>

          {/* Botones de acción */}
          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              size="large"
              startIcon={<Groups />}
              onClick={() => navigate('/equipos')}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: 3,
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Buscar Equipos
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/dashboard')}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 'bold',
                '&:hover': {
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Volver al Dashboard
            </Button>
          </Box>

          {/* Información adicional */}
          <Box sx={{ mt: 4, p: 3, bgcolor: 'action.hover', borderRadius: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
              💡 ¿Qué puedes hacer?
            </Typography>
            <Grid container spacing={2} sx={{ textAlign: 'left' }}>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="start" gap={1}>
                  <SportsRugby sx={{ fontSize: 20, color: 'primary.main', mt: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    Explora equipos de tu categoría
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="start" gap={1}>
                  <EmojiEventsOutlined sx={{ fontSize: 20, color: 'primary.main', mt: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    Solicita unirte a tu favorito
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="start" gap={1}>
                  <PeopleOutline sx={{ fontSize: 20, color: 'primary.main', mt: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    Espera la aprobación del manager
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="start" gap={1}>
                  <Star sx={{ fontSize: 20, color: 'primary.main', mt: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    Comienza tu carrera deportiva
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    );
  }

  // Agrupar jugadores por categoría
  const jugadoresPorCategoria = jugadores.reduce((acc: any, jugador: Jugador) => {
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
        {/* Botón de Salir del Club */}
        <Tooltip title="Salir del club">
          <IconButton
            onClick={() => setOpenExitDialog(true)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: alpha('#f44336', 0.1),
              color: '#f44336',
              zIndex: 1,
              '&:hover': {
                bgcolor: alpha('#f44336', 0.2),
                transform: 'scale(1.1)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <ExitToApp />
          </IconButton>
        </Tooltip>

        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={equipo.logo ? getImageUrl(equipo.logo) : ''}
              sx={{ 
                width: 120, 
                height: 120,
                border: '4px solid white',
                boxShadow: 3
              }}
            >
              <Groups sx={{ fontSize: 60 }} />
            </Avatar>
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
              {equipo.nombre}
            </Typography>
            {equipo.club && (
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                {equipo.club}
              </Typography>
            )}
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {equipo.ciudad && (
                <Chip 
                  icon={<LocationOn />} 
                  label={equipo.ciudad} 
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
              <Chip 
                icon={<Star />} 
                label="Mi Club" 
                color="success"
                size="small"
              />
            </Box>
            {equipo.descripcion && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {equipo.descripcion}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Estadísticas Rápidas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Jugadores */}
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

        {/* Partidos Ganados */}
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
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#4caf50' }}>
                    {estadisticasCalculadas.ganados}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#4caf50', 0.15), color: '#4caf50' }}>
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
                      bgcolor: '#4caf50'
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

        {/* Partidos Perdidos */}
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
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#f44336' }}>
                    {estadisticasCalculadas.perdidos}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#f44336', 0.15), color: '#f44336' }}>
                  <SportsRugby />
                </Avatar>
              </Box>
              <Typography variant="caption" color="text.secondary">
                De {estadisticasCalculadas.total} partidos totales
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Torneos Activos */}
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
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#ff9800' }}>
                    {torneosActivos.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha('#ff9800', 0.15), color: '#ff9800' }}>
                  <EmojiEventsOutlined />
                </Avatar>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="caption" sx={{ color: '#ff9800' }} fontWeight="medium">
                  Competiciones en curso
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Layout de dos columnas */}
      <Grid container spacing={3}>
        {/* Columna Izquierda - Roster */}
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
              <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                Roster de Jugadores
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                {jugadores.length} {jugadores.length === 1 ? 'jugador' : 'jugadores'}
              </Typography>

          {jugadores.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mx: 'auto', 
                  mb: 3,
                  bgcolor: alpha('#2196f3', 0.1),
                  color: 'primary.main'
                }}
              >
                <Person sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                No hay jugadores en el equipo
              </Typography>
            </Box>
          ) : (
            <>
              {Object.entries(jugadoresPorCategoria).map(([categoria, jugadoresCategoria]: [string, any]) => (
                <Box key={categoria} mb={3}>
                  {/* Header de categoría */}
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
                  
                  {/* Grid de jugadores con foto de fondo */}
                  <Grid container spacing={2}>
                    {jugadoresCategoria.map((jugador: Jugador, index: number) => (
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

        {/* Columna Derecha - Widgets */}
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Último Resultado */}
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
                          src={ultimoPartido.equipoLocalId === equipo?.id 
                            ? (equipo.logo ? getImageUrl(equipo.logo) : undefined)
                            : (ultimoPartido.equipoLocalLogo ? getImageUrl(ultimoPartido.equipoLocalLogo) : undefined)
                          }
                          sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5 }}
                        >
                          {(ultimoPartido.equipoLocal || '').charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.7rem' }}>
                          {ultimoPartido.equipoLocalId === equipo?.id 
                            ? equipo.nombre?.substring(0, 10)
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
                              ? (ultimoPartido.equipoLocalId === equipo?.id ? 'success.main' : 'error.main')
                              : ultimoPartido.resultado?.puntosLocal < ultimoPartido.resultado?.puntosVisitante
                              ? (ultimoPartido.equipoVisitanteId === equipo?.id ? 'success.main' : 'error.main')
                              : 'text.secondary'
                          }}
                        >
                          {ultimoPartido.resultado?.puntosLocal || 0} - {ultimoPartido.resultado?.puntosVisitante || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ultimoPartido.resultado?.puntosLocal === ultimoPartido.resultado?.puntosVisitante 
                            ? 'Empate'
                            : (
                              (ultimoPartido.equipoLocalId === equipo?.id && ultimoPartido.resultado?.puntosLocal > ultimoPartido.resultado?.puntosVisitante) ||
                              (ultimoPartido.equipoVisitanteId === equipo?.id && ultimoPartido.resultado?.puntosVisitante > ultimoPartido.resultado?.puntosLocal)
                            ) ? 'Victoria' : 'Derrota'
                          }
                        </Typography>
                      </Box>
                      
                      {/* Equipo Visitante */}
                      <Box textAlign="center" flex={1}>
                        <Avatar 
                          src={ultimoPartido.equipoVisitanteId === equipo?.id 
                            ? (equipo.logo ? getImageUrl(equipo.logo) : undefined)
                            : (ultimoPartido.equipoVisitanteLogo ? getImageUrl(ultimoPartido.equipoVisitanteLogo) : undefined)
                          }
                          sx={{ width: 48, height: 48, mx: 'auto', mb: 0.5 }}
                        >
                          {(ultimoPartido.equipoVisitante || '').charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.7rem' }}>
                          {ultimoPartido.equipoVisitanteId === equipo?.id 
                            ? equipo.nombre?.substring(0, 10)
                            : ultimoPartido.equipoVisitante?.substring(0, 10)
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Próximo Partido */}
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
                      {proximoPartido.equipoLocalId === equipo?.id ? equipo.nombre?.toUpperCase() : proximoPartido.equipoLocal?.toUpperCase()} 
                      {' VS '}
                      {proximoPartido.equipoVisitanteId === equipo?.id ? equipo.nombre?.toUpperCase() : proximoPartido.equipoVisitante?.toUpperCase()}
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
                          src={proximoPartido.equipoLocalId === equipo?.id 
                            ? (equipo.logo ? getImageUrl(equipo.logo) : undefined)
                            : (proximoPartido.equipoLocalLogo ? getImageUrl(proximoPartido.equipoLocalLogo) : undefined)
                          }
                          sx={{ width: 56, height: 56, mx: 'auto', mb: 1 }}
                        >
                          {(proximoPartido.equipoLocal || '').charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.7rem' }}>
                          {proximoPartido.equipoLocalId === equipo?.id 
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
                          src={proximoPartido.equipoVisitanteId === equipo?.id 
                            ? (equipo.logo ? getImageUrl(equipo.logo) : undefined)
                            : (proximoPartido.equipoVisitanteLogo ? getImageUrl(proximoPartido.equipoVisitanteLogo) : undefined)
                          }
                          sx={{ width: 56, height: 56, mx: 'auto', mb: 1 }}
                        >
                          {(proximoPartido.equipoVisitante || '').charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.7rem' }}>
                          {proximoPartido.equipoVisitanteId === equipo?.id 
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

            {/* Partidos Anteriores */}
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
                      const esLocal = partido.equipoLocalId === equipo?.id;
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

            {/* Tabla de Posiciones */}
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
                    <EmojiEventsOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Sin datos de torneo
                    </Typography>
                  </Box>
                ) : (
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
                          const esElClub = team.equipoId === equipo?.id || team.equipo?.id === equipo?.id;
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
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Modal de Confirmación para Salir del Club */}
      <Dialog 
        open={openExitDialog} 
        onClose={() => !exitingClub && setOpenExitDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Warning sx={{ color: 'warning.main', fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold">
              ¿Salir del Club?
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer fácilmente
          </Alert>
          
          <Typography variant="body1" gutterBottom>
            ¿Estás seguro que deseas salir de <strong>{equipo?.nombre}</strong>?
          </Typography>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • Perderás acceso a la información del club
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Deberás solicitar unirte nuevamente si cambias de opinión
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Tus estadísticas con el club se mantendrán
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setOpenExitDialog(false)}
            disabled={exitingClub}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalirDelClub}
            disabled={exitingClub}
            variant="contained"
            color="error"
            startIcon={exitingClub ? <CircularProgress size={20} color="inherit" /> : <ExitToApp />}
          >
            {exitingClub ? 'Saliendo...' : 'Salir del Club'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MiEquipo;
