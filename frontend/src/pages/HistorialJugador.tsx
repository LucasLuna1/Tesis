import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  Sports,
  CalendarToday,
  EmojiEvents,
  SportsRugby
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import api, { jugadoresService } from '../services/api';

interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  foto?: string;
  posicion: string;
  equipo: string;
}

interface Partido {
  id: string;
  fecha: Date;
  torneo: string;
  rival: string;
  miEquipo: string;
  resultado: string;
  gano: boolean;
  tries: number;
  conversiones: number;
  penalties: number;
  drops: number;
  minutos: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  tackles: number;
  asistencias: number;
}

interface Totales {
  partidos: number;
  tries: number;
  conversiones: number;
  penalties: number;
  drops: number;
  puntos: number;
  tackles: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  victorias: number;
}

const HistorialJugador: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { darkMode } = useTheme();

  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      cargarHistorial();
    }
  }, [id]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Usar llamada directa a la API para evitar problemas de caché
      const response = await api.get(`/jugadores/${id}/historial`);
      const data = response.data;
      
      setJugador(data.jugador);
      setPartidos(data.partidos);
      setTotales(data.totales);
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      setError(error.response?.data?.error || error.message || 'Error cargando historial del jugador');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: Date) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const obtenerIniciales = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

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

  if (error) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: darkMode ? '#121212' : '#f5f5f5',
        pb: 8
      }}>
        <Box sx={{ 
          bgcolor: darkMode ? '#1e1e1e' : 'white', 
          px: 2, 
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          borderBottom: darkMode ? '1px solid #333' : '1px solid #e0e0e0'
        }}>
          <IconButton onClick={() => navigate(`/jugadores/${id}`)} sx={{ mr: 1 }}>
            <ArrowBack sx={{ color: '#2196f3' }} />
          </IconButton>
          <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
            Historial de Partidos
          </Typography>
        </Box>
        <Container maxWidth="sm" sx={{ px: 2, py: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!jugador) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: darkMode ? '#121212' : '#f5f5f5',
        pb: 8
      }}>
        <Box sx={{ 
          bgcolor: darkMode ? '#1e1e1e' : 'white', 
          px: 2, 
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          borderBottom: darkMode ? '1px solid #333' : '1px solid #e0e0e0'
        }}>
          <IconButton onClick={() => navigate(`/jugadores/${id}`)} sx={{ mr: 1 }}>
            <ArrowBack sx={{ color: '#2196f3' }} />
          </IconButton>
          <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
            Historial de Partidos
          </Typography>
        </Box>
        <Container maxWidth="sm" sx={{ px: 2, py: 3 }}>
          <Alert severity="info">Jugador no encontrado</Alert>
        </Container>
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
        <IconButton onClick={() => navigate(`/jugadores/${id}`)} sx={{ mr: 1 }}>
          <ArrowBack sx={{ color: '#2196f3' }} />
        </IconButton>
        <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
          Historial de Partidos
        </Typography>
      </Box>

      <Container maxWidth="sm" sx={{ px: 2, py: 3 }}>
        {/* Info del jugador */}
        <Paper sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: darkMode ? '#1e1e1e' : 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar 
            src={jugador.foto}
            sx={{ width: 60, height: 60 }}
          >
            {obtenerIniciales(jugador.nombre, jugador.apellido)}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
              {jugador.nombre} {jugador.apellido}
            </Typography>
            <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
              {jugador.posicion} - {jugador.equipo}
            </Typography>
          </Box>
        </Paper>

        {/* Estadísticas resumen */}
        {totales && (
          <Paper sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: darkMode ? '#1e1e1e' : 'white'
          }}>
            <Typography variant="subtitle2" sx={{ 
              color: darkMode ? '#b0b0b0' : '#757575', 
              mb: 1.5,
              fontWeight: 600
            }}>
              RESUMEN DE TEMPORADA
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
                  {totales.partidos}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  Partidos
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  {totales.tries}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  Tries
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                  {totales.puntos}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  Puntos
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                  {totales.victorias}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  Victorias
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Lista de partidos */}
        <Typography variant="h6" sx={{ 
          color: darkMode ? '#e0e0e0' : '#424242', 
          fontWeight: 'bold',
          mb: 2
        }}>
          Últimos Partidos
        </Typography>

        {partidos.length > 0 ? (
          <List sx={{ bgcolor: darkMode ? '#1e1e1e' : 'white', borderRadius: 2, p: 0 }}>
            {partidos.map((partido, index) => (
              <React.Fragment key={partido.id || index}>
                <ListItem 
                  sx={{ 
                    py: 2,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    '&:hover': {
                      bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, width: '100%' }}>
                    <CalendarToday sx={{ fontSize: 16, color: darkMode ? '#b0b0b0' : '#757575' }} />
                    <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                      {formatearFecha(partido.fecha)}
                    </Typography>
                    <Chip 
                      label={partido.torneo} 
                      size="small" 
                      sx={{ ml: 'auto', height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ 
                        color: darkMode ? '#e0e0e0' : '#424242', 
                        fontWeight: 600,
                        mb: 0.5
                      }}>
                        {partido.miEquipo} vs {partido.rival}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ 
                        color: partido.gano ? '#4caf50' : darkMode ? '#b0b0b0' : '#757575',
                        fontWeight: 500
                      }}>
                        Resultado: {partido.resultado} {partido.gano ? '✓' : '✗'}
                      </Typography>
                    }
                  />

                  <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      icon={<SportsRugby sx={{ fontSize: 16 }} />}
                      label={`${partido.tries} Tries`}
                      size="small"
                      color={partido.tries > 0 ? 'primary' : 'default'}
                      variant={partido.tries > 0 ? 'filled' : 'outlined'}
                    />
                    <Chip 
                      label={`${partido.minutos}'`}
                      size="small"
                      variant="outlined"
                    />
                    {partido.conversiones > 0 && (
                      <Chip 
                        label={`${partido.conversiones} Conv.`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                    {partido.penalties > 0 && (
                      <Chip 
                        label={`${partido.penalties} Pen.`}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                    {(partido.tarjetasAmarillas > 0 || partido.tarjetasRojas > 0) && (
                      <Chip 
                        label={`${partido.tarjetasAmarillas}A ${partido.tarjetasRojas}R`}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </ListItem>
                {index < partidos.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Paper sx={{ 
            p: 3, 
            textAlign: 'center',
            bgcolor: darkMode ? '#1e1e1e' : 'white'
          }}>
            <EmojiEvents sx={{ fontSize: 48, color: darkMode ? '#666' : '#ccc', mb: 2 }} />
            <Typography variant="body1" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
              No hay partidos registrados
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default HistorialJugador;

