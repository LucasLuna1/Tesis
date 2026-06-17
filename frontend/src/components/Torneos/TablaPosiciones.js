import React, { useState, useEffect, useCallback } from 'react';
import { getImageUrl } from '../../services/api';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { torneosGestionService } from '../../services/api';

const TablaPosiciones = ({ torneoId, torneoNombre }) => {
  const [tablaPosiciones, setTablaPosiciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTablaPosiciones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await torneosGestionService.getTable(torneoId);
      setTablaPosiciones(response.data.tablaPosiciones || []);
    } catch (error) {
      console.error('Error cargando tabla de posiciones:', error);
      setError('Error cargando tabla de posiciones');
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    if (torneoId) {
      loadTablaPosiciones();
    }
  }, [torneoId, loadTablaPosiciones]);

  const getPosicionIcon = (posicion) => {
    if (posicion === 1) return <EmojiEvents color="primary" />;
    if (posicion <= 3) return <TrendingUp color="success" />;
    return <TrendingDown color="action" />;
  };

  const getPosicionColor = (posicion) => {
    if (posicion === 1) return 'primary';
    if (posicion <= 3) return 'success';
    return 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  if (tablaPosiciones.length === 0) {
    return (
      <Alert severity="info">
        No hay datos de tabla de posiciones disponibles
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <EmojiEvents color="primary" />
          <Typography variant="h6">
            Tabla de Posiciones - {torneoNombre}
          </Typography>
        </Box>

        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Pos
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  Equipo
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  PJ
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  PG
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  PE
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  PP
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  PF
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  PC
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Dif
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Pts
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Bonus
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tablaPosiciones.map((equipo, index) => (
                <TableRow 
                  key={equipo.equipoId}
                  sx={{ 
                    backgroundColor: index < 3 ? 'rgba(76, 175, 80, 0.1)' : 'inherit',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                  }}
                >
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      {getPosicionIcon(equipo.posicion)}
                      <Typography variant="subtitle2" fontWeight="bold">
                        {equipo.posicion}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {equipo.logo && (
                        <Avatar 
                          src={getImageUrl(equipo.logo)} 
                          alt={equipo.nombre}
                          sx={{ width: 32, height: 32 }}
                        />
                      )}
                      <Typography variant="subtitle2" fontWeight="bold">
                        {equipo.nombre}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {equipo.partidosJugados}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      {equipo.partidosGanados}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="warning.main">
                      {equipo.partidosEmpatados}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="error.main">
                      {equipo.partidosPerdidos}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="bold">
                      {equipo.puntosAFavor}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {equipo.puntosEnContra}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      color={equipo.diferenciaPuntos > 0 ? 'success.main' : equipo.diferenciaPuntos < 0 ? 'error.main' : 'text.primary'}
                    >
                      {equipo.diferenciaPuntos > 0 ? '+' : ''}{equipo.diferenciaPuntos}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={equipo.puntosTabla} 
                      color={getPosicionColor(equipo.posicion)}
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={0.5} justifyContent="center">
                      {equipo.bonusOfensivo > 0 && (
                        <Chip 
                          label="O" 
                          size="small" 
                          color="info" 
                          variant="outlined"
                          title="Bonus Ofensivo"
                        />
                      )}
                      {equipo.bonusDefensivo > 0 && (
                        <Chip 
                          label="D" 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                          title="Bonus Defensivo"
                        />
                      )}
                      {equipo.bonusOfensivo === 0 && equipo.bonusDefensivo === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Leyenda:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • PJ: Partidos Jugados | PG: Partidos Ganados | PE: Partidos Empatados | PP: Partidos Perdidos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • PF: Puntos a Favor | PC: Puntos en Contra | Dif: Diferencia | Pts: Puntos
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Sistema de Puntos:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Victoria: 4 puntos | Empate: 2 puntos | Derrota: 0 puntos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Bonus Ofensivo (O): 1 punto por anotar 4+ tries
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Bonus Defensivo (D): 1 punto por perder por 7 puntos o menos
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TablaPosiciones;
