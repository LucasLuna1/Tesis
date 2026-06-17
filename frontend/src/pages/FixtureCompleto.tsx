import { asText } from '../utils/text';
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, CircularProgress, Alert, Button, Grid, Card, CardContent, Chip, IconButton, Tooltip, Stack, Paper, Avatar, Collapse, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import { SportsRugby, Schedule, People, Edit, ExpandMore, ExpandLess, ArrowBack, Sports, EmojiEvents } from '@mui/icons-material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { DateUtils } from '../utils/dateUtils';
import { construirUrlImagen } from '../utils/imageUtils';

interface Partido {
  _id: string;
  id?: string;
  tipo?: string;
  estado?: string;
  equipoLocal: { nombre?: string; logo?: string; };
  equipoVisitante: { nombre?: string; logo?: string; };
  resultado?: {
    puntosLocal?: number;
    puntosVisitante?: number;
  };
  fecha?: string;
  hora?: string;
  canchaId?: string;
  ubicacion?: string;
  arbitroId?: string;
  torneo?: {
    _id?: string;
    nombre?: string;
    categoria?: string;
  };
}

interface TorneoConPartidos {
  _id: string;
  nombre: string;
  categoria: string;
  partidos: Partido[];
}

const FixtureCompleto: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  
  const [torneosConPartidos, setTorneosConPartidos] = useState<TorneoConPartidos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [torneosExpandidos, setTorneosExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    cargarTorneosYPartidos();
  }, []);

  const cargarTorneosYPartidos = async () => {
    try {
      setLoading(true);
      
      // Cargar todos los torneos
      const response = await api.get('/torneos');
      const responseData = response.data || {};
      
      // La API devuelve un objeto con la estructura {message, torneos, total}
      const torneosData = responseData.torneos || responseData || [];
      
      
      if (Array.isArray(torneosData)) {
        // Para cada torneo, cargar sus partidos
        const torneosConPartidosPromises = torneosData.map(async (torneo) => {
          try {
            // Usar el id del torneo (puede ser _id o id)
            const torneoId = torneo._id || torneo.id;
            if (!torneoId) {

              return {
                _id: 'unknown',
                nombre: torneo.nombre || 'Torneo sin nombre',
                categoria: asText(torneo.categoria) || 'Sin categoría',
                partidos: []
              };
            }
            
            // Usar el endpoint correcto para obtener partidos del torneo
            const partidosResponse = await api.get(`/partidos?torneoId=${torneoId}`);
            const partidos = partidosResponse.data?.partidos || partidosResponse.data || [];
            
            // Procesar los partidos directamente
            const todosLosPartidos: Partido[] = [];
            if (Array.isArray(partidos)) {
              partidos.forEach((partido: any) => {
                todosLosPartidos.push({
                  ...partido,
                  torneo: {
                    _id: torneoId,
                    nombre: torneo.nombre,
                    categoria: asText(torneo.categoria)
                  }
                });
              });
            }
            
            return {
              _id: torneoId,
              nombre: torneo.nombre,
              categoria: asText(torneo.categoria),
              partidos: todosLosPartidos
            };
          } catch (err) {
            console.error(`Error cargando partidos del torneo ${torneo.nombre}:`, err);
            return {
              _id: torneo._id || torneo.id || 'unknown',
              nombre: torneo.nombre,
              categoria: asText(torneo.categoria),
              partidos: []
            };
          }
        });
        
        const torneosConPartidos = await Promise.all(torneosConPartidosPromises);
        setTorneosConPartidos(torneosConPartidos);
      } else {

        setTorneosConPartidos([]);
      }
    } catch (err) {
      console.error('Error cargando torneos:', err);
      setError('Error al cargar los torneos y partidos');
      setTorneosConPartidos([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePartidoClick = (partido: Partido) => {
    const partidoId = partido._id || partido.id;
    if (partidoId) {
      navigate(`/partidos/${partidoId}`);
    }
  };

  const toggleTorneo = (torneoId: string) => {
    setTorneosExpandidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(torneoId)) {
        newSet.delete(torneoId);
      } else {
        newSet.add(torneoId);
      }
      return newSet;
    });
  };

  const getEstadoColor = (estado?: string) => {
    switch (estado) {
      case 'finalizado':
        return 'success';
      case 'En Curso':
      case 'en_curso':
        return 'warning';
      case 'programado':
        return 'info';
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEstadoText = (estado?: string) => {
    switch (estado) {
      case 'finalizado':
        return 'Finalizado';
      case 'En Curso':
      case 'en_curso':
        return 'En Curso';
      case 'programado':
        return 'Programado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado || 'Desconocido';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 4,
        p: 2,
        bgcolor: darkMode ? 'grey.800' : 'grey.50',
        borderRadius: 2
      }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Fixture Completo
        </Typography>
      </Box>

      {torneosConPartidos.length === 0 ? (
        <Alert severity="info">No hay torneos disponibles en el fixture completo.</Alert>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {torneosConPartidos.map((torneo, index) => {
            const isExpanded = torneosExpandidos.has(torneo._id);
            return (
              <React.Fragment key={torneo._id || `torneo-${index}`}>
                {/* Header del Torneo - Clickable */}
                <ListItemButton
                  onClick={() => toggleTorneo(torneo._id)}
                  sx={{
                    bgcolor: darkMode ? 'grey.800' : 'grey.100',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      bgcolor: darkMode ? 'grey.700' : 'grey.200'
                    }
                  }}
                >
                  <ListItemIcon>
                    <EmojiEvents sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {torneo.nombre}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {asText(torneo.categoria)} • {torneo.partidos.length} partidos
                      </Typography>
                    }
                  />
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                {/* Submenu de Partidos */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {torneo.partidos.length === 0 ? (
                      <ListItem sx={{ pl: 4 }}>
                        <Alert severity="info" sx={{ width: '100%' }}>
                          No hay partidos disponibles para este torneo.
                        </Alert>
                      </ListItem>
                    ) : (
                      torneo.partidos.map((partido, partidoIndex) => (
                        <ListItemButton
                          key={partido._id || partido.id || `partido-${torneo._id}-${partidoIndex}`}
                          sx={{ pl: 4, py: 1 }}
                          onClick={() => handlePartidoClick(partido)}
                        >
                          <ListItemIcon>
                            <Sports sx={{ color: 'text.secondary' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                  {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Sin nombre' : partido.equipoLocal || 'Sin nombre'} vs {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Sin nombre' : partido.equipoVisitante || 'Sin nombre'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {partido.estado === 'finalizado' && (
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                      {partido.resultado?.puntosLocal || 0} - {partido.resultado?.puntosVisitante || 0}
                                    </Typography>
                                  )}
                                  <Chip
                                    label={getEstadoText(partido.estado)}
                                    size="small"
                                    color={getEstadoColor(partido.estado)}
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                  📅 {partido.fecha ? DateUtils.formatDateForDisplay(partido.fecha) : 'Fecha no definida'} - {partido.hora || 'Hora no definida'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                  🏟️ {partido.canchaId || 'Cancha no definida'}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItemButton>
                      ))
                    )}
                  </List>
                </Collapse>
                <Divider sx={{ my: 1 }} />
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Container>
  );
};

export default FixtureCompleto;