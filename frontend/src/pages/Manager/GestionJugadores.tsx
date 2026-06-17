import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  PersonAdd,
  Person,
  Delete,
  ArrowBack,
  Visibility,
  Edit
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import AgregarJugadorModal from './components/AgregarJugadorModal';

const GestionJugadores: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<any>(null);
  const [openAgregarJugador, setOpenAgregarJugador] = useState(false);
  const [eliminandoJugador, setEliminandoJugador] = useState<string | null>(null);
  const [openEditarCategoria, setOpenEditarCategoria] = useState(false);
  const [jugadorEditando, setJugadorEditando] = useState<any>(null);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [actualizandoCategoria, setActualizandoCategoria] = useState(false);

  const cargarClub = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar datos del club
      const clubResponse = await api.get('/managers/mi-club');
      
      if (clubResponse.data.club) {
        const clubData = clubResponse.data.club;
        
        // Cargar jugadores con datos completos
        try {
          const jugadoresResponse = await api.get(`/managers/club/${clubData.id}/jugadores`);
          clubData.jugadores = jugadoresResponse.data.jugadores || [];
        } catch (error) {
          console.error('Error cargando jugadores:', error);
          clubData.jugadores = [];
        }
        
        setClub(clubData);
      } else {
        toast.error('No tienes un club creado');
        navigate('/manager/mi-club');
      }
    } catch (error) {
      console.error('Error cargando club:', error);
      toast.error('Error al cargar información del club');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    cargarClub();
  }, [cargarClub]);

  const handleEliminarJugador = async (jugadorId: string) => {
    if (!club) return;
    
    try {
      setEliminandoJugador(jugadorId);
      await api.delete(`/managers/club/${club.id}/jugadores/${jugadorId}`);
      
      toast.success('Jugador eliminado del club exitosamente');
      
      // Recargar la lista de jugadores
      await cargarClub();
    } catch (error: any) {
      console.error('Error eliminando jugador:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar el jugador');
    } finally {
      setEliminandoJugador(null);
    }
  };

  const handleJugadorAgregado = () => {
    cargarClub(); // Recargar el club
    setOpenAgregarJugador(false);
  };

  const categorias = ['M14', 'M15', 'M16', 'M17', 'M18', 'M19', 'Intermedia', 'Preintermedia', 'Primera'];

  const handleEditarCategoria = (jugador: any) => {
    setJugadorEditando(jugador);
    setNuevaCategoria(jugador.categoria || '');
    setOpenEditarCategoria(true);
  };

  const handleCerrarEditarCategoria = () => {
    setOpenEditarCategoria(false);
    setJugadorEditando(null);
    setNuevaCategoria('');
  };

  const handleActualizarCategoria = async () => {
    if (!jugadorEditando || !club || !nuevaCategoria) return;

    try {
      setActualizandoCategoria(true);
      
      // Actualizar la categoría del jugador en la base de datos
      await api.put(`/managers/jugador/${jugadorEditando.jugadorId}/categoria`, {
        categoria: nuevaCategoria
      });

      toast.success('Categoría actualizada exitosamente');
      
      // Recargar la lista de jugadores
      await cargarClub();
      
      handleCerrarEditarCategoria();
    } catch (error: any) {
      console.error('Error actualizando categoría:', error);
      toast.error(error.response?.data?.error || 'Error al actualizar la categoría');
    } finally {
      setActualizandoCategoria(false);
    }
  };

  // Agrupar jugadores por categoría
  const jugadoresPorCategoria = club?.jugadores?.reduce((acc: any, jugador: any) => {
    const categoria = jugador.categoria || 'Sin categoría';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(jugador);
    return acc;
  }, {}) || {};

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

  if (!club) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">
          No tienes un club creado. Crea tu club primero.
        </Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate('/manager/mi-club')}
        >
          Ir a Mi Club
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/manager/mi-club')}
          sx={{ mb: 2 }}
        >
          Volver a Mi Club
        </Button>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              Jugadores de {club.nombre}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Total: {club.jugadores?.length || 0} jugadores
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setOpenAgregarJugador(true)}
          >
            Agregar Jugador
          </Button>
        </Box>
      </Box>

      {/* Lista de Jugadores */}
      {club.jugadores?.length === 0 ? (
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <Person sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay jugadores en el club
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Comienza agregando jugadores a tu club
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setOpenAgregarJugador(true)}
          >
            Agregar Primer Jugador
          </Button>
        </Paper>
      ) : (
        <>
          {Object.entries(jugadoresPorCategoria).map(([categoria, jugadores]: [string, any]) => (
            <Paper key={categoria} elevation={3} sx={{ mb: 3, p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  {categoria}
                </Typography>
                <Chip label={`${jugadores.length} jugador${jugadores.length !== 1 ? 'es' : ''}`} color="primary" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                {jugadores.map((jugador: any, index: number) => (
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
                      secondaryAction={
                        <Box display="flex" gap={1}>
                          <IconButton 
                            edge="end" 
                            color="primary" 
                            title="Ver perfil del jugador"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jugadores/${jugador.jugadorId}`);
                            }}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            color="secondary" 
                            title="Editar categoría"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditarCategoria(jugador);
                            }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            color="error" 
                            title="Remover jugador"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEliminarJugador(jugador.jugadorId);
                            }}
                            disabled={eliminandoJugador === jugador.jugadorId}
                          >
                            {eliminandoJugador === jugador.jugadorId ? (
                              <CircularProgress size={20} />
                            ) : (
                              <Delete />
                            )}
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={jugador.foto || ''}
                        >
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1" fontWeight="medium">
                              {jugador.nombre} {jugador.apellido}
                            </Typography>
                            <Chip
                              label={jugador.categoria}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {jugador.email}
                            </Typography>
                            {jugador.fechaIngreso && (
                              <Typography variant="caption" color="text.secondary">
                                Ingresó: {new Date(jugador.fechaIngreso).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          ))}
        </>
      )}

      {/* Modal para agregar jugadores */}
      <AgregarJugadorModal
        open={openAgregarJugador}
        onClose={() => setOpenAgregarJugador(false)}
        clubId={club.id}
        onJugadorAgregado={handleJugadorAgregado}
      />

      {/* Modal para editar categoría */}
      <Dialog open={openEditarCategoria} onClose={handleCerrarEditarCategoria} maxWidth="sm" fullWidth>
        <DialogTitle>
          Editar Categoría del Jugador
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Jugador: <strong>{jugadorEditando?.nombre} {jugadorEditando?.apellido}</strong>
            </Typography>
            
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={nuevaCategoria}
                label="Categoría"
                onChange={(e) => setNuevaCategoria(e.target.value)}
              >
                {categorias.map((categoria) => (
                  <MenuItem key={categoria} value={categoria}>
                    {categoria}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCerrarEditarCategoria} disabled={actualizandoCategoria}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleActualizarCategoria}
            disabled={actualizandoCategoria || !nuevaCategoria}
            startIcon={actualizandoCategoria ? <CircularProgress size={20} /> : null}
          >
            {actualizandoCategoria ? 'Actualizando...' : 'Actualizar Categoría'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GestionJugadores;



