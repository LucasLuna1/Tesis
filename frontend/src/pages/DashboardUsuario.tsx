import React, { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Avatar,
  alpha,
  CardMedia,
  CardActions,
  Paper
} from '@mui/material';
import {
  EmojiEvents,
  CalendarToday,
  TrendingUp,
  People,
  Article,
  Visibility,
  Star,
  LocationOn,
  SportsRugby,
  ArrowForward,
  ReadMore
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { construirUrlImagen } from '../utils/imageUtils';
import toast from 'react-hot-toast';
import { useTheme as useMuiTheme } from '@mui/material/styles';

interface Partido {
  id: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  equipoLocal: any;
  equipoVisitante: any;
  equipoLocalLogo?: string;
  equipoVisitanteLogo?: string;
  fecha: string;
  hora?: string;
  estado?: string;
  torneoNombre?: string;
  tipo?: string;
  cancha?: any;
  resultado?: {
    puntosLocal: number;
    puntosVisitante: number;
  };
  tiempoTranscurrido?: number;
  tiempoInicioTimestamp?: number;
}

interface Torneo {
  id: string;
  nombre: string;
  categoria: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  organizadorNombre?: string;
  equipos?: any[];
}

interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string;
  fechaPublicacion?: string;
  imagen?: string;
  imagenes?: string[];
  autor?: {
    id: string;
    nombre: string;
  } | string;
  destacada?: boolean;
  categoria?: string;
  etiquetas?: string[];
  estado?: string;
  vistas?: number;
  likes?: number;
}

interface Equipo {
  id: string;
  nombre: string;
  logo?: string;
  categoria?: string;
  jugadoresCount?: number;
}

