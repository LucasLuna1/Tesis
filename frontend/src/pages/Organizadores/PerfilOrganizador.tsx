import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  alpha
} from '@mui/material';
import {
  Edit,
  Work,
  EmojiEvents,
  SportsRugby,
  Assessment,
  Save,
  PhotoCamera,
  Person,
  Phone,
  Email
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import ImageUploadBackend from '../../components/common/ImageUploadBackend';
import { construirUrlImagen } from '../../utils/imageUtils';

interface OrganizadorData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  foto: string;
  organizacion: string;
  cargo: string;
  experiencia: number;
  torneosCreados: number;
  partidosOrganizados: number;
  permisos: {
    gestionarTorneos: boolean;
    gestionarPartidos: boolean;
    gestionarEquipos: boolean;
    gestionarJugadores: boolean;
    gestionarArbitros: boolean;
    supervisarPartidos: boolean;
    publicarNoticias: boolean;
    gestionarPatrocinadores: boolean;
    generarReportes: boolean;
    verHistorial: boolean;
  };
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
  tipoUsuario: string;
}

const PerfilOrganizador: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const authContext = useAuth();
  const currentUser = authContext?.user;
  
  const [organizador, setOrganizador] = useState<OrganizadorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<OrganizadorData>>({});
  const [saving, setSaving] = useState(false);
  const [colorDominante, setColorDominante] = useState<string>('#4facfe');

  // Cargar datos del organizador
  useEffect(() => {
    const cargarOrganizador = async () => {
      try {
        setLoading(true);
        
        const perfilResponse = await api.get(`/organizadores/perfil/${id}`);

        setOrganizador(perfilResponse.data);
        
      } catch (error) {
        console.error('Error cargando organizador:', error);
        toast.error('Error al cargar el perfil del organizador');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      cargarOrganizador();
    }
  }, [id]);

  // Abrir diálogo de edición
  const handleEditOpen = () => {
    if (organizador) {
      setEditData({
        nombre: organizador.nombre,
        apellido: organizador.apellido,
        telefono: organizador.telefono,
        organizacion: organizador.organizacion,
        cargo: organizador.cargo,
        experiencia: organizador.experiencia
      });
      setEditDialogOpen(true);
    }
  };

  // Cerrar diálogo de edición
  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditData({});
  };

  // Guardar cambios
  const handleSave = async () => {
    try {
      setSaving(true);
      
      await api.put(`/organizadores/perfil/${id}`, editData);
      
      // Actualizar estado local
      if (organizador) {
        setOrganizador({
          ...organizador,
          ...editData,
          fechaActualizacion: new Date().toISOString()
        });
      }
      
      // Actualizar el userProfile en AuthContext para que el Sidebar y Dashboard se actualicen
      if (currentUser?.uid === id && authContext?.setUserProfile && authContext?.userProfile) {
        authContext.setUserProfile({
          ...authContext.userProfile,
          nombre: editData.nombre || authContext.userProfile.nombre,
          apellido: editData.apellido || authContext.userProfile.apellido,
          ...(editData.telefono && { telefono: editData.telefono })
        } as any);
      }
      
      toast.success('Perfil actualizado correctamente');
      setEditDialogOpen(false);
      
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };


  // Extraer color dominante de la foto
  useEffect(() => {
    if (organizador?.foto) {
      const extraerColorDominante = (imageSrc: string) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = construirUrlImagen(imageSrc);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let r = 0, g = 0, b = 0, count = 0;
          
          for (let i = 0; i < imageData.length; i += 4) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
            count++;
          }
          
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          
          setColorDominante(`rgb(${r}, ${g}, ${b})`);
        };
        
        img.onerror = () => {
          setColorDominante('#4facfe');
        };
      };
      
      extraerColorDominante(organizador.foto);
    }
  }, [organizador?.foto]);

  // Verificar si es el perfil propio
  const isOwnProfile = currentUser?.uid === id;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!organizador) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          No se pudo cargar el perfil del organizador
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, pb: 10 }}>
      {/* Header estilo LinkedIn */}
      <Paper 
        elevation={0}
        sx={{ 
          mb: 3,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* Banner con blur */}
        <Box
          sx={{
            height: 200,
            position: 'relative',
            overflow: 'hidden'
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
              backgroundImage: organizador.foto && construirUrlImagen(organizador.foto)
                ? `url(${construirUrlImagen(organizador.foto)})`
                : `linear-gradient(135deg, ${colorDominante}dd 0%, ${colorDominante}88 100%)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(25px) brightness(0.85)',
              transform: 'scale(1.1)',
              transition: 'all 0.5s ease'
            }}
          />
          
          {/* Overlay oscuro para mejor legibilidad */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, 
                ${alpha('#000000', 0.3)} 0%, 
                ${alpha('#000000', 0.5)} 50%,
                ${alpha(colorDominante, 0.15)} 100%)`,
              zIndex: 1
            }}
          />
        </Box>
        
        <Box sx={{ px: 3, pb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            mt: -8,
            mb: 2
          }}>
            <Box sx={{ position: 'relative', zIndex: 10 }}>
              {isOwnProfile ? (
                <ImageUploadBackend
                  currentImageUrl={construirUrlImagen(organizador.foto)}
                  onImageUpload={(imageUrl) => {
                    if (organizador) {
                      setOrganizador({
                        ...organizador,
                        foto: imageUrl,
                        fechaActualizacion: new Date().toISOString()
                      });
                    }
                  }}
                  size={140}
                  userId={id}
                  userType="organizador"
                />
              ) : (
                <Avatar
                  src={construirUrlImagen(organizador.foto)}
                  sx={{ 
                    width: 140, 
                    height: 140,
                    border: '5px solid',
                    borderColor: 'background.paper',
                    boxShadow: 3
                  }}
                >
                  <Work sx={{ fontSize: 60 }} />
                </Avatar>
              )}
            </Box>
            
            {isOwnProfile && (
              <Box sx={{ mb: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={handleEditOpen}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Editar Perfil
                </Button>
              </Box>
            )}
          </Box>
          
          <Typography variant="h4" fontWeight="700" gutterBottom>
            {organizador.nombre} {organizador.apellido}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            {organizador.cargo || 'Organizador'} • {organizador.organizacion || 'Sin organización'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip
              label={organizador.activo ? 'Activo' : 'Inactivo'}
              color={organizador.activo ? 'success' : 'default'}
              size="small"
              sx={{ height: 24, fontWeight: 500 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Estadísticas principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <EmojiEvents color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{organizador.torneosCreados || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Torneos Creados
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SportsRugby color="secondary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{organizador.partidosOrganizados || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Partidos Organizados
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Work color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{organizador.experiencia || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Años de Experiencia
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assessment color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {organizador.permisos ? Object.values(organizador.permisos).filter(Boolean).length : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Permisos Activos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Información detallada */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Información Personal
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">{organizador.email}</Typography>
            </Box>
            
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Teléfono
              </Typography>
              <Typography variant="body1">
                {organizador.telefono || 'No especificado'}
              </Typography>
            </Box>
            
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Fecha de Nacimiento
              </Typography>
              <Typography variant="body1">
                {new Date(organizador.fechaNacimiento).toLocaleDateString()}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                Miembro desde
              </Typography>
              <Typography variant="body1">
                {new Date(organizador.fechaCreacion).toLocaleDateString()}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Información Profesional
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Organización
              </Typography>
              <Typography variant="body1">
                {organizador.organizacion || 'No especificada'}
              </Typography>
            </Box>
            
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Cargo
              </Typography>
              <Typography variant="body1">
                {organizador.cargo || 'No especificado'}
              </Typography>
            </Box>
            
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Experiencia
              </Typography>
              <Typography variant="body1">
                {organizador.experiencia || 0} {(organizador.experiencia || 0) === 1 ? 'año' : 'años'}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Diálogo de edición */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Editar Perfil
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={editData.nombre || ''}
              onChange={(e) => setEditData({...editData, nombre: e.target.value})}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Apellido"
              value={editData.apellido || ''}
              onChange={(e) => setEditData({...editData, apellido: e.target.value})}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Teléfono"
              value={editData.telefono || ''}
              onChange={(e) => setEditData({...editData, telefono: e.target.value})}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Organización"
              value={editData.organizacion || ''}
              onChange={(e) => setEditData({...editData, organizacion: e.target.value})}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Cargo"
              value={editData.cargo || ''}
              onChange={(e) => setEditData({...editData, cargo: e.target.value})}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Experiencia (años)"
              type="number"
              value={editData.experiencia || 0}
              onChange={(e) => setEditData({...editData, experiencia: parseInt(e.target.value)})}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleEditClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PerfilOrganizador;
