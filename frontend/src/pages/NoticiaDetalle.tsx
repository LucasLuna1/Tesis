import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Alert,
  Chip,
  Button,
  IconButton,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  Star,
  Visibility,
  Share,
  Favorite,
  FavoriteBorder
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
// import { useAuth } from '../contexts/AuthContext'; // No se usa actualmente

interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  destacada: boolean;
  categoria: string;
  etiquetas: string[];
  imagen?: string;
  autor: {
    id: string;
    nombre: string;
  };
  fechaPublicacion: string;
  fechaActualizacion: string;
  vistas: number;
  likes: number;
}

const NoticiaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const { userProfile } = useAuth(); // No se usa actualmente
  
  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);

  const cargarNoticia = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/noticias/${id}`);
      setNoticia(response.data);
      setError(null);
      
      // Registrar vista y actualizar contador
      try {
        const vistaResponse = await api.post(`/noticias/${id}/vista`);
        // Actualizar el contador de vistas con el valor del servidor
        setNoticia(prev => prev ? { ...prev, vistas: vistaResponse.data.vistas } : prev);
      } catch (vistaError) {
        console.error('Error registrando vista:', vistaError);
        // No mostrar error al usuario, solo loggearlo
      }
      
      // Verificar si el usuario le dio like
      try {
        const likeResponse = await api.get(`/noticias/${id}/like/estado`);
        setLiked(likeResponse.data.liked);
      } catch (likeError) {
        console.error('Error verificando like:', likeError);
        // Si falla, asumir que no le dio like
        setLiked(false);
      }
    } catch (err: any) {
      setError('Error cargando la noticia');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      cargarNoticia();
    }
  }, [id, cargarNoticia]);

  const handleLike = async () => {
    if (!noticia) return;
    
    try {
      const response = await api.post(`/noticias/${id}/like`);
      
      // Actualizar el estado con la respuesta del servidor
      setNoticia(prev => prev ? { ...prev, likes: response.data.likes } : null);
      setLiked(response.data.liked);
    } catch (error: any) {
      console.error('Error al dar like:', error);
      // Si el error es 401, significa que no está autenticado
      if (error.response?.status === 401) {
        alert('Debes iniciar sesión para dar me gusta');
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: noticia?.titulo,
          text: noticia?.contenido.substring(0, 100),
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    } else {
      // Fallback: copiar URL al portapapeles
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando noticia...
        </Typography>
      </Container>
    );
  }

  if (error || !noticia) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          {error || 'Noticia no encontrada'}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/noticias')}
          sx={{ mt: 2 }}
        >
          Volver a Noticias
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Botón de regreso */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/noticias')}
        sx={{ mb: 3 }}
      >
        Volver a Noticias
      </Button>

      <Card>
        {noticia.imagen && (
          <CardMedia
            component="img"
            height="400"
            image={noticia.imagen}
            alt={noticia.titulo}
          />
        )}
        
        <CardContent>
          {/* Título y destacada */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              {noticia.titulo}
            </Typography>
            {noticia.destacada && <Star color="warning" sx={{ ml: 1 }} />}
          </Box>

          {/* Categoría y etiquetas */}
          <Box sx={{ mb: 3 }}>
            <Chip 
              label={noticia.categoria} 
              color="primary" 
              sx={{ mr: 1, mb: 1 }} 
            />
            {noticia.etiquetas.map((etiqueta, index) => (
              <Chip 
                key={index}
                label={etiqueta} 
                variant="outlined"
                sx={{ mr: 1, mb: 1 }} 
              />
            ))}
          </Box>

          {/* Información del autor y fecha */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Por <strong>{noticia.autor.nombre}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(noticia.fechaPublicacion).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Visibility sx={{ fontSize: 16, mr: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                {noticia.vistas} vistas
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Contenido */}
          <Typography 
            variant="body1" 
            sx={{ 
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              '& p': { mb: 2 }
            }}
          >
            {noticia.contenido}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Acciones */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={handleLike}
              color={liked ? 'error' : 'default'}
            >
              {liked ? <Favorite /> : <FavoriteBorder />}
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {noticia.likes} me gusta
            </Typography>
            
            <IconButton onClick={handleShare}>
              <Share />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              Compartir
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default NoticiaDetalle;
