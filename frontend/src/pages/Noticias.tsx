import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Alert,
  Fab,
  Grid,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Button,
  CardActions
} from '@mui/material';
import { Add, Star, Visibility, Search, FilterList, ReadMore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRolePermissions } from '../hooks/useRolePermissions';

interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  destacada: boolean;
  categoria: string;
  etiquetas: string[];
  imagen?: string;
  imagenes?: string[]; // Array de múltiples imágenes
  autor: {
    id: string;
    nombre: string;
  };
  fechaPublicacion: string;
  fechaActualizacion: string;
  estado: string;
  vistas: number;
  likes: number;
}

const Noticias: React.FC = () => {
  const navigate = useNavigate();
  useAuth();
  const rolePermissions = useRolePermissions();
  
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const cargarNoticias = async () => {
    try {
      setLoading(true);
      const response = await api.get('/noticias');
      setNoticias(response.data.noticias || []);
      setError(null);
    } catch (err: any) {
      setError('Error cargando noticias');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNoticias();
  }, []);

  // Filtrar noticias basado en búsqueda y categoría
  const filteredNoticias = noticias.filter(noticia => {
    const matchesSearch = noticia.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         noticia.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         noticia.etiquetas.some(etiqueta => etiqueta.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || noticia.categoria === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Obtener categorías únicas
  const categorias = Array.from(new Set(noticias.map(noticia => noticia.categoria)));

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      pb: 8
    }}>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Título y botón de gestión */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3 
        }}>
          <Typography variant="h4" sx={{ 
            color: 'text.primary', 
            fontWeight: 'bold'
          }}>
            NOTICIAS
          </Typography>
          
          {rolePermissions.canManageNews() && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Add />}
              onClick={() => navigate('/noticias/gestion')}
              sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.5 },
                fontWeight: 'bold',
                boxShadow: 3,
                '&:hover': {
                  boxShadow: 6
                }
              }}
            >
              Gestionar Noticias
            </Button>
          )}
        </Box>

        {/* Filtros de búsqueda */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              placeholder="Buscar noticias por título, contenido o etiquetas..."
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
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <FilterList />
                  </InputAdornment>
                }
              >
                <MenuItem value="">
                  <em>Todas las categorías</em>
                </MenuItem>
                {categorias.map((categoria) => (
                  <MenuItem key={categoria} value={categoria}>
                    {categoria}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Contador de resultados */}
        {!loading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {filteredNoticias.length} noticia{filteredNoticias.length !== 1 ? 's' : ''} encontrada{filteredNoticias.length !== 1 ? 's' : ''}
              {searchTerm && ` para "${searchTerm}"`}
              {selectedCategory && ` en categoría "${selectedCategory}"`}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {/* Carrusel de Noticias Destacadas */}
        {!loading && filteredNoticias.filter(n => n.destacada && (n.imagenes?.length || n.imagen)).length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
              Noticias Destacadas
            </Typography>
            <Swiper
              modules={[Navigation, Pagination, Autoplay, EffectFade]}
              spaceBetween={0}
              slidesPerView={1}
              navigation={true}
              pagination={{ clickable: true }}
              autoplay={{
                delay: 4000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
              }}
              effect="fade"
              style={{
                height: 400,
                borderRadius: 8,
                overflow: 'hidden'
              }}
            >
              {filteredNoticias
                .filter(noticia => noticia.destacada && (noticia.imagenes?.length || noticia.imagen))
                .map((noticia) => {
                  const imagenes = noticia.imagenes || (noticia.imagen ? [noticia.imagen] : []);
                  return imagenes.map((imagenUrl, index) => (
                    <SwiperSlide key={`${noticia.id}-${index}`}>
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url(${imagenUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/noticias/${noticia.id}`)}
                      >
                        {/* Overlay oscuro para mejor legibilidad */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            p: 3
                          }}
                        >
                          <Typography
                            variant="h4"
                            sx={{
                              color: 'white',
                              fontWeight: 'bold',
                              mb: 1,
                              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                            }}
                          >
                            {noticia.titulo}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              color: 'white',
                              mb: 2,
                              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {noticia.contenido.length > 150
                              ? `${noticia.contenido.substring(0, 150)}...`
                              : noticia.contenido}
                          </Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            sx={{ alignSelf: 'flex-start' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/noticias/${noticia.id}`);
                            }}
                          >
                            Leer más
                          </Button>
                        </Box>
                      </Box>
                    </SwiperSlide>
                  ));
                })}
            </Swiper>
          </Box>
        )}

        {/* Lista de noticias */}
        <Grid container spacing={3}>
          {filteredNoticias.map((noticia) => (
            <Grid item xs={12} md={6} lg={4} key={noticia.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Carrusel si hay múltiples imágenes, sino imagen simple */}
                {(noticia.imagenes && noticia.imagenes.length > 1) ? (
                  <Box sx={{ height: 200, position: 'relative' }}>
                    <Swiper
                      modules={[Navigation, Pagination, Autoplay]}
                      spaceBetween={0}
                      slidesPerView={1}
                      navigation={true}
                      pagination={{ clickable: true }}
                      autoplay={{
                        delay: 3000,
                        disableOnInteraction: false
                      }}
                      style={{ height: '100%' }}
                    >
                      {noticia.imagenes.map((imagenUrl, index) => (
                        <SwiperSlide key={index}>
                          <CardMedia
                            component="img"
                            height="200"
                            image={imagenUrl}
                            alt={`${noticia.titulo} - Imagen ${index + 1}`}
                            sx={{ objectFit: 'cover' }}
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </Box>
                ) : (
                  (noticia.imagen || (noticia.imagenes && noticia.imagenes.length > 0)) && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={noticia.imagen || noticia.imagenes?.[0]}
                      alt={noticia.titulo}
                    />
                  )
                )}
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {noticia.titulo}
                    </Typography>
                    {noticia.destacada && <Star color="warning" />}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {noticia.contenido.length > 100 
                      ? `${noticia.contenido.substring(0, 100)}...` 
                      : noticia.contenido}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={noticia.categoria} 
                      size="small" 
                      color="primary" 
                      sx={{ mr: 1, mb: 1 }} 
                    />
                    {noticia.etiquetas.map((etiqueta, index) => (
                      <Chip 
                        key={index}
                        label={etiqueta} 
                        size="small" 
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }} 
                      />
                    ))}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    Por {noticia.autor.nombre} • {new Date(noticia.fechaPublicacion).toLocaleDateString('es-ES')}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Visibility sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" color="text.secondary">
                      {noticia.vistas} vistas
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ReadMore />}
                    onClick={() => navigate(`/noticias/${noticia.id}`)}
                    fullWidth
                  >
                    Leer más
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {!loading && noticias.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No hay noticias disponibles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Las noticias aparecerán aquí cuando se publiquen
            </Typography>
          </Box>
        )}

        {!loading && noticias.length > 0 && filteredNoticias.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No se encontraron noticias
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Intenta con otros términos de búsqueda o cambia el filtro de categoría
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip 
                label="Limpiar filtros" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                }}
                color="primary"
                variant="outlined"
              />
            </Box>
          </Box>
        )}
      </Container>

      {/* FAB para gestionar noticias */}
      {rolePermissions.canManageNews() && (
        <Fab
          color="primary"
          aria-label="gestionar noticias"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => navigate('/noticias/gestion')}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
};

export default Noticias;