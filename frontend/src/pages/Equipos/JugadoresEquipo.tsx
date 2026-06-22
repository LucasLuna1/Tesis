import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Email,
  Phone,
  SportsRugby,
  Badge
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getImageUrl } from '../../services/api';
import toast from 'react-hot-toast';

interface Jugador {
  jugadorId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  foto: string;
  posicion: string;
  categoria: string;
  numero?: number;
}

interface Equipo {
  id: string;
  nombre: string;
  club: string;
  logo: string;
  ciudad: string;
  pais: string;
  descripcion: string;
}

const JugadoresEquipo: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar información del equipo
      const equipoResponse = await api.get(`/equipos/${id}`);
      setEquipo(equipoResponse.data);
      
      // Cargar jugadores del equipo
      const jugadoresResponse = await api.get(`/equipos/${id}/jugadores`);
      setJugadores(jugadoresResponse.data.jugadores || []);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar información del equipo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando jugadores...
        </Typography>
      </Container>
    );
  }

  if (!equipo) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Equipo no encontrado</Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate('/equipos')}
        >
          Volver a Equipos
        </Button>
      </Container>
    );
  }

  // Agrupar jugadores por categoría
  const jugadoresPorCategoria = jugadores.reduce((acc: any, jugador: Jugador) => {
    const categoria = jugador.categoria || 'Sin categoría';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(jugador);
    return acc;
  }, {});

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/equipos')}
          sx={{ mb: 2 }}
        >
          Volver a Equipos
        </Button>
      </Box>

      {/* Información del Equipo */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={equipo.logo ? getImageUrl(equipo.logo) : ''}
              sx={{ width: 100, height: 100 }}
            >
              <SportsRugby sx={{ fontSize: 50 }} />
            </Avatar>
          </Grid>
          
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              {equipo.nombre}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {equipo.club}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip label={`${equipo.ciudad}, ${equipo.pais}`} size="small" />
              <Chip 
                icon={<Person />} 
                label={`${jugadores.length} Jugadores`} 
                color="primary" 
                size="small" 
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Jugadores por Categoría */}
      {jugadores.length === 0 ? (
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <Person sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Este equipo aún no tiene jugadores registrados
          </Typography>
        </Paper>
      ) : (
        <>
          {Object.entries(jugadoresPorCategoria).map(([categoria, jugadoresCategoria]: [string, any]) => (
            <Paper key={categoria} elevation={3} sx={{ mb: 3, p: 3 }}>
              <Typography variant="h5" gutterBottom color="primary">
                {categoria}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {jugadoresCategoria.length} {jugadoresCategoria.length === 1 ? 'jugador' : 'jugadores'}
              </Typography>
              
              <List>
                {jugadoresCategoria.map((jugador: Jugador, index: number) => (
                  <React.Fragment key={jugador.jugadorId || index}>
                    <ListItem
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => navigate(`/jugadores/${jugador.jugadorId}`)}
                    >
                      <ListItemAvatar>
                        <Avatar src={jugador.foto ? getImageUrl(jugador.foto) : ''}>
                          {jugador.nombre?.charAt(0)}{jugador.apellido?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {jugador.nombre} {jugador.apellido}
                            </Typography>
                            {jugador.numero && (
                              <Chip 
                                icon={<Badge />} 
                                label={`#${jugador.numero}`} 
                                size="small" 
                                color="secondary"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            {jugador.posicion && (
                              <Chip 
                                icon={<SportsRugby />} 
                                label={jugador.posicion} 
                                size="small" 
                                sx={{ mr: 1, mt: 0.5 }}
                              />
                            )}
                            {jugador.email && (
                              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                <Email sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                {jugador.email}
                              </Typography>
                            )}
                            {jugador.telefono && (
                              <Typography variant="caption" display="block">
                                <Phone sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                {jugador.telefono}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    
                    {index < jugadoresCategoria.length - 1 && <Box sx={{ height: 8 }} />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          ))}
        </>
      )}
    </Container>
  );
};

export default JugadoresEquipo;

