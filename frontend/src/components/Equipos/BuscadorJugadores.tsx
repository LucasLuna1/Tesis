import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Avatar,
  Typography,
  Chip,
  Button,
  Paper
} from '@mui/material';
import {
  Search,
  Person,
  SportsRugby
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  posicion: string;
  equipo: string;
  equipoId: string;
  equipoLogo?: string;
  foto?: string;
  tries: number;
  partidosJugados: number;
  categoria: string[];
}

const posiciones = [
  'Todas',
  'Pilar',
  'Hooker',
  'Segunda línea',
  'Ala',
  'Octavo',
  'Medio scrum',
  'Apertura',
  'Centro',
  'Wing',
  'Fullback'
];

export const BuscadorJugadores: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [posicionFiltro, setPosicionFiltro] = useState('Todas');
  const [equipoFiltro, setEquipoFiltro] = useState('Todos');
  const [minTries, setMinTries] = useState<number | ''>('');

  // Obtener todos los jugadores
  const { data: jugadores = [], isLoading } = useQuery({
    queryKey: ['jugadores-busqueda'],
    queryFn: async () => {
      const response = await api.get('/jugadores');
      return response.data;
    }
  });

  // Obtener equipos para filtro
  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos'],
    queryFn: async () => {
      const response = await api.get('/equipos');
      return response.data;
    }
  });

  // Filtrar jugadores
  const jugadoresFiltrados = jugadores.filter((jugador: Jugador) => {
    const nombreCompleto = `${jugador.nombre} ${jugador.apellido}`.toLowerCase();
    const coincideNombre = nombreCompleto.includes(busqueda.toLowerCase());
    const coincidePosicion = posicionFiltro === 'Todas' || jugador.posicion === posicionFiltro;
    const coincideEquipo = equipoFiltro === 'Todos' || jugador.equipoId === equipoFiltro;
    const coincideTries = minTries === '' || jugador.tries >= minTries;

    return coincideNombre && coincidePosicion && coincideEquipo && coincideTries;
  });

  const limpiarFiltros = () => {
    setBusqueda('');
    setPosicionFiltro('Todas');
    setEquipoFiltro('Todos');
    setMinTries('');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
        Buscador de Jugadores
      </Typography>

      {/* Filtros - Reducido según feedback */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Buscar por nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Posición</InputLabel>
              <Select
                value={posicionFiltro}
                label="Posición"
                onChange={(e) => setPosicionFiltro(e.target.value)}
              >
                {posiciones.map((pos) => (
                  <MenuItem key={pos} value={pos}>
                    {pos}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Equipo</InputLabel>
              <Select
                value={equipoFiltro}
                label="Equipo"
                onChange={(e) => setEquipoFiltro(e.target.value)}
              >
                <MenuItem value="Todos">Todos</MenuItem>
                {equipos.map((equipo: any) => (
                  <MenuItem key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Tries mínimos"
              value={minTries}
              onChange={(e) => setMinTries(e.target.value ? parseInt(e.target.value) : '')}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={limpiarFiltros}
              size="small"
              sx={{ height: '40px' }}
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Resultados */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        {jugadoresFiltrados.length} jugador(es) encontrado(s)
      </Typography>

      {isLoading ? (
        <Typography>Cargando...</Typography>
      ) : (
        <Grid container spacing={2}>
          {jugadoresFiltrados.map((jugador: Jugador) => (
            <Grid item xs={12} sm={6} md={4} key={jugador.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={jugador.foto}
                      sx={{ width: 60, height: 60, mr: 2 }}
                    >
                      <Person />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {jugador.nombre} {jugador.apellido}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {jugador.posicion}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {jugador.equipoLogo && (
                      <img
                        src={jugador.equipoLogo}
                        alt={jugador.equipo}
                        style={{ width: 24, height: 24, marginRight: 8 }}
                      />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {jugador.equipo}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      icon={<SportsRugby />}
                      label={`${jugador.tries} Tries`}
                      size="small"
                      color="primary"
                    />
                    <Chip
                      label={`${jugador.partidosJugados} Partidos`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {jugador.categoria?.map((cat) => (
                      <Chip
                        key={cat}
                        label={cat}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    sx={{ mt: 2 }}
                    href={`/jugadores/${jugador.id}`}
                  >
                    Ver Perfil Completo
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default BuscadorJugadores;



