import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  HowToVote,
  EmojiEvents,
  CheckCircle,
  ThumbUp
} from '@mui/icons-material';
import { votosService } from '../../services/api';
import { getImageUrl } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Jugador {
  id: string;
  nombre: string;
  foto?: string;
  numeroCamiseta?: number;
  posicion?: string;
}

interface Equipo {
  id: string;
  nombre: string;
  logo?: string;
  jugadores: Jugador[];
}

interface ResultadoVotacion {
  jugadorId: string;
  jugadorNombre: string;
  equipoId: string;
  equipoNombre: string;
  votos: number;
}

interface Props {
  partidoId: string;
  equipoLocal: Equipo;
  equipoVisitante: Equipo;
  estadoPartido: string; // programado, En Curso, finalizado
  convocadosLocal?: any[];
  convocadosVisitante?: any[];
}

const VotacionJugadorPartido: React.FC<Props> = ({
  partidoId,
  equipoLocal,
  equipoVisitante,
  estadoPartido,
  convocadosLocal = [],
  convocadosVisitante = []
}) => {
  const { darkMode } = useTheme();
  const { user, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [loadingResultados, setLoadingResultados] = useState(true);
  const [haVotado, setHaVotado] = useState(false);
  const [miVoto, setMiVoto] = useState<any>(null);
  const [resultados, setResultados] = useState<ResultadoVotacion[]>([]);
  const [totalVotos, setTotalVotos] = useState(0);
  const [ganadores, setGanadores] = useState<ResultadoVotacion[]>([]);
  const [hayEmpate, setHayEmpate] = useState(false);
  const [error, setError] = useState('');
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [jugadorAVotar, setJugadorAVotar] = useState<any>(null);

  // Verificar si el usuario puede votar (solo jugadores y árbitros)
  const puedeVotar = userProfile?.tipoUsuario === 'jugador' || userProfile?.tipoUsuario === 'arbitro';

  // Verificar si el partido permite votación
  const partidoPermiteVotacion = estadoPartido === 'En Curso' || estadoPartido === 'finalizado';

  const cargarResultados = useCallback(async () => {
    try {
      setLoadingResultados(true);
      const response = await votosService.getResultados(partidoId);
      
      if (response.data) {
        const data = response.data as any;
        setResultados(data.resultados || []);
        setTotalVotos(data.totalVotos || 0);
        setGanadores(data.ganadores || []);
        setHayEmpate(data.hayEmpate || false);
      }
    } catch (err: any) {
      console.error('Error cargando resultados:', err);
    } finally {
      setLoadingResultados(false);
    }
  }, [partidoId]);

  const verificarVotoUsuario = useCallback(async () => {
    try {
      const response = await votosService.getMiVoto(partidoId);
      
      if (response.data) {
        const data = response.data as any;
        setHaVotado(data.haVotado);
        setMiVoto(data.voto);
      }
    } catch (err: any) {
      console.error('Error verificando voto:', err);
    }
  }, [partidoId]);

  useEffect(() => {
    if (partidoId) {
      cargarResultados();
      if (user && puedeVotar) {
        verificarVotoUsuario();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidoId, user, puedeVotar]);


  const handleVotar = (jugador: any, equipo: any) => {
    setJugadorAVotar({ ...jugador, equipo });
    setOpenConfirmDialog(true);
  };

  const confirmarVoto = async () => {
    if (!jugadorAVotar) return;

    try {
      setLoading(true);
      setError('');

      const votoData = {
        jugadorId: jugadorAVotar.id,
        jugadorNombre: jugadorAVotar.nombre,
        equipoId: jugadorAVotar.equipo.id,
        equipoNombre: jugadorAVotar.equipo.nombre
      };

      await votosService.votar(partidoId, votoData);
      
      toast.success(`¡Voto registrado para ${jugadorAVotar.nombre}!`);
      setHaVotado(true);
      setMiVoto(votoData);
      setOpenConfirmDialog(false);
      
      // Recargar resultados
      await cargarResultados();
      
    } catch (err: any) {
      console.error('Error votando:', err);
      const errorMsg = err.response?.data?.error || 'Error al registrar el voto';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarVoto = async () => {
    try {
      setLoading(true);
      await votosService.eliminarVoto(partidoId);
      
      setHaVotado(false);
      setMiVoto(null);
      toast.success('Voto eliminado. Puedes votar nuevamente.');
      
      await cargarResultados();
    } catch (err: any) {
      console.error('Error eliminando voto:', err);
      toast.error('Error al eliminar el voto');
    } finally {
      setLoading(false);
    }
  };

  const obtenerPorcentaje = (votos: number) => {
    if (totalVotos === 0) return 0;
    return Math.round((votos / totalVotos) * 100);
  };

  const renderJugadorCard = (jugador: Jugador, equipo: Equipo) => {
    const esMiVoto = miVoto?.jugadorId === jugador.id;
    const resultado = resultados.find(r => r.jugadorId === jugador.id);
    const votos = resultado?.votos || 0;
    const porcentaje = obtenerPorcentaje(votos);
    const esGanador = ganadores.some(g => g.jugadorId === jugador.id);

    return (
      <Card
        key={jugador.id}
        sx={{
          mb: 2,
          cursor: !haVotado && partidoPermiteVotacion ? 'pointer' : 'default',
          border: esMiVoto ? '2px solid #4caf50' : esGanador ? '2px solid #ffc107' : '1px solid',
          borderColor: esMiVoto ? '#4caf50' : esGanador ? '#ffc107' : (darkMode ? '#404040' : '#e0e0e0'),
          bgcolor: darkMode ? '#2a2a2a' : 'white',
          transition: 'all 0.3s ease',
          '&:hover': !haVotado && partidoPermiteVotacion ? {
            transform: 'translateY(-2px)',
            boxShadow: 4,
            borderColor: 'primary.main'
          } : {},
          position: 'relative',
          overflow: 'visible'
        }}
        onClick={() => {
          if (!haVotado && partidoPermiteVotacion) {
            handleVotar(jugador, equipo);
          }
        }}
      >
        {esGanador && (
          <Box
            sx={{
              position: 'absolute',
              top: -10,
              right: 10,
              zIndex: 10
            }}
          >
            <EmojiEvents sx={{ color: '#ffc107', fontSize: 32 }} />
          </Box>
        )}
        
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={2}>
              <Avatar
                src={jugador.foto ? getImageUrl(jugador.foto) : undefined}
                sx={{
                  width: 50,
                  height: 50,
                  bgcolor: 'primary.main'
                }}
              >
                {!jugador.foto && jugador.nombre.charAt(0)}
              </Avatar>
            </Grid>
            
            <Grid item xs={6}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: esGanador ? 700 : 600,
                  color: darkMode ? '#e0e0e0' : '#424242'
                }}
              >
                {jugador.nombre}
              </Typography>
              <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                {jugador.posicion || 'Jugador'}
                {jugador.numeroCamiseta && ` - #${jugador.numeroCamiseta}`}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={equipo.nombre}
                  size="small"
                  avatar={
                    <Avatar
                      src={equipo.logo ? getImageUrl(equipo.logo) : undefined}
                      sx={{ width: 20, height: 20 }}
                    />
                  }
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'right' }}>
                {esMiVoto && (
                  <Chip
                    icon={<CheckCircle />}
                    label="Mi Voto"
                    color="success"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                )}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: esGanador ? '#ffc107' : (darkMode ? '#e0e0e0' : '#424242')
                  }}
                >
                  {votos} {votos === 1 ? 'voto' : 'votos'}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                  {porcentaje}%
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Barra de progreso */}
          {totalVotos > 0 && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={porcentaje}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: darkMode ? '#404040' : '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: esGanador ? '#ffc107' : '#2196f3'
                  }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // No mostrar si el partido está programado
  if (!partidoPermiteVotacion) {
    return (
      <Paper
        sx={{
          p: 3,
          bgcolor: darkMode ? '#1e1e1e' : 'white',
          borderRadius: 2
        }}
      >
        <Alert severity="info">
          La votación estará disponible cuando el partido comience.
        </Alert>
      </Paper>
    );
  }

  // No mostrar si el usuario no puede votar
  if (!puedeVotar) {
    return null; // Los organizadores y managers no ven la votación
  }

  return (
    <Paper
      sx={{
        p: 3,
        bgcolor: darkMode ? '#1e1e1e' : 'white',
        borderRadius: 2,
        border: `2px solid ${darkMode ? '#404040' : '#e0e0e0'}`
      }}
    >
      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <HowToVote sx={{ color: '#2196f3', fontSize: 32 }} />
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: darkMode ? '#e0e0e0' : '#424242'
            }}
          >
            Jugador del Partido
          </Typography>
          <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
            {haVotado ? 'Ya has votado en este partido' : 'Vota por el mejor jugador'}
          </Typography>
        </Box>
        {totalVotos > 0 && (
          <Chip
            icon={<ThumbUp />}
            label={`${totalVotos} ${totalVotos === 1 ? 'voto' : 'votos'}`}
            color="primary"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Estado de votación del usuario */}
      {haVotado && miVoto && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleCambiarVoto}
              disabled={loading}
            >
              Cambiar Voto
            </Button>
          }
        >
          Has votado por <strong>{miVoto.jugadorNombre}</strong>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Resultados */}
      {loadingResultados ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Ganador(es) */}
          {ganadores.length > 0 && totalVotos > 0 && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: darkMode ? '#2a2a2a' : '#fff3e0',
                border: '2px solid #ffc107'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f57c00', mb: 1 }}>
                {hayEmpate ? '🏆 Empate en el Primer Lugar' : '🏆 Liderando la Votación'}
              </Typography>
              {ganadores.map((ganador, index) => (
                <Typography key={index} variant="body1" sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
                  {ganador.jugadorNombre} - {ganador.equipoNombre} ({ganador.votos} {ganador.votos === 1 ? 'voto' : 'votos'})
                </Typography>
              ))}
            </Box>
          )}

          {/* Lista de jugadores convocados para votar */}
          {!haVotado && (
            <>
              <Typography
                variant="subtitle2"
                sx={{
                  color: darkMode ? '#b0b0b0' : '#757575',
                  mb: 2,
                  fontWeight: 600
                }}
              >
                Selecciona un jugador para votar:
              </Typography>
            </>
          )}

          {/* Equipo Local */}
          <Typography
            variant="h6"
            sx={{
              color: darkMode ? '#e0e0e0' : '#424242',
              mb: 2,
              fontWeight: 600
            }}
          >
            {equipoLocal.nombre}
          </Typography>
          
          {convocadosLocal.length > 0 ? (
            convocadosLocal.map((jugador) => renderJugadorCard(jugador, equipoLocal))
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              No hay jugadores convocados para votar
            </Alert>
          )}

          {/* Equipo Visitante */}
          <Typography
            variant="h6"
            sx={{
              color: darkMode ? '#e0e0e0' : '#424242',
              mb: 2,
              mt: 4,
              fontWeight: 600
            }}
          >
            {equipoVisitante.nombre}
          </Typography>
          
          {convocadosVisitante.length > 0 ? (
            convocadosVisitante.map((jugador) => renderJugadorCard(jugador, equipoVisitante))
          ) : (
            <Alert severity="info">
              No hay jugadores convocados para votar
            </Alert>
          )}
        </>
      )}

      {/* Dialog de confirmación */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: darkMode ? '#1e1e1e' : 'white',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
          Confirmar Voto
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
            ¿Confirmas tu voto para <strong>{jugadorAVotar?.nombre}</strong> de <strong>{jugadorAVotar?.equipo?.nombre}</strong>?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Solo puedes votar una vez. Podrás cambiar tu voto si lo deseas.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarVoto}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <HowToVote />}
          >
            {loading ? 'Votando...' : 'Confirmar Voto'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default VotacionJugadorPartido;

