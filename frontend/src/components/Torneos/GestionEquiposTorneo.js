import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  TextField,
  InputAdornment,
  Paper,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  SportsRugby as SportsRugbyIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { equiposService } from '../../services/api';
import { torneosEquiposService } from '../../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../services/api';

const GestionEquiposTorneo = ({ 
  open, 
  onClose, 
  torneo, 
  onEquiposUpdated 
}) => {
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [equiposTorneo, setEquiposTorneo] = useState([]);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoEquipos, setCargandoEquipos] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar equipos disponibles (que coincidan con la categoría del torneo)
  const loadEquiposDisponibles = useCallback(async () => {
    try {
      setCargandoEquipos(true);

      // Cargar TODOS los equipos (sin filtro previo) para asegurar que se incluyan todos
      const todosLosEquipos = await equiposService.getAll({});

      // Buscar específicamente "San Martin"
      const sanMartin = todosLosEquipos.find(e => e.nombre?.toLowerCase().includes('san martin'));
      if (sanMartin) {

      } else {

      }
      
      // Filtrar en el cliente por categoría
      const equiposFiltrados = todosLosEquipos.filter(equipo => {
        const tieneCategoria = equipo.categorias && equipo.categorias.includes(torneo?.categoria);
        if (equipo.nombre?.toLowerCase().includes('san martin')) {

        }
        return tieneCategoria;
      });

      setEquiposDisponibles(equiposFiltrados);
    } catch (error) {
      console.error('❌ Error cargando equipos disponibles:', error);
      toast.error('Error cargando equipos disponibles');
    } finally {
      setCargandoEquipos(false);
    }
  }, [torneo?.categoria]);

  // Cargar equipos del torneo
  const loadEquiposTorneo = useCallback(async () => {
    if (!torneo?.id) return;
    
    try {
      setLoading(true);
      const response = await torneosEquiposService.getTeams(torneo.id);
      setEquiposTorneo(response.data.equipos || []);
    } catch (error) {
      console.error('Error cargando equipos del torneo:', error);
      toast.error('Error cargando equipos del torneo');
    } finally {
      setLoading(false);
    }
  }, [torneo?.id]);

  useEffect(() => {
    if (open && torneo) {
      loadEquiposDisponibles();
      loadEquiposTorneo();
    }
  }, [open, torneo, loadEquiposDisponibles, loadEquiposTorneo]);

  // Filtrar equipos disponibles
  const equiposFiltrados = equiposDisponibles.filter(equipo => {
    // Filtrar por búsqueda de nombre
    if (searchTerm && !equipo.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtrar por categoría adicional si está seleccionada
    if (filtroCategoria && !equipo.categorias?.includes(filtroCategoria)) {
      return false;
    }
    
    // Excluir equipos que ya están en el torneo
    return !equiposTorneo.some(et => et.id === equipo.id);
  });

  const handleAgregarEquipos = async () => {
    if (equiposSeleccionados.length === 0) {
      toast.warning('Selecciona al menos un equipo');
      return;
    }

    try {
      setLoading(true);
      const response = await torneosEquiposService.addTeams(torneo.id, equiposSeleccionados);
      
      toast.success(response.data.message);
      setEquiposSeleccionados([]);
      loadEquiposTorneo();
      onEquiposUpdated?.();
    } catch (error) {
      console.error('Error agregando equipos:', error);
      toast.error(error.response?.data?.error || 'Error agregando equipos');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverEquipo = async (equipoId) => {
    try {
      setLoading(true);
      const response = await torneosEquiposService.removeTeams(torneo.id, [equipoId]);
      
      toast.success(response.data.message);
      loadEquiposTorneo();
      onEquiposUpdated?.();
    } catch (error) {
      console.error('Error removiendo equipo:', error);
      toast.error(error.response?.data?.error || 'Error removiendo equipo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEquiposSeleccionados([]);
    setFiltroCategoria('');
    setSearchTerm('');
    onClose();
  };

  const handleToggleEquipo = (equipoId) => {
    setEquiposSeleccionados(prev => 
      prev.includes(equipoId) 
        ? prev.filter(id => id !== equipoId)
        : [...prev, equipoId]
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
          backgroundImage: 'none',
          height: '95vh',
          m: { xs: 1, sm: 1 }
        }
      }}
    >
      {/* Header Compacto */}
      <DialogTitle sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        background: 'linear-gradient(135deg, rgba(211,47,47,0.1) 0%, rgba(211,47,47,0.05) 100%)',
        py: { xs: 1.5, sm: 2 },
        px: { xs: 2, sm: 3 }
      }}>
        <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2 }}>
          <Box sx={{
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            borderRadius: 2,
            background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(211,47,47,0.3)'
          }}>
            <SportsRugbyIcon sx={{ fontSize: { xs: 24, sm: 28 }, color: 'white' }} />
          </Box>
          <Box flex={1}>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Gestionar Equipos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {torneo?.nombre}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ 
        p: { xs: 1.5, sm: 2, md: 3 },
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}>
        {/* Alert Info */}
        <Alert 
          severity="info" 
          icon={<InfoIcon fontSize="small" />}
          sx={{ 
            mb: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            py: { xs: 0.5, sm: 1 }
          }}
        >
          <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            Solo equipos con categoría <strong>"{torneo?.categoria}"</strong>
          </Typography>
        </Alert>

        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {/* Columna Izquierda: Equipos en el Torneo */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                background: 'linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(76,175,80,0.02) 100%)'
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                    Equipos en el Torneo
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    {equiposTorneo.length} {equiposTorneo.length === 1 ? 'equipo' : 'equipos'}
                  </Typography>
                </Box>
                <Chip 
                  icon={<CheckCircleIcon fontSize="small" />}
                  label={equiposTorneo.length}
                  color="success"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Divider sx={{ mb: 1.5 }} />
              
              {/* Contenedor con altura fija */}
              <Box sx={{ 
                height: 520, 
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none'
                },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress size={32} />
                  </Box>
                ) : equiposTorneo.length === 0 ? (
                  <Box 
                    sx={{ 
                      textAlign: 'center', 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      px: 1
                    }}
                  >
                    <SportsRugbyIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      No hay equipos en este torneo
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      Agrega equipos desde el panel de la derecha
                    </Typography>
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {equiposTorneo.map((equipo) => (
                      <Card 
                        key={equipo.id}
                        elevation={0}
                        sx={{ 
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1.5,
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'error.main',
                            boxShadow: '0 2px 8px rgba(211,47,47,0.15)',
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        <CardContent sx={{ p: { xs: 1, sm: 1.5 }, '&:last-child': { pb: { xs: 1, sm: 1.5 } } }}>
                          <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
                            <Avatar
                              src={getImageUrl(equipo.logo)}
                              sx={{ 
                                width: { xs: 36, sm: 40 }, 
                                height: { xs: 36, sm: 40 },
                                border: 1.5,
                                borderColor: 'divider'
                              }}
                            >
                              {equipo.nombre?.charAt(0)}
                            </Avatar>
                            <Box flex={1} sx={{ minWidth: 0 }}>
                              <Typography 
                                variant="body2" 
                                fontWeight={600}
                                sx={{ 
                                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {equipo.nombre}
                              </Typography>
                              {equipo.ciudad && (
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    display: { xs: 'none', sm: 'block' }
                                  }}
                                >
                                  {equipo.ciudad}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoverEquipo(equipo.id)}
                              disabled={loading}
                              sx={{
                                '&:hover': {
                                  bgcolor: 'error.main',
                                  color: 'white'
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Columna Derecha: Agregar Equipos */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                background: 'linear-gradient(135deg, rgba(211,47,47,0.05) 0%, rgba(211,47,47,0.02) 100%)'
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                    Agregar Equipos
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Selecciona los equipos que quieres agregar
                  </Typography>
                </Box>
                <Chip 
                  icon={<AddIcon fontSize="small" />}
                  label={equiposSeleccionados.length}
                  color="error"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              {/* Filtros */}
              <Box display="flex" gap={{ xs: 1, sm: 1.5 }} mb={2} flexWrap={{ xs: 'wrap', sm: 'nowrap' }}>
                <TextField
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      fontSize: { xs: '0.85rem', sm: '0.9rem' }
                    }
                  }}
                />
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
                  <InputLabel sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <FilterListIcon fontSize="small" />
                      <span>Categoría</span>
                    </Box>
                  </InputLabel>
                  <Select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    label="Categoría"
                    sx={{ 
                      borderRadius: 1.5,
                      fontSize: { xs: '0.85rem', sm: '0.9rem' }
                    }}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    <MenuItem value="M14">M14</MenuItem>
                    <MenuItem value="M15">M15</MenuItem>
                    <MenuItem value="M16">M16</MenuItem>
                    <MenuItem value="M17">M17</MenuItem>
                    <MenuItem value="M18">M18</MenuItem>
                    <MenuItem value="M19">M19</MenuItem>
                    <MenuItem value="Intermedia">Intermedia</MenuItem>
                    <MenuItem value="Preintermedia">Preintermedia</MenuItem>
                    <MenuItem value="Primera">Primera</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Lista de equipos disponibles - Altura fija */}
              <Box sx={{ 
                height: 520, 
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none'
                },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}>
                {cargandoEquipos ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress size={32} />
                  </Box>
                ) : equiposFiltrados.length === 0 ? (
                  <Box 
                    sx={{ 
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      px: 1
                    }}
                  >
                    <SearchIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      No hay equipos disponibles
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {searchTerm || filtroCategoria 
                        ? 'Intenta con otros filtros'
                        : 'Todos los equipos ya están en el torneo'
                      }
                    </Typography>
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {equiposFiltrados.map((equipo) => {
                      const isSelected = equiposSeleccionados.includes(equipo.id);
                      return (
                        <Card 
                          key={equipo.id}
                          elevation={0}
                          onClick={() => handleToggleEquipo(equipo.id)}
                          sx={{ 
                            border: 1.5,
                            borderColor: isSelected ? 'error.main' : 'divider',
                            borderRadius: 1.5,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            bgcolor: isSelected ? 'rgba(211,47,47,0.08)' : 'transparent',
                            '&:hover': {
                              borderColor: 'error.main',
                              boxShadow: '0 2px 8px rgba(211,47,47,0.15)',
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          <CardContent sx={{ p: { xs: 1, sm: 1.5 }, '&:last-child': { pb: { xs: 1, sm: 1.5 } } }}>
                            <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
                              <Checkbox 
                                checked={isSelected}
                                size="small"
                                onChange={() => handleToggleEquipo(equipo.id)}
                                sx={{ p: 0 }}
                              />
                              <Avatar
                                src={getImageUrl(equipo.logo)}
                                sx={{ 
                                  width: { xs: 36, sm: 40 }, 
                                  height: { xs: 36, sm: 40 },
                                  border: 1.5,
                                  borderColor: isSelected ? 'error.main' : 'divider'
                                }}
                              >
                                {equipo.nombre?.charAt(0)}
                              </Avatar>
                              <Box flex={1} sx={{ minWidth: 0 }}>
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600}
                                  sx={{ 
                                    fontSize: { xs: '0.85rem', sm: '0.9rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {equipo.nombre}
                                </Typography>
                                <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                                  {equipo.categorias?.slice(0, 5).map((cat) => (
                                    <Chip 
                                      key={cat} 
                                      label={cat} 
                                      size="small"
                                      variant={cat === torneo?.categoria ? 'filled' : 'outlined'}
                                      color={cat === torneo?.categoria ? 'error' : 'default'}
                                      sx={{ 
                                        height: { xs: 16, sm: 18 }, 
                                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                        fontWeight: cat === torneo?.categoria ? 600 : 400,
                                        '& .MuiChip-label': {
                                          px: { xs: 0.5, sm: 0.75 }
                                        }
                                      }}
                                    />
                                  ))}
                                  {equipo.categorias?.length > 5 && (
                                    <Chip 
                                      label={`+${equipo.categorias.length - 5}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ 
                                        height: { xs: 16, sm: 18 }, 
                                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                        '& .MuiChip-label': {
                                          px: { xs: 0.5, sm: 0.75 }
                                        }
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* Botón Agregar */}
              <Box mt={{ xs: 1.5, sm: 2 }}>
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={handleAgregarEquipos}
                  disabled={equiposSeleccionados.length === 0 || loading}
                  fullWidth
                  sx={{
                    borderRadius: 1.5,
                    py: { xs: 1, sm: 1.2 },
                    textTransform: 'none',
                    fontSize: { xs: '0.85rem', sm: '0.95rem' },
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(211,47,47,0.25)',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(211,47,47,0.35)',
                    }
                  }}
                >
                  Agregar {equiposSeleccionados.length} {equiposSeleccionados.length === 1 ? 'Equipo' : 'Equipos'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, borderTop: 1, borderColor: 'divider' }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          size="small"
          sx={{ 
            textTransform: 'none',
            px: { xs: 2, sm: 3 },
            borderRadius: 1.5,
            fontSize: { xs: '0.85rem', sm: '0.9rem' }
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GestionEquiposTorneo;
