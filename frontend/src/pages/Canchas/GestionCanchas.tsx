import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocationOn,
  SportsRugby,
  Directions
} from '@mui/icons-material';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { useNavigate } from 'react-router-dom';
import { canchasService } from '../../services/api';
import toast from 'react-hot-toast';

interface Cancha {
  id: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  direccionCompleta: string;
  ciudad: string;
  provincia: string;
  telefono?: string;
  email?: string;
  responsable?: string;
  tipo: string;
  superficie: string;
  dimensiones: {
    largo: number;
    ancho: number;
    unidad: string;
  };
  capacidadEspectadores: number;
  servicios: {
    vestuarios: boolean;
    duchas: boolean;
    estacionamiento: boolean;
    cafeteria: boolean;
    iluminacion: boolean;
    marcador: boolean;
    sonido: boolean;
    camaras: boolean;
    wifi: boolean;
    accesibilidad: boolean;
  };
  coordenadas?: {
    latitud: number;
    longitud: number;
  };
  precioPorHora?: number;
  disponible: boolean;
  mantenimiento: boolean;
  fechaFinMantenimiento?: Date;
  foto?: string;
  activa: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const GestionCanchas: React.FC = () => {
  const rolePermissions = useRolePermissions();
  const navigate = useNavigate();
  const canEdit = rolePermissions.canManageCanchas();
  
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCancha, setEditingCancha] = useState<Cancha | null>(null);
  const [formData, setFormData] = useState<Partial<Cancha>>({
    nombre: '',
    descripcion: '',
    direccion: '',
    direccionCompleta: '',
    ciudad: '',
    provincia: '',
    telefono: '',
    email: '',
    responsable: '',
    tipo: 'rugby',
    superficie: 'cesped',
    precioPorHora: 0,
    disponible: true,
    mantenimiento: false,
    activa: true
  });

  // Vista disponible para todos los roles; los que no gestionan verán solo lectura

  // Cargar canchas
  useEffect(() => {
    cargarCanchas();
  }, []);

  const cargarCanchas = async () => {
    try {
      setLoading(true);
      const response = await canchasService.getAll();
      setCanchas((response.data as unknown as Cancha[]) || []);
    } catch (error) {
      console.error('Error cargando canchas:', error);
      toast.error('Error cargando canchas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (cancha?: Cancha) => {
    if (cancha) {
      setEditingCancha(cancha);
      setFormData(cancha);
    } else {
      setEditingCancha(null);
      setFormData({
        nombre: '',
        descripcion: '',
        direccion: '',
        direccionCompleta: '',
        ciudad: '',
        provincia: '',
        telefono: '',
        email: '',
        responsable: '',
        tipo: 'rugby',
        superficie: 'cesped',
        precioPorHora: 0,
        disponible: true,
        mantenimiento: false,
        activa: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCancha(null);
    setFormData({
      nombre: '',
      descripcion: '',
      direccion: '',
      direccionCompleta: '',
      ciudad: '',
      provincia: '',
      telefono: '',
      email: '',
      responsable: '',
      tipo: 'rugby',
      superficie: 'cesped',
      precioPorHora: 0,
      disponible: true,
      mantenimiento: false,
      activa: true
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingCancha) {
        await canchasService.update(editingCancha.id, formData);
        toast.success('Cancha actualizada correctamente');
      } else {
        await canchasService.create(formData);
        toast.success('Cancha creada correctamente');
      }
      cargarCanchas();
      handleCloseDialog();
    } catch (error) {
      console.error('Error guardando cancha:', error);
      toast.error('Error guardando cancha');
    }
  };

  const handleDelete = async (cancha: Cancha) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la cancha "${cancha.nombre}"?`)) {
      try {
        await canchasService.delete(cancha.id);
        toast.success('Cancha eliminada correctamente');
        cargarCanchas();
      } catch (error) {
        console.error('Error eliminando cancha:', error);
        toast.error('Error eliminando cancha');
      }
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  const abrirEnGoogleMaps = (cancha: Cancha) => {
    const nombreCancha = encodeURIComponent(cancha.nombre);
    const direccion = encodeURIComponent(`${cancha.direccion}, ${cancha.ciudad}`);
    
    // Siempre buscar por dirección y nombre de la cancha
    const googleMapsUrl = `https://www.google.com/maps/search/${nombreCancha}+${direccion}`;
    
    // Abrir en Google Maps
    window.open(googleMapsUrl, '_blank');
    
    // Mostrar notificación
    toast.success('Abriendo en Google Maps...');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="700" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn sx={{ fontSize: 36 }} />
            Canchas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Canchas disponibles para los torneos
          </Typography>
        </Box>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3
            }}
          >
            Nueva Cancha
          </Button>
        )}
      </Box>

      {/* Lista de canchas */}
      {canchas.length === 0 ? (
        <Alert severity="info">
          No hay canchas registradas. Crea la primera cancha para comenzar.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {canchas.map((cancha) => (
            <Grid item xs={12} sm={6} md={4} key={cancha.id}>
              <Card 
                elevation={0}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    borderColor: 'primary.main'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationOn color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      {cancha.nombre}
                    </Typography>
                  </Box>
                  
                  <Button
                    variant="text"
                    color="primary"
                    onClick={() => abrirEnGoogleMaps(cancha)}
                    sx={{ p: 0, minWidth: 'auto', textTransform: 'none', justifyContent: 'flex-start' }}
                  >
                    <Typography variant="body2" color="primary" sx={{ mb: 2, textAlign: 'left' }}>
                      {cancha.direccion}, {cancha.ciudad}
                    </Typography>
                  </Button>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={cancha.tipo} 
                      size="small" 
                      color="primary" 
                      icon={<SportsRugby />}
                    />
                    <Chip 
                      label={cancha.superficie} 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      label={cancha.disponible ? 'Disponible' : 'No disponible'} 
                      size="small" 
                      color={cancha.disponible ? 'success' : 'error'}
                    />
                  </Box>

                  {/* Capacidad, dimensiones y teléfono ocultos según solicitud */}

                </CardContent>

                <CardActions>
                  {canEdit && (
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleOpenDialog(cancha)}
                    >
                      Editar
                    </Button>
                  )}
                  {cancha.coordenadas && (
                    <Button
                      size="small"
                      color="info"
                      startIcon={<Directions />}
                      onClick={() => abrirEnGoogleMaps(cancha)}
                    >
                      Ver en Maps
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDelete(cancha)}
                    >
                      Eliminar
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog para crear/editar cancha */}
      {canEdit && (
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCancha ? 'Editar Cancha' : 'Nueva Cancha'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Información básica */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Información Básica
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre de la cancha"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.tipo}
                  onChange={(e) => handleInputChange('tipo', e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="rugby">Rugby</MenuItem>
                  <MenuItem value="multi">Multideportiva</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.descripcion}
                onChange={(e) => handleInputChange('descripcion', e.target.value)}
                multiline
                rows={3}
              />
            </Grid>

            {/* Ubicación */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Ubicación
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Dirección"
                value={formData.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ciudad"
                value={formData.ciudad}
                onChange={(e) => handleInputChange('ciudad', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Provincia"
                value={formData.provincia}
                onChange={(e) => handleInputChange('provincia', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
              />
            </Grid>



            {/* Estado */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Estado
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.disponible || false}
                    onChange={(e) => handleInputChange('disponible', e.target.checked)}
                  />
                }
                label="Disponible"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.activa || false}
                    onChange={(e) => handleInputChange('activa', e.target.checked)}
                  />
                }
                label="Activa"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCancha ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
      )}
    </Container>
  );
};

export default GestionCanchas;
