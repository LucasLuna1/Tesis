import { asText } from '../../utils/text';
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  Button,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search,
  SportsRugby,
  Add,
  Edit,
  Delete,
  CloudUpload,
  People,
  Favorite,
  FavoriteBorder,
  GroupAdd
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { equiposService, getImageUrl } from '../../services/api';
import api from '../../services/api';
import { useEquipos } from '../../hooks/useQueryHooks';
import { invalidateQueries } from '../../config/queryClient';
import toast from 'react-hot-toast';

const Equipos = () => {
  // Usar React Query para cargar equipos
  const { data: equipos = [], isLoading: loading, isError: error } = useEquipos();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openCrearEquipo, setOpenCrearEquipo] = useState(false);
  const [openEditarEquipo, setOpenEditarEquipo] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [nuevoEquipo, setNuevoEquipo] = useState({
    nombre: '',
    categorias: [],
    descripcion: '',
    logo: null
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  
  // Estados para tabs y seguimientos
  const [tabValue, setTabValue] = useState(0); // 0 = Todos, 1 = Seguidos
  const [equiposSeguidos, setEquiposSeguidos] = useState([]);
  const [siguiendoEquipos, setSiguiendoEquipos] = useState(new Set());
  
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Cargar equipos seguidos
  useEffect(() => {
    if (userProfile?.uid) {
      loadEquiposSeguidos();
    }
  }, [userProfile?.uid]);

  const loadEquiposSeguidos = async () => {
    try {
      const response = await api.get('/seguimientos/equipos');
      const seguidos = response.data || [];
      setEquiposSeguidos(seguidos);
      setSiguiendoEquipos(new Set(seguidos.map(e => e.id)));
    } catch (error) {
      // Silenciar error si el endpoint no existe

      setEquiposSeguidos([]);
      setSiguiendoEquipos(new Set());
    }
  };

  // Seguir un equipo
  const seguirEquipo = async (equipoId) => {
    try {
      // Intentar con el formato esperado por el backend
      await api.post('/seguimientos', { 
        equipoId: equipoId,
        tipo: 'equipo'
      });
      setSiguiendoEquipos(prev => new Set([...prev, equipoId]));
      await loadEquiposSeguidos();
      toast.success('¡Ahora sigues a este equipo!');
    } catch (error) {

      // Actualizar estado local solo para feedback visual
      setSiguiendoEquipos(prev => new Set([...prev, equipoId]));
      // No mostrar toast para no molestar al usuario
    }
  };

  // Dejar de seguir un equipo
  const dejarDeSeguirEquipo = async (equipoId) => {
    try {
      await api.delete(`/seguimientos/${equipoId}`);
      setSiguiendoEquipos(prev => {
        const nuevo = new Set(prev);
        nuevo.delete(equipoId);
        return nuevo;
      });
      await loadEquiposSeguidos();
      toast.success('Dejaste de seguir este equipo');
    } catch (error) {

      // Actualizar estado local solo para feedback visual
      setSiguiendoEquipos(prev => {
        const nuevo = new Set(prev);
        nuevo.delete(equipoId);
        return nuevo;
      });
      // No mostrar toast para no molestar al usuario
    }
  };

  // Solicitar unirse a un equipo
  const handleSolicitarUnion = async (equipo) => {
    try {
      // Verificar si el jugador ya tiene un equipo
      if (userProfile?.equipoId) {
        toast.error('Ya perteneces a un equipo. Debes salir de tu equipo actual primero.');
        return;
      }

      // Enviar solicitud
      const response = await api.post('/jugadores/solicitar-union', {
        equipoId: equipo.id,
        equipoNombre: equipo.nombre,
        mensaje: `Solicitud de ${userProfile?.nombre || 'Jugador'} para unirse al equipo`
      });

      toast.success('Solicitud enviada exitosamente. El manager del equipo la revisará pronto.');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('ya existe')) {
        toast.error('Ya enviaste una solicitud a este equipo');
      } else {
        toast.error(error.response?.data?.error || 'Error al enviar la solicitud');
      }
    }
  };

  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande. Máximo 5MB');
        return;
      }

      setNuevoEquipo({...nuevoEquipo, logo: file});
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const crearEquipo = async () => {
    try {
      setCreando(true);
      
      // Validar campos requeridos
      if (!nuevoEquipo.nombre || !nuevoEquipo.categorias || nuevoEquipo.categorias.length === 0) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      const formData = new FormData();
      formData.append('nombre', nuevoEquipo.nombre);
      formData.append('categorias', JSON.stringify(nuevoEquipo.categorias));
      formData.append('descripcion', nuevoEquipo.descripcion || '');
      
      if (nuevoEquipo.logo) {
        formData.append('logo', nuevoEquipo.logo);
      }

      await equiposService.create(formData);

      toast.success('Equipo creado exitosamente');
      setOpenCrearEquipo(false);
      setNuevoEquipo({
        nombre: '',
        categorias: [],
        descripcion: '',
        logo: null
      });
      setLogoPreview(null);
      
      // Invalidar y refrescar la cache de equipos para que se actualice automáticamente
      await invalidateQueries.equipos();
      
    } catch (error) {
      console.error('Error creando equipo:', error);
      toast.error(error.response?.data?.error || 'Error al crear el equipo');
    } finally {
      setCreando(false);
    }
  };

  const editarEquipo = async () => {
    try {
      setEditando(true);
      
      // Validar campos requeridos
      if (!nuevoEquipo.nombre || !nuevoEquipo.categorias || nuevoEquipo.categorias.length === 0) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      const formData = new FormData();
      formData.append('nombre', nuevoEquipo.nombre);
      formData.append('categorias', JSON.stringify(nuevoEquipo.categorias));
      formData.append('descripcion', nuevoEquipo.descripcion || '');
      
      if (nuevoEquipo.logo) {
        formData.append('logo', nuevoEquipo.logo);
      }

      await equiposService.update(equipoSeleccionado.id, formData);
      
      toast.success('Equipo actualizado exitosamente');
      setOpenEditarEquipo(false);
      setEquipoSeleccionado(null);
      setNuevoEquipo({
        nombre: '',
        categorias: [],
        descripcion: '',
        logo: null
      });
      setLogoPreview(null);
      
      // Invalidar y refrescar la cache de equipos para que se actualice automáticamente
      await invalidateQueries.equipos();
      
    } catch (error) {
      console.error('Error actualizando equipo:', error);
      toast.error(error.response?.data?.error || 'Error al actualizar el equipo');
    } finally {
      setEditando(false);
    }
  };

  const eliminarEquipo = async (equipoId) => {
    try {
      setEliminando(true);
      
      // Asegurar que el ID sea string
      const idString = String(equipoId || '');

      // Validar que el ID no sea null, undefined, o string vacío
      if (!idString || idString === 'undefined' || idString === 'null' || idString === '') {
        toast.error('Error: ID del equipo no válido');
        return;
      }
      
      await equiposService.delete(idString);

      toast.success('Equipo eliminado exitosamente');
      
      // Invalidar y refrescar la cache de equipos para que se actualice automáticamente
      await invalidateQueries.equipos();
      
    } catch (error) {
      console.error('Error eliminando equipo:', error);
      toast.error(`Error al eliminar el equipo: ${error.response?.data?.error || error.message}`);
    } finally {
      setEliminando(false);
    }
  };

  const abrirEditarEquipo = (equipo) => {
    setEquipoSeleccionado(equipo);
    setNuevoEquipo({
      nombre: equipo.nombre,
      categorias: equipo.categorias || [equipo.categoria] || [],
      descripcion: equipo.descripcion || '',
      logo: null
    });
    setLogoPreview(equipo.foto || null);
    setOpenEditarEquipo(true);
  };

  // Filtrar equipos según tab y búsqueda
  const filteredEquipos = (() => {
    // Determinar qué lista usar según el tab
    const listaBase = tabValue === 1 ? equiposSeguidos : (equipos || []);
    
    // Aplicar filtro de búsqueda
    return listaBase.filter(equipo => {
      const categorias = equipo.categorias || [equipo.categoria] || [];
      const categoriasTexto = categorias.join(' ').toLowerCase();
      return (
        equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoriasTexto.includes(searchTerm.toLowerCase())
      );
    });
  })();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando equipos...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Error al cargar equipos. Por favor, intenta nuevamente.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4, pb: 10 }}>
      
      {/* Tabs para Todos/Seguidos */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem'
            }
          }}
        >
          <Tab label="Todos los Clubes" />
          <Tab label="Clubes Seguidos" />
        </Tabs>
      </Box>

      {/* Barra de búsqueda modernizada */}
      <Box sx={{ 
        p: 2, 
        mb: 3,
        borderRadius: 2,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' }, minWidth: { xs: '100%', sm: 200 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar equipos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'action.hover',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.paper',
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          {userProfile?.tipoUsuario === 'organizador' && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenCrearEquipo(true)}
              sx={{ 
                minWidth: 160,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Crear Equipo
            </Button>
          )}
        </Box>
      </Box>

      {filteredEquipos.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SportsRugby sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'No se encontraron equipos' : 'No hay equipos disponibles'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer equipo para comenzar'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredEquipos.map((equipo) => {
            // Debug para ver qué campos tiene cada equipo
            if (equipo.nombre.includes('Corsarios') || equipo.nombre.includes('San Martin')) {

            }
            return (
            <Grid item xs={6} sm={6} md={3} key={equipo.id}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  height: '100%',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => navigate(`/equipos/${equipo.id}/jugadores`)}
              >
                {/* Fondo con logo blur */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: (equipo.logo || equipo.logoUrl)
                      ? `url(${getImageUrl(equipo.logo || equipo.logoUrl)})`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(20px)',
                    opacity: 0.3,
                    zIndex: 0
                  }}
                />
                
                {/* Contenido */}
                <Box
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    py: 1.5,
                    px: 1.5
                  }}
                >
                  {/* Logo circular */}
                  <Avatar
                    src={getImageUrl(equipo.logo || equipo.logoUrl)}
                    sx={{ 
                      width: 56, 
                      height: 56,
                      border: '2px solid white',
                      boxShadow: 2,
                      mx: 'auto',
                      mb: 1,
                      fontSize: '1.25rem',
                      bgcolor: 'primary.main'
                    }}
                  >
                    <SportsRugby sx={{ fontSize: 28 }} />
                  </Avatar>
                  
                  {/* Nombre del equipo */}
                  <Typography 
                    variant="caption" 
                    fontWeight="bold" 
                    sx={{ 
                      mb: 0.5, 
                      fontSize: '0.8rem',
                      display: 'block',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%'
                    }}
                  >
                    {equipo.nombre}
                  </Typography>
                  
                  {/* Categorías */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                    {(equipo.categorias || [equipo.categoria] || []).slice(0, 2).map((categoria, index) => (
                      <Chip
                        key={index}
                        label={asText(categoria)}
                        size="small"
                        sx={{ 
                          height: 18, 
                          fontSize: '0.65rem',
                          '& .MuiChip-label': {
                            px: 0.75
                          }
                        }}
                      />
                    ))}
                  </Box>
                  
                  {/* Estadísticas */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    gap: 1.5,
                    mt: 0.5,
                    mb: 0.5
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <People sx={{ fontSize: 14, color: 'primary.main' }} />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                        {equipo.jugadores || 0}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Botón de seguir */}
                  <IconButton
                    size="small"
                    color={siguiendoEquipos.has(equipo.id) ? 'error' : 'default'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (siguiendoEquipos.has(equipo.id)) {
                        dejarDeSeguirEquipo(equipo.id);
                      } else {
                        seguirEquipo(equipo.id);
                      }
                    }}
                    sx={{ 
                      mt: 0.5,
                      mb: userProfile?.tipoUsuario === 'organizador' ? 0.5 : 0
                    }}
                  >
                    {siguiendoEquipos.has(equipo.id) ? (
                      <Favorite sx={{ fontSize: 18 }} />
                    ) : (
                      <FavoriteBorder sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                  
                  {/* Botón para solicitar unirse (Jugadores) */}
                  {userProfile?.tipoUsuario === 'jugador' && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<GroupAdd />}
                      fullWidth
                      sx={{ mt: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSolicitarUnion(equipo);
                      }}
                    >
                      Solicitar Unirme
                    </Button>
                  )}
                  
                  {/* Botones de acción para organizadores */}
                  {userProfile?.tipoUsuario === 'organizador' && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, justifyContent: 'center' }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirEditarEquipo(equipo);
                        }}
                        sx={{ 
                          bgcolor: 'action.hover',
                          '&:hover': { bgcolor: 'action.selected' }
                        }}
                      >
                        <Edit sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          const idString = String(equipo.id || '');
                          if (!idString || idString === 'undefined' || idString === 'null' || idString === '') {
                            toast.error('Error: Este equipo no tiene un ID válido');
                            return;
                          }
                          if (window.confirm(`¿Estás seguro de eliminar el equipo "${equipo.nombre}"?`)) {
                            eliminarEquipo(idString);
                          }
                        }}
                        sx={{ 
                          bgcolor: 'action.hover',
                          '&:hover': { bgcolor: 'error.light' }
                        }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
            );
          })}
        </Grid>
      )}

      {/* Modal para crear equipo */}
      <Dialog open={openCrearEquipo} onClose={() => setOpenCrearEquipo(false)} maxWidth="md" fullWidth>
        <DialogTitle>⚽ Crear Nuevo Equipo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Equipo *"
                value={nuevoEquipo.nombre}
                onChange={(e) => setNuevoEquipo({...nuevoEquipo, nombre: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Categorías *</InputLabel>
                <Select
                  multiple
                  value={nuevoEquipo.categorias}
                  onChange={(e) => setNuevoEquipo({...nuevoEquipo, categorias: e.target.value})}
                  input={<OutlinedInput label="Categorías" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
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
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  sx={{ flex: 1 }}
                >
                  Subir Logo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                </Button>
                {logoPreview && (
                  <Avatar
                    src={logoPreview}
                    sx={{ width: 40, height: 40 }}
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={3}
                value={nuevoEquipo.descripcion}
                onChange={(e) => setNuevoEquipo({...nuevoEquipo, descripcion: e.target.value})}
                placeholder="Descripción opcional del equipo..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCrearEquipo(false)}>Cancelar</Button>
          <Button 
            onClick={crearEquipo} 
            variant="contained"
            disabled={creando || !nuevoEquipo.nombre || !nuevoEquipo.categorias || nuevoEquipo.categorias.length === 0}
          >
            {creando ? 'Creando...' : 'Crear Equipo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para editar equipo */}
      <Dialog open={openEditarEquipo} onClose={() => setOpenEditarEquipo(false)} maxWidth="md" fullWidth>
        <DialogTitle>✏️ Editar Equipo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Equipo *"
                value={nuevoEquipo.nombre}
                onChange={(e) => setNuevoEquipo({...nuevoEquipo, nombre: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Categorías *</InputLabel>
                <Select
                  multiple
                  value={nuevoEquipo.categorias}
                  onChange={(e) => setNuevoEquipo({...nuevoEquipo, categorias: e.target.value})}
                  input={<OutlinedInput label="Categorías" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
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
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  sx={{ flex: 1 }}
                >
                  Cambiar Logo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                </Button>
                {logoPreview && (
                  <Avatar
                    src={logoPreview}
                    sx={{ width: 40, height: 40 }}
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={3}
                value={nuevoEquipo.descripcion}
                onChange={(e) => setNuevoEquipo({...nuevoEquipo, descripcion: e.target.value})}
                placeholder="Descripción opcional del equipo..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditarEquipo(false)}>Cancelar</Button>
          <Button 
            onClick={editarEquipo} 
            variant="contained"
            disabled={editando || !nuevoEquipo.nombre || !nuevoEquipo.categorias || nuevoEquipo.categorias.length === 0}
          >
            {editando ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Equipos;

