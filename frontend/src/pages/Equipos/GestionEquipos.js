import { asText } from '../../utils/text';
/**
 * Componente para Gestión de Equipos
 * CRUD completo desde cero
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
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
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
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
  MoreVert,
  Visibility,
  LocationOn,
  Email,
  Phone,
  HowToReg,
  PhotoCamera,
  Favorite,
  FavoriteBorder,
  GroupAdd
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { equiposService } from '../../services/equiposService';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LogoDisplay from '../../components/common/LogoDisplay';
import { construirUrlImagen } from '../../utils/imageUtils';

const GestionEquipos = () => {
  const { userProfile } = useAuth();
  const isOrganizador = userProfile?.tipoUsuario === 'organizador' || userProfile?.tipoUsuario === 'admin' || true; // TEMPORAL: permitir a todos
  
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  
  // Estados para datos
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para paginación
  const [equiposVisibles, setEquiposVisibles] = useState(9); // 3x3 = 9 equipos iniciales
  const [cargandoMas, setCargandoMas] = useState(false);

  // Estados para seguimiento de equipos
  const [equiposSeguidos, setEquiposSeguidos] = useState([]);
  const [siguiendoEquipos, setSiguiendoEquipos] = useState(new Set());
  
  // Estado para tabs
  const [tabValue, setTabValue] = useState(0); // 0 = Todos los Clubes, 1 = Clubes Seguidos

  // Estados para modales
  const [openCrear, setOpenCrear] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const [openSolicitud, setOpenSolicitud] = useState(false);
  const [openSolicitudGestion, setOpenSolicitudGestion] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);

  // Estados para formularios
  const [nuevoEquipo, setNuevoEquipo] = useState({
    nombre: '',
    descripcion: '',
    categorias: [],
    club: '',
    ciudad: '',
    pais: 'Colombia',
    telefono: '',
    email: '',
    sitioWeb: '',
    logo: null
  });

  const [logoPreview, setLogoPreview] = useState(null);

  // Estados para solicitud de unirse (jugadores)
  const [posicion, setPosicion] = useState('');
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  
  // Estados para solicitud de gestión (managers)
  const [mensajeSolicitudGestion, setMensajeSolicitudGestion] = useState('');
  const [enviandoSolicitudGestion, setEnviandoSolicitudGestion] = useState(false);

  // Estados para menú contextual
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuEquipo, setMenuEquipo] = useState(null);

  const navigate = useNavigate();

  // Categorías disponibles
  const categoriasDisponibles = [
    'M14', 'M15', 'M16', 'M17', 'M18', 'M19', 
    'Intermedia', 'Preintermedia', 'Primera'
  ];

  // Posiciones disponibles (Rugby)
  const posicionesDisponibles = [
    'Pilar Izquierdo',
    'Hooker',
    'Pilar Derecho',
    'Segunda Línea',
    'Tercera Línea',
    'Medio Scrum',
    'Apertura',
    'Centro',
    'Wing Izquierdo',
    'Wing Derecho',
    'Fullback',
    'Forward',
    'Back',
    'Sin posición específica'
  ];

  // Cargar equipos
  const loadEquipos = useCallback(async () => {
    try {
      setLoading(true);

      const filtros = {};
      if (filtroCategoria) filtros.categoria = filtroCategoria;

      const equiposData = await equiposService.getAll(filtros);
      setEquipos(equiposData);

    } catch (error) {
      console.error('❌ Error cargando equipos:', error);
      setError('Error al cargar equipos');
      toast.error('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  }, [filtroCategoria]);

  useEffect(() => {
    loadEquipos();
    loadEquiposSeguidos();
  }, [loadEquipos]);

  // Cargar equipos seguidos por el usuario
  const loadEquiposSeguidos = async () => {
    try {
      const response = await api.get('/seguimientos/mis-equipos');
      const seguidos = response.data || [];
      setEquiposSeguidos(seguidos);
      
      // Crear un Set con los IDs de equipos seguidos para verificación rápida
      const idsSeguidos = new Set(seguidos.map(s => s.equipoId));
      setSiguiendoEquipos(idsSeguidos);
    } catch (error) {
      console.error('Error cargando equipos seguidos:', error);
    }
  };

  // Seguir un equipo
  const seguirEquipo = async (equipoId) => {
    try {
      await api.post('/seguimientos', { equipoId });
      
      // Actualizar estado local
      setSiguiendoEquipos(prev => new Set([...prev, equipoId]));
      
      // Recargar equipos seguidos
      await loadEquiposSeguidos();
      
      toast.success('¡Ahora sigues a este equipo!');
    } catch (error) {      toast.error('Error al seguir el equipo');
    }
  };

  // Dejar de seguir un equipo
  const dejarDeSeguirEquipo = async (equipoId) => {
    try {
      await api.delete(`/seguimientos/${equipoId}`);
      
      // Actualizar estado local
      setSiguiendoEquipos(prev => {
        const nuevo = new Set(prev);
        nuevo.delete(equipoId);
        return nuevo;
      });
      
      // Recargar equipos seguidos
      await loadEquiposSeguidos();
      
      toast.success('Dejaste de seguir a este equipo');
    } catch (error) {      toast.error('Error al dejar de seguir el equipo');
    }
  };

  // Manejar cambio de logo
  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setNuevoEquipo({ ...nuevoEquipo, logo: file });
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Manejar eliminación de logo
  const handleEliminarLogo = async () => {
    if (!equipoSeleccionado?.id) return;
    
    try {
      await api.delete(`/equipos/${equipoSeleccionado.id}/logo`);
      
      // Actualizar el estado local
      setNuevoEquipo({ ...nuevoEquipo, logo: '' });
      setLogoPreview(null);
      
      toast.success('Imagen eliminada correctamente');
      
      // Recargar los equipos para actualizar la lista
      await loadEquipos();
    } catch (error) {      toast.error('Error al eliminar la imagen');
    }
  };

  // Crear equipo
  const handleCrearEquipo = async () => {
    try {
      if (!nuevoEquipo.nombre || nuevoEquipo.categorias.length === 0) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      await equiposService.create(nuevoEquipo);
      
      toast.success('Equipo creado exitosamente');
      setOpenCrear(false);
      resetForm();
      
      // Recargar los equipos para mostrar el nuevo equipo
      await loadEquipos();
    } catch (error) {      toast.error('Error al crear el equipo');
    }
  };

  // Actualizar equipo
  const handleActualizarEquipo = async () => {
    try {
      if (!nuevoEquipo.nombre || nuevoEquipo.categorias.length === 0) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      // Si hay una nueva imagen, subirla primero
      if (nuevoEquipo.logo && nuevoEquipo.logo instanceof File) {
        const formData = new FormData();
        formData.append('logo', nuevoEquipo.logo);
        
        await api.put(`/equipos/${equipoSeleccionado.id}/logo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      // Actualizar el resto de la información del equipo
      const equipoDataSinLogo = { ...nuevoEquipo };
      delete equipoDataSinLogo.logo; // No enviar el archivo en la actualización general
      
      await equiposService.update(equipoSeleccionado.id, equipoDataSinLogo);
      
      toast.success('Equipo actualizado exitosamente');
      setOpenEditar(false);
      resetForm();
      
      // Recargar los equipos para mostrar los cambios actualizados
      await loadEquipos();
    } catch (error) {      toast.error('Error al actualizar el equipo');
    }
  };

  // Eliminar equipo
  const handleEliminarEquipo = async () => {
    try {

      await equiposService.delete(equipoSeleccionado.id);
      
      toast.success('Equipo eliminado exitosamente');
      setOpenEliminar(false);
      setEquipoSeleccionado(null);
      
      // Recargar los equipos para actualizar la lista
      await loadEquipos();
    } catch (error) {      toast.error('Error al eliminar el equipo');
    }
  };

  // Abrir modal de edición
  const abrirEditar = (equipo) => {
    setEquipoSeleccionado(equipo);
    setNuevoEquipo({
      nombre: equipo.nombre,
      descripcion: equipo.descripcion || '',
      categorias: equipo.categorias || [],
      club: equipo.club || '',
      ciudad: equipo.ciudad || '',
      pais: equipo.pais || 'Colombia',
      telefono: equipo.telefono || '',
      email: equipo.email || '',
      sitioWeb: equipo.sitioWeb || '',
      logo: null
    });
    setLogoPreview(equipo.logo || null);
    setOpenEditar(true);
  };

  // Abrir modal de eliminación
  const abrirEliminar = (equipo) => {
    setEquipoSeleccionado(equipo);
    setOpenEliminar(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setNuevoEquipo({
      nombre: '',
      descripcion: '',
      categorias: [],
      club: '',
      ciudad: '',
      pais: 'Colombia',
      telefono: '',
      email: '',
      sitioWeb: '',
      logo: null
    });
    setLogoPreview(null);
  };

  // Manejar solicitud de unirse (para jugadores)
  const handleSolicitarUnirse = (equipo) => {
    setEquipoSeleccionado(equipo);
    setOpenSolicitud(true);
  };

  const handleEnviarSolicitud = async () => {
    if (!equipoSeleccionado) return;

    try {
      setEnviandoSolicitud(true);
      await api.post(`/equipos/${equipoSeleccionado.id}/solicitar-unirse`, {
        mensaje: mensajeSolicitud,
        posicion
      });

      toast.success('Solicitud enviada correctamente');
      setOpenSolicitud(false);
      setMensajeSolicitud('');
      setPosicion('');
      setEquipoSeleccionado(null);
    } catch (error) {      toast.error(error.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  // Manejar solicitud de gestión (para managers)
  const handleSolicitarGestion = (equipo) => {
    setEquipoSeleccionado(equipo);
    setOpenSolicitudGestion(true);
  };

  const handleEnviarSolicitudGestion = async () => {
    if (!equipoSeleccionado) return;

    try {
      setEnviandoSolicitudGestion(true);
      await api.post(`/equipos/${equipoSeleccionado.id}/solicitar-gestion`, {
        mensaje: mensajeSolicitudGestion
      });

      toast.success('Solicitud de gestión enviada correctamente');
      setOpenSolicitudGestion(false);
      setMensajeSolicitudGestion('');
      setEquipoSeleccionado(null);
    } catch (error) {      toast.error(error.response?.data?.error || 'Error al enviar solicitud de gestión');
    } finally {
      setEnviandoSolicitudGestion(false);
    }
  };

  // Filtrar equipos
  const equiposFiltrados = equipos.filter(equipo => {
    const matchesSearch = equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipo.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipo.ciudad.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Equipos visibles (paginación)
  const equiposMostrados = equiposFiltrados.slice(0, equiposVisibles);
  const hayMasEquipos = equiposVisibles < equiposFiltrados.length;

  // Función para cargar más equipos
  const cargarMasEquipos = () => {
    setCargandoMas(true);
    
    // Simular carga con timeout para mejor UX
    setTimeout(() => {
      setEquiposVisibles(prev => Math.min(prev + 3, equiposFiltrados.length));
      setCargandoMas(false);
    }, 500);
  };

  // Resetear paginación cuando cambien los filtros
  useEffect(() => {
    setEquiposVisibles(9);
  }, [searchTerm, filtroCategoria]);

  // Manejar menú contextual
  const handleMenuOpen = (event, equipo) => {
    setAnchorEl(event.currentTarget);
    setMenuEquipo(equipo);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuEquipo(null);
  };

  if (loading) {
    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Cargando equipos...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      
      {/* Título */}
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        Equipos
      </Typography>

      {/* Tabs para navegación */}
      {userProfile?.tipoUsuario !== 'organizador' && (
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Todos los Clubes" />
          <Tab label="Clubes Seguidos" />
        </Tabs>
      )}
      
      {/* Filtros y búsqueda - Solo en la tab "Todos los Clubes" */}
      {(tabValue === 0 || userProfile?.tipoUsuario === 'organizador') && (
        <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar equipos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              label="Categoría"
            >
              <MenuItem value="">Todas</MenuItem>
              {categoriasDisponibles.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
        </Box>
        </Box>
      )}

      {/* Lista de equipos - Solo en tab "Todos los Clubes" */}
      {(tabValue === 0 || userProfile?.tipoUsuario === 'organizador') && (
        <>
      {equiposFiltrados.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SportsRugby sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'No se encontraron equipos' : 'No hay equipos registrados'}
          </Typography>
          {!searchTerm && userProfile?.tipoUsuario === 'organizador' && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenCrear(true)}
              sx={{ mt: 2 }}
            >
              Crear Primer Equipo
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {equiposMostrados.map((equipo) => (
            <Grid item xs={12} sm={6} md={4} key={equipo.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Header del equipo */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LogoDisplay
                      src={construirUrlImagen(equipo.logo)}
                      size="medium"
                      shape="square"
                      fallbackText={equipo.nombre}
                      sx={{ mr: 2 }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h2">
                        {equipo.nombre}
                      </Typography>
                      {equipo.club && (
                        <Typography variant="body2" color="text.secondary">
                          {typeof equipo.club === 'object' ? equipo.club?.nombre || 'Club' : equipo.club}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, equipo)}
                      size="small"
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {/* Categorías */}
                  <Box sx={{ mb: 2 }}>
                    {equipo.categorias?.map((categoria, index) => (
                      <Chip
                        key={index}
                        label={asText(categoria)}
                        color="primary"
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>

                  {/* Información adicional */}
                  <Box sx={{ mb: 2 }}>
                    {equipo.ciudad && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {equipo.ciudad}
                        </Typography>
                      </Box>
                    )}
                    {equipo.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {equipo.email}
                        </Typography>
                      </Box>
                    )}
                    {equipo.telefono && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Phone sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {equipo.telefono}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Descripción */}
                  {equipo.descripcion && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {equipo.descripcion}
                    </Typography>
                  )}

                  {/* Estadísticas */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">{equipo.jugadores?.length || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Jugadores
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">{equipo.estadisticas?.partidosJugados || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Partidos
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">{equipo.estadisticas?.puntos || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Puntos
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0, flexWrap: 'wrap', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<People />}
                    onClick={() => navigate(`/equipos/${equipo.id}/jugadores`)}
                  >
                    Ver Jugadores
                  </Button>
                  
                  {/* Botón de Seguir/Dejar de Seguir */}
                  {userProfile?.tipoUsuario !== 'organizador' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color={siguiendoEquipos.has(equipo.id) ? "error" : "primary"}
                      startIcon={siguiendoEquipos.has(equipo.id) ? <Favorite /> : <FavoriteBorder />}
                      onClick={() => siguiendoEquipos.has(equipo.id) 
                        ? dejarDeSeguirEquipo(equipo.id) 
                        : seguirEquipo(equipo.id)
                      }
                    >
                      {siguiendoEquipos.has(equipo.id) ? 'Siguiendo' : 'Seguir'}
                    </Button>
                  )}

                  {userProfile?.tipoUsuario === 'organizador' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Edit />}
                      onClick={() => abrirEditar(equipo)}
                    >
                      Editar
                    </Button>
                  )}
                  
                  {userProfile?.tipoUsuario === 'jugador' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<HowToReg />}
                      onClick={() => handleSolicitarUnirse(equipo)}
                      fullWidth={false}
                    >
                      Solicitar Unirse
                    </Button>
                  )}
                  
                  {userProfile?.tipoUsuario === 'manager' && equipo.creadoPor !== userProfile?.uid && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<GroupAdd />}
                      onClick={() => handleSolicitarGestion(equipo)}
                      fullWidth={false}
                    >
                      Solicitar Gestionar
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
            ))}
          </Grid>

          {/* Botón Ver Más */}
          {hayMasEquipos && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
              <Button
                variant="outlined"
                size="large"
                onClick={cargarMasEquipos}
                disabled={cargandoMas}
                startIcon={cargandoMas ? <CircularProgress size={20} /> : <People />}
                sx={{
                  minWidth: 200,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}
              >
                {cargandoMas ? 'Cargando...' : `Ver más equipos (${equiposFiltrados.length - equiposVisibles} restantes)`}
              </Button>
            </Box>
          )}

          {/* Contador de equipos */}
          <Box sx={{ textAlign: 'center', mt: 2, mb: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {equiposMostrados.length} de {equiposFiltrados.length} equipos
            </Typography>
          </Box>
        </>
      )}
        </>
      )}

      {/* Sección de Equipos Seguidos - Solo en tab "Clubes Seguidos" */}
      {userProfile?.tipoUsuario !== 'organizador' && tabValue === 1 && (
        <>
          {equiposSeguidos.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Favorite sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No sigues ningún club aún
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ve a la pestaña "Todos los Clubes" y haz clic en "Seguir" en tus equipos favoritos
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
                  Mis Equipos Seguidos
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {equiposSeguidos.map((seguimiento) => (
              <Card key={seguimiento.id} sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Logo del equipo */}
                  <img
                    src={construirUrlImagen(seguimiento.equipoLogo)}
                    alt={seguimiento.equipoNombre}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: '50%'
                    }}
                  />
                  
                  {/* Información del equipo */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {seguimiento.equipoNombre}
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="nowrap" sx={{ overflowX: 'auto' }}>
                      {seguimiento.notificarPartidos && (
                        <Chip label="Partidos" size="small" color="primary" />
                      )}
                      {seguimiento.notificarNoticias && (
                        <Chip label="Noticias" size="small" color="success" />
                      )}
                      {seguimiento.notificarResultados && (
                        <Chip label="Resultados" size="small" color="info" />
                      )}
                    </Box>
                  </Box>
                  
                  {/* Botón de dejar de seguir - Responsive */}
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={<Favorite />}
                      onClick={() => dejarDeSeguirEquipo(seguimiento.equipoId)}
                    >
                      Dejar de seguir
                    </Button>
                  </Box>
                  
                  {/* Icono para mobile */}
                  <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => dejarDeSeguirEquipo(seguimiento.equipoId)}
                    >
                      <Favorite />
                    </IconButton>
                  </Box>
                </Box>
              </Card>
            ))}
              </Box>
            </>
          )}
        </>
      )}

      {/* Botón flotante para crear equipo */}
      {userProfile?.tipoUsuario === 'organizador' && (
        <Fab
          color="primary"
          aria-label="crear equipo"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setOpenCrear(true)}
        >
          <Add />
        </Fab>
      )}

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { navigate(`/equipos/${menuEquipo?.id}`); handleMenuClose(); }}>
          <ListItemIcon><Visibility /></ListItemIcon>
          <ListItemText>Ver Detalles</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigate(`/equipos/${menuEquipo?.id}/jugadores`); handleMenuClose(); }}>
          <ListItemIcon><People /></ListItemIcon>
          <ListItemText>Ver Jugadores</ListItemText>
        </MenuItem>
        {userProfile?.tipoUsuario === 'organizador' && (
          <MenuItem 
            onClick={() => { abrirEliminar(menuEquipo); handleMenuClose(); }}
            sx={{
              color: 'error.main',
              '&:hover': {
                bgcolor: 'error.light',
                color: 'error.dark'
              }
            }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <Delete />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Modal Crear Equipo */}
      <Dialog open={openCrear} onClose={() => setOpenCrear(false)} maxWidth="md" fullWidth>
        <DialogTitle>⚽ Crear Nuevo Equipo</DialogTitle>
        <DialogContent>
          <EquipoForm
            equipo={nuevoEquipo}
            setEquipo={setNuevoEquipo}
            logoPreview={logoPreview}
            onLogoChange={handleLogoChange}
            categoriasDisponibles={categoriasDisponibles}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCrear(false)}>Cancelar</Button>
          <Button
            onClick={handleCrearEquipo}
            variant="contained"
            disabled={!nuevoEquipo.nombre || nuevoEquipo.categorias.length === 0}
          >
            Crear Equipo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Editar Equipo */}
        <Dialog
          open={openEditar}
          onClose={() => setOpenEditar(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              maxHeight: '90vh',
              height: 'auto'
            }
          }}
        >
        <DialogTitle sx={{ 
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'grey.700',
          bgcolor: 'grey.900',
          borderRadius: '12px 12px 0 0',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Edit sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={600}>
                Editar Equipo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Modifica la información del equipo
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          p: 2, 
          bgcolor: 'grey.900', 
          color: 'white',
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none'
        }}>
          <EquipoForm
            equipo={nuevoEquipo}
            setEquipo={setNuevoEquipo}
            logoPreview={logoPreview}
            onLogoChange={handleLogoChange}
            onEliminarLogo={handleEliminarLogo}
            categoriasDisponibles={categoriasDisponibles}
            teamId={equipoSeleccionado?.id}
            isOrganizador={isOrganizador}
          />
        </DialogContent>
        <DialogActions sx={{ 
          p: 2, 
          gap: 2,
          borderTop: '1px solid',
          borderColor: 'grey.700',
          bgcolor: 'grey.900',
          borderRadius: '0 0 12px 12px'
        }}>
          <Button 
            onClick={() => setOpenEditar(false)}
            variant="outlined"
            size="large"
            sx={{ 
              minWidth: 120,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleActualizarEquipo}
            variant="contained"
            size="large"
            disabled={!nuevoEquipo.nombre || nuevoEquipo.categorias.length === 0}
            sx={{ 
              minWidth: 160,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4
              }
            }}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Eliminar Equipo */}
      <Dialog open={openEliminar} onClose={() => setOpenEliminar(false)}>
        <DialogTitle>🗑️ Eliminar Equipo</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar el equipo "{equipoSeleccionado?.nombre}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEliminar(false)}>Cancelar</Button>
          <Button
            onClick={handleEliminarEquipo}
            color="error"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Solicitar Unirse (para jugadores) */}
      <Dialog open={openSolicitud} onClose={() => setOpenSolicitud(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Solicitar Unirse a {equipoSeleccionado?.nombre}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Posición preferida</InputLabel>
              <Select
                value={posicion}
                label="Posición preferida"
                onChange={(e) => setPosicion(e.target.value)}
              >
                {posicionesDisponibles.map((pos) => (
                  <MenuItem key={pos} value={pos}>
                    {pos}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Mensaje (opcional)"
              placeholder="Cuéntanos sobre tu experiencia y por qué quieres unirte al equipo..."
              value={mensajeSolicitud}
              onChange={(e) => setMensajeSolicitud(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSolicitud(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEnviarSolicitud}
            variant="contained"
            disabled={enviandoSolicitud}
          >
            {enviandoSolicitud ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Componente de formulario para equipos
const EquipoForm = ({ equipo, setEquipo, logoPreview, onLogoChange, onEliminarLogo, categoriasDisponibles, teamId, isOrganizador }) => {
  // Estilo común para campos dark mode
  const darkModeFieldStyle = {
    '& .MuiInputLabel-root': {
      color: 'grey.300'
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      backgroundColor: 'grey.800',
      color: 'white',
      '& fieldset': {
        borderColor: 'grey.600'
      },
      '&:hover fieldset': {
        borderColor: 'primary.main',
        borderWidth: 2
      },
      '&.Mui-focused fieldset': {
        borderColor: 'primary.main',
        borderWidth: 2
      }
    }
  };
  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {/* Sección de imagen arriba de todo */}
      <Grid item xs={12}>
        {isOrganizador && teamId ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            mb: 3
          }}>
            {/* Imagen del equipo - centrada arriba */}
            <Box sx={{ 
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              border: '2px solid',
              borderColor: 'primary.main',
              boxShadow: 3,
              bgcolor: 'white',
              width: 120,
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LogoDisplay 
                src={logoPreview || equipo.logo} 
                width={116} 
                height={116}
                shape="square"
                fallbackText="Equipo"
                sx={{
                  borderRadius: 2
                }}
              />
              {logoPreview && (
                <Box sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'success.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 'bold'
                }}>
                  ✓
                </Box>
              )}
            </Box>
            
            {/* Botones debajo de la foto */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2,
              justifyContent: 'center'
            }}>
              {/* Botón Editar Foto */}
              <Button
                variant="contained"
                component="label"
                startIcon={<PhotoCamera />}
                sx={{ 
                  width: 100,
                  height: 40,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 2,
                  bgcolor: 'primary.main',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-1px)',
                    bgcolor: 'primary.dark'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Editar
                <input type="file" hidden accept="image/*" onChange={onLogoChange} />
              </Button>
              
              {/* Botón Eliminar Foto */}
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={onEliminarLogo}
                sx={{ 
                  width: 100,
                  height: 40,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  borderWidth: 2,
                  borderColor: 'error.main',
                  color: 'error.main',
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'translateY(-1px)',
                    bgcolor: 'error.main',
                    color: 'white'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                disabled={!equipo.logo && !logoPreview}
              >
                Eliminar
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              sx={{ flex: 1 }}
            >
              Subir Imagen
              <input type="file" hidden accept="image/*" onChange={onLogoChange} />
            </Button>
            {logoPreview && (
              <LogoDisplay 
                src={logoPreview} 
                size="small" 
                shape="square"
                fallbackText="Imagen"
              />
            )}
          </Box>
        )}
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Nombre del Equipo *"
          value={equipo.nombre}
          onChange={(e) => setEquipo({ ...equipo, nombre: e.target.value })}
          required
          variant="outlined"
          size="small"
          sx={darkModeFieldStyle}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required size="small">
          <InputLabel sx={{ color: 'grey.300' }}>Categorías *</InputLabel>
          <Select
            multiple
            value={equipo.categorias}
            onChange={(e) => setEquipo({ ...equipo, categorias: e.target.value })}
            input={<OutlinedInput label="Categorías" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip
                    key={value}
                    label={value}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ borderRadius: 1 }}
                  />
                ))}
              </Box>
            )}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'grey.800',
                color: 'white',
                '& fieldset': {
                  borderColor: 'grey.600'
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 2
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 2
                }
              }
            }}
          >
            {categoriasDisponibles.map(categoria => (
              <MenuItem key={asText(categoria)} value={categoria}>{asText(categoria)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Club"
          value={equipo.club}
          onChange={(e) => setEquipo({ ...equipo, club: e.target.value })}
          variant="outlined"
          size="small"
          sx={darkModeFieldStyle}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Ciudad"
          value={equipo.ciudad}
          onChange={(e) => setEquipo({ ...equipo, ciudad: e.target.value })}
          variant="outlined"
          size="small"
          sx={darkModeFieldStyle}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Teléfono"
          value={equipo.telefono}
          onChange={(e) => setEquipo({ ...equipo, telefono: e.target.value })}
          variant="outlined"
          size="small"
          sx={darkModeFieldStyle}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={equipo.email}
          onChange={(e) => setEquipo({ ...equipo, email: e.target.value })}
          variant="outlined"
          size="small"
          sx={darkModeFieldStyle}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Sitio Web"
          value={equipo.sitioWeb}
          onChange={(e) => setEquipo({ ...equipo, sitioWeb: e.target.value })}
          variant="outlined"
          size="small"
          sx={darkModeFieldStyle}
        />
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Descripción"
          multiline
          rows={2}
          value={equipo.descripcion}
          onChange={(e) => setEquipo({ ...equipo, descripcion: e.target.value })}
          placeholder="Descripción del equipo..."
          variant="outlined"
          size="small"
          sx={darkModeFieldStyle}
        />
      </Grid>
    </Grid>
  );
};

export default GestionEquipos;
