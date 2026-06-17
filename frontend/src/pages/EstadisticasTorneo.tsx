import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Avatar,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { Sports, LocalPolice, EmojiEvents, Shield, Person } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface EstadisticaEquipo {
  equipoId: string;
  equipoNombre: string;
  equipoLogo?: string;
  tries: number;
  puntosAFavor: number;
  puntosEnContra: number;
  partidosJugados: number;
  partidosGanados: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
}

interface Goleador {
  jugadorId: string;
  jugadorNombre: string;
  jugadorFoto?: string;
  equipoNombre: string;
  tries: number;
}

const EstadisticasTorneo: React.FC = () => {
  const { torneoId } = useParams();
  const [maxTries, setMaxTries] = useState(1);

  // Obtener datos del torneo
  const { data: torneo, isLoading: loadingTorneo } = useQuery({
    queryKey: ['torneo', torneoId],
    queryFn: async () => {
      const response = await api.get(`/torneos/${torneoId}`);
      return response.data;
    },
    enabled: !!torneoId
  });

  // Obtener estadísticas del torneo
  const { data: estadisticas, isLoading: loadingEstadisticas } = useQuery({
    queryKey: ['estadisticas-torneo', torneoId],
    queryFn: async () => {
      const response = await api.get(`/torneos/${torneoId}/estadisticas`);
      return response.data;
    },
    enabled: !!torneoId
  });

  // Calcular máximo de tries para las barras de progreso
  useEffect(() => {
    if (estadisticas?.equipos) {
      const max = Math.max(...estadisticas.equipos.map((e: EstadisticaEquipo) => e.tries));
      setMaxTries(max || 1);
    }
  }, [estadisticas]);

  if (loadingTorneo || loadingEstadisticas) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const totalTries = estadisticas?.totales?.tries || 0;
  const totalPuntos = estadisticas?.totales?.puntos || 0;
  const totalTarjetasAmarillas = estadisticas?.totales?.tarjetasAmarillas || 0;
  const totalTarjetasRojas = estadisticas?.totales?.tarjetasRojas || 0;
  const equipoMasAnotador = estadisticas?.equipos?.[0];
  const mejorDefensa = estadisticas?.mejorDefensa;

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f5f5f5',
      pb: 8
    }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        px: 2, 
        py: 1,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Box sx={{ 
          width: 32, 
          height: 32, 
          bgcolor: '#1976d2', 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 1
        }}>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
            UR
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ color: '#424242', fontWeight: 600 }}>
          {torneo?.nombre || 'Torneo'}
        </Typography>
      </Box>

      <Container maxWidth="sm" sx={{ px: 2, py: 3 }}>
        {/* Título principal */}
        <Typography variant="h4" sx={{ 
          color: '#424242', 
          fontWeight: 'bold',
          textAlign: 'center',
          mb: 4
        }}>
          ESTADÍSTICAS DEL TORNEO
        </Typography>

        {/* Totales Generales */}
        <Typography variant="h6" sx={{ 
          color: '#424242', 
          fontWeight: 'bold',
          mb: 2
        }}>
          TOTALES GENERALES
        </Typography>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* Tries marcados */}
          <Grid item xs={4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <CardContent sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ color: '#757575', mb: 1 }}>
                  TRIES MARCADOS
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    {totalTries}
                  </Typography>
                  <Sports sx={{ color: '#1976d2', fontSize: 32 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Puntos anotados */}
          <Grid item xs={4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <CardContent sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ color: '#757575', mb: 1 }}>
                  PUNTOS ANOTADOS
                </Typography>
                <Typography variant="h4" sx={{ color: '#424242', fontWeight: 'bold' }}>
                  {totalPuntos}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Tarjetas */}
          <Grid item xs={4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <CardContent sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ color: '#757575', mb: 1, fontSize: '0.7rem' }}>
                  TARJETAS AM/ROJAS
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#ffa726', fontWeight: 'bold' }}>
                      {totalTarjetasAmarillas}
                    </Typography>
                    <Typography variant="caption">AM</Typography>
                  </Box>
                  <Typography variant="h5" sx={{ color: '#757575' }}>/</Typography>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#ef5350', fontWeight: 'bold' }}>
                      {totalTarjetasRojas}
                    </Typography>
                    <Typography variant="caption">R</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Ranking */}
        <Typography variant="h6" sx={{ 
          color: '#424242', 
          fontWeight: 'bold',
          mb: 2
        }}>
          RANKING
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Equipo más anotador */}
          {equipoMasAnotador && (
            <Grid item xs={6}>
              <Card sx={{ 
                bgcolor: '#1976d2', 
                color: 'white',
                p: 2,
                textAlign: 'center'
              }}>
                <CardContent sx={{ p: 1 }}>
                  <EmojiEvents sx={{ mb: 1 }} />
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    MÁS ANOTADOR
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {equipoMasAnotador.equipoLogo && (
                      <Avatar 
                        src={equipoMasAnotador.equipoLogo} 
                        sx={{ width: 24, height: 24 }}
                      />
                    )}
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {equipoMasAnotador.equipoNombre}
                    </Typography>
                  </Box>
                  <Typography variant="caption">
                    {equipoMasAnotador.tries} tries
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Mejor defensa */}
          {mejorDefensa && (
            <Grid item xs={6}>
              <Card sx={{ 
                bgcolor: '#4caf50', 
                color: 'white',
                p: 2,
                textAlign: 'center'
              }}>
                <CardContent sx={{ p: 1 }}>
                  <Shield sx={{ mb: 1 }} />
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    MEJOR DEFENSA
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {mejorDefensa.equipoLogo && (
                      <Avatar 
                        src={mejorDefensa.equipoLogo} 
                        sx={{ width: 24, height: 24 }}
                      />
                    )}
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {mejorDefensa.equipoNombre}
                    </Typography>
                  </Box>
                  <Typography variant="caption">
                    {mejorDefensa.puntosEnContra} pts en contra
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Tabla de Goleadores */}
        {estadisticas?.goleadores && estadisticas.goleadores.length > 0 && (
          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" sx={{ 
              color: '#424242', 
              fontWeight: 'bold',
              mb: 2
            }}>
              GOLEADORES
            </Typography>
            {estadisticas.goleadores.slice(0, 5).map((goleador: Goleador, index: number) => (
              <Box key={goleador.jugadorId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ color: '#757575', minWidth: 24 }}>
                    {index + 1}
                  </Typography>
                  <Avatar 
                    src={goleador.jugadorFoto} 
                    sx={{ width: 32, height: 32 }}
                  >
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#424242', fontWeight: 600 }}>
                      {goleador.jugadorNombre}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#757575' }}>
                      {goleador.equipoNombre}
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  icon={<Sports />} 
                  label={`${goleador.tries} tries`}
                  color="primary"
                  size="small"
                />
              </Box>
            ))}
          </Paper>
        )}

        {/* Tries anotados por equipo */}
        <Typography variant="h6" sx={{ 
          color: '#424242', 
          fontWeight: 'bold',
          mb: 2
        }}>
          TRIES ANOTADOS POR EQUIPO
        </Typography>

        <Paper sx={{ p: 3 }}>
          {estadisticas?.equipos && estadisticas.equipos.map((equipo: EstadisticaEquipo, index: number) => (
            <Box key={equipo.equipoId} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {equipo.equipoLogo ? (
                    <Avatar 
                      src={equipo.equipoLogo} 
                      sx={{ width: 24, height: 24 }}
                    />
                  ) : (
                    <Box sx={{
                      width: 24,
                      height: 24,
                      bgcolor: '#1976d2',
                      borderRadius: 1
                    }} />
                  )}
                  <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                    {equipo.equipoNombre}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#424242', fontWeight: 'bold' }}>
                  {equipo.tries} tries
                </Typography>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={(equipo.tries / maxTries) * 100}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#1976d2',
                    borderRadius: 4
                  }
                }}
              />
            </Box>
          ))}
        </Paper>
      </Container>
    </Box>
  );
};

export default EstadisticasTorneo;
