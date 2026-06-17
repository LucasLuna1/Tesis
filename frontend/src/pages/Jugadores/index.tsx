import React, { useState, useEffect, useCallback } from 'react';
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
  Avatar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Search,
  People,
  Star,
  EmojiEvents,
  TrendingUp,
  PersonAdd,
  PersonRemove
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { construirUrlImagen } from '../../utils/imageUtils';

interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  foto?: string;
  posicion?: string;
  numero?: number;
  equipoNombre?: string;
  tipoUsuario?: string;
  estadisticas?: {
    partidosJugados: number;
    tries: number;
    tarjetasAmarillas: number;
    tarjetasRojas: number;
    rating: number;
  };
  siguiendo?: boolean;
}

const Jugadores: React.FC = () => {
  const [todosLosJugadores, setTodosLosJugadores] = useState<Jugador[]>([]); // Lista completa
  const [jugadoresVisibles, setJugadoresVisibles] = useState(15); // Mostrar 15 inicialmente
  const [cargandoMas, setCargandoMas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroPosicion, setFiltroPosicion] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('');
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const navigate = useNavigate();
  const authContext = useAuth();
  const currentUserId = authContext?.user?.uid;

  const posiciones = [
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

  const buscarJugadores = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('nombre', searchTerm);
      }
      if (filtroPosicion) {
        params.append('posicion', filtroPosicion);
      }
      if (filtroEquipo) {
        params.append('equipo', filtroEquipo);
      }
      
      // Cargar todos los jugadores sin límite de paginación
      const response = await api.get(`/jugadores/buscar?${params.toString()}`);
      
      // 🚫 Excluir al usuario actual de los resultados
      const jugadoresFiltrados = response.data.jugadores.filter(
        (jugador: Jugador) => jugador.id !== currentUserId
      );
      
      setTodosLosJugadores(jugadoresFiltrados);
      
      // Resetear jugadores visibles cuando cambian los filtros
      setJugadoresVisibles(15);
    } catch (error) {
      console.error('Error buscando jugadores:', error);
      setError('Error al buscar jugadores');
      toast.error('Error al buscar jugadores');
    } finally {
      setLoading(false);
    }
  }, [filtroPosicion, filtroEquipo, searchTerm, currentUserId]);

  const buscarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('nombre', searchTerm);
      }
      
      // Cargar todos los usuarios
      const response = await api.get(`/usuarios/buscar?${params.toString()}`);
      
      // 🚫 Excluir al usuario actual y filtrar solo usuarios que NO sean jugadores
      const usuariosFiltrados = response.data.usuarios.filter(
        (usuario: any) => 
          usuario.id !== currentUserId && 
          usuario.tipoUsuario !== 'jugador'
      );
      
      setTodosLosJugadores(usuariosFiltrados);
      
      // Resetear jugadores visibles cuando cambian los filtros
      setJugadoresVisibles(15);
    } catch (error) {
      console.error('Error buscando usuarios:', error);
      setError('Error al buscar usuarios');
      toast.error('Error al buscar usuarios');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentUserId]);

  // Efecto inicial para cargar jugadores al montar
  useEffect(() => {
    buscarJugadores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efecto unificado para búsqueda con debounce
  useEffect(() => {
    // Para searchTerm, aplicar debounce
    if (searchTerm.length > 0 && searchTerm.length < 2) {
      // No buscar si el término es muy corto
      return;
    }

    const timeoutId = setTimeout(() => {
      if (mostrarUsuarios) {
        buscarUsuarios();
      } else {
        buscarJugadores();
      }
    }, searchTerm.length > 0 ? 500 : 0); // Sin delay para búsqueda inicial

    return () => clearTimeout(timeoutId);
  }, [filtroPosicion, filtroEquipo, searchTerm, buscarJugadores, buscarUsuarios, mostrarUsuarios]);

  // Función para cargar más jugadores
  const cargarMasJugadores = () => {
    setCargandoMas(true);
    
    // Simular carga con timeout para mejor UX
    setTimeout(() => {
      setJugadoresVisibles(prev => Math.min(prev + 15, todosLosJugadores.length));
      setCargandoMas(false);
    }, 500);
  };

  const handleSeguir = async (jugadorId: string) => {
    try {
      const response = await api.post(`/jugadores/seguir/${jugadorId}`);
      const { siguiendo } = response.data;
      
      if (siguiendo) {
        toast.success('Ahora sigues a este jugador');
      } else {
        toast.success('Dejaste de seguir a este jugador');
      }
      
      // Actualizar estado local
      setTodosLosJugadores(prev => 
        prev.map(jugador => 
          jugador.id === jugadorId 
            ? { ...jugador, siguiendo }
            : jugador
        )
      );
    } catch (error) {
      console.error('Error siguiendo jugador:', error);
      toast.error('Error al seguir jugador');
    }
  };

  const toggleUsuarios = () => {
    const nuevoEstado = !mostrarUsuarios;
    setMostrarUsuarios(nuevoEstado);
    setFiltroPosicion('');
    setFiltroEquipo('');
    // Ejecutar la búsqueda correspondiente inmediatamente
    if (nuevoEstado) {
      buscarUsuarios();
    } else {
      buscarJugadores();
    }
  };

  // Calcular jugadores a mostrar y si hay más disponibles
  const jugadoresMostrados = todosLosJugadores.slice(0, jugadoresVisibles);
  const hayMasJugadores = jugadoresVisibles < todosLosJugadores.length;

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4, pb: 10 }}>
      
      {/* Barra de búsqueda y filtros */}
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
          {/* Search */}
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' }, minWidth: { xs: '100%', sm: 200 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar..."
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
          
          {/* Filtro Posición */}
          {!mostrarUsuarios && (
            <Box sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' }, minWidth: { xs: '100%', sm: 140 } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Posición</InputLabel>
                <Select
                  value={filtroPosicion}
                  label="Posición"
                  onChange={(e) => setFiltroPosicion(e.target.value)}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    }
                  }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {posiciones.map((posicion) => (
                    <MenuItem key={posicion} value={posicion}>
                      {posicion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          
          {/* Toggle Jugadores/Usuarios */}
          <Box 
            sx={{ 
              flex: { xs: '1 1 100%', sm: '0 0 auto' },
              display: 'flex',
              gap: 1,
              p: 0.5,
              backgroundColor: 'action.hover',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Button
              size="small"
              variant={!mostrarUsuarios ? "contained" : "text"}
              onClick={() => {
                setMostrarUsuarios(false);
                setFiltroPosicion('');
                setFiltroEquipo('');
                buscarJugadores();
              }}
              sx={{
                minWidth: 100,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: !mostrarUsuarios ? 1 : 'none',
                '&.MuiButton-text': {
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  }
                }
              }}
            >
              Jugadores
            </Button>
            <Button
              size="small"
              variant={mostrarUsuarios ? "contained" : "text"}
              onClick={toggleUsuarios}
              sx={{
                minWidth: 100,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: mostrarUsuarios ? 1 : 'none',
                '&.MuiButton-text': {
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  }
                }
              }}
            >
              Usuarios
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Resultados */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : todosLosJugadores.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {mostrarUsuarios ? 'No se encontraron usuarios' : 'No se encontraron jugadores'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Intenta ajustar tus filtros de búsqueda
          </Typography>
        </Box>
      ) : (
        <>
          {/* Vista de tarjetas */}
          <Grid container spacing={2}>
            {jugadoresMostrados.map((item) => (
              <Grid item xs={6} sm={6} md={3} key={item.id}>
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
                  onClick={() => {
                    if (mostrarUsuarios) {
                      if (item.tipoUsuario === 'arbitro') {
                        navigate(`/arbitros/${item.id}`);
                      } else if (item.tipoUsuario === 'organizador' || item.tipoUsuario === 'admin') {
                        navigate(`/organizadores/${item.id}`);
                      } else if (item.tipoUsuario === 'manager') {
                        navigate(`/managers/${item.id}`);
                      } else {
                        navigate(`/usuarios/${item.id}`);
                      }
                    } else {
                      navigate(`/jugadores/${item.id}`);
                    }
                  }}
                >
                  {/* Fondo con foto blur */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: item.foto 
                        ? `url(${construirUrlImagen(item.foto)})`
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
                    {/* Foto circular */}
                    <Avatar
                      src={construirUrlImagen(item.foto)}
                      sx={{ 
                        width: 56, 
                        height: 56,
                        border: '2px solid white',
                        boxShadow: 2,
                        mx: 'auto',
                        mb: 1,
                        fontSize: '1.25rem'
                      }}
                    >
                      {item.nombre?.charAt(0)}{item.apellido?.charAt(0)}
                    </Avatar>
                    
                    {/* Información del jugador */}
                    <Typography 
                      variant="caption" 
                      fontWeight="bold" 
                      sx={{ 
                        mb: 0.5, 
                        fontSize: '0.8rem',
                        display: 'block',
                        lineHeight: 1.2
                      }}
                    >
                      {item.nombre} {item.apellido}
                    </Typography>
                    
                    {/* Posición/Tipo Usuario */}
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block', 
                        mb: 0.5,
                        fontSize: '0.7rem'
                      }}
                    >
                      {mostrarUsuarios ? (
                        item.tipoUsuario === 'organizador' ? 'Organizador' :
                        item.tipoUsuario === 'admin' ? 'Admin' :
                        item.tipoUsuario === 'arbitro' ? 'Árbitro' :
                        item.tipoUsuario === 'manager' ? 'Manager' :
                        'Usuario'
                      ) : (
                        item.posicion || 'Vacío'
                      )}
                    </Typography>
                    
                    {/* Club */}
                    {!mostrarUsuarios && (
                      <Chip
                        label={item.equipoNombre || 'Vacío'}
                        size="small"
                        sx={{ 
                          height: 18,
                          fontSize: '0.65rem',
                          mb: 0.5
                        }}
                      />
                    )}
                    
                    {/* Botón seguir */}
                    <Box sx={{ mt: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeguir(item.id);
                        }}
                        sx={{ 
                          color: item.siguiendo ? 'primary.main' : 'action.active',
                          padding: 0.5
                        }}
                      >
                        {item.siguiendo ? <PersonRemove sx={{ fontSize: 18 }} /> : <PersonAdd sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Botón Ver Más */}
          {hayMasJugadores && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2, alignItems: 'center', flexDirection: 'column' }}>
              <Button
                variant="contained"
                size="large"
                onClick={cargarMasJugadores}
                disabled={cargandoMas}
                startIcon={cargandoMas ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{
                  minWidth: 200,
                  py: 1.5
                }}
              >
                        {cargandoMas ? 'Cargando...' : `Ver más ${mostrarUsuarios ? 'usuarios' : 'jugadores'} (${todosLosJugadores.length - jugadoresVisibles} restantes)`}
              </Button>
            </Box>
          )}
        </>
      )}

    </Container>
  );
};

export default Jugadores;