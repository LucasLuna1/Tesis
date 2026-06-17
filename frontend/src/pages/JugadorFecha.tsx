import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { 
  Sports, 
  Share,
  ArrowBack,
  Star,
  EmojiEvents
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { votosService } from '../services/api';
import { getImageUrl } from '../services/api';
import api from '../services/api';

const JugadorFecha: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [searchParams] = useSearchParams();
  const partidoId = searchParams.get('partidoId');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ganador, setGanador] = useState<any>(null);
  const [jugadorInfo, setJugadorInfo] = useState<any>(null);
  const [totalVotos, setTotalVotos] = useState(0);

  useEffect(() => {
    if (partidoId) {
      cargarGanador();
    } else {
      setError('No se especificó el partido');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidoId]);

  const cargarGanador = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Obtener resultados de votación
      const response = await votosService.getResultados(partidoId!);
      const data = response.data as any;
      
      if (data.ganadores && data.ganadores.length > 0) {
        const jugadorGanador = data.ganadores[0]; // Tomar el primer ganador
        setGanador(jugadorGanador);
        setTotalVotos(data.totalVotos || 0);
        
        // Cargar información completa del jugador
        try {
          const jugadorResponse = await api.get(`/jugadores/${jugadorGanador.jugadorId}`);
          setJugadorInfo(jugadorResponse.data);
        } catch (err) {
          console.error('Error cargando información del jugador:', err);
          // Continuar con la información básica del voto
        }
      } else {
        setError('No hay resultados de votación disponibles para este partido');
      }
    } catch (err: any) {
      console.error('Error cargando ganador:', err);
      setError(err.response?.data?.error || 'Error al cargar el jugador de la fecha');
    } finally {
      setLoading(false);
    }
  };

  const obtenerIniciales = (nombre?: string) => {
    if (!nombre) return '??';
    const partes = nombre.split(' ');
    if (partes.length >= 2) {
      return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
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

  if (error || !ganador) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: darkMode ? '#121212' : '#f5f5f5',
        pb: 8
      }}>
        <Box sx={{ 
          bgcolor: darkMode ? '#1e1e1e' : 'white', 
          px: 2, 
          py: 1,
          display: 'flex',
          alignItems: 'center',
          borderBottom: darkMode ? '1px solid #333' : '1px solid #e0e0e0'
        }}>
          <ArrowBack 
            sx={{ color: '#2196f3', mr: 1, cursor: 'pointer' }} 
            onClick={() => navigate(-1)}
          />
          <Star sx={{ color: '#2196f3', mr: 1 }} />
          <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
            JUGADOR DE LA FECHA
          </Typography>
        </Box>
        <Container maxWidth="sm" sx={{ px: 2, py: 3 }}>
          <Alert severity="error">{error || 'No se pudo cargar el jugador de la fecha'}</Alert>
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
        py: 1,
        display: 'flex',
        alignItems: 'center',
        borderBottom: darkMode ? '1px solid #333' : '1px solid #e0e0e0'
      }}>
        <ArrowBack 
          sx={{ color: '#2196f3', mr: 1, cursor: 'pointer' }} 
          onClick={() => navigate(-1)}
        />
        <Star sx={{ color: '#2196f3', mr: 1 }} />
        <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
          JUGADOR DE LA FECHA
        </Typography>
      </Box>

      <Container maxWidth="sm" sx={{ px: 2, py: 3 }}>
        {/* Perfil del jugador */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              src={jugadorInfo?.foto ? getImageUrl(jugadorInfo.foto) : undefined}
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                border: '4px solid #4caf50',
                bgcolor: '#1976d2'
              }}
            >
              <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                {obtenerIniciales(ganador.jugadorNombre)}
              </Typography>
            </Avatar>
            <Box
              sx={{
                position: 'absolute',
                top: -10,
                right: 'calc(50% - 70px)',
                bgcolor: '#ffc107',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 3
              }}
            >
              <EmojiEvents sx={{ color: 'white', fontSize: 24 }} />
            </Box>
          </Box>
          
          <Typography variant="h4" sx={{ 
            color: darkMode ? '#e0e0e0' : '#424242', 
            fontWeight: 'bold',
            mb: 1
          }}>
            {ganador.jugadorNombre}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body1" sx={{ 
              color: darkMode ? '#b0b0b0' : '#757575'
            }}>
              {jugadorInfo?.posicion || 'Jugador'} - {ganador.equipoNombre}
            </Typography>
          </Box>
          
          <Chip
            icon={<Star />}
            label={`${ganador.votos} ${ganador.votos === 1 ? 'voto' : 'votos'} (${Math.round((ganador.votos / totalVotos) * 100)}%)`}
            color="primary"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {/* Estadísticas */}
        <Paper sx={{ 
          p: 3,
          mb: 4,
          bgcolor: darkMode ? '#1e1e1e' : '#f9f9f9',
          borderRadius: 2
        }}>
          {/* Votos recibidos */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Star sx={{ color: '#ffc107', fontSize: 32 }} />
              <Box>
                <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  VOTOS RECIBIDOS:
                </Typography>
                <Typography variant="h5" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
                  {ganador.votos}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{
              width: 40,
              height: 40,
              bgcolor: '#4caf50',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <EmojiEvents sx={{ color: 'white', fontSize: 24 }} />
            </Box>
          </Box>

          {/* Porcentaje de votos */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Sports sx={{ color: '#2196f3', fontSize: 32 }} />
              <Box>
                <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  PORCENTAJE:
                </Typography>
                <Typography variant="h5" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
                  {Math.round((ganador.votos / totalVotos) * 100)}%
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                TOTAL VOTOS
              </Typography>
              <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
                {totalVotos}
              </Typography>
            </Box>
          </Box>

          {/* Equipo */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
              EQUIPO
            </Typography>
            <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
              {ganador.equipoNombre}
            </Typography>
          </Box>
        </Paper>

        {/* Descripción */}
        <Paper sx={{ 
          p: 3,
          mb: 4,
          bgcolor: darkMode ? '#1e1e1e' : 'white',
          borderRadius: 2
        }}>
          <Typography variant="body1" sx={{ 
            color: darkMode ? '#b0b0b0' : '#757575',
            lineHeight: 1.6,
            textAlign: 'justify'
          }}>
            {jugadorInfo?.descripcion || 
              `El jugador ${ganador.jugadorNombre} ha sido elegido como Jugador de la Fecha por los espectadores, 
              recibiendo ${ganador.votos} ${ganador.votos === 1 ? 'voto' : 'votos'} del total de ${totalVotos} votos emitidos. 
              Una actuación destacada que lo hace merecedor de este reconocimiento.`}
          </Typography>
        </Paper>

        {/* Botón compartir */}
        <Button
          variant="contained"
          fullWidth
          sx={{
            bgcolor: '#4caf50',
            color: 'white',
            borderRadius: 2,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}
          startIcon={<Share />}
        >
          Compartir en redes
        </Button>
      </Container>
    </Box>
  );
};

export default JugadorFecha;
