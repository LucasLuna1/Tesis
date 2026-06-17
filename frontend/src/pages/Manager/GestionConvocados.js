import { asText } from '../../utils/text';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  Stack
} from '@mui/material';
import {
  CalendarToday,
  SportsRugby,
  Group,
  Person,
  Event,
  AccessTime,
  People,
  CheckCircle
} from '@mui/icons-material';
import api from '../../services/api';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

const GestionConvocados = () => {
  const { darkMode } = useCustomTheme();
  const [partidosProximos, setPartidosProximos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState([]);
  const [convocados, setConvocados] = useState(null);
  const [convocadosExistentes, setConvocadosExistentes] = useState({}); // { [partidoId]: { id } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para el diálogo
  const [openDialog, setOpenDialog] = useState(false);
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [jugadoresSeleccionados, setJugadoresSeleccionados] = useState([]);
  
  // Estados para selección
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  // Cargar equipos del manager y extraer categorías
  const cargarEquipos = useCallback(async () => {
    try {
      const response = await api.get('/managers/mis-equipos');
      const equiposData = response.data.equipos || [];
      
      // Extraer todas las categorías únicas de los equipos
      const categoriasUnicas = new Set();
      equiposData.forEach(equipo => {
        if (equipo.categorias && Array.isArray(equipo.categorias)) {
          equipo.categorias.forEach(categoria => {
            categoriasUnicas.add(categoria);
          });
        } else if (equipo.categorias && typeof equipo.categorias === 'string') {
          categoriasUnicas.add(equipo.categorias);
        }
      });
      
      // Convertir Set a Array y ordenar
      const categoriasArray = Array.from(categoriasUnicas).sort();
      setCategorias(categoriasArray);
      
      if (categoriasArray.length === 0) {
        setError('No se encontraron categorías en tus equipos. Verifica que tus equipos tengan categorías asignadas.');
      }
      
    } catch (error) {
      console.error('Error cargando equipos:', error);
      setError('Error al cargar los equipos. Verifica tu conexión.');
    }
  }, []);

  // Helpers para normalizar strings cuando llegan objetos { id, nombre }
  const getNombreEquipo = (equipo, fallback = 'Equipo') => {
    if (!equipo) return fallback;
    if (typeof equipo === 'string') return equipo;
    if (typeof equipo === 'object') return equipo.nombre || equipo.id || fallback;
    return fallback;
  };

  // Cargar partidos próximos de equipos por categoría
  const cargarPartidosProximos = async (categoria) => {
    try {
      setLoading(true);
      

      // Usar el nuevo endpoint que obtiene todos los partidos del manager de una vez
      const response = await api.get(`/managers/partidos-proximos?categoria=${encodeURIComponent(categoria)}`);
      const partidos = response.data.partidos || [];
      

      setPartidosProximos(partidos);

      // Prefetch: verificar si ya existe lista de convocados para cada partido
      const existencias = {};
      await Promise.all(partidos.map(async (p) => {
        const equipoId = p.esLocal ? p.equipoLocalId : p.equipoVisitanteId;
        try {
          const res = await api.get(`/managers/convocados/partido/${p.id}/equipo/${equipoId}`);
          if (res.data && res.data.id) {
            existencias[p.id] = { id: res.data.id };
          }
        } catch (e) {
          // 404: no existe lista aún -> ignorar
        }
      }));
      setConvocadosExistentes(existencias);
    } catch (error) {
      console.error('Error cargando partidos próximos:', error);
      setError('Error al cargar los partidos próximos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar jugadores disponibles de un equipo por categoría
  const cargarJugadoresDisponibles = async (equipoId, categoria) => {
    try {
      const response = await api.get(`/managers/equipos/${equipoId}/jugadores?categoria=${categoria}`);
      setJugadoresDisponibles(response.data.jugadores || []);
    } catch (error) {
      console.error('Error cargando jugadores:', error);
      setError('Error al cargar los jugadores');
    }
  };

  // Cargar convocados existentes
  const cargarConvocados = async (partidoId, equipoId) => {
    try {
      const response = await api.get(`/managers/convocados/partido/${partidoId}/equipo/${equipoId}`);
      setConvocados(response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        setConvocados(null);
        return null;
      } else if (error.response?.status === 403) {
        // Sin permisos: no bloquear la UI, solo indicar que no hay lista editable

        setConvocados(null);
        return null;
      } else {
        console.error('Error cargando convocados:', error);
        setError('Error al cargar los convocados');
        return null;
      }
    }
  };

  // Abrir diálogo para crear/editar convocados
  const abrirDialogoConvocados = async (partido) => {
    setPartidoSeleccionado(partido);
    setEquipoSeleccionado(partido.esLocal ? partido.equipoLocalId : partido.equipoVisitanteId);
    
    // Cargar jugadores disponibles
    await cargarJugadoresDisponibles(
      partido.esLocal ? partido.equipoLocalId : partido.equipoVisitanteId,
      partido.categoria
    );
    
    // Cargar convocados existentes si los hay
    const conv = await cargarConvocados(
      partido.id,
      partido.esLocal ? partido.equipoLocalId : partido.equipoVisitanteId
    );
    
    if (conv) {
      setJugadoresSeleccionados(conv.jugadores || []);
    } else {
      setJugadoresSeleccionados([]);
    }
    
    setOpenDialog(true);
  };

  // Guardar convocados
  const guardarConvocados = async () => {
    try {
      if (jugadoresSeleccionados.length === 0) {
        toast.error('Debes seleccionar al menos un jugador');
        return;
      }

      const convocadosData = {
        partidoId: partidoSeleccionado.id,
        equipoId: equipoSeleccionado,
        jugadores: jugadoresSeleccionados
      };

      if (convocados && convocados.id) {
        // Actualizar convocados existentes
        await api.put(`/managers/convocados/${convocados.id}`, convocadosData);
        toast.success('Lista de convocados actualizada');
      } else {
        // Crear nuevos convocados
        try {
          await api.post('/managers/convocados', convocadosData);
          toast.success('Lista de convocados creada');
        } catch (err) {
          if (err.response?.status === 409) {
            toast.success('Ya existe una lista. Abriendo para editar.');
            // Guardar referencia y abrir en modo edición
            const existente = err.response.data;
            setConvocados({ id: existente.existenteId, ...existente.existente });
            // Hacer una actualización inmediata con lo seleccionado
            await api.put(`/managers/convocados/${existente.existenteId}`, convocadosData);
            toast.success('Lista de convocados actualizada');
          } else {
            throw err;
          }
        }
      }

      setOpenDialog(false);
      setPartidoSeleccionado(null);
      setEquipoSeleccionado(null);
      setJugadoresSeleccionados([]);
      setConvocados(null);
      
      // Recargar partidos próximos de la categoría seleccionada
      if (categoriaSeleccionada) {
        await cargarPartidosProximos(categoriaSeleccionada);
      }

    } catch (error) {
      console.error('Error guardando convocados:', error);
      toast.error('Error al guardar los convocados');
    }
  };

  // Toggle selección de jugador
  const toggleJugador = (jugador) => {
    setJugadoresSeleccionados(prev => {
      const existe = prev.find(j => j.id === jugador.id);
      if (existe) {
        return prev.filter(j => j.id !== jugador.id);
      } else {
        return [...prev, jugador];
      }
    });
  };

  useEffect(() => {
    cargarEquipos();
  }, [cargarEquipos]);

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: darkMode ? '#e0e0e0' : '#212121', mb: 2 }}>
          Gestión de Convocados
        </Typography>
        <Typography variant="body1" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
          Selecciona una categoría para ver los partidos próximos y crear listas de convocados
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Selector de categoría */}
      <Paper 
        elevation={darkMode ? 3 : 2} 
        sx={{ 
          p: 3, 
          mb: 3, 
          bgcolor: darkMode ? '#2d2d2d' : 'white',
          border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: darkMode ? '#e0e0e0' : '#212121' }}>
          Seleccionar Categoría
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="categoria-select-label">Categoría</InputLabel>
          <Select
            labelId="categoria-select-label"
            id="categoria-select"
            value={categoriaSeleccionada}
            label="Categoría"
            onChange={(e) => {
              const categoria = e.target.value;
              setCategoriaSeleccionada(categoria);
              cargarPartidosProximos(categoria);
            }}
            disabled={loading}
          >
            {categorias.length === 0 ? (
              <MenuItem disabled>No hay categorías disponibles</MenuItem>
            ) : (
              categorias.map((categoria) => (
                <MenuItem key={asText(categoria)} value={categoria}>
                  {asText(categoria)}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Paper>

      {/* Lista de partidos próximos */}
      {!categoriaSeleccionada ? (
        <Paper 
          elevation={darkMode ? 3 : 2} 
          sx={{ 
            p: 4, 
            mb: 3, 
            bgcolor: darkMode ? '#2d2d2d' : 'white',
            border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0',
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
            Selecciona una categoría para ver los partidos próximos
          </Typography>
        </Paper>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Información de la categoría seleccionada */}
          <Paper 
            elevation={darkMode ? 3 : 2} 
            sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: darkMode ? '#2d2d2d' : 'white',
              border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
            }}
          >
            <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#212121', mb: 1 }}>
              Partidos de la categoría: {categoriaSeleccionada}
            </Typography>
            <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
              {partidosProximos.length} partido{partidosProximos.length !== 1 ? 's' : ''} encontrado{partidosProximos.length !== 1 ? 's' : ''}
            </Typography>
          </Paper>

          <Grid container spacing={3}>
            {partidosProximos.map((partido) => (
            <Grid item xs={12} md={6} key={partido.id}>
              <Card 
                sx={{ 
                  bgcolor: darkMode ? '#2d2d2d' : 'white',
                  border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: darkMode ? 4 : 6
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: darkMode ? '#e0e0e0' : '#212121' }}>
                      {partido.esLocal ? 
                        `${getNombreEquipo(partido.equipoLocal, 'Equipo Local')} vs ${getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}` :
                        `${getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')} vs ${getNombreEquipo(partido.equipoLocal, 'Equipo Local')}`
                      }
                    </Typography>
                    <Chip 
                      label={asText(partido.categoria)} 
                      color="primary" 
                      size="small"
                      icon={<SportsRugby />}
                    />
                  </Box>

                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday fontSize="small" color="primary" />
                      <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                        {formatFecha(partido.fecha)} - {partido.horaInicio}
                      </Typography>
                    </Box>
                  </Stack>

                  {partido.cancha && (
                    <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575', mb: 2 }}>
                      Cancha: {typeof partido.cancha === 'object' ? partido.cancha.nombre : partido.cancha}
                    </Typography>
                  )}

                  {partido.torneoNombre && (
                    <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575', mb: 2 }}>
                      Torneo: {partido.torneoNombre}
                    </Typography>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<Group />}
                    onClick={() => abrirDialogoConvocados(partido)}
                    fullWidth
                    sx={{ 
                      bgcolor: darkMode ? '#1976d2' : '#2196f3',
                      '&:hover': {
                        bgcolor: darkMode ? '#1565c0' : '#1976d2'
                      }
                    }}
                  >
                    {convocadosExistentes[partido.id] ? 'Editar lista' : 'Gestionar Convocados'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          </Grid>
        </>
      )}

      {/* Diálogo para gestionar convocados - Diseño mejorado */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: darkMode ? '#1e1e1e' : 'white',
            borderRadius: 4,
            border: darkMode ? '1px solid #333' : '1px solid #e0e0e0',
            boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }
        }}
      >
        {/* Header del diálogo con gradiente */}
        <Box sx={{
          background: darkMode 
            ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
            : 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
          color: 'white',
          p: 3,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255,255,255,0.2)'
          }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {convocados ? 'Editar Convocados' : 'Crear Lista de Convocados'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Selecciona los jugadores que participarán en el partido
              </Typography>
            </Box>
          </Box>
          
          {partidoSeleccionado && (
            <Paper sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              p: 2,
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <SportsRugby sx={{ fontSize: 20, opacity: 0.9 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {partidoSeleccionado.esLocal ? 
                    `${getNombreEquipo(partidoSeleccionado.equipoLocal, 'Equipo Local')} vs ${getNombreEquipo(partidoSeleccionado.equipoVisitante, 'Equipo Visitante')}` :
                    `${getNombreEquipo(partidoSeleccionado.equipoVisitante, 'Equipo Visitante')} vs ${getNombreEquipo(partidoSeleccionado.equipoLocal, 'Equipo Local')}`
                  }
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Event sx={{ fontSize: 16, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {formatFecha(partidoSeleccionado.fecha)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime sx={{ fontSize: 16, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {partidoSeleccionado.horaInicio}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={asText(partidoSeleccionado.categoria)}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 600,
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
        
        <DialogContent sx={{ p: 0 }}>
          {/* Sección de jugadores */}
          <Box sx={{ p: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 3,
              pb: 2,
              borderBottom: darkMode ? '1px solid #333' : '1px solid #e0e0e0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  bgcolor: darkMode ? '#1976d2' : '#2196f3',
                  borderRadius: 2,
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <People sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: darkMode ? '#e0e0e0' : '#212121' }}>
                    Jugadores Disponibles
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                    {jugadoresSeleccionados.length} de {jugadoresDisponibles.length} seleccionados
                  </Typography>
                </Box>
              </Box>
              
              {jugadoresSeleccionados.length > 0 && (
                <Chip
                  label={`${jugadoresSeleccionados.length} seleccionados`}
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>

            {/* Lista de jugadores mejorada */}
            <Box sx={{ 
              maxHeight: 450, 
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: darkMode ? '#2d2d2d' : '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: darkMode ? '#555' : '#c1c1c1',
                borderRadius: '4px',
                '&:hover': {
                  background: darkMode ? '#777' : '#a8a8a8',
                },
              },
            }}>
              {jugadoresDisponibles.map((jugador, index) => {
                const seleccionado = jugadoresSeleccionados.find(j => j.id === jugador.id);
                return (
                  <Paper
                    key={jugador.id}
                    elevation={0}
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: 3,
                      border: seleccionado 
                        ? (darkMode ? '2px solid #1976d2' : '2px solid #2196f3')
                        : (darkMode ? '1px solid #333' : '1px solid #e0e0e0'),
                      bgcolor: seleccionado 
                        ? (darkMode ? 'rgba(25, 118, 210, 0.1)' : 'rgba(33, 150, 243, 0.05)')
                        : (darkMode ? '#2d2d2d' : '#fafafa'),
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer',
                      '&:hover': {
                        border: seleccionado 
                          ? (darkMode ? '2px solid #1976d2' : '2px solid #2196f3')
                          : (darkMode ? '1px solid #555' : '1px solid #c0c0c0'),
                        transform: 'translateY(-1px)',
                        boxShadow: darkMode 
                          ? '0 4px 12px rgba(0,0,0,0.3)' 
                          : '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    }}
                    onClick={() => toggleJugador(jugador)}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!seleccionado}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleJugador(jugador);
                          }}
                          color="primary"
                          sx={{
                            '&.Mui-checked': {
                              color: darkMode ? '#1976d2' : '#2196f3'
                            }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%' }}>
                          <Avatar 
                            src={jugador.foto} 
                            sx={{ 
                              width: 56, 
                              height: 56,
                              border: seleccionado 
                                ? (darkMode ? '3px solid #1976d2' : '3px solid #2196f3')
                                : (darkMode ? '2px solid #333' : '2px solid #e0e0e0'),
                              boxShadow: darkMode 
                                ? '0 2px 8px rgba(0,0,0,0.3)' 
                                : '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Person sx={{ fontSize: 28 }} />
                          </Avatar>
                          
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 600, 
                              color: darkMode ? '#e0e0e0' : '#212121',
                              mb: 0.5
                            }}>
                              {jugador.nombre} {jugador.apellido}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                              {jugador.posicion && (
                                <Chip
                                  label={jugador.posicion}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    borderColor: darkMode ? '#555' : '#c0c0c0',
                                    color: darkMode ? '#a0a0a0' : '#757575',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                              {jugador.numero && (
                                <Chip
                                  label={`#${jugador.numero}`}
                                  size="small"
                                  sx={{
                                    bgcolor: darkMode ? '#333' : '#f0f0f0',
                                    color: darkMode ? '#e0e0e0' : '#212121',
                                    fontWeight: 600,
                                    minWidth: '40px'
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          
                          {seleccionado && (
                            <Box sx={{
                              bgcolor: darkMode ? '#1976d2' : '#2196f3',
                              borderRadius: '50%',
                              p: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                          )}
                        </Box>
                      }
                      sx={{
                        width: '100%',
                        margin: 0,
                        '& .MuiFormControlLabel-label': {
                          width: '100%'
                        }
                      }}
                    />
                  </Paper>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        
        {/* Footer del diálogo mejorado */}
        <Box sx={{
          p: 3,
          borderTop: darkMode ? '1px solid #333' : '1px solid #e0e0e0',
          bgcolor: darkMode ? '#1e1e1e' : '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
            {jugadoresSeleccionados.length === 0 
              ? 'Selecciona al menos un jugador para continuar'
              : `${jugadoresSeleccionados.length} jugador${jugadoresSeleccionados.length !== 1 ? 'es' : ''} seleccionado${jugadoresSeleccionados.length !== 1 ? 's' : ''}`
            }
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              variant="outlined"
              sx={{
                borderColor: darkMode ? '#555' : '#c0c0c0',
                color: darkMode ? '#e0e0e0' : '#212121',
                '&:hover': {
                  borderColor: darkMode ? '#777' : '#a0a0a0',
                  bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={guardarConvocados}
              variant="contained"
              disabled={jugadoresSeleccionados.length === 0}
              startIcon={<CheckCircle />}
              sx={{
                bgcolor: darkMode ? '#1976d2' : '#2196f3',
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: darkMode ? '#1565c0' : '#1976d2'
                },
                '&:disabled': {
                  bgcolor: darkMode ? '#333' : '#e0e0e0',
                  color: darkMode ? '#666' : '#999'
                }
              }}
            >
              {convocados ? 'Actualizar Lista' : 'Crear Lista'}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
};

export default GestionConvocados;
