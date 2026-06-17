import { asText } from '../utils/text';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  ArrowBack,
  EmojiEvents,
  AccessTime,
  CheckCircle,
  Schedule,
  SportsRugby
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { torneosService, getImageUrl } from '../services/api';
import api from '../services/api';
import { DateUtils } from '../utils/dateUtils';

// Interfaces
interface Equipo {
  id: string;
  nombre: string;
  logo?: string;
}

interface Partido {
  id: string;
  equipoLocal: any;
  equipoLocalId: string;
  equipoLocalLogo?: string;
  equipoVisitante: any;
  equipoVisitanteId: string;
  equipoVisitanteLogo?: string;
  resultado?: {
    puntosLocal: number;
    puntosVisitante: number;
    triesLocal?: number;
    triesVisitante?: number;
  };
  estado: string;
  fecha: string;
  horaInicio: string;
  cancha?: {
    nombre: string;
  };
}

interface Fase {
  nombre: string;
  partidos: Partido[];
  totalPartidos: number;
  partidosJugados: number;
  partidosPendientes: number;
  partidosEnCurso: number;
  equiposClasificados: Equipo[];
  tablaPosiciones?: TablaPosicion[];
}

interface TablaPosicion {
  posicion: number;
  emoji: string;
  equipo: {
    id: string;
    nombre: string;
    logo?: string;
  };
  estadisticas: {
    partidosJugados: number;
    partidosGanados: number;
    partidosEmpatados: number;
    partidosPerdidos: number;
    puntosAFavor: number;
    puntosEnContra: number;
    diferencia: number;
    bonusOfensivo: number;
    bonusDefensivo: number;
    puntosTotales: number;
  };
}

interface TorneoInfo {
  id: string;
  nombre: string;
  categoria: string;
  estado: string;
}

interface EquipoDetalle {
  id: string;
  nombre: string;
  logo?: string;
  estadisticas?: any;
  plantel?: any[];
}