const DashboardUsuario: React.FC = () => {
  const authContext = useAuth();
  const userProfile = authContext?.userProfile;
  const navigate = useNavigate();
  const theme = useMuiTheme();
  const [loading, setLoading] = useState(true);
  const [proximosPartidos, setProximosPartidos] = useState<Partido[]>([]);
  const [torneosDisponibles, setTorneosDisponibles] = useState<Torneo[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [equiposDestacados, setEquiposDestacados] = useState<Equipo[]>([]);
  const [tiemposTranscurridos, setTiemposTranscurridos] = useState<Record<string, number>>({});
  const [tiemposInicio, setTiemposInicio] = useState<Record<string, number>>({});
  const [cronometrosActivos, setCronometrosActivos] = useState<Record<string, boolean>>({});
  const [estadisticas, setEstadisticas] = useState<any>(null);

  // Función para formatear tiempo
  const formatearTiempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Función para formatear estado profesionalmente
  const formatearEstado = (estado: string) => {
    const estados: Record<string, string> = {
      'En Curso': 'En Curso',
      'en_curso': 'En Curso',
      'pendiente': 'Pendiente',
      'Pendiente': 'Pendiente',
      'finalizado': 'Finalizado',
      'Finalizado': 'Finalizado',
      'cancelado': 'Cancelado',
      'Cancelado': 'Cancelado',
      'pausado': 'Pausado',
      'Pausado': 'Pausado',
      'activo': 'Activo',
      'Activo': 'Activo',
      'programado': 'Programado',
      'Programado': 'Programado'
    };
    return estados[estado] || estado;
  };

  // Función para obtener color del estado
  const getEstadoColor = (estado: string): 'success' | 'warning' | 'info' | 'error' | 'default' => {
    switch (estado?.toLowerCase()) {
      case 'finalizado':
        return 'success'; // Verde
      case 'en curso':
      case 'en_curso':
      case 'pausado':
        return 'warning'; // Amarillo no saturado
      case 'pendiente':
      case 'programado':
        return 'info'; // Azul
      case 'activo':
        return 'success'; // Verde (torneos activos)
      case 'cancelado':
        return 'error'; // Rojo
      default:
        return 'default';
    }
  };

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      
      const userId = userProfile?.uid;
      
      const [proximosRes, torneosRes, noticiasRes, equiposRes, statsRes] = await Promise.all([
        api.get('/partidos/proximos').catch(() => ({ data: [] })),
        api.get('/torneos').catch(() => ({ data: { torneos: [] } })),
        api.get('/noticias').catch(() => ({ data: [] })),
        api.get('/equipos').catch(() => ({ data: [] })),
        userId ? api.get(`/jugadores/perfil/${userId}`).catch(() => ({ data: null })) : Promise.resolve({ data: null })
      ]);
      
      // Cargar estadísticas del jugador si está disponible
      if (statsRes.data?.estadisticas) {
        setEstadisticas(statsRes.data.estadisticas);
      }

      // Cargar datos completos de los partidos próximos
      const partidosConEquipos = await Promise.all((proximosRes.data || []).slice(0, 6).map(async (partido: any) => {
        try {
          // Si el partido está en curso o pausado, cargar datos completos
          if (partido.estado === 'En Curso' || partido.estado === 'pausado') {
            try {
              const liveRes = await api.get(`/partidos/${partido.id}/live`).catch(() => null);
              if (liveRes?.data) {
                partido = { ...partido, ...liveRes.data };
              }
              
              // Cargar datos completos del partido para obtener tiempo.inicio
              try {
                const partidoCompletoRes = await api.get(`/partidos/${partido.id}`).catch(() => null);
                if (partidoCompletoRes?.data) {
                  const tiempoInicioPartido = partidoCompletoRes.data.tiempo?.inicio;
                  if (tiempoInicioPartido) {
                    let inicioTimestamp = null;
                    if ((tiempoInicioPartido as any)?.toMillis) {
                      inicioTimestamp = (tiempoInicioPartido as any).toMillis();
                    } else if ((tiempoInicioPartido as any)?.seconds) {
                      inicioTimestamp = (tiempoInicioPartido as any).seconds * 1000;
                    } else {
                      inicioTimestamp = new Date(tiempoInicioPartido).getTime();
                    }
                    
                    if (!isNaN(inicioTimestamp) && inicioTimestamp > 0) {
                      (partido as any).tiempoInicioTimestamp = inicioTimestamp;
                    }
                  }
                  partido = { ...partido, ...partidoCompletoRes.data };
                }
              } catch (e) {

              }
            } catch (e) {

            }
          }
          
          const [equipoLocalRes, equipoVisitanteRes] = await Promise.all([
            api.get(`/equipos/${partido.equipoLocalId}`).catch(() => ({ data: null })),
            api.get(`/equipos/${partido.equipoVisitanteId}`).catch(() => ({ data: null }))
          ]);
          
          return {
            ...partido,
            equipoLocal: equipoLocalRes.data,
            equipoVisitante: equipoVisitanteRes.data
          };
        } catch (error) {
          return partido;
        }
      }));
      
      setProximosPartidos(partidosConEquipos);
      
      // Torneos - asegurar que sea array
      const torneosData = torneosRes.data?.torneos || torneosRes.data || [];
      setTorneosDisponibles(Array.isArray(torneosData) ? torneosData.slice(0, 6) : []);
      
      // Noticias - asegurar que sea array y extraer del objeto si es necesario
      const noticiasData = noticiasRes.data?.noticias || noticiasRes.data || [];
      setNoticias(Array.isArray(noticiasData) ? noticiasData.slice(0, 3) : []);
      
      // Equipos - asegurar que sea array (solo 4 para 2x2)
      const equiposData = Array.isArray(equiposRes.data) ? equiposRes.data : [];
      setEquiposDestacados(equiposData.slice(0, 4));
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Inicializar tiempos de inicio y cronómetros cuando se cargan los partidos
  useEffect(() => {
    if (proximosPartidos.length === 0) {
      return;
    }

    const nuevosTiemposInicio: Record<string, number> = { ...tiemposInicio };
    const nuevosCronometrosActivos: Record<string, boolean> = { ...cronometrosActivos };
    const nuevosTiemposTranscurridos: Record<string, number> = { ...tiemposTranscurridos };

    proximosPartidos.forEach(partido => {
      if ((partido.estado === 'En Curso' || partido.estado === 'pausado') && partido.id) {
        const tiempoInicioTimestamp = (partido as any).tiempoInicioTimestamp;
        const tiempoBackend = (partido as any).tiempoTranscurrido;

        if (partido.estado === 'pausado') {
          nuevosTiemposTranscurridos[partido.id] = tiempoBackend || 0;
          nuevosCronometrosActivos[partido.id] = false;
        } else if (partido.estado === 'En Curso') {
          if (tiempoInicioTimestamp) {
            const ahora = Date.now();
            const tiempoCalculado = Math.floor((ahora - tiempoInicioTimestamp) / 1000);
            nuevosTiemposTranscurridos[partido.id] = Math.max(0, tiempoCalculado);
            nuevosTiemposInicio[partido.id] = tiempoInicioTimestamp;
            nuevosCronometrosActivos[partido.id] = true;
          } else if (tiempoBackend !== undefined && tiempoBackend !== null && tiempoBackend > 0) {
            const ahora = Date.now();
            const tiempoInicioVirtual = ahora - (tiempoBackend * 1000);
            nuevosTiemposInicio[partido.id] = tiempoInicioVirtual;
            nuevosTiemposTranscurridos[partido.id] = tiempoBackend;
            nuevosCronometrosActivos[partido.id] = true;
          } else {
            const ahora = Date.now();
            nuevosTiemposInicio[partido.id] = ahora;
            nuevosTiemposTranscurridos[partido.id] = 0;
            nuevosCronometrosActivos[partido.id] = true;
          }
        }
      }
    });

    setTiemposInicio(nuevosTiemposInicio);
    setCronometrosActivos(nuevosCronometrosActivos);
    setTiemposTranscurridos(nuevosTiemposTranscurridos);
  }, [proximosPartidos.map(p => `${p.id}-${p.estado}-${(p as any).tiempoTranscurrido}-${(p as any).tiempoInicioTimestamp}`).join(',')]);

  // Cronómetro - calcular tiempo transcurrido en tiempo real
  useEffect(() => {
    const partidosEnCurso = proximosPartidos.filter(p => p.estado === 'En Curso' && p.id && cronometrosActivos[p.id] && tiemposInicio[p.id]);

    if (partidosEnCurso.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setTiemposTranscurridos(prev => {
        const nuevos = { ...prev };
        partidosEnCurso.forEach(partido => {
          const inicioTimestamp = tiemposInicio[partido.id];
          if (inicioTimestamp && cronometrosActivos[partido.id]) {
            const ahora = Date.now();
            const tiempoCalculado = Math.floor((ahora - inicioTimestamp) / 1000);
            nuevos[partido.id] = Math.max(0, tiempoCalculado);
          }
        });
        return nuevos;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [proximosPartidos, tiemposInicio, cronometrosActivos]);

  // Sincronizar con backend periódicamente
  useEffect(() => {
    const partidosEnCurso = proximosPartidos.filter(p => p.estado === 'En Curso' && p.id);
    
    if (partidosEnCurso.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      partidosEnCurso.forEach(async (partido) => {
        try {
          const partidoCompletoRes = await api.get(`/partidos/${partido.id}`).catch(() => null);
          if (partidoCompletoRes?.data) {
            const tiempoInicioPartido = partidoCompletoRes.data.tiempo?.inicio;
            
            if (tiempoInicioPartido) {
              let inicioTimestamp: number | null = null;
              if ((tiempoInicioPartido as any)?.toMillis) {
                inicioTimestamp = (tiempoInicioPartido as any).toMillis();
              } else if ((tiempoInicioPartido as any)?.seconds) {
                inicioTimestamp = (tiempoInicioPartido as any).seconds * 1000;
              } else {
                inicioTimestamp = new Date(tiempoInicioPartido).getTime();
              }
              
              if (inicioTimestamp && !isNaN(inicioTimestamp) && inicioTimestamp > 0) {
                setTiemposInicio(prev => ({
                  ...prev,
                  [partido.id]: inicioTimestamp as number
                }));
              }
            }
            
            let tiempoInicioTimestampCalc: number | null = null;
            if (tiempoInicioPartido) {
              if ((tiempoInicioPartido as any)?.toMillis) {
                tiempoInicioTimestampCalc = (tiempoInicioPartido as any).toMillis();
              } else if ((tiempoInicioPartido as any)?.seconds) {
                tiempoInicioTimestampCalc = (tiempoInicioPartido as any).seconds * 1000;
              } else {
                tiempoInicioTimestampCalc = new Date(tiempoInicioPartido).getTime();
              }
            }
            
            setProximosPartidos(prev => prev.map(p => 
              p.id === partido.id ? { ...p, ...partidoCompletoRes.data, tiempoInicioTimestamp: tiempoInicioTimestampCalc || (p as any).tiempoInicioTimestamp } as Partido : p
            ));
          }
        } catch (e) {

        }
      });
    }, 30000); // Sincronizar cada 30 segundos

    return () => clearInterval(interval);
  }, [proximosPartidos]);

  // Componente para partidos en vivo
  const LivePartidoCard: React.FC<{ partido: Partido }> = ({ partido }) => {
    const tiempoActual = tiemposTranscurridos[partido.id] ?? (partido as any).tiempoTranscurrido ?? 0;
    const resultado = partido.resultado || { puntosLocal: 0, puntosVisitante: 0 };
    
    return (
      <Card 
        sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? '#2a2a2a' : 'white',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            borderColor: 'primary.main'
          }
        }}
        onClick={() => navigate(`/partidos/${partido.id}`)}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header del partido */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmojiEvents sx={{ color: '#3F8CFF', mr: 1, fontSize: 24 }} />
            <Typography variant="h6" sx={{ 
              color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#424242',
              fontWeight: 'bold'
            }}>
              {partido.torneoNombre || partido.tipo || 'Partido'}
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ 
            color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#757575',
            mb: 3
          }}>
            Partido en Vivo
          </Typography>

          {/* Equipos y resultado */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            {/* Equipo Local */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              {partido.equipoLocal && (partido.equipoLocal as any).logo ? (
                <Box sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: '#3F8CFF'
                }}>
                  <img 
                    src={construirUrlImagen((partido.equipoLocal as any).logo)} 
                    alt={partido.equipoLocal?.nombre || 'Local'}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      backgroundColor: 'white',
                      padding: '4px'
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  border: '2px solid #3F8CFF'
                }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 'bold', 
                    color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#424242'
                  }}>
                    {partido.equipoLocal?.nombre?.charAt(0) || 'L'}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" sx={{ 
                color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#424242',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                {partido.equipoLocal?.nombre || 'Equipo Local'}
              </Typography>
            </Box>

            {/* Resultado */}
            <Box sx={{ mx: 3 }}>
              <Typography variant="h3" sx={{ 
                color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#424242',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                {resultado.puntosLocal || 0} - {resultado.puntosVisitante || 0}
              </Typography>
            </Box>

            {/* Equipo Visitante */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              {partido.equipoVisitante && (partido.equipoVisitante as any).logo ? (
                <Box sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: theme.palette.mode === 'dark' ? '#404040' : '#e0e0e0'
                }}>
                  <img 
                    src={construirUrlImagen((partido.equipoVisitante as any).logo)} 
                    alt={partido.equipoVisitante?.nombre || 'Visitante'}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      backgroundColor: 'white',
                      padding: '4px'
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  border: theme.palette.mode === 'dark' ? '2px solid white' : '2px solid #e0e0e0'
                }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 'bold', 
                    color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#424242'
                  }}>
                    {partido.equipoVisitante?.nombre?.charAt(0) || 'V'}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" sx={{ 
                color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#424242',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                {partido.equipoVisitante?.nombre || 'Equipo Visitante'}
              </Typography>
            </Box>
          </Box>

          {/* Estado del partido y cronómetro */}
          <Box sx={{ textAlign: 'center', px: 3 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                bgcolor: '#FF9800',
                px: 2,
                py: 1,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '0.9rem',
                minHeight: 36
              }}
            >
              <TrendingUp sx={{ color: '#000000', fontSize: '0.9rem' }} />
              <Typography sx={{ color: '#000000', fontWeight: 700, fontSize: '0.9rem' }}>
                {partido?.estado === 'En Curso' ? 'PRIMER TIEMPO' : partido?.estado === 'pausado' ? 'PAUSADO' : (partido?.estado || 'PROGRAMADO').toUpperCase()}{(partido?.estado === 'En Curso' || partido?.estado === 'pausado') ? ` - ${formatearTiempo(tiempoActual)}` : ''}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="xl" 
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
            backgroundImage: userProfile?.foto 
              ? `url(${construirUrlImagen(userProfile.foto)})`
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
            background: `linear-gradient(135deg, 
              ${alpha('#000000', 0.3)} 0%, 
              ${alpha('#000000', 0.5)} 50%,
              ${alpha('#667eea', 0.15)} 100%)`,
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
            <Avatar
              src={userProfile?.foto ? construirUrlImagen(userProfile.foto) : ''}
              sx={{
                width: 80,
                height: 80,
                border: '4px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
              }}
            >
              {userProfile?.nombre?.charAt(0) || 'U'}
            </Avatar>
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
                ¡Bienvenido, {userProfile?.nombre}! 👋
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'rgba(255,255,255,0.95)',
                  fontWeight: 500,
                  fontSize: { xs: '0.95rem', sm: '1.1rem' }
                }}
              >
                Tu espacio personalizado - Banner adaptado a tu perfil
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Grid Principal */}
      <Grid container spacing={3}>
        {/* Próximos Partidos */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            height: '100%'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex'
                }}>
                  <SportsRugby sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Próximos Partidos
                </Typography>
              </Box>

              {proximosPartidos.length > 0 ? (
                <Grid container spacing={2}>
                  {proximosPartidos.map((partido) => (
                    partido.estado === 'En Curso' || partido.estado === 'pausado' ? (
                      <Grid item xs={12} key={partido.id}>
                        <LivePartidoCard partido={partido} />
                      </Grid>
                    ) : (
                    <Grid item xs={12} sm={6} key={partido.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            borderColor: 'primary.main'
                          }
                        }}
                        onClick={() => navigate(`/partidos/${partido.id}`)}
                      >
                        <CardContent sx={{ p: 2 }}>
                          {/* Estado */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Chip 
                              label={partido.torneoNombre || 'Torneo'} 
                              size="small"
                              sx={{ 
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.7rem'
                              }}
                            />
                            {partido.estado && (
                              <Chip 
                                label={formatearEstado(partido.estado)} 
                                size="small"
                                color={getEstadoColor(partido.estado)}
                                sx={{ 
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  ...(getEstadoColor(partido.estado) === 'warning' && {
                                    bgcolor: '#FFB74D',
                                    color: 'white'
                                  }),
                                  ...(getEstadoColor(partido.estado) === 'success' && {
                                    bgcolor: '#66BB6A',
                                    color: 'white'
                                  })
                                }}
                              />
                            )}
                          </Box>

                          {/* Equipos */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Avatar
                                src={partido.equipoLocal?.logo ? construirUrlImagen(partido.equipoLocal.logo) : ''}
                                sx={{ width: 48, height: 48, mb: 1, bgcolor: 'primary.light' }}
                              >
                                {partido.equipoLocal?.nombre?.charAt(0) || 'L'}
                              </Avatar>
                              <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'center', fontSize: '0.7rem' }}>
                                {partido.equipoLocal?.nombre || 'Local'}
                              </Typography>
                            </Box>

                            <Typography variant="h6" sx={{ mx: 2, color: 'text.secondary', fontWeight: 700 }}>
                              VS
                            </Typography>

                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Avatar
                                src={partido.equipoVisitante?.logo ? construirUrlImagen(partido.equipoVisitante.logo) : ''}
                                sx={{ width: 48, height: 48, mb: 1, bgcolor: 'secondary.light' }}
                              >
                                {partido.equipoVisitante?.nombre?.charAt(0) || 'V'}
                              </Avatar>
                              <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'center', fontSize: '0.7rem' }}>
                                {partido.equipoVisitante?.nombre || 'Visitante'}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Fecha y Hora */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: 2,
                            p: 1.5,
                            bgcolor: 'action.hover',
                            borderRadius: 1.5
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                                {new Date(partido.fecha).toLocaleDateString('es-ES')}
                              </Typography>
                            </Box>
                            {partido.hora && (
                              <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                {partido.hora}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    )
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">No hay partidos próximos</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Torneos Activos */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            height: '100%'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  display: 'flex'
                }}>
                  <EmojiEvents sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Torneos
                </Typography>
              </Box>

              {torneosDisponibles.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {torneosDisponibles.map((torneo) => (
                    <Card 
                      key={torneo.id}
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transform: 'translateX(4px)'
                        }
                      }}
                      onClick={() => navigate(`/torneos/${torneo.id}`)}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                            {torneo.nombre}
                          </Typography>
                          <Chip 
                            label={formatearEstado(torneo.estado || 'Activo')} 
                            size="small" 
                            color={getEstadoColor(torneo.estado || 'Activo')}
                            sx={{ 
                              height: 20, 
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              ...(getEstadoColor(torneo.estado || 'Activo') === 'success' && {
                                bgcolor: '#66BB6A',
                                color: 'white'
                              }),
                              ...(getEstadoColor(torneo.estado || 'Activo') === 'warning' && {
                                bgcolor: '#FFB74D',
                                color: 'white'
                              })
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                          {torneo.categoria}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Alert severity="info">No hay torneos disponibles</Alert>
              )}

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
                onClick={() => navigate('/torneos')}
              >
                Ver todos los torneos
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Slider de Noticias */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            height: '100%'
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  display: 'flex'
                }}>
                  <Article sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Últimas Noticias
                </Typography>
              </Box>

              {noticias.length > 0 ? (
                <Box sx={{ 
                  '& .swiper-pagination-bullet': {
                    backgroundColor: 'white !important',
                    opacity: 0.5
                  },
                  '& .swiper-pagination-bullet-active': {
                    opacity: 1,
                    backgroundColor: 'white !important'
                  }
                }}>
                  <Swiper
                    modules={[Pagination, Autoplay]}
                    spaceBetween={0}
                    slidesPerView={1}
                    pagination={{ 
                      clickable: true,
                      dynamicBullets: false
                    }}
                    autoplay={{
                      delay: 4000,
                      disableOnInteraction: false,
                      pauseOnMouseEnter: true
                    }}
                    style={{
                      height: 300,
                      borderRadius: 12,
                      overflow: 'hidden'
                    }}
                  >
                    {noticias.map((noticia) => (
                      <SwiperSlide key={noticia.id}>
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            backgroundImage: noticia.imagen 
                              ? `url(${noticia.imagen})`
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/noticias/${noticia.id}`)}
                        >
                          {/* Overlay oscuro para mejor legibilidad */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                              p: 2,
                              pb: 2
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                color: 'white',
                                fontWeight: 'bold',
                                mb: 0.5,
                                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                fontSize: '1.1rem'
                              }}
                            >
                              {noticia.titulo}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'white',
                                mb: 1.5,
                                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontSize: '0.85rem'
                              }}
                            >
                              {noticia.contenido.length > 100
                                ? `${noticia.contenido.substring(0, 100)}...`
                                : noticia.contenido}
                            </Typography>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              sx={{ alignSelf: 'flex-start', fontSize: '0.8rem', py: 0.5, px: 2 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/noticias/${noticia.id}`);
                              }}
                            >
                              Leer más
                            </Button>
                          </Box>
                        </Box>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </Box>
              ) : (
                <Alert severity="info">No hay noticias disponibles</Alert>
              )}

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600 }}
                onClick={() => navigate('/noticias')}
              >
                Ver todas las noticias
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Equipos Destacados */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  display: 'flex'
                }}>
                  <SportsRugby sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Equipos Destacados
                </Typography>
              </Box>

              {equiposDestacados.length > 0 ? (
                <Grid container spacing={1.5}>
                  {equiposDestacados.map((equipo) => (
                    <Grid item xs={6} key={equipo.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transform: 'scale(1.02)'
                          }
                        }}
                        onClick={() => navigate(`/equipos/${equipo.id}`)}
                      >
                        <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                          <Avatar
                            src={equipo.logo ? construirUrlImagen(equipo.logo) : ''}
                            sx={{ 
                              width: 48, 
                              height: 48, 
                              mx: 'auto', 
                              mb: 1,
                              bgcolor: 'primary.light',
                              border: '2px solid',
                              borderColor: 'divider'
                            }}
                          >
                            {equipo.nombre?.charAt(0) || 'E'}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.8rem' }}>
                            {equipo.nombre}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {equipo.categoria || 'Sin categoría'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">No hay equipos disponibles</Alert>
              )}

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600 }}
                onClick={() => navigate('/equipos')}
              >
                Ver todos los equipos
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Estadísticas de Rendimiento del Jugador */}
      {estadisticas && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3,
            mt: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}
        >
          <Typography variant="h5" fontWeight="700" gutterBottom sx={{ mb: 3 }}>
            Estadísticas de Rendimiento
          </Typography>
          
          <Grid container spacing={2}>
            {[
              { label: 'Partidos Jugados', value: estadisticas?.partidosJugados || 0, icon: <SportsRugby />, color: 'primary.main' },
              { label: 'Tries', value: estadisticas?.tries || 0, icon: <EmojiEvents />, color: 'success.main' },
              { label: 'Titular', value: estadisticas?.partidosTitular || 0, icon: <Star />, color: 'warning.main' },
              { label: 'Suplente', value: estadisticas?.partidosSuplente || 0, icon: <TrendingUp />, color: 'info.main' },
            ].map((stat, index) => (
              <Grid item xs={6} sm={3} key={index}>
                <Card 
                  elevation={0}
                  sx={{ 
                    p: 2,
                    textAlign: 'center',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: stat.color,
                      transform: 'translateY(-2px)',
                      boxShadow: 1
                    }
                  }}
                >
                  <Box sx={{ color: stat.color, mb: 1 }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h5" fontWeight="700" color={stat.color}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default DashboardUsuario;

