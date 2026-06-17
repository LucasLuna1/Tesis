import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Stack,
  Avatar,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  SportsRugby,
  EmojiEvents,
  TrendingUp,
  Warning,
  SwapHoriz,
  LocalHospital,
  Star,
  Timeline,
  Timer,
  Description,
  CheckCircle
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
// api import consolidado más abajo
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import { construirUrlImagen } from '../../utils/imageUtils';
import LogoDisplay from '../../components/common/LogoDisplay';
import VotacionJugadorPartido from '../../components/Votacion/VotacionJugadorPartido';
import api from '../../services/api';

interface Partido {
  id: string;
  equipoLocal: any;
  equipoLocalId?: string;
  equipoVisitante: any;
  equipoVisitanteId?: string;
  equipoLocalLogo?: string;
  equipoVisitanteLogo?: string;
  cancha: any;
  fecha: any;
  horaInicio?: string;
  estado: string;
  torneoNombre?: string;
  categoria?: string;
  resultado?: {
    puntosLocal: number;
    puntosVisitante: number;
    triesLocal?: number;
    triesVisitante?: number;
    conversionesLocal?: number;
    conversionesVisitante?: number;
    penalesLocal?: number;
    penalesVisitante?: number;
  };
  incidencias?: any[];
  estadisticas?: any;
  tiempoTranscurrido?: number;
}