const FasesTorneo: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { darkMode } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [torneo, setTorneo] = useState<TorneoInfo | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  
  // Estados para modal de equipo
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoDetalle | null>(null);
  const [openEquipoDialog, setOpenEquipoDialog] = useState(false);
  const [loadingEquipo, setLoadingEquipo] = useState(false);

  const cargarFases = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await torneosService.getFases(id);
      
      if (response.data) {
        const data = response.data as any;
        setTorneo(data.torneo);
        setFases(data.fases || []);
      }
    } catch (err: any) {
      console.error('Error cargando fases:', err);
      setError(err.response?.data?.error || 'Error al cargar las fases del torneo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      cargarFases();
    }
  }, [id, cargarFases]);

  const handleEquipoClick = async (equipoId: string, equipoNombre: string, equipoLogo?: string) => {
    try {
      setLoadingEquipo(true);
      setOpenEquipoDialog(true);
      
      // Cargar información del equipo
      const response = await api.get(`/equipos/${equipoId}`);
      
      if (response.data?.equipo) {
        setEquipoSeleccionado(response.data.equipo);
      } else {
        // Si no hay datos completos, usar información básica
        setEquipoSeleccionado({
          id: equipoId,
          nombre: equipoNombre,
          logo: equipoLogo
        });
      }
    } catch (err) {
      console.error('Error cargando equipo:', err);
      // Mostrar información básica en caso de error
      setEquipoSeleccionado({
        id: equipoId,
        nombre: equipoNombre,
        logo: equipoLogo
      });
    } finally {
      setLoadingEquipo(false);
    }
  };

  const handlePartidoClick = (partidoId: string) => {
    navigate(`/partidos/${partidoId}`);
  };

  const getNombreEquipo = (equipo: any, fallback: string = 'Equipo'): string => {
    if (!equipo) return fallback;
    if (typeof equipo === 'string') return equipo;
    if (typeof equipo === 'object') return (equipo as any).nombre || (equipo as any).id || fallback;
    return fallback;
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'finalizado':
        return 'success';
      case 'En Curso':
        return 'warning';
      case 'programado':
        return 'info';
      default:
        return 'default';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'finalizado':
        return <CheckCircle fontSize="small" />;
      case 'En Curso':
        return <AccessTime fontSize="small" />;
      case 'programado':
        return <Schedule fontSize="small" />;
      default:
        return undefined;
    }
  };

  const renderPartidoCard = (partido: Partido) => {
    const esFinalizado = partido.estado === 'finalizado';
    const puntosLocal = partido.resultado?.puntosLocal || 0;
    const puntosVisitante = partido.resultado?.puntosVisitante || 0;
    const ganadorLocal = esFinalizado && puntosLocal > puntosVisitante;
    const ganadorVisitante = esFinalizado && puntosVisitante > puntosLocal;

    return (
      <Card
        key={partido.id}
        onClick={() => handlePartidoClick(partido.id)}
        sx={{
          mb: 2,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          bgcolor: darkMode ? '#2a2a2a' : 'white',
          border: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4,
            borderColor: 'primary.main'
          }
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Encabezado con estado y fecha */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Chip
              label={partido.estado}
              color={getEstadoColor(partido.estado)}
              size="small"
              icon={getEstadoIcon(partido.estado)}
              sx={{ fontWeight: 600 }}
            />
            <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
              {DateUtils.formatDateForDisplay(partido.fecha)} - {partido.horaInicio}
            </Typography>
          </Box>

          {/* Equipos */}
          <Grid container spacing={2} alignItems="center">
            {/* Equipo Local */}
            <Grid item xs={5}>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  handleEquipoClick(partido.equipoLocalId, getNombreEquipo(partido.equipoLocal), partido.equipoLocalLogo);
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  borderRadius: 1,
                  transition: 'all 0.2s',
                  opacity: ganadorVisitante ? 0.6 : 1,
                  '&:hover': {
                    bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                  }
                }}
              >
                <Avatar
                  src={partido.equipoLocalLogo ? getImageUrl(partido.equipoLocalLogo) : undefined}
                  sx={{
                    width: 50,
                    height: 50,
                    border: ganadorLocal ? '3px solid #4caf50' : 'none',
                    boxShadow: ganadorLocal ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'none'
                  }}
                >
                  {!partido.equipoLocalLogo && getNombreEquipo(partido.equipoLocal).charAt(0)}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    fontWeight: ganadorLocal ? 700 : 500,
                    color: darkMode ? '#e0e0e0' : '#424242'
                  }}
                >
                  {getNombreEquipo(partido.equipoLocal)}
                </Typography>
                {esFinalizado && (
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: ganadorLocal ? '#4caf50' : (darkMode ? '#e0e0e0' : '#424242')
                    }}
                  >
                    {puntosLocal}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* VS o Resultado */}
            <Grid item xs={2}>
              <Box sx={{ textAlign: 'center' }}>
                {!esFinalizado ? (
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: darkMode ? '#90caf9' : '#1976d2'
                    }}
                  >
                    VS
                  </Typography>
                ) : (
                  <Box>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                      Final
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Equipo Visitante */}
            <Grid item xs={5}>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  handleEquipoClick(partido.equipoVisitanteId, getNombreEquipo(partido.equipoVisitante), partido.equipoVisitanteLogo);
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  borderRadius: 1,
                  transition: 'all 0.2s',
                  opacity: ganadorLocal ? 0.6 : 1,
                  '&:hover': {
                    bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                  }
                }}
              >
                <Avatar
                  src={partido.equipoVisitanteLogo ? getImageUrl(partido.equipoVisitanteLogo) : undefined}
                  sx={{
                    width: 50,
                    height: 50,
                    border: ganadorVisitante ? '3px solid #4caf50' : 'none',
                    boxShadow: ganadorVisitante ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'none'
                  }}
                >
                  {!partido.equipoVisitanteLogo && getNombreEquipo(partido.equipoVisitante).charAt(0)}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    fontWeight: ganadorVisitante ? 700 : 500,
                    color: darkMode ? '#e0e0e0' : '#424242'
                  }}
                >
                  {getNombreEquipo(partido.equipoVisitante)}
                </Typography>
                {esFinalizado && (
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: ganadorVisitante ? '#4caf50' : (darkMode ? '#e0e0e0' : '#424242')
                    }}
                  >
                    {puntosVisitante}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Información adicional */}
          {partido.cancha && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                <SportsRugby fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 14 }} />
                {partido.cancha.nombre}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTablaPosiciones = (tablaPosiciones: TablaPosicion[]) => {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          sx={{
            color: darkMode ? '#e0e0e0' : '#424242',
            mb: 2,
            fontWeight: 600
          }}
        >
          Tabla de Posiciones
        </Typography>
        
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            backgroundColor: darkMode ? '#2a2a2a' : 'white',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: darkMode ? '#404040' : '#f5f5f5' }}>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>Pos</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>Equipo</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>PJ</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>G</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>E</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>P</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>PF</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>PC</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>Dif</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>BO</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>BD</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {tablaPosiciones.map((posicion, index) => (
                <tr 
                  key={posicion.equipo.id}
                  style={{ 
                    backgroundColor: index % 2 === 0 ? (darkMode ? '#1e1e1e' : 'white') : (darkMode ? '#2a2a2a' : '#f9f9f9'),
                    borderBottom: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`
                  }}
                >
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.emoji}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={posicion.equipo.logo ? getImageUrl(posicion.equipo.logo) : undefined}
                        sx={{ width: 24, height: 24 }}
                      >
                        {!posicion.equipo.logo && posicion.equipo.nombre.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {posicion.equipo.nombre}
                      </Typography>
                    </Box>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.partidosJugados}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.partidosGanados}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.partidosEmpatados}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.partidosPerdidos}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.puntosAFavor}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.puntosEnContra}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.diferencia > 0 ? '+' : ''}{posicion.estadisticas.diferencia}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.bonusOfensivo}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', color: darkMode ? '#e0e0e0' : '#424242' }}>
                    {posicion.estadisticas.bonusDefensivo}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', fontWeight: 700, color: darkMode ? '#4caf50' : '#2e7d32' }}>
                    {posicion.estadisticas.puntosTotales}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>
    );
  };

  const renderFase = (fase: Fase) => {
    return (
      <Paper
        key={fase.nombre}
        sx={{
          p: 3,
          mb: 4,
          bgcolor: darkMode ? '#1e1e1e' : 'white',
          borderRadius: 2,
          border: `2px solid ${darkMode ? '#404040' : '#e0e0e0'}`
        }}
      >
        {/* Encabezado de la fase */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EmojiEvents sx={{ color: '#ffc107', fontSize: 32 }} />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: darkMode ? '#e0e0e0' : '#424242'
              }}
            >
              {fase.nombre}
            </Typography>
          </Box>

          {/* Estadísticas de la fase */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: darkMode ? '#2a2a2a' : '#f5f5f5' }}>
                <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700 }}>
                  {fase.partidosJugados}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  Jugados
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: darkMode ? '#2a2a2a' : '#f5f5f5' }}>
                <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 700 }}>
                  {fase.partidosEnCurso}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  En Curso
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: darkMode ? '#2a2a2a' : '#f5f5f5' }}>
                <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 700 }}>
                  {fase.partidosPendientes}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  Pendientes
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: darkMode ? '#2a2a2a' : '#f5f5f5' }}>
                <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 700 }}>
                  {fase.totalPartidos}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  Total
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Tabla de posiciones */}
          {fase.tablaPosiciones && fase.tablaPosiciones.length > 0 && (
            renderTablaPosiciones(fase.tablaPosiciones)
          )}

          {/* Equipos clasificados */}
          {fase.equiposClasificados.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: darkMode ? '#b0b0b0' : '#757575',
                  mb: 1,
                  fontWeight: 600
                }}
              >
                Equipos Clasificados
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {fase.equiposClasificados.map((equipo) => (
                  <Chip
                    key={equipo.id}
                    avatar={
                      <Avatar
                        src={equipo.logo ? getImageUrl(equipo.logo) : undefined}
                        sx={{ width: 24, height: 24 }}
                      >
                        {!equipo.logo && equipo.nombre.charAt(0)}
                      </Avatar>
                    }
                    label={equipo.nombre}
                    onClick={() => handleEquipoClick(equipo.id, equipo.nombre, equipo.logo)}
                    color="success"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'success.light'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Partidos de la fase */}
        <Box>
          {fase.partidos.length > 0 ? (
            fase.partidos.map((partido) => renderPartidoCard(partido))
          ) : (
            <Alert severity="info">No hay partidos en esta fase</Alert>
          )}
        </Box>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: darkMode ? '#121212' : '#f5f5f5',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: darkMode ? '#121212' : '#f5f5f5', pb: 8 }}>
        <Box
          sx={{
            bgcolor: darkMode ? '#1e1e1e' : 'white',
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            borderBottom: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
          }}
        >
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBack sx={{ color: '#2196f3' }} />
          </IconButton>
          <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
            Fases del Torneo
          </Typography>
        </Box>
        <Container maxWidth="lg" sx={{ px: 2, py: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: darkMode ? '#121212' : '#f5f5f5', pb: 8 }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: darkMode ? '#1e1e1e' : 'white',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          borderBottom: darkMode ? '1px solid #404040' : '1px solid #e0e0e0',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <IconButton onClick={() => navigate(`/torneos/${id}`)} sx={{ mr: 1 }}>
          <ArrowBack sx={{ color: '#2196f3' }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
            Fases del Torneo
          </Typography>
          {torneo && (
            <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
              {torneo.nombre} - {asText(torneo.categoria)}
            </Typography>
          )}
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ px: 2, py: 3 }}>
        {/* Información del torneo */}
        {torneo && (
          <Paper
            sx={{
              p: 3,
              mb: 4,
              bgcolor: darkMode ? '#1e1e1e' : 'white',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <EmojiEvents sx={{ fontSize: 60, color: '#ffc107', mb: 2 }} />
            <Typography variant="h4" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 700, mb: 1 }}>
              {torneo.nombre}
            </Typography>
            <Chip label={asText(torneo.categoria)} color="primary" sx={{ mr: 1 }} />
            <Chip
              label={torneo.estado}
              color={torneo.estado === 'En Curso' ? 'success' : 'default'}
            />
          </Paper>
        )}

        {/* Fases */}
        {fases.length > 0 ? (
          fases.map((fase) => renderFase(fase))
        ) : (
          <Alert severity="info">
            No hay fases definidas para este torneo. Las fases se crearán automáticamente cuando se registren partidos.
          </Alert>
        )}
      </Container>

      {/* Modal de detalles del equipo */}
      <Dialog
        open={openEquipoDialog}
        onClose={() => setOpenEquipoDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: darkMode ? '#1e1e1e' : 'white',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {equipoSeleccionado?.logo && (
              <Avatar
                src={getImageUrl(equipoSeleccionado.logo)}
                sx={{ width: 50, height: 50 }}
              >
                {equipoSeleccionado.nombre.charAt(0)}
              </Avatar>
            )}
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {equipoSeleccionado?.nombre || 'Cargando...'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingEquipo ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : equipoSeleccionado ? (
            <Box>
              <Typography variant="body1" sx={{ color: darkMode ? '#e0e0e0' : '#424242', mb: 2 }}>
                Para ver las estadísticas completas y el plantel del equipo, haz clic en el botón de abajo.
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                • Estadísticas detalladas del torneo
              </Typography>
              <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                • Plantel completo de jugadores
              </Typography>
              <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                • Historial de partidos
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
              No se pudo cargar la información del equipo
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEquipoDialog(false)} sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
            Cerrar
          </Button>
          {equipoSeleccionado && (
            <Button
              variant="contained"
              onClick={() => {
                setOpenEquipoDialog(false);
                navigate(`/equipos/${equipoSeleccionado.id}`);
              }}
            >
              Ver Equipo Completo
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FasesTorneo;

