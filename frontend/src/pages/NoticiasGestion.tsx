import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Fab,
  CardMedia,
  CardActions,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Image as ImageIcon,
  Article,
  Star,
  Search
} from '@mui/icons-material';
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

const NoticiasGestion: React.FC = () => {
  useAuth();
  const rolePermissions = useRolePermissions();
  
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el diálogo de crear/editar
  const [openDialog, setOpenDialog] = useState(false);
  const [editingNoticia, setEditingNoticia] = useState<Noticia | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    destacada: false,
    categoria: 'general',
    etiquetas: [] as string[]
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [destacadaFilter, setDestacadaFilter] = useState('');
  
  const categorias = [
    'general',
    'partidos',
    'torneos',
    'equipos',
    'jugadores',
    'arbitros',
    'comunicados',
    'eventos'
  ];

  const cargarNoticias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoriaFilter) params.append('categoria', categoriaFilter);
      if (destacadaFilter) params.append('destacada', destacadaFilter);
      
      const response = await api.get(`/noticias?${params.toString()}`);
      setNoticias(response.data.noticias || []);
      setError(null);
    } catch (err: any) {
      setError('Error cargando noticias');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [categoriaFilter, destacadaFilter]);

  useEffect(() => {
    cargarNoticias();
  }, [cargarNoticias]);

  const handleOpenDialog = (noticia?: Noticia) => {
    if (noticia) {
      setEditingNoticia(noticia);
      setFormData({
        titulo: noticia.titulo,
        contenido: noticia.contenido,
        destacada: noticia.destacada,
        categoria: noticia.categoria,
        etiquetas: noticia.etiquetas || []
      });
      // Cargar imágenes existentes (usar imagenes[] si existe, sino usar imagen)
      const imagenesExistentes = (noticia as any).imagenes || (noticia.imagen ? [noticia.imagen] : []);
      setImagePreviews(imagenesExistentes);
    } else {
      setEditingNoticia(null);
      setFormData({
        titulo: '',
        contenido: '',
        destacada: false,
        categoria: 'general',
        etiquetas: []
      });
      setImagePreviews([]);
    }
    setSelectedImages([]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingNoticia(null);
    setFormData({
      titulo: '',
      contenido: '',
      destacada: false,
      categoria: 'general',
      etiquetas: []
    });
    setSelectedImages([]);
    setImagePreviews([]);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setSelectedImages(prev => [...prev, ...newFiles]);
      
      // Generar previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleEtiquetaAdd = (etiqueta: string) => {
    if (etiqueta.trim() && !formData.etiquetas.includes(etiqueta.trim())) {
      setFormData(prev => ({
        ...prev,
        etiquetas: [...prev.etiquetas, etiqueta.trim()]
      }));
    }
  };

  const handleEtiquetaRemove = (etiquetaToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      etiquetas: prev.etiquetas.filter(etiqueta => etiqueta !== etiquetaToRemove)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim() || !formData.contenido.trim()) {
      setError('Título y contenido son requeridos');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('titulo', formData.titulo);
      formDataToSend.append('contenido', formData.contenido);
      formDataToSend.append('destacada', formData.destacada.toString());
      formDataToSend.append('categoria', formData.categoria);
      formDataToSend.append('etiquetas', JSON.stringify(formData.etiquetas));
      
      // Agregar múltiples imágenes
      selectedImages.forEach((image) => {
        formDataToSend.append('imagenes', image);
      });

      if (editingNoticia) {
        await api.put(`/noticias/${editingNoticia.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/noticias', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      await cargarNoticias();
      handleCloseDialog();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error guardando noticia');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta noticia?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/noticias/${id}`);
      await cargarNoticias();
      setError(null);
    } catch (err: any) {
      setError('Error eliminando noticia');
    } finally {
      setLoading(false);
    }
  };

  const filteredNoticias = noticias.filter(noticia => {
    const matchesSearch = noticia.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         noticia.contenido.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!rolePermissions.canManageNews()) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          No tienes permisos para gestionar noticias
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Noticias
        </Typography>
        
        {/* Filtros */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Buscar noticias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                label="Categoría"
              >
                <MenuItem value="">Todas</MenuItem>
                {categorias.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Destacadas</InputLabel>
              <Select
                value={destacadaFilter}
                onChange={(e) => setDestacadaFilter(e.target.value)}
                label="Destacadas"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="true">Destacadas</MenuItem>
                <MenuItem value="false">Normales</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

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

      {/* Lista de noticias */}
      <Grid container spacing={3}>
        {filteredNoticias.map((noticia) => (
          <Grid item xs={12} md={6} lg={4} key={noticia.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {noticia.imagen && (
                <CardMedia
                  component="img"
                  height="200"
                  image={noticia.imagen}
                  alt={noticia.titulo}
                />
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
                  startIcon={<Edit />}
                  onClick={() => handleOpenDialog(noticia)}
                >
                  Editar
                </Button>
                <Button 
                  size="small" 
                  color="error" 
                  startIcon={<Delete />}
                  onClick={() => handleDelete(noticia.id)}
                >
                  Eliminar
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredNoticias.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Article sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No hay noticias
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea tu primera noticia para comenzar
          </Typography>
        </Box>
      )}

      {/* FAB para crear noticia */}
      <Fab
        color="primary"
        aria-label="crear noticia"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <Add />
      </Fab>

      {/* Dialog para crear/editar noticia */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingNoticia ? 'Editar Noticia' : 'Crear Nueva Noticia'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ingresa el título de la noticia"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={formData.categoria}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                  label="Categoría"
                >
                  {categorias.map(cat => (
                    <MenuItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.destacada}
                    onChange={(e) => setFormData(prev => ({ ...prev, destacada: e.target.checked }))}
                  />
                }
                label="Noticia destacada"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contenido"
                multiline
                rows={6}
                value={formData.contenido}
                onChange={(e) => setFormData(prev => ({ ...prev, contenido: e.target.value }))}
                placeholder="Escribe el contenido de la noticia..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Imágenes (múltiples)
              </Typography>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                multiple
                onChange={handleImageChange}
              />
              <label htmlFor="image-upload">
                <Button variant="outlined" component="span" startIcon={<ImageIcon />}>
                  Seleccionar Imágenes
                </Button>
              </label>
              {imagePreviews.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {imagePreviews.map((preview, index) => (
                    <Box key={index} sx={{ position: 'relative', mb: 2 }}>
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        style={{ maxWidth: 150, maxHeight: 150, objectFit: 'contain', borderRadius: 4 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveImage(index)}
                        sx={{ 
                          position: 'absolute', 
                          top: -8, 
                          right: -8, 
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Etiquetas
              </Typography>
              <Box sx={{ mb: 2 }}>
                {formData.etiquetas.map((etiqueta, index) => (
                  <Chip
                    key={index}
                    label={etiqueta}
                    onDelete={() => handleEtiquetaRemove(etiqueta)}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
              <TextField
                fullWidth
                placeholder="Agregar etiqueta (presiona Enter)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    handleEtiquetaAdd(target.value);
                    target.value = '';
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading || !formData.titulo.trim() || !formData.contenido.trim()}
          >
            {loading ? <CircularProgress size={20} /> : editingNoticia ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NoticiasGestion;
