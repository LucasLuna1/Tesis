import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Grid,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  EmojiEvents,
  Timeline,
  BarChart,
  AccessTime,
  LocationOn,
  Analytics
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { DateUtils } from '../utils/dateUtils';
import VotacionJugadorPartido from '../components/Votacion/VotacionJugadorPartido';

interface Partido {
  _id: string;
  id?: string;
  tipo?: string;
  estado?: string;
  equipoLocal: any;
  equipoLocalId?: string;
  equipoLocalLogo?: string;
  equipoVisitante: any;
  equipoVisitanteId?: string;
  equipoVisitanteLogo?: string;
  resultado?: {
    puntosLocal?: number;
    puntosVisitante?: number;
  };
  fecha?: string;
  hora?: string;
  canchaId?: string;
  ubicacion?: string;
  arbitroId?: string;
  tiempoTranscurrido?: number;
  tiempo?: {
    inicio?: any;
  };
}

const DetallePartido: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { darkMode } = useTheme();
  
  const [partido, setPartido] = useState<Partido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [convocadosLocal, setConvocadosLocal] = useState<any[]>([]);
  const [convocadosVisitante, setConvocadosVisitante] = useState<any[]>([]);
  
  // Estados para cronómetro
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [tiempoInicio, setTiempoInicio] = useState<number | null>(null);
  const [cronometroActivo, setCronometroActivo] = useState(false);

  const cargarPartido = useCallback(async (esActualizacionAutomatica = false) => {

    try {
      // Solo mostrar loading en la carga inicial
      if (!esActualizacionAutomatica) {
        setLoading(true);
      }
      
      // Intentar usar endpoint /live si está disponible, sino usar el básico
      let response;
      try {
        response = await api.get(`/partidos/${id}/live`);
      } catch (liveError) {
        // Fallback al endpoint básico
        response = await api.get(`/partidos/${id}`);
      }
      
      // Log para debug - Solo en carga inicial
      if (!esActualizacionAutomatica) {
      }
      
      setPartido(response.data);
      setUltimaActualizacion(new Date());
      setError('');
      
      // Obtener tiempo de inicio del partido - Misma lógica que GestionPartido.js
      const tiempoInicioPartido = response.data.tiempo?.inicio;
      
      // Convertir tiempo de inicio a timestamp si existe
      let inicioTimestamp = null;
      if (tiempoInicioPartido) {
        inicioTimestamp = tiempoInicioPartido?.toMillis 
          ? tiempoInicioPartido.toMillis() 
          : (tiempoInicioPartido?.seconds 
            ? tiempoInicioPartido.seconds * 1000 
            : new Date(tiempoInicioPartido).getTime());
        
        // Validar que el timestamp sea válido
        if (!isNaN(inicioTimestamp) && inicioTimestamp > 0) {
          setTiempoInicio(inicioTimestamp);
          if (!esActualizacionAutomatica) {

          }
        } else {
          if (!esActualizacionAutomatica) {

          }
          inicioTimestamp = null;
        }
      } else if (!esActualizacionAutomatica) {

      }
      
      // Si el partido está pausado, usar el tiempo guardado del backend
      if (response.data.estado === 'pausado') {
        setTiempoTranscurrido(response.data.tiempoTranscurrido || 0);
        setCronometroActivo(false);
      } else if (response.data.estado === 'En Curso') {
        // Si está en curso, calcular tiempo transcurrido
        if (inicioTimestamp) {
          // Calcular desde el tiempo de inicio real
          const ahora = Date.now();
          const tiempoCalculado = Math.floor((ahora - inicioTimestamp) / 1000);
          setTiempoTranscurrido(Math.max(0, tiempoCalculado));
          setCronometroActivo(true);
        } else {
          // Si no hay tiempo de inicio del backend
          if (!esActualizacionAutomatica) {
            // En carga inicial, establecer tiempo virtual desde tiempo del backend
            const tiempoBackend = response.data.tiempoTranscurrido || 0;
            if (tiempoBackend > 0) {
              const ahora = Date.now();
              const tiempoInicioVirtual = ahora - (tiempoBackend * 1000);

              setTiempoInicio(tiempoInicioVirtual);
              setTiempoTranscurrido(tiempoBackend);
              setCronometroActivo(true);
            } else {
              // Si no hay tiempo backend, iniciar desde ahora

              const ahora = Date.now();
              setTiempoInicio(ahora);
              setTiempoTranscurrido(0);
              setCronometroActivo(true);
            }
          } else {
            // En actualizaciones automáticas, mantener el cronómetro activo si ya lo estaba
            if (tiempoInicio) {
              setCronometroActivo(true);
            }
          }
        }
      } else {
        // Partido no iniciado o finalizado
        setTiempoTranscurrido(response.data.tiempoTranscurrido || 0);
        setCronometroActivo(false);
      }
      
      // Cargar convocados para votación
      if (!esActualizacionAutomatica) {
        await cargarConvocados();
      }
    } catch (err) {
      console.error('Error cargando partido:', err);
      if (!esActualizacionAutomatica) {
        setError('Error al cargar el partido');
      }
    } finally {
      if (!esActualizacionAutomatica) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cargarConvocados = async () => {
    try {
      const response = await api.get(`/partidos/${id}/convocados`);
      if (response.data) {
        // Extraer el array de jugadores del objeto convocados
        const convocadosLocalObj = response.data.convocadosLocal;
        const convocadosVisitanteObj = response.data.convocadosVisitante;
        
        setConvocadosLocal(convocadosLocalObj?.jugadores || []);
        setConvocadosVisitante(convocadosVisitanteObj?.jugadores || []);
        

      }
    } catch (error) {
      console.error('Error cargando convocados:', error);
    }
  };

  // Carga inicial
  useEffect(() => {

    if (id) {
      cargarPartido(false);
    }
  }, [id, cargarPartido]);

  // Función para formatear tiempo
  const formatearTiempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Cronómetro - calcular tiempo transcurrido en tiempo real basado en tiempo de inicio
  useEffect(() => {
    let intervalo: NodeJS.Timeout | null = null;
    
    // Solo calcular tiempo en tiempo real si el partido está en curso
    if (cronometroActivo && partido?.estado === 'En Curso' && tiempoInicio) {

      intervalo = setInterval(() => {
        const ahora = Date.now();
        const tiempoCalculado = Math.floor((ahora - tiempoInicio) / 1000);
        setTiempoTranscurrido(Math.max(0, tiempoCalculado));
      }, 1000);
    } else {

    }
    
      return () => {
        if (intervalo) {
          clearInterval(intervalo);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cronometroActivo, partido?.estado, tiempoInicio]);

  // Sincronizar con backend periódicamente para asegurar precisión - Igual que GestionPartido.js
  useEffect(() => {
    if (!partido || partido.estado !== 'En Curso') {
      return;
    }

    const intervalo = setInterval(() => {
      cargarPartido(true); // Recargar datos del servidor cada 30 segundos
    }, 30000); // Sincronizar cada 30 segundos

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partido?.estado, id, cargarPartido]);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: darkMode ? '#121212' : '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !partido) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: darkMode ? '#121212' : '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error || 'Partido no encontrado'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: darkMode ? '#121212' : '#f5f5f5',
      pb: 8
    }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: darkMode ? '#1e1e1e' : 'white', 
        px: 2, 
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        borderBottom: darkMode ? '1px solid #333' : '1px solid #e0e0e0'
      }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBack sx={{ color: '#2196f3' }} />
        </IconButton>
        <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold', flex: 1 }}>
          Detalle del Partido
        </Typography>
        
        {/* Indicador de actualización automática */}
        {(partido?.estado === 'En Curso' || partido?.estado === 'pausado') && ultimaActualizacion && (
          <Chip 
            icon={<Analytics sx={{ fontSize: 12 }} />}
            label={ultimaActualizacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            size="small"
            sx={{ 
              bgcolor: darkMode ? '#1565c0' : '#e3f2fd',
              color: darkMode ? '#90caf9' : '#1565c0',
              fontWeight: 500,
              fontSize: '0.65rem',
              height: 22,
              '& .MuiChip-icon': {
                color: darkMode ? '#90caf9' : '#1565c0'
              }
            }}
          />
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Card Principal - Resumen del Partido */}
        <Card sx={{ 
          mb: 3, 
          bgcolor: darkMode ? '#2a2a2a' : 'white',
          borderRadius: 3,
          overflow: 'hidden'
        }}>
          <CardContent sx={{ p: 3 }}>
            {/* Header del partido */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmojiEvents sx={{ color: '#2196f3', mr: 1, fontSize: 24 }} />
              <Typography variant="h6" sx={{ 
                color: darkMode ? '#e0e0e0' : '#424242', 
                fontWeight: 'bold' 
              }}>
                {partido.tipo || 'Partido'}
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ 
              color: darkMode ? '#b0b0b0' : '#757575', 
              mb: 3 
            }}>
              Partido en Vivo
            </Typography>

            {/* Equipos y resultado */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              {/* Equipo Local */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <Avatar sx={{ 
                  width: 60, 
                  height: 60, 
                  bgcolor: darkMode ? '#404040' : '#f0f0f0',
                  mb: 1,
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: darkMode ? '#e0e0e0' : '#424242'
                }}>
                  {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre?.charAt(0) : partido.equipoLocal?.charAt(0) || 'L'}
                </Avatar>
                <Typography variant="body2" sx={{ 
                  color: darkMode ? '#e0e0e0' : '#424242',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre : partido.equipoLocal || 'Equipo Local'}
                </Typography>
              </Box>

              {/* Resultado */}
              <Box sx={{ mx: 3 }}>
                <Typography variant="h3" sx={{ 
                  color: darkMode ? '#e0e0e0' : '#424242',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  {partido.resultado?.puntosLocal || 0} - {partido.resultado?.puntosVisitante || 0}
                </Typography>
              </Box>

              {/* Equipo Visitante */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <Avatar sx={{ 
                  width: 60, 
                  height: 60, 
                  bgcolor: darkMode ? '#404040' : '#f0f0f0',
                  mb: 1,
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: darkMode ? '#e0e0e0' : '#424242'
                }}>
                  {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre?.charAt(0) : partido.equipoVisitante?.charAt(0) || 'V'}
                </Avatar>
                <Typography variant="body2" sx={{ 
                  color: darkMode ? '#e0e0e0' : '#424242',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre : partido.equipoVisitante || 'Equipo Visitante'}
                </Typography>
              </Box>
            </Box>

            {/* Estado del partido y cronómetro - Exactamente igual al del árbitro */}
            <Box sx={{ textAlign: 'center', px: 3 }}>
              <Chip 
                label={`${partido?.estado === 'En Curso' ? 'PRIMER TIEMPO' : partido?.estado === 'pausado' ? 'PAUSADO' : (partido?.estado || 'PROGRAMADO').toUpperCase()}${(partido?.estado === 'En Curso' || partido?.estado === 'pausado') ? ` - ${formatearTiempo(tiempoTranscurrido)}` : ''}`}
                color={partido?.estado === 'En Curso' ? 'success' : partido?.estado === 'pausado' ? 'warning' : 'default'}
                sx={{ 
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 2,
                  py: 1,
                  height: 'auto',
                  '& .MuiChip-label': {
                    px: 2
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Card Cronología */}
        <Card sx={{ 
          mb: 3, 
          bgcolor: darkMode ? '#2a2a2a' : 'white',
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Timeline sx={{ color: '#2196f3', mr: 1, fontSize: 24 }} />
              <Typography variant="h6" sx={{ 
                color: darkMode ? '#e0e0e0' : '#424242', 
                fontWeight: 'bold' 
              }}>
                Cronología del Partido
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Timeline sx={{ 
                fontSize: 64, 
                color: darkMode ? '#404040' : '#e0e0e0',
                mb: 2 
              }} />
              <Typography variant="body1" sx={{ 
                color: darkMode ? '#e0e0e0' : '#424242',
                fontWeight: 'bold',
                mb: 1
              }}>
                Sin incidencias
              </Typography>
              <Typography variant="body2" sx={{ 
                color: darkMode ? '#b0b0b0' : '#757575' 
              }}>
                No hay eventos registrados en este partido
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Card Estadísticas */}
        <Card sx={{ 
          mb: 3, 
          bgcolor: darkMode ? '#2a2a2a' : 'white',
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BarChart sx={{ color: '#4caf50', mr: 1, fontSize: 24 }} />
              <Typography variant="h6" sx={{ 
                color: darkMode ? '#e0e0e0' : '#424242', 
                fontWeight: 'bold' 
              }}>
                Estadísticas del Partido
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ 
              color: darkMode ? '#b0b0b0' : '#757575',
              textAlign: 'center',
              py: 2
            }}>
              Las estadísticas aparecerán cuando el partido comience
            </Typography>
          </CardContent>
        </Card>

        {/* Card Información del Partido */}
        <Card sx={{ 
          bgcolor: darkMode ? '#2a2a2a' : 'white',
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <AccessTime sx={{ color: '#9c27b0', mr: 1, fontSize: 24 }} />
              <Typography variant="h6" sx={{ 
                color: darkMode ? '#e0e0e0' : '#424242', 
                fontWeight: 'bold' 
              }}>
                Información del Partido
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {/* Fecha y Hora */}
              <Grid item xs={6}>
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: darkMode ? '#1a1a1a' : '#f8f9fa',
                  borderRadius: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccessTime sx={{ color: '#2196f3', mr: 1, fontSize: 20 }} />
                    <Typography variant="caption" sx={{ 
                      color: darkMode ? '#b0b0b0' : '#757575',
                      fontWeight: 'bold'
                    }}>
                      FECHA Y HORA
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: darkMode ? '#e0e0e0' : '#424242',
                    fontWeight: 'bold'
                  }}>
                    {partido.fecha ? DateUtils.formatDateForDisplay(partido.fecha) : 'Fecha no definida'}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: darkMode ? '#e0e0e0' : '#424242'
                  }}>
                    {partido.hora || 'Hora no definida'}
                  </Typography>
                </Paper>
              </Grid>

              {/* Cancha */}
              <Grid item xs={6}>
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: darkMode ? '#1a1a1a' : '#f8f9fa',
                  borderRadius: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn sx={{ color: '#4caf50', mr: 1, fontSize: 20 }} />
                    <Typography variant="caption" sx={{ 
                      color: darkMode ? '#b0b0b0' : '#757575',
                      fontWeight: 'bold'
                    }}>
                      CANCHA O UBICACIÓN
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: darkMode ? '#e0e0e0' : '#424242',
                    fontWeight: 'bold'
                  }}>
                    {partido.canchaId || 'Por asignar'}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: darkMode ? '#e0e0e0' : '#424242'
                  }}>
                    {partido.ubicacion || 'Campo de juego'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Votación de Jugador del Partido */}
        {partido && (
          <Box sx={{ mt: 3 }}>
            <VotacionJugadorPartido
              partidoId={partido.id || partido._id}
              equipoLocal={{
                id: partido.equipoLocalId || '',
                nombre: typeof partido.equipoLocal === 'string' ? partido.equipoLocal : partido.equipoLocal?.nombre || '',
                logo: partido.equipoLocalLogo,
                jugadores: []
              }}
              equipoVisitante={{
                id: partido.equipoVisitanteId || '',
                nombre: typeof partido.equipoVisitante === 'string' ? partido.equipoVisitante : partido.equipoVisitante?.nombre || '',
                logo: partido.equipoVisitanteLogo,
                jugadores: []
              }}
              estadoPartido={partido.estado || 'programado'}
              convocadosLocal={convocadosLocal}
              convocadosVisitante={convocadosVisitante}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DetallePartido;