const VisualizarPartido: React.FC = () => {
  const { id: partidoId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useCustomTheme();
  // Edición deshabilitada en esta vista
  
  const [partido, setPartido] = useState<Partido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [convocadosLocal, setConvocadosLocal] = useState<any[]>([]);
  const [convocadosVisitante, setConvocadosVisitante] = useState<any[]>([]);
  // Sin estado de edición aquí
  
  // Estados para cronómetro
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [tiempoInicio, setTiempoInicio] = useState<number | null>(null);
  const [cronometroActivo, setCronometroActivo] = useState(false);
  const [periodoActual, setPeriodoActual] = useState('primerTiempo');
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null);
  const [ultimoHashIncidencias, setUltimoHashIncidencias] = useState<string>('');
  const [ultimoHashConvocados, setUltimoHashConvocados] = useState<string>('');

  const cargarPartido = async (esActualizacionAutomatica = false) => {

    try {
      // Solo mostrar loading en la carga inicial, no en actualizaciones automáticas
      if (!esActualizacionAutomatica) {
        setLoading(true);
      }
      
      // Usar endpoint público /live para obtener datos en tiempo real
      const response = await api.get(`/partidos/${partidoId}/live`);
      setPartido(response.data);
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
        
        // Validar timestamp
        if (!isNaN(inicioTimestamp) && inicioTimestamp > 0) {
          setTiempoInicio(inicioTimestamp);

        } else {
          inicioTimestamp = null;
        }
      }
      
      // Si el partido está pausado, usar el tiempo guardado del backend
      if (response.data.estado === 'pausado') {
        console.log('⏸️ PARTIDO PAUSADO - Organizador recibe:', {
          tiempoTranscurrido: response.data.tiempoTranscurrido,
          estado: 'pausado',
          timestamp: new Date().toISOString()
        });
        setTiempoTranscurrido(response.data.tiempoTranscurrido || 0);
        setCronometroActivo(false);
        setTiempoInicio(null); // Limpiar tiempo de inicio
      } else if (response.data.estado === 'En Curso') {
        // Si está en curso, calcular tiempo transcurrido
        if (inicioTimestamp) {
          // Calcular desde el tiempo de inicio real (ajustado después de pausas)
          const ahora = Date.now();
          const tiempoCalculado = Math.floor((ahora - inicioTimestamp) / 1000);
          console.log('▶️ Partido en curso - Visualizar:', {
            tiempoInicio: new Date(inicioTimestamp).toISOString(),
            ahora: new Date(ahora).toISOString(),
            tiempoCalculado,
            estado: 'En Curso'
          });
          setTiempoTranscurrido(Math.max(0, tiempoCalculado));
          setCronometroActivo(true);
        } else {
          // Si no hay tiempo de inicio, usar el tiempo del backend
          const tiempoBackend = response.data.tiempoTranscurrido || 0;
          if (tiempoBackend > 0) {
            const ahora = Date.now();
            const tiempoInicioVirtual = ahora - (tiempoBackend * 1000);

            setTiempoInicio(tiempoInicioVirtual);
            setTiempoTranscurrido(tiempoBackend);
            setCronometroActivo(true);
          } else {
            // Iniciar desde cero
            const ahora = Date.now();
            setTiempoInicio(ahora);
            setTiempoTranscurrido(0);
            setCronometroActivo(true);
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
      // Edición deshabilitada en esta vista
    } catch (error) {
      console.error('Error cargando partido:', error);
      if (!esActualizacionAutomatica) {
        setError('Error al cargar el partido');
      }
    } finally {
      if (!esActualizacionAutomatica) {
        setLoading(false);
      }
    }
  };

  // Edición deshabilitada en esta vista

  const cargarConvocados = async () => {
    try {
      // Cargar convocados del partido
      const response = await api.get(`/partidos/${partidoId}/convocados`);
      if (response.data) {
        // Extraer el array de jugadores del objeto convocados
        const convocadosLocalObj = response.data.convocadosLocal;
        const convocadosVisitanteObj = response.data.convocadosVisitante;
        
        setConvocadosLocal(convocadosLocalObj?.jugadores || []);
        setConvocadosVisitante(convocadosVisitanteObj?.jugadores || []);
        

      }
    } catch (error) {
      console.error('Error cargando convocados:', error);
      // No mostrar error, los convocados son opcionales
    }
  };

  // Carga inicial
  useEffect(() => {

    if (partidoId) {
      cargarPartido(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidoId]);

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
    }
    
    return () => {
      if (intervalo) {
        clearInterval(intervalo);
      }
    };
  }, [cronometroActivo, partido?.estado, tiempoInicio]);

  // Verificar cambios en incidencias y resultado cada 2 segundos (actualización inteligente)
  useEffect(() => {
    if (!partido || !partidoId) {
      return;
    }

    // Solo para partidos activos
    const debeVerificar = partido.estado === 'En Curso' || partido.estado === 'pausado';
    
    if (!debeVerificar) {
      return;
    }

    const verificarCambios = setInterval(async () => {
      try {
        // Obtener solo incidencias y resultado (sin recargar todo)
        const response = await api.get(`/partidos/${partidoId}/incidencias?t=${Date.now()}`);
        
        // Crear hash simple de las incidencias para detectar cambios
        const nuevoHash = JSON.stringify({
          incidencias: response.data.incidencias?.length || 0,
          resultado: response.data.resultado,
          ultimaIncidencia: response.data.incidencias?.[response.data.incidencias?.length - 1]?.id || ''
        });
        
        // Si hay cambios, actualizar solo esos datos (sin recargar página)
        if (nuevoHash !== ultimoHashIncidencias) {
          console.log('🆕 Nuevas incidencias detectadas, actualizando...');
          
          // Actualizar partido con nuevos datos SIN perder el estado actual
          setPartido(prev => prev ? {
            ...prev,
            incidencias: response.data.incidencias || [],
            resultado: response.data.resultado || prev.resultado
          } : prev);
          
          setUltimoHashIncidencias(nuevoHash);
          setUltimaSincronizacion(new Date());
        }
      } catch (error) {
        console.error('Error verificando cambios:', error);
      }
    }, 2000); // Verificar cada 2 segundos

    return () => clearInterval(verificarCambios);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partido?.estado, partidoId, ultimoHashIncidencias]);

  // Verificar cambios en convocados cada 5 segundos (cambios, sin bin, etc)
  useEffect(() => {
    if (!partido || !partidoId) {
      return;
    }

    // Solo para partidos activos
    const debeVerificar = partido.estado === 'En Curso' || partido.estado === 'pausado';
    
    if (!debeVerificar) {
      return;
    }

    const verificarConvocados = setInterval(async () => {
      try {
        const response = await api.get(`/partidos/${partidoId}/convocados?t=${Date.now()}`);
        
        // Crear hash de convocados para detectar cambios
        const nuevoHash = JSON.stringify({
          localJugadores: response.data.convocadosLocal?.jugadores?.length || 0,
          visitanteJugadores: response.data.convocadosVisitante?.jugadores?.length || 0,
          localActivos: response.data.convocadosLocal?.jugadores?.filter((j: any) => j.activo).length || 0,
          visitanteActivos: response.data.convocadosVisitante?.jugadores?.filter((j: any) => j.activo).length || 0
        });
        
        // Si hay cambios, actualizar
        if (nuevoHash !== ultimoHashConvocados) {
          console.log('👥 Cambios en convocados detectados, actualizando...');
          
          setConvocadosLocal(response.data.convocadosLocal?.jugadores || []);
          setConvocadosVisitante(response.data.convocadosVisitante?.jugadores || []);
          setUltimoHashConvocados(nuevoHash);
        }
      } catch (error) {
        console.error('Error verificando convocados:', error);
      }
    }, 5000); // Verificar cada 5 segundos

    return () => clearInterval(verificarConvocados);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partido?.estado, partidoId, ultimoHashConvocados]);

  // Verificación ultra rápida del cronómetro (endpoint ligero sin caché)
  useEffect(() => {
    if (!partido || !partidoId) return;

    // Solo para partidos activos, verificar estado del cronómetro constantemente
    if (partido.estado === 'En Curso' || partido.estado === 'pausado') {
      const verificarCronometro = setInterval(async () => {
        try {
          // Usar endpoint ligero que solo devuelve estado y tiempo con timestamp para evitar caché
          const response = await api.get(`/partidos/${partidoId}/cronometro?t=${Date.now()}`);
          const nuevoEstado = response.data.estado;
          const nuevoTiempo = response.data.tiempoTranscurrido;
          const nuevoTiempoInicio = response.data.tiempo?.inicio;
          
          console.log('⏱️ Check cronómetro:', {
            estadoActual: partido.estado,
            estadoNuevo: nuevoEstado,
            tiempoActual: tiempoTranscurrido,
            tiempoNuevo: nuevoTiempo
          });
          
          // Actualizar timestamp de última sincronización
          setUltimaSincronizacion(new Date());
          
          // Si el estado cambió, recargar todo inmediatamente
          if (nuevoEstado !== partido.estado) {
            console.log('🔄 CAMBIO DE ESTADO DETECTADO:', partido.estado, '→', nuevoEstado);
            await cargarPartido(true);
          } else if (nuevoEstado === 'pausado') {
            // Si está pausado, detener cronómetro local y usar tiempo del backend
            console.log('⏸️ Aplicando pausa - Organizador:', { nuevoTiempo });
            setCronometroActivo(false);
            setTiempoInicio(null);
            setTiempoTranscurrido(nuevoTiempo);
            setPartido(prev => prev ? { ...prev, estado: 'pausado' } : prev);
          } else if (nuevoEstado === 'En Curso' && nuevoTiempoInicio) {
            // Si está en curso, asegurar que el cronómetro local esté sincronizado
            const inicioTimestamp = nuevoTiempoInicio?.toMillis 
              ? nuevoTiempoInicio.toMillis() 
              : (nuevoTiempoInicio?.seconds 
                ? nuevoTiempoInicio.seconds * 1000 
                : new Date(nuevoTiempoInicio).getTime());
            
            if (inicioTimestamp && !isNaN(inicioTimestamp)) {
              console.log('▶️ Aplicando reanudación - Organizador:', { inicioTimestamp, nuevoTiempo });
              setTiempoInicio(inicioTimestamp);
              setCronometroActivo(true);
              setPartido(prev => prev ? { ...prev, estado: 'En Curso' } : prev);
            }
          }
        } catch (error) {
          console.error('Error verificando cronómetro:', error);
        }
      }, 1000); // Verificar cada 1 segundo para máxima precisión

      return () => clearInterval(verificarCronometro);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partido?.estado, partidoId]);

  const getNombreEquipo = (equipo: any, fallback: string = 'Equipo'): string => {
    if (!equipo) return fallback;
    if (typeof equipo === 'string') return equipo;
    if (typeof equipo === 'object') return equipo.nombre || fallback;
    return fallback;
  };
  
  // Utilidades para mostrar información básica del documento (fecha/hora/cancha)
  const getNombreCancha = (cancha: any, fallback: string = 'Cancha'): string => {
    if (!cancha) return fallback;
    if (typeof cancha === 'string') return cancha;
    if (typeof cancha === 'object') return cancha.nombre || fallback;
    return fallback;
  };

  const formatFecha = (fecha: any): string => {
    try {
      if (!fecha) return 'Fecha no especificada';
      let d: Date | null = null;
      if (typeof fecha?.toDate === 'function') d = fecha.toDate();
      else if (typeof fecha === 'object' && (fecha.seconds || fecha._seconds)) {
        const s = fecha.seconds ?? fecha._seconds;
        d = new Date(s * 1000);
      } else if (typeof fecha === 'string' || typeof fecha === 'number') {
        const tmp = new Date(fecha);
        d = isNaN(tmp.getTime()) ? null : tmp;
      }
      if (!d || isNaN(d.getTime())) return 'Fecha no especificada';
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Fecha no especificada';
    }
  };

  const formatearTiempo = (segundos?: number) => {
    if (!segundos) return '00:00';
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Calcular período actual basado en tiempo transcurrido
  useEffect(() => {
    if (!partido || partido.estado !== 'En Curso') return;
    
    const tiempoEnMinutos = Math.floor(tiempoTranscurrido / 60);
    
    if (tiempoEnMinutos < 40) {
      setPeriodoActual('primerTiempo');
    } else if (tiempoEnMinutos >= 40 && tiempoEnMinutos < 80) {
      setPeriodoActual('segundoTiempo');
    }
  }, [tiempoTranscurrido, partido]);


  const getTipoIncidenciaIcon = (tipo: string) => {
    const iconProps = {
      sx: { 
        fontSize: 20,
        filter: darkMode ? 'brightness(0.9)' : 'brightness(1)'
      }
    };

    switch (tipo.toUpperCase()) {
      case 'TRY':
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#1976d2' : '#2196f3', boxShadow: 2 }}><SportsRugby {...iconProps} /></Avatar>;
      case 'CONVERSION':
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#4caf50' : '#66bb6a', boxShadow: 2 }}><TrendingUp {...iconProps} /></Avatar>;
      case 'PENAL':
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#ff9800' : '#ffb74d', boxShadow: 2 }}><Star {...iconProps} /></Avatar>;
      case 'DROP':
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#9c27b0' : '#ba68c8', boxShadow: 2 }}><EmojiEvents {...iconProps} /></Avatar>;
      case 'TARJETA_AMARILLA':
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#fdd835' : '#ffeb3b', boxShadow: 2 }}><Warning {...iconProps} /></Avatar>;
      case 'TARJETA_ROJA':
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#e53935' : '#f44336', boxShadow: 2 }}><Warning {...iconProps} /></Avatar>;
      case 'CAMBIO':
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#607d8b' : '#78909c', boxShadow: 2 }}><SwapHoriz {...iconProps} /></Avatar>;
      case 'LESION':
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#f44336' : '#ef5350', boxShadow: 2 }}><LocalHospital {...iconProps} /></Avatar>;
      default:
        return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#757575' : '#9e9e9e', boxShadow: 2 }}><SportsRugby {...iconProps} /></Avatar>;
    }
  };


  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando partido...
        </Typography>
      </Container>
    );
  }

  if (error || !partido) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Partido no encontrado'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 0, mb: 10, p: 0, bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5', minHeight: '100vh' }}>
      {/* Header del partido - Igual al del árbitro */}
      <Paper 
        elevation={darkMode ? 3 : 2} 
        sx={{ 
          borderRadius: 3, 
          bgcolor: darkMode ? '#2d2d2d' : 'white', 
          pt: { xs: 2, sm: 3 }, 
          pb: { xs: 2, sm: 4 },
          mx: { xs: 1, sm: 2 },
          mt: 2,
          background: darkMode 
            ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
        }}
      >
        {/* Título del torneo */}
        <Box sx={{ px: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ 
            width: { xs: 32, sm: 40 }, 
            height: { xs: 32, sm: 40 }, 
            bgcolor: darkMode ? '#1976d2' : '#2196f3',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 3,
            flexShrink: 0
          }}>
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '1.2rem' } }}>
              {partido.torneoNombre?.substring(0, 3) || 'M16'}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              color: darkMode ? '#e0e0e0' : '#424242', 
              lineHeight: 1.2,
              fontSize: { xs: '0.95rem', sm: '1.25rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: { xs: 'normal', sm: 'nowrap' }
            }}>
              {partido.torneoNombre || 'Torneo'}
            </Typography>
            <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Partido en Vivo • {formatFecha(partido.fecha)} {partido.horaInicio ? `• ${partido.horaInicio}` : ''}
            </Typography>
          </Box>
        </Box>


        {/* Equipos y marcador - Responsive como el del árbitro */}
        <Box sx={{ px: { xs: 1.5, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
          <Grid container spacing={{ xs: 1, sm: 3 }} alignItems="center" justifyContent="center">
            {/* Equipo Local */}
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <LogoDisplay
                  src={construirUrlImagen(
                    partido.equipoLocalLogo || 
                    (typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.logo : null)
                  )}
                  alt={getNombreEquipo(partido.equipoLocal, 'Local')}
                  size="medium"
                  shape="square"
                  fallbackText={getNombreEquipo(partido.equipoLocal, 'Local')}
                  sx={{ 
                    mx: 'auto',
                    mb: { xs: 1, sm: 2 },
                    boxShadow: { xs: 2, sm: 4 },
                    border: { xs: `2px solid ${darkMode ? '#1976d2' : '#2196f3'}`, sm: `3px solid ${darkMode ? '#1976d2' : '#2196f3'}` },
                    borderRadius: { xs: 2, sm: 3 },
                    width: { xs: 50, sm: 80 },
                    height: { xs: 50, sm: 80 }
                  }}
                />
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#e0e0e0' : '#424242', 
                  fontSize: { xs: '0.7rem', sm: '0.9rem' },
                  lineHeight: 1.2,
                  px: 0.5
                }}>
                  {getNombreEquipo(partido.equipoLocal, 'Local')}
                </Typography>
              </Box>
            </Grid>

            {/* Marcador */}
            <Grid item xs={4}>
              <Box sx={{ 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 1.5, sm: 3 }
              }}>
                <Typography variant="h1" sx={{ 
                  fontWeight: 900, 
                  color: darkMode ? '#e0e0e0' : '#212121',
                  fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
                  lineHeight: 1,
                  textShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {partido.resultado?.puntosLocal || 0}
                </Typography>
                <Typography variant="h1" sx={{ 
                  fontWeight: 900, 
                  color: darkMode ? '#a0a0a0' : '#757575',
                  fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
                  lineHeight: 1
                }}>
                  -
                </Typography>
                <Typography variant="h1" sx={{ 
                  fontWeight: 900, 
                  color: darkMode ? '#e0e0e0' : '#212121',
                  fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
                  lineHeight: 1,
                  textShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {partido.resultado?.puntosVisitante || 0}
                </Typography>
              </Box>
            </Grid>

            {/* Equipo Visitante */}
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <LogoDisplay
                  src={construirUrlImagen(
                    partido.equipoVisitanteLogo || 
                    (typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.logo : null)
                  )}
                  alt={getNombreEquipo(partido.equipoVisitante, 'Visitante')}
                  size="medium"
                  shape="square"
                  fallbackText={getNombreEquipo(partido.equipoVisitante, 'Visitante')}
                  sx={{ 
                    mx: 'auto',
                    mb: { xs: 1, sm: 2 },
                    boxShadow: { xs: 2, sm: 4 },
                    border: { xs: `2px solid ${darkMode ? '#ff9800' : '#ffb74d'}`, sm: `3px solid ${darkMode ? '#ff9800' : '#ffb74d'}` },
                    borderRadius: { xs: 2, sm: 3 },
                    width: { xs: 50, sm: 80 },
                    height: { xs: 50, sm: 80 }
                  }}
                />
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#e0e0e0' : '#424242', 
                  fontSize: { xs: '0.7rem', sm: '0.9rem' },
                  lineHeight: 1.2,
                  px: 0.5
                }}>
                  {getNombreEquipo(partido.equipoVisitante, 'Visitante')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Estado y tiempo */}
        <Box sx={{ textAlign: 'center', px: { xs: 2, sm: 3 } }}>
          <Chip 
            label={(() => {
              if (partido.estado !== 'En Curso' && partido.estado !== 'pausado') {
                return partido.estado.toUpperCase();
              }
              
              let periodo = '';
              if (periodoActual === 'primerTiempo') {
                periodo = 'PRIMER TIEMPO';
              } else if (periodoActual === 'entretiempo') {
                periodo = 'ENTRETIEMPO';
              } else if (periodoActual === 'segundoTiempo') {
                periodo = 'SEGUNDO TIEMPO';
              }
              
              return `${periodo} - ${formatearTiempo(tiempoTranscurrido)}`;
            })()}
            color={
              partido.estado === 'pausado' ? 'warning' :
              periodoActual === 'entretiempo' ? 'info' :
              partido.estado === 'En Curso' ? 'success' : 
              'default'
            }
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '0.75rem', sm: '0.9rem' },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              height: 'auto',
              '& .MuiChip-label': {
                px: { xs: 1, sm: 2 }
              }
            }}
            icon={<Timer sx={{ fontSize: 18 }} />}
          />

          {/* Indicador de sincronización en tiempo real */}
          {(partido.estado === 'En Curso' || partido.estado === 'pausado') && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'success.main',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 }
                }
              }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                Sincronización en vivo
                {ultimaSincronizacion && ` • ${ultimaSincronizacion.toLocaleTimeString()}`}
              </Typography>
            </Box>
          )}
          
          {/* Botón Jugador de la Fecha - Solo si el partido está finalizado */}
          {partido.estado === 'finalizado' && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                fullWidth
                sx={{
                  bgcolor: '#4caf50',
                  color: 'white',
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  borderRadius: 2,
                  boxShadow: 3,
                  '&:hover': {
                    bgcolor: '#45a049'
                  }
                }}
                startIcon={<Star />}
                 onClick={() => navigate(`/jugador-fecha?partidoId=${partidoId}`)}
              >
                Ver Jugador de la Fecha
              </Button>
            </Box>
          )}
          
        </Box>
      </Paper>

      {/* Incidencias del partido - Diseño modernizado igual al del árbitro */}
      <Grid container spacing={3} sx={{ px: 2, mt: 2 }}>
        <Grid item xs={12}>
          <Card elevation={darkMode ? 3 : 2} sx={{ 
            bgcolor: darkMode ? '#2d2d2d' : 'white',
            borderRadius: 3,
            border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Description color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Cronología del Partido
                </Typography>
              </Box>

              {partido.incidencias && partido.incidencias.length > 0 ? (
                <Box>
                  {partido.incidencias.map((incidencia: any, index: number) => {
                    // Renderizado especial moderno para CAMBIO (igual que GestionPartido)
                    if (incidencia.tipo === 'CAMBIO') {
                      return (
                        <Card 
                          key={incidencia.id || index}
                          elevation={3}
                          sx={{ 
                            mb: 2,
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: `2px solid ${darkMode ? '#1976d2' : '#2196f3'}`,
                            background: darkMode 
                              ? 'linear-gradient(135deg, #1e3a5f 0%, #2d2d2d 100%)'
                              : 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)'
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' },
                            p: { xs: 2, sm: 3 },
                            gap: 2
                          }}>
                            {/* Icono y Título */}
                            <Box sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              minWidth: { xs: 'auto', sm: 180 }
                            }}>
                              <Box sx={{ 
                                bgcolor: 'primary.main',
                                borderRadius: '50%',
                                width: 48,
                                height: 48,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 3,
                                flexShrink: 0
                              }}>
                                <Typography sx={{ fontSize: '1.5rem' }}>🔄</Typography>
                              </Box>
                              <Box>
                                <Typography variant="h6" sx={{ 
                                  fontWeight: 700,
                                  color: darkMode ? '#90caf9' : '#1976d2',
                                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                                }}>
                                  CAMBIO
                                </Typography>
                                <Typography variant="caption" sx={{ 
                                  color: darkMode ? '#a0a0a0' : '#757575',
                                  fontSize: '0.85rem'
                                }}>
                                  #{incidencia.minuto || 0}' • {incidencia.equipo === 'LOCAL' 
                                    ? getNombreEquipo(partido.equipoLocal)
                                    : getNombreEquipo(partido.equipoVisitante)
                                  }
                                </Typography>
                              </Box>
                            </Box>

                            {/* Jugadores - SALE y ENTRA */}
                            <Box sx={{ 
                              display: 'flex',
                              flexDirection: { xs: 'column', sm: 'row' },
                              gap: 2,
                              flex: 1
                            }}>
                              {/* Jugador que SALE */}
                              <Paper elevation={2} sx={{ 
                                flex: 1,
                                p: 2,
                                borderRadius: 2,
                                bgcolor: darkMode ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.08)',
                                border: `1px solid ${darkMode ? '#d32f2f' : '#ef5350'}`
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Box sx={{ 
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    bgcolor: 'error.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Typography sx={{ fontSize: '0.9rem', color: 'white' }}>↓</Typography>
                                  </Box>
                                  <Typography variant="caption" sx={{ 
                                    fontWeight: 600,
                                    color: 'error.main',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                  }}>
                                    Sale
                                  </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600,
                                  color: darkMode ? '#e0e0e0' : '#212121',
                                  fontSize: '0.95rem'
                                }}>
                                  {incidencia.jugadorSale?.nombre || incidencia.jugadorNombre || 'Jugador'}
                                </Typography>
                              </Paper>

                              {/* Jugador que ENTRA */}
                              <Paper elevation={2} sx={{ 
                                flex: 1,
                                p: 2,
                                borderRadius: 2,
                                bgcolor: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.08)',
                                border: `1px solid ${darkMode ? '#388e3c' : '#66bb6a'}`
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Box sx={{ 
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    bgcolor: 'success.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Typography sx={{ fontSize: '0.9rem', color: 'white' }}>↑</Typography>
                                  </Box>
                                  <Typography variant="caption" sx={{ 
                                    fontWeight: 600,
                                    color: 'success.main',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                  }}>
                                    Entra
                                  </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600,
                                  color: darkMode ? '#e0e0e0' : '#212121',
                                  fontSize: '0.95rem'
                                }}>
                                  {incidencia.jugadorEntra?.nombre || 'Jugador'}
                                </Typography>
                              </Paper>
                            </Box>

                            {/* Minuto */}
                            <Box sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: { xs: 'auto', sm: 60 }
                            }}>
                              <Typography variant="h5" sx={{ 
                                fontWeight: 700,
                                color: darkMode ? '#90caf9' : '#1976d2',
                                fontSize: { xs: '1.5rem', sm: '1.75rem' }
                              }}>
                                {incidencia.minuto || 0}'
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      );
                    }

                    // Renderizado normal para otras incidencias
                    return (
                      <Box 
                        key={incidencia.id || index}
                        sx={{ 
                          px: 3,
                          py: 2,
                          borderBottom: index < (partido.incidencias?.length || 0) - 1 ? `1px solid ${darkMode ? '#404040' : '#e0e0e0'}` : 'none',
                          bgcolor: darkMode ? '#2d2d2d' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: darkMode ? '#404040' : '#f8f9fa'
                          }
                        }}
                      >
                        {getTipoIncidenciaIcon(incidencia.tipo)}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: darkMode ? '#e0e0e0' : '#212121' }}>
                            {incidencia.tipo === 'TRY' ? 'TRY' :
                             incidencia.tipo === 'CONVERSION' ? 'CONVERSIÓN' :
                             incidencia.tipo === 'PENAL' ? 'PENAL' :
                             incidencia.tipo === 'DROP' ? 'DROP GOAL' :
                             incidencia.tipo === 'TARJETA_AMARILLA' ? 'TARJETA AMARILLA' :
                             incidencia.tipo === 'TARJETA_ROJA' ? 'TARJETA ROJA' :
                             incidencia.tipo === 'TARJETA_AZUL' ? 'TARJETA AZUL (LESIÓN)' :
                             incidencia.tipo === 'tarjeta_azul' ? 'TARJETA AZUL (LESIÓN)' :
                             incidencia.tipo ? incidencia.tipo.replace('_', ' ') : 'Incidencia'
                            }
                            {` - ${incidencia.jugadorNombre || 'Jugador'}`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                            #{incidencia.minuto || 0}' • {incidencia.equipo === 'LOCAL' 
                              ? getNombreEquipo(partido.equipoLocal)
                              : getNombreEquipo(partido.equipoVisitante)
                            }
                            {incidencia.descripcion && ` • ${incidencia.descripcion}`}
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          color: darkMode ? '#a0a0a0' : '#757575',
                          minWidth: 40,
                          textAlign: 'right'
                        }}>
                          {incidencia.minuto || 0}'
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                    No hay incidencias registradas
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Convocados y Jugadores Activos - Como vista del árbitro pero solo lectura */}
      {(convocadosLocal.length > 0 || convocadosVisitante.length > 0) && (
        <Grid container spacing={3} sx={{ px: 2, mt: 2 }}>
          <Grid item xs={12}>
            <Card elevation={darkMode ? 3 : 2} sx={{ 
              bgcolor: darkMode ? '#2d2d2d' : 'white',
              borderRadius: 3,
              border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <CheckCircle color="success" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Jugadores Convocados
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {/* Convocados Local */}
                  {convocadosLocal.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: darkMode ? '#404040' : '#f5f5f5', 
                        borderRadius: 2,
                        border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <LogoDisplay
                              src={construirUrlImagen(partido.equipoLocalLogo)}
                              alt={getNombreEquipo(partido.equipoLocal)}
                              size="small"
                              shape="rounded"
                              fallbackText={getNombreEquipo(partido.equipoLocal)}
                              sx={{ width: 40, height: 40, borderRadius: '50%' }}
                            />
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {getNombreEquipo(partido.equipoLocal)} ({convocadosLocal.length})
                            </Typography>
                          </Box>
                        </Box>

                        {/* Titulares */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ 
                            fontWeight: 600, 
                            color: '#4caf50', 
                            mb: 1,
                            fontSize: { xs: '0.95rem', sm: '0.875rem' }
                          }}>
                            TITULARES
                          </Typography>
                          <Box sx={{ 
                            maxHeight: 200, 
                            overflowY: 'auto',
                            p: { xs: 1.5, sm: 1 },
                            bgcolor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                            borderRadius: 2,
                            '&::-webkit-scrollbar': { width: '8px' },
                            '&::-webkit-scrollbar-track': {
                              backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                              borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: darkMode ? '#555' : '#888',
                              borderRadius: '10px',
                              '&:hover': { backgroundColor: darkMode ? '#777' : '#555' },
                            },
                          }}>
                            {convocadosLocal.filter((j: any) => j.esTitular).length > 0 ? (
                              convocadosLocal.filter((j: any) => j.esTitular).map((jugador: any) => (
                                <Box 
                                  key={jugador.id}
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    gap: 2, 
                                    p: 1, 
                                    mb: 0.5,
                                    bgcolor: darkMode ? '#2d2d2d' : 'white',
                                    borderRadius: 1,
                                    border: `2px solid ${darkMode ? '#4caf50' : '#81c784'}`
                                  }}
                                >
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {jugador.nombre} {jugador.apellido}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                      {jugador.posicion || 'Sin posición'}
                                    </Typography>
                                  </Box>
                                  {jugador.activo && (
                                    <Chip 
                                      label="EN CANCHA" 
                                      color="success"
                                      size="small"
                                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                    />
                                  )}
                                </Box>
                              ))
                            ) : (
                              <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                No hay titulares
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {/* Suplentes */}
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            fontWeight: 600, 
                            color: darkMode ? '#90caf9' : '#2196f3', 
                            mb: 1,
                            fontSize: { xs: '0.95rem', sm: '0.875rem' },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}>
                            🔄 SUPLENTES
                          </Typography>
                          <Box sx={{ 
                            maxHeight: 200, 
                            overflowY: 'auto',
                            p: { xs: 1.5, sm: 1 },
                            '&::-webkit-scrollbar': { width: '8px' },
                            '&::-webkit-scrollbar-track': {
                              backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                              borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: darkMode ? '#555' : '#888',
                              borderRadius: '10px',
                              '&:hover': { backgroundColor: darkMode ? '#777' : '#555' },
                            },
                          }}>
                            {convocadosLocal.filter((j: any) => !j.esTitular).length > 0 ? (
                              convocadosLocal.filter((j: any) => !j.esTitular).map((jugador: any) => (
                                <Box 
                                  key={jugador.id}
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    gap: 2, 
                                    p: 1, 
                                    mb: 0.5,
                                    bgcolor: darkMode ? '#2d2d2d' : 'white',
                                    borderRadius: 1,
                                    border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                                  }}
                                >
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {jugador.nombre} {jugador.apellido}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                      {jugador.posicion || 'Sin posición'}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))
                            ) : (
                              <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                No hay suplentes
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {/* Convocados Visitante */}
                  {convocadosVisitante.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: darkMode ? '#404040' : '#f5f5f5', 
                        borderRadius: 2,
                        border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <LogoDisplay
                              src={construirUrlImagen(partido.equipoVisitanteLogo)}
                              alt={getNombreEquipo(partido.equipoVisitante)}
                              size="small"
                              shape="rounded"
                              fallbackText={getNombreEquipo(partido.equipoVisitante)}
                              sx={{ width: 40, height: 40, borderRadius: '50%' }}
                            />
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {getNombreEquipo(partido.equipoVisitante)} ({convocadosVisitante.length})
                            </Typography>
                          </Box>
                        </Box>

                        {/* Titulares */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ 
                            fontWeight: 600, 
                            color: '#4caf50', 
                            mb: 1,
                            fontSize: { xs: '0.95rem', sm: '0.875rem' }
                          }}>
                            TITULARES
                          </Typography>
                          <Box sx={{ 
                            maxHeight: 200, 
                            overflowY: 'auto',
                            p: { xs: 1.5, sm: 1 },
                            bgcolor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                            borderRadius: 2,
                            '&::-webkit-scrollbar': { width: '8px' },
                            '&::-webkit-scrollbar-track': {
                              backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                              borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: darkMode ? '#555' : '#888',
                              borderRadius: '10px',
                              '&:hover': { backgroundColor: darkMode ? '#777' : '#555' },
                            },
                          }}>
                            {convocadosVisitante.filter((j: any) => j.esTitular).length > 0 ? (
                              convocadosVisitante.filter((j: any) => j.esTitular).map((jugador: any) => (
                                <Box 
                                  key={jugador.id}
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    gap: 2, 
                                    p: 1, 
                                    mb: 0.5,
                                    bgcolor: darkMode ? '#2d2d2d' : 'white',
                                    borderRadius: 1,
                                    border: `2px solid ${darkMode ? '#4caf50' : '#81c784'}`
                                  }}
                                >
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {jugador.nombre} {jugador.apellido}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                      {jugador.posicion || 'Sin posición'}
                                    </Typography>
                                  </Box>
                                  {jugador.activo && (
                                    <Chip 
                                      label="EN CANCHA" 
                                      color="success"
                                      size="small"
                                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                    />
                                  )}
                                </Box>
                              ))
                            ) : (
                              <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                No hay titulares
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {/* Suplentes */}
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            fontWeight: 600, 
                            color: darkMode ? '#90caf9' : '#2196f3', 
                            mb: 1,
                            fontSize: { xs: '0.95rem', sm: '0.875rem' },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}>
                            🔄 SUPLENTES
                          </Typography>
                          <Box sx={{ 
                            maxHeight: 200, 
                            overflowY: 'auto',
                            p: { xs: 1.5, sm: 1 },
                            '&::-webkit-scrollbar': { width: '8px' },
                            '&::-webkit-scrollbar-track': {
                              backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                              borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: darkMode ? '#555' : '#888',
                              borderRadius: '10px',
                              '&:hover': { backgroundColor: darkMode ? '#777' : '#555' },
                            },
                          }}>
                            {convocadosVisitante.filter((j: any) => !j.esTitular).length > 0 ? (
                              convocadosVisitante.filter((j: any) => !j.esTitular).map((jugador: any) => (
                                <Box 
                                  key={jugador.id}
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    gap: 2, 
                                    p: 1, 
                                    mb: 0.5,
                                    bgcolor: darkMode ? '#2d2d2d' : 'white',
                                    borderRadius: 1,
                                    border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                                  }}
                                >
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {jugador.nombre} {jugador.apellido}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                      {jugador.posicion || 'Sin posición'}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))
                            ) : (
                              <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                No hay suplentes
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Votación de Jugador del Partido */}
      {partido && (
        <Box sx={{ mt: 3, px: { xs: 2, sm: 0 } }}>
          <VotacionJugadorPartido
            partidoId={partido.id}
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
            estadoPartido={partido.estado}
            convocadosLocal={convocadosLocal}
            convocadosVisitante={convocadosVisitante}
          />
        </Box>
      )}
    </Container>
  );
};

export default VisualizarPartido;

