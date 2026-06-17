import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  CardContent,
  CardActions,
  Box,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import {
  Search,
  SportsRugby,
  People,
  Schedule,
  Add,
  PlayArrow,
  TableChart,
  Delete,
  Warning,
  EmojiEvents
} from '@mui/icons-material';
import { torneosGestionService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import toast from 'react-hot-toast';
import GestionEquiposTorneo from '../../components/Torneos/GestionEquiposTorneo';
import TablaPosiciones from '../../components/Torneos/TablaPosiciones';
import FixtureGenerator from '../../components/Fixture/FixtureGenerator';
import { useTorneos, useCreateTorneo, useDeleteTorneo } from '../../hooks/useQueryHooks';
import { invalidateQueries } from '../../config/queryClient';
import { useQuery } from '@tanstack/react-query';
import BaseCard from '../../components/ui/BaseCard';
import BaseButton from '../../components/ui/BaseButton';
import EmptyState from '../../components/ui/EmptyState';
import CardSkeleton from '../../components/ui/CardSkeleton';
import { asText } from '../../utils/text';
import api from '../../services/api';

const Torneos = () => {
  // React Query - Cargar torneos con caché
  const { data: torneos = [], isLoading: loading, isError } = useTorneos();
  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos'],
    queryFn: () => api.get('/equipos').then(res => res.data),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
  const createTorneoMutation = useCreateTorneo();
  const deleteTorneoMutation = useDeleteTorneo();
  const rolePermissions = useRolePermissions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openCrearTorneo, setOpenCrearTorneo] = useState(false);
  const [nuevoTorneo, setNuevoTorneo] = useState({
    nombre: '',
    categoria: '',
    formato: 'liga',
    idaYvuelta: false,
    cantidadGrupos: 2,
    equiposPorGrupo: 4
  });
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [openGestionEquipos, setOpenGestionEquipos] = useState(false);
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null);
  const [mostrarTablaPosiciones, setMostrarTablaPosiciones] = useState(false);
  const [torneoParaTabla, setTorneoParaTabla] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [torneoToDelete, setTorneoToDelete] = useState(null);
  const [openFixtureGenerator, setOpenFixtureGenerator] = useState(false);
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const asText = (value) => {
    if (value == null) return '';
    if (typeof value === 'object') return value.nombre || value.id || '';
    return String(value);
  };

  // Función para formatear fechas
  const formatFecha = (fecha) => {
    if (!fecha) return 'Por definir';
    
    try {
      let fechaObj;
      
      // Si es un objeto Timestamp de Firestore
      if (fecha && typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      } 
      // Si es una cadena en formato ISO (YYYY-MM-DD)
      else if (typeof fecha === 'string') {
        // Añadir hora para evitar problemas de zona horaria
        fechaObj = new Date(fecha + 'T12:00:00');
      } 
      // Si ya es un objeto Date
      else if (fecha instanceof Date) {
        fechaObj = fecha;
      } 
      else {
        return 'Por definir';
      }
      
      // Formatear como DD/MM/YYYY
      const dia = fechaObj.getDate().toString().padStart(2, '0');
      const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
      const anio = fechaObj.getFullYear();
      
      return `${dia}/${mes}/${anio}`;
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Por definir';
    }
  };

  // Función para manejar la selección de equipos
  const handleEquiposChange = (event) => {
    const value = event.target.value;
    setEquiposSeleccionados(typeof value === 'string' ? value.split(',') : value);
  };

  // Filtrar equipos por categoría
  const equiposFiltrados = equipos.filter(equipo => {
    if (equipo.categorias && Array.isArray(equipo.categorias)) {
      return equipo.categorias.includes(nuevoTorneo.categoria);
    }
    return equipo.categoria === nuevoTorneo.categoria;
  });


  const crearTorneo = async () => {
    // Validar campos requeridos
    if (!nuevoTorneo.nombre || !nuevoTorneo.categoria) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar configuración de grupos si el formato es grupos-playoff
    if (nuevoTorneo.formato === 'grupos-playoff') {
      const totalEquiposNecesarios = nuevoTorneo.cantidadGrupos * nuevoTorneo.equiposPorGrupo;
      if (equiposSeleccionados.length !== totalEquiposNecesarios) {
        toast.error(`Para este formato necesitas exactamente ${totalEquiposNecesarios} equipos (${nuevoTorneo.cantidadGrupos} grupos × ${nuevoTorneo.equiposPorGrupo} equipos por grupo). Actualmente tienes ${equiposSeleccionados.length} equipos seleccionados.`);
        return;
      }
    }

    // Preparar equipos con información completa
    const equiposCompletos = equiposSeleccionados.map(equipoId => {
      const equipo = equipos.find(e => e.id === equipoId);
      return {
        id: equipoId,
        nombre: equipo?.nombre || 'Equipo',
        logo: equipo?.logo || ''
      };
    });

    // Las fechas se configurarán al generar el fixture
    const torneoData = {
      nombre: nuevoTorneo.nombre,
      categoria: nuevoTorneo.categoria,
      organizadorId: userProfile.uid,
      equipos: equiposCompletos,
      formato: nuevoTorneo.formato,
      idaYvuelta: nuevoTorneo.idaYvuelta
    };

    // Agregar configuración de grupos si el formato es grupos-playoff
    if (nuevoTorneo.formato === 'grupos-playoff') {
      torneoData.cantidadGrupos = nuevoTorneo.cantidadGrupos;
      torneoData.equiposPorGrupo = nuevoTorneo.equiposPorGrupo;
    }

    createTorneoMutation.mutate(torneoData, {
      onSuccess: () => {
        setOpenCrearTorneo(false);
        setNuevoTorneo({
          nombre: '',
          categoria: '',
          formato: 'liga',
          idaYvuelta: false,
          cantidadGrupos: 2,
          equiposPorGrupo: 4
        });
        setEquiposSeleccionados([]);
      }
    });
  };

  const handleGestionarEquipos = (torneo) => {
    setTorneoSeleccionado(torneo);
    setOpenGestionEquipos(true);
  };

  const handleCloseGestionEquipos = () => {
    setOpenGestionEquipos(false);
    setTorneoSeleccionado(null);
  };

  const handleEquiposUpdated = () => {
    // Invalidar caché de torneos para recargar
    invalidateQueries.torneos();
  };

  const handleComenzarTorneo = (torneo) => {
    // Abrir el generador de fixture en lugar de comenzar directamente
    setTorneoSeleccionado(torneo);
    setOpenFixtureGenerator(true);
  };

  const handleVerTablaPosiciones = (torneo) => {
    setTorneoParaTabla(torneo);
    setMostrarTablaPosiciones(true);
  };

  const handleCloseTablaPosiciones = () => {
    setMostrarTablaPosiciones(false);
    setTorneoParaTabla(null);
  };

  const handleDeleteTorneo = (torneo) => {
    setTorneoToDelete(torneo);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteTorneo = async () => {
    if (!torneoToDelete) return;
    deleteTorneoMutation.mutate(torneoToDelete.id, {
      onSuccess: () => {
        setOpenDeleteDialog(false);
        setTorneoToDelete(null);
      }
    });
  };

  const cancelDeleteTorneo = () => {
    setOpenDeleteDialog(false);
    setTorneoToDelete(null);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'En Curso':
      case 'en_curso':
        return 'success';
      case 'pendiente':
        return 'info';
      case 'finalizado':
        return 'default';
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'En Curso':
      case 'en_curso':
        return 'En Curso';
      case 'pendiente':
        return 'Pendiente';
      case 'finalizado':
        return 'Finalizado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  };

  const filteredTorneos = (torneos || []).filter(torneo =>
    torneo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    torneo.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={2.5}>
          {[...Array(8)].map((_, i) => (
            <Grid item xs={12} md={6} lg={3} key={i}>
              <CardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">Error al cargar torneos</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4, pb: 10 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Buscar torneos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          {userProfile?.tipoUsuario === 'organizador' && (
            <BaseButton
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenCrearTorneo(true)}
              sx={{ minWidth: 160 }}
            >
              Crear Torneo
            </BaseButton>
          )}
        </Box>
      </Box>

      {filteredTorneos.length === 0 ? (
        <EmptyState
          icon={<SportsRugby sx={{ fontSize: 64, color: 'text.secondary' }} />}
          title={searchTerm ? 'No se encontraron torneos' : 'No hay torneos disponibles'}
          description={searchTerm ? 'Intenta con otros términos de búsqueda' : 'Vuelve más tarde para ver nuevos torneos'}
        />
      ) : (
        <Grid container spacing={2.5}>
          {filteredTorneos.map((torneo) => (
            <Grid item xs={12} md={6} lg={3} key={torneo.id}>
              <BaseCard>
                <CardContent sx={{ flexGrow: 1, p: 2, position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography 
                      variant="h6" 
                      component="h2" 
                      sx={{ 
                        fontWeight: 700,
                        color: 'text.primary',
                        lineHeight: 1.2
                      }}
                    >
                      {torneo.nombre}
                    </Typography>
                    <Chip
                      label={getEstadoText(torneo.estado)}
                      color={getEstadoColor(torneo.estado)}
                      size="small"
                      sx={{ 
                        fontWeight: 600,
                        boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        '& .MuiChip-label': {
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.25,
                    p: 1.25,
                    backgroundColor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(4px)'
                    }
                  }}>
                    <Box sx={{ 
                      p: 0.75, 
                      borderRadius: '50%', 
                      backgroundColor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1.25,
                      boxShadow: 1
                    }}>
                      <SportsRugby sx={{ fontSize: 16, color: 'white' }} />
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 600, 
                      color: 'text.primary',
                      fontSize: '0.8rem'
                    }}>
                      {asText(torneo.categoria)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.25,
                    p: 1.25,
                    backgroundColor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(4px)'
                    }
                  }}>
                    <Box sx={{ 
                      p: 0.75, 
                      borderRadius: '50%', 
                      backgroundColor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1.25,
                      boxShadow: 1
                    }}>
                      <Schedule sx={{ fontSize: 16, color: 'white' }} />
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 600, 
                      color: 'text.primary',
                      fontSize: '0.8rem'
                    }}>
                      {formatFecha(torneo.fechaInicio)} - {formatFecha(torneo.fechaFin)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    p: 1.25,
                    backgroundColor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(4px)'
                    }
                  }}>
                    <Box sx={{ 
                      p: 0.75, 
                      borderRadius: '50%', 
                      backgroundColor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1.25,
                      boxShadow: 1
                    }}>
                      <People sx={{ fontSize: 16, color: 'white' }} />
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 600, 
                      color: 'text.primary',
                      fontSize: '0.8rem'
                    }}>
                      Organizador: {torneo.organizadorNombre || (torneo.organizador && (torneo.organizador.nombre || torneo.organizador.id)) || 'Sistema'}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ 
                  p: 2, 
                  pt: 0.5, 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 1,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <BaseButton
                      variant="contained"
                      onClick={() => navigate(`/torneos/${torneo.id}`)}
                      sx={{ 
                        minWidth: 'auto',
                        borderRadius: 1.5,
                        px: 2,
                        py: 0.75,
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        boxShadow: 1,
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 2
                        }
                      }}
                    >
                      Ver Detalles
                    </BaseButton>
                    {rolePermissions.canManageEquipos() && (
                      <>
                        <BaseButton
                          variant="outlined"
                          onClick={() => handleGestionarEquipos(torneo)}
                          sx={{ minWidth: 'auto' }}
                        >
                          Gestionar Equipos
                        </BaseButton>
                        {userProfile?.tipoUsuario === 'organizador' && (
                          <BaseButton
                            variant="outlined"
                            color="error"
                            startIcon={<Delete />}
                            onClick={() => handleDeleteTorneo(torneo)}
                            disabled={torneo.estado === 'En Curso' || torneo.estado === 'finalizado'}
                            sx={{ minWidth: 'auto' }}
                          >
                            Eliminar
                          </BaseButton>
                        )}
                      </>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {torneo.estado === 'pendiente' && userProfile?.tipoUsuario === 'organizador' && (
                      <BaseButton
                        variant="contained"
                        color="success"
                        startIcon={<TableChart />}
                        onClick={() => handleComenzarTorneo(torneo)}
                        sx={{ 
                          minWidth: 'auto',
                          boxShadow: 1,
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        Generar Fixture
                      </BaseButton>
                    )}
                    {torneo.estado === 'En Curso' && (
                      <BaseButton
                        variant="outlined"
                        color="primary"
                        startIcon={<TableChart />}
                        onClick={() => handleVerTablaPosiciones(torneo)}
                        sx={{ 
                          minWidth: 'auto',
                          borderWidth: 2,
                          '&:hover': {
                            borderWidth: 2,
                            backgroundColor: 'primary.main',
                            color: 'white'
                          }
                        }}
                      >
                        Tabla
                      </BaseButton>
                    )}
                    {torneo.estado === 'En Curso' && (
                      <BaseButton
                        variant="outlined"
                        color="secondary"
                        startIcon={<EmojiEvents />}
                        onClick={() => navigate(`/torneos/${torneo.id}/fases`)}
                        sx={{ 
                          minWidth: 'auto',
                          borderRadius: 1.5,
                          px: 1.75,
                          py: 0.6,
                          fontWeight: 600,
                          textTransform: 'none',
                          fontSize: '0.8rem',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: 1
                          }
                        }}
                      >
                        Fases
                      </BaseButton>
                    )}
                  </Box>
                </CardActions>
              </BaseCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal para crear torneo */}
      <Dialog open={openCrearTorneo} onClose={() => setOpenCrearTorneo(false)} maxWidth="md" fullWidth>
        <DialogTitle>🏆 Crear Nuevo Torneo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre del Torneo *"
                value={nuevoTorneo.nombre}
                onChange={(e) => setNuevoTorneo({...nuevoTorneo, nombre: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
               <FormControl fullWidth required>
                 <InputLabel>Categoría *</InputLabel>
                 <Select
                   value={nuevoTorneo.categoria}
                   onChange={(e) => setNuevoTorneo({...nuevoTorneo, categoria: e.target.value})}
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
            
            {/* Selector de formato */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Seleccionar formato</InputLabel>
                <Select
                  value={nuevoTorneo.formato}
                  onChange={(e) => setNuevoTorneo({...nuevoTorneo, formato: e.target.value})}
                >
                  <MenuItem value="liga">1️⃣ Formato Liga (Todos contra todos)</MenuItem>
                  <MenuItem value="grupos-playoff">2️⃣ Formato Grupos + Playoff</MenuItem>
                  <MenuItem value="eliminacion_directa">3️⃣ Eliminación Directa</MenuItem>
                  <MenuItem value="personalizado">4️⃣ Formato Personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Descripción del formato Liga */}
            {nuevoTorneo.formato === 'liga' && (
              <Grid item xs={12}>
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: 'primary.main', 
                  borderRadius: 1, 
                  color: 'primary.contrastText'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📋 Descripción:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Cada equipo juega contra todos los demás una o dos veces (ida y/o vuelta).
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Se genera una tabla general con:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • Puntos (4 por victoria, 2 por empate, bonus ofensivo/defensivo)
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • PJ, PG, PE, PP, PF, PC, DF, Bonus, Total
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Se define el campeón por puntos acumulados.
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Descripción del formato Grupos + Playoff */}
            {nuevoTorneo.formato === 'grupos-playoff' && (
              <>
                <Grid item xs={12}>
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'secondary.main', 
                    borderRadius: 1, 
                    color: 'secondary.contrastText'
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      📋 Descripción:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Los equipos se dividen en grupos. Dentro de cada grupo se juega un formato liga.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Los primeros (o primeros y segundos) de cada grupo clasifican a cuartos, semis y final.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Se generan 2 estructuras:
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 2 }}>
                      • Tabla por grupo
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 2 }}>
                      • Fixture de playoff
                    </Typography>
                  </Box>
                </Grid>
                
                {/* Configuración de grupos */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Cantidad de Grupos</InputLabel>
                    <Select
                      value={nuevoTorneo.cantidadGrupos}
                      onChange={(e) => setNuevoTorneo({...nuevoTorneo, cantidadGrupos: parseInt(e.target.value)})}
                    >
                      <MenuItem value={2}>2 Grupos</MenuItem>
                      <MenuItem value={3}>3 Grupos</MenuItem>
                      <MenuItem value={4}>4 Grupos</MenuItem>
                      <MenuItem value={6}>6 Grupos</MenuItem>
                      <MenuItem value={8}>8 Grupos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Equipos por Grupo</InputLabel>
                    <Select
                      value={nuevoTorneo.equiposPorGrupo}
                      onChange={(e) => setNuevoTorneo({...nuevoTorneo, equiposPorGrupo: parseInt(e.target.value)})}
                    >
                      <MenuItem value={3}>3 Equipos</MenuItem>
                      <MenuItem value={4}>4 Equipos</MenuItem>
                      <MenuItem value={5}>5 Equipos</MenuItem>
                      <MenuItem value={6}>6 Equipos</MenuItem>
                      <MenuItem value={8}>8 Equipos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Total de equipos necesarios: {nuevoTorneo.cantidadGrupos * nuevoTorneo.equiposPorGrupo} equipos
                  </Alert>
                </Grid>
              </>
            )}

            {/* Descripción del formato Eliminación Directa */}
            {nuevoTorneo.formato === 'eliminacion_directa' && (
              <Grid item xs={12}>
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: 'warning.main', 
                  borderRadius: 1, 
                  color: 'warning.contrastText'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    ⚡ Descripción:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Los equipos se enfrentan en llaves eliminatorias. El perdedor queda eliminado.
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Se generan automáticamente las fases según la cantidad de equipos:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • 8 equipos: Cuartos → Semifinales → Final
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • 16 equipos: Octavos → Cuartos → Semifinales → Final
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • 32 equipos: Dieciseisavos → Octavos → Cuartos → Semifinales → Final
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    El ganador de la final es el campeón del torneo.
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Descripción del formato Personalizado */}
            {nuevoTorneo.formato === 'personalizado' && (
              <Grid item xs={12}>
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: 'info.main', 
                  borderRadius: 1, 
                  color: 'info.contrastText'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    🛠️ Descripción:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Formato flexible para torneos con estructuras especiales o únicas.
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Características:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • Sin estructura fija predefinida
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • Creación manual de todos los partidos
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • Control total sobre fechas, horarios y canchas
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • Usa referencias dinámicas: "Ganador Partido X" o "Perdedor Partido Y"
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • Ideal para torneos con formatos especiales como doble eliminación, round robin modificado, etc.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                    ⚠️ Nota: Deberás crear cada partido manualmente usando el Generador de Fixture.
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Modalidad de juego para Liga */}
            {nuevoTorneo.formato === 'liga' && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Modalidad de Juego:
                </Typography>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={nuevoTorneo.idaYvuelta}
                    onChange={(e) => setNuevoTorneo({...nuevoTorneo, idaYvuelta: e.target.value === 'true'})}
                  >
                    <FormControlLabel 
                      value={false} 
                      control={<Radio />} 
                      label="Solo ida (cada equipo juega una vez contra cada rival)" 
                    />
                    <FormControlLabel 
                      value={true} 
                      control={<Radio />} 
                      label="Ida y vuelta (cada equipo juega dos veces contra cada rival)" 
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
            )}

            {/* Selector de equipos */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Equipos del Torneo</InputLabel>
                <Select
                  multiple
                  value={equiposSeleccionados}
                  onChange={handleEquiposChange}
                  input={<OutlinedInput label="Equipos del Torneo" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const equipo = equipos.find(e => e.id === (value?.id ?? value));
                        return (
                          <Chip 
                            key={value?.id ?? value} 
                            label={
                              equipo?.nombre ||
                              (typeof value === 'object' ? (value?.nombre || value?.id) : String(value))
                            } 
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                  disabled={equiposFiltrados.length === 0}
                >
                  {equiposFiltrados.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        {nuevoTorneo.categoria ? 
                          `No hay equipos disponibles para la categoría "${nuevoTorneo.categoria}"` : 
                          'Selecciona una categoría primero'
                        }
                      </Typography>
                    </MenuItem>
                  ) : (
                    equiposFiltrados.map((equipo) => (
                      <MenuItem key={equipo.id} value={equipo.id}>
                        <Checkbox checked={equiposSeleccionados.indexOf(equipo.id) > -1} />
                        <ListItemText primary={equipo.nombre} />
                      </MenuItem>
                    ))
                  )}
                </Select>
                {equiposFiltrados.length === 0 && nuevoTorneo.categoria && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    💡 Tip: Los equipos deben tener la categoría "{nuevoTorneo.categoria}" para aparecer en esta lista
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <BaseButton onClick={() => setOpenCrearTorneo(false)}>Cancelar</BaseButton>
          <BaseButton 
            onClick={crearTorneo} 
            variant="contained"
            disabled={!nuevoTorneo.nombre || !nuevoTorneo.categoria}
          >
            Crear Torneo
          </BaseButton>
        </DialogActions>
      </Dialog>

      {/* Modal para gestionar equipos del torneo */}
      <GestionEquiposTorneo
        open={openGestionEquipos}
        onClose={handleCloseGestionEquipos}
        torneo={torneoSeleccionado}
        onEquiposUpdated={handleEquiposUpdated}
      />

      {/* Modal para tabla de posiciones */}
      <Dialog 
        open={mostrarTablaPosiciones} 
        onClose={handleCloseTablaPosiciones}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Tabla de Posiciones
        </DialogTitle>
        <DialogContent>
          {torneoParaTabla && (
            <TablaPosiciones 
              torneoId={torneoParaTabla.id}
              torneoNombre={torneoParaTabla.nombre}
            />
          )}
        </DialogContent>
        <DialogActions>
          <BaseButton onClick={handleCloseTablaPosiciones}>
            Cerrar
          </BaseButton>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para eliminar torneo */}
      <Dialog open={openDeleteDialog} onClose={cancelDeleteTorneo} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            Confirmar Eliminación
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ¿Estás seguro de que quieres eliminar el torneo "{torneoToDelete?.nombre}"?
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer. El torneo y todos sus datos asociados serán eliminados permanentemente.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            <strong>Estado del torneo:</strong> {torneoToDelete?.estado}<br/>
            <strong>Categoría:</strong> {asText(torneoToDelete?.categoria)}<br/>
            <strong>Período:</strong> {torneoToDelete?.fechaInicio && new Date(torneoToDelete.fechaInicio).toLocaleDateString()} - {torneoToDelete?.fechaFin && new Date(torneoToDelete.fechaFin).toLocaleDateString()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <BaseButton onClick={cancelDeleteTorneo} disabled={deleteTorneoMutation.isLoading}>
            Cancelar
          </BaseButton>
          <BaseButton 
            onClick={confirmDeleteTorneo}
            color="error" 
            variant="contained"
            disabled={deleteTorneoMutation.isLoading}
            startIcon={deleteTorneoMutation.isLoading ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleteTorneoMutation.isLoading ? 'Eliminando...' : 'Eliminar Torneo'}
          </BaseButton>
        </DialogActions>
      </Dialog>

      {/* Generador de Fixture */}
      <FixtureGenerator
        open={openFixtureGenerator}
        onClose={() => {
          setOpenFixtureGenerator(false);
          setTorneoSeleccionado(null);
          invalidateQueries.torneos(); // Recargar torneos después de generar fixture
        }}
        torneos={torneos}
        torneoPreseleccionado={torneoSeleccionado}
      />
    </Container>
  );
};

export default Torneos;
