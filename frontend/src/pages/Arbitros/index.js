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
  IconButton
} from '@mui/material';
import {
  Search,
  Gavel,
  History,
  Star,
  EmojiEvents,
  LocationOn
} from '@mui/icons-material';
import { arbitrosService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { construirUrlImagen } from '../../utils/imageUtils';

const Arbitros = () => {
  const [todosLosArbitros, setTodosLosArbitros] = useState([]);
  const [arbitrosVisibles, setArbitrosVisibles] = useState(15);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const navigate = useNavigate();

  const especialidades = [
    'Rugby',
    'Básquetbol',
    'Vóley',
    'Tenis',
    'Hockey',
    'Handball',
    'Multidisciplinario'
  ];

  const buscarArbitros = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await arbitrosService.getDisponibles();
      const arbitrosData = response.data?.arbitros || [];
      
      // Aplicar filtros en memoria
      let arbitrosFiltrados = arbitrosData;
      
      if (searchTerm) {
        arbitrosFiltrados = arbitrosFiltrados.filter(arbitro =>
          arbitro.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          arbitro.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          arbitro.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (filtroEspecialidad) {
        arbitrosFiltrados = arbitrosFiltrados.filter(
          arbitro => arbitro.especialidad === filtroEspecialidad
        );
      }
      
      setTodosLosArbitros(arbitrosFiltrados);
      setArbitrosVisibles(15);
    } catch (error) {
      setError('Error al cargar árbitros');
      toast.error('Error al cargar árbitros');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filtroEspecialidad]);

  useEffect(() => {
    buscarArbitros();
  }, [buscarArbitros]);

  const cargarMasArbitros = () => {
    setCargandoMas(true);
    
    setTimeout(() => {
      setArbitrosVisibles(prev => Math.min(prev + 15, todosLosArbitros.length));
      setCargandoMas(false);
    }, 500);
  };

  const arbitrosMostrados = todosLosArbitros.slice(0, arbitrosVisibles);
  const hayMasArbitros = arbitrosVisibles < todosLosArbitros.length;

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
          
          {/* Filtro Especialidad */}
          <Box sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' }, minWidth: { xs: '100%', sm: 180 } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Especialidad</InputLabel>
              <Select
                value={filtroEspecialidad}
                label="Especialidad"
                onChange={(e) => setFiltroEspecialidad(e.target.value)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: 'action.hover',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  }
                }}
              >
                <MenuItem value="">Todas</MenuItem>
                {especialidades.map((especialidad) => (
                  <MenuItem key={especialidad} value={especialidad}>
                    {especialidad}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
      ) : todosLosArbitros.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Gavel sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No se encontraron árbitros
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Intenta ajustar tus filtros de búsqueda
          </Typography>
        </Box>
      ) : (
        <>
          {/* Vista de tarjetas */}
          <Grid container spacing={2}>
            {arbitrosMostrados.map((arbitro) => (
              <Grid item xs={6} sm={6} md={3} key={arbitro.id}>
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
                  onClick={() => navigate(`/arbitros/${arbitro.id}`)}
                >
                  {/* Fondo con foto blur */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: arbitro.foto && construirUrlImagen(arbitro.foto)
                        ? `url(${construirUrlImagen(arbitro.foto)})`
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
                      src={arbitro.foto ? construirUrlImagen(arbitro.foto) : undefined}
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
                      {arbitro.nombre?.charAt(0)}{arbitro.apellido?.charAt(0)}
                    </Avatar>
                    
                    {/* Información del árbitro */}
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
                      {arbitro.nombre} {arbitro.apellido}
                    </Typography>
                    
                    {/* Especialidad */}
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block', 
                        mb: 0.5,
                        fontSize: '0.7rem'
                      }}
                    >
                      {arbitro.especialidad || 'Árbitro'}
                    </Typography>
                    
                    {/* Partidos arbitrados */}
                    {arbitro.partidosArbitrados !== undefined && (
                      <Chip
                        label={`${arbitro.partidosArbitrados} partidos`}
                        size="small"
                        sx={{ 
                          height: 18,
                          fontSize: '0.65rem',
                          mb: 0.5
                        }}
                      />
                    )}
                    
                    {/* Botón historial */}
                    <Box sx={{ mt: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/arbitros/${arbitro.id}`);
                        }}
                        sx={{ 
                          color: 'primary.main',
                          padding: 0.5
                        }}
                      >
                        <History sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Botón Ver Más */}
          {hayMasArbitros && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2, alignItems: 'center', flexDirection: 'column' }}>
              <Button
                variant="contained"
                size="large"
                onClick={cargarMasArbitros}
                disabled={cargandoMas}
                startIcon={cargandoMas ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{
                  minWidth: 200,
                  py: 1.5
                }}
              >
                {cargandoMas ? 'Cargando...' : `Ver más árbitros (${todosLosArbitros.length - arbitrosVisibles} restantes)`}
              </Button>
            </Box>
          )}
        </>
      )}

    </Container>
  );
};

export default Arbitros;
