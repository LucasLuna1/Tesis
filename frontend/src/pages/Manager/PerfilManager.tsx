import React, { useState, useEffect } from 'react';
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
  Badge,
  Stack
} from '@mui/material';
import {
  Edit,
  Business,
  Groups,
  EmojiEvents,
  Person,
  Phone,
  Email,
  Save,
  Close,
  LocationOn,
  CameraAlt,
  CalendarToday,
  TrendingUp,
  SportsRugby,
  EmojiEventsOutlined,
  PeopleOutline
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getImageUrl } from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth';

interface ManagerData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  foto: string;
  clubId: string | null;
  clubNombre: string | null;
  experiencia: number;
  torneosParticipados: number;
  partidosGestionados: number;
  jugadoresGestionados: number;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
  tipoUsuario: string;
}

const PerfilManager: React.FC = () => {
  const authContext = useAuth();
  const [loading, setLoading] = useState(true);
  const [manager, setManager] = useState<ManagerData | null>(null);
  const [club, setClub] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<ManagerData>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar datos del manager actual
      const userDoc = await api.get('/managers/perfil');
      setManager(userDoc.data);
      
      // Cargar club del manager si tiene uno
      try {
        const clubResponse = await api.get('/managers/mi-club');
        if (clubResponse.data.club) {
          setClub(clubResponse.data.club);
        }
      } catch (error) {
        // No tiene club aún
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = () => {
    if (manager) {
      setEditData({
        nombre: manager.nombre,
        apellido: manager.apellido,
        telefono: manager.telefono,
        email: manager.email
      });
      setEditDialogOpen(true);
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditData({});
  };

  const handleSave = async () => {
    if (!manager) return;

    try {
      setSaving(true);
      
      await api.put('/managers/perfil', {
        nombre: editData.nombre,
        apellido: editData.apellido,
        telefono: editData.telefono
      });

      toast.success('Perfil actualizado exitosamente');
      await cargarDatos();
      
      // Actualizar el userProfile en AuthContext para que el Sidebar y Dashboard se actualicen
      if (authContext?.setUserProfile && authContext?.userProfile) {
        authContext.setUserProfile({
          ...authContext.userProfile,
          nombre: editData.nombre || authContext.userProfile.nombre,
          apellido: editData.apellido || authContext.userProfile.apellido,
          ...(editData.telefono && { telefono: editData.telefono })
        } as any);
      }
      
      handleEditClose();
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('foto', file);

      const response = await api.post('/managers/perfil/foto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Foto de perfil actualizada');
      await cargarDatos();

      // Actualizar foto en AuthContext
      if (authContext?.setUserProfile && authContext?.userProfile) {
        authContext.setUserProfile({
          ...authContext.userProfile,
          foto: response.data.foto
        } as any);
      }
    } catch (error: any) {
      console.error('Error subiendo foto:', error);
      toast.error(error.response?.data?.error || 'Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setUploadingCover(true);
      toast.success('Funcionalidad de cover en desarrollo');
      // Por ahora solo mostramos mensaje, se puede implementar después
    } catch (error) {
      console.error('Error subiendo cover:', error);
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando perfil...
        </Typography>
      </Container>
    );
  }

  if (!manager) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          Error al cargar el perfil del manager
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Hero Header con Cover Photo estilo LinkedIn */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          mb: 2
        }}
      >
        {/* Cover Image con blur */}
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
              backgroundImage: manager.foto
                ? `url(${manager.foto})`
                : 'none',
              background: manager.foto
                ? undefined
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: manager.foto ? 'blur(25px) brightness(0.85)' : 'none',
              transform: manager.foto ? 'scale(1.1)' : 'none',
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
              background: manager.foto
                ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(102, 126, 234, 0.15) 100%)'
                : 'none',
              zIndex: 1
            }}
          />
        </Box>

        {/* Profile Info Section */}
        <Box sx={{ px: 3, pb: 3 }}>
          {/* Avatar superpuesto */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ position: 'relative', zIndex: 10 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload"
                type="file"
                onChange={handlePhotoChange}
              />
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <label htmlFor="photo-upload">
                    <IconButton
                      component="span"
                      disabled={uploadingPhoto}
                      size="small"
                      sx={{
                        bgcolor: 'background.paper',
                        border: '2px solid',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      {uploadingPhoto ? (
                        <CircularProgress size={16} />
                      ) : (
                        <CameraAlt fontSize="small" />
                      )}
                    </IconButton>
                  </label>
                }
              >
                <Avatar
                  src={manager.foto ? getImageUrl(manager.foto) : ''}
                  sx={{
                    width: 140,
                    height: 140,
                    mt: -7,
                    border: '4px solid white',
                    boxShadow: 3
                  }}
                >
                  <Person sx={{ fontSize: 70 }} />
                </Avatar>
              </Badge>
            </Box>

            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEditOpen}
              sx={{ mt: 2 }}
            >
              Editar Perfil
            </Button>
          </Box>

          {/* Nombre y título */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {manager.nombre} {manager.apellido}
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                icon={<Business />}
                label="Manager Deportivo"
                color="primary"
                size="small"
              />
              {club && (
                <Chip
                  icon={<Groups />}
                  label={club.nombre}
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>

            {club && (
              <Stack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body2">
                    {club.ciudad}, {club.pais}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <CalendarToday fontSize="small" />
                  <Typography variant="body2">
                    Miembro desde {new Date(manager.fechaCreacion).toLocaleDateString('es', { month: 'short', year: 'numeric' })}
                  </Typography>
                </Box>
              </Stack>
            )}
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        {/* Columna Izquierda */}
        <Grid item xs={12} md={8}>
          {/* Acerca de */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              mb: 2
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Acerca de
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Manager deportivo dedicado a la gestión y desarrollo de equipos de rugby.
                {club && ` Actualmente gestionando ${club.nombre}, trabajando con ${club.estadisticas?.totalJugadores || 0} jugadores.`}
              </Typography>
              
              {club && club.descripcion && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    {club.descripcion}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          {/* Estadísticas Destacadas */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              mb: 2
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Estadísticas de Gestión
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    <PeopleOutline sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {club?.estadisticas?.totalJugadores || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Jugadores
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    <EmojiEventsOutlined sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {club?.estadisticas?.torneosJugados || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Torneos
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    <SportsRugby sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {club?.estadisticas?.partidosJugados || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Partidos
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Información del Club */}
          {club && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Club Actual
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <Avatar
                    src={club.logo ? getImageUrl(club.logo) : ''}
                    sx={{ width: 64, height: 64 }}
                  >
                    <Groups sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold">
                      {club.nombre}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {club.club || 'Club de Rugby'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip
                        label={`${club.estadisticas?.totalJugadores || 0} jugadores`}
                        size="small"
                        variant="outlined"
                      />
                      {club.activo && (
                        <Chip
                          label="Activo"
                          size="small"
                          color="success"
                        />
                      )}
                    </Stack>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Columna Derecha - Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Información de Contacto */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              mb: 2
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Información de Contacto
              </Typography>
              
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Email fontSize="small" color="action" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {manager.email}
                    </Typography>
                  </Box>
                </Box>

                {manager.telefono && (
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Phone fontSize="small" color="action" />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Teléfono
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {manager.telefono}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Actividad Reciente */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Actividad
              </Typography>
              
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography variant="body2" fontWeight="medium">
                      Perfil Activo
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Última actualización: {new Date(manager.fechaActualizacion || manager.fechaCreacion).toLocaleDateString()}
                  </Typography>
                </Box>

                {club && (
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                      <Groups fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight="medium">
                        Gestionando {club.nombre}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {club.estadisticas?.totalJugadores || 0} jugadores activos
                    </Typography>
                  </Box>
                )}

                <Divider />

                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Miembro desde
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {new Date(manager.fechaCreacion).toLocaleDateString('es', { 
                      day: 'numeric',
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Diálogo de Edición - Estilo LinkedIn */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            bgcolor: 'background.paper'
          }
        }}
      >
        {/* Header limpio */}
        <Box
          sx={{
            px: 3,
            pt: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="h5" fontWeight={600} color="text.primary">
            Editar información
          </Typography>
          <IconButton 
            onClick={handleEditClose} 
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { 
                bgcolor: 'action.hover',
                color: 'text.primary'
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: 0, py: 0 }}>
          {/* Sección: Información Básica */}
          <Box sx={{ px: 3, py: 3 }}>
            <Typography 
              variant="subtitle2" 
              fontWeight={600}
              color="text.primary"
              sx={{ mb: 2 }}
            >
              Información básica
            </Typography>
            <Stack spacing={2.5}>
              <Box>
                <Typography 
                  variant="caption" 
                  fontWeight={500}
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  Nombre*
                </Typography>
                <TextField
                  fullWidth
                  value={editData.nombre || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, nombre: e.target.value }))}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      '& fieldset': {
                        borderColor: 'divider'
                      },
                      '&:hover fieldset': {
                        borderColor: 'text.secondary'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Box>

              <Box>
                <Typography 
                  variant="caption" 
                  fontWeight={500}
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  Apellido*
                </Typography>
                <TextField
                  fullWidth
                  value={editData.apellido || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, apellido: e.target.value }))}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      '& fieldset': {
                        borderColor: 'divider'
                      },
                      '&:hover fieldset': {
                        borderColor: 'text.secondary'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Sección: Información de Contacto */}
          <Box sx={{ px: 3, py: 3 }}>
            <Typography 
              variant="subtitle2" 
              fontWeight={600}
              color="text.primary"
              sx={{ mb: 2 }}
            >
              Información de contacto
            </Typography>
            <Stack spacing={2.5}>
              <Box>
                <Typography 
                  variant="caption" 
                  fontWeight={500}
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  Email
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  value={editData.email || ''}
                  disabled
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'action.hover',
                      '& fieldset': {
                        borderColor: 'divider'
                      }
                    }
                  }}
                />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}
                >
                  El email no se puede cambiar por motivos de seguridad
                </Typography>
              </Box>

              <Box>
                <Typography 
                  variant="caption" 
                  fontWeight={500}
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  Teléfono
                </Typography>
                <TextField
                  fullWidth
                  value={editData.telefono || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="+54 381 1234567"
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      '& fieldset': {
                        borderColor: 'divider'
                      },
                      '&:hover fieldset': {
                        borderColor: 'text.secondary'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: 2
                      }
                    }
                  }}
                />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  Este número puede ser visible para los miembros de tu equipo
                </Typography>
              </Box>
            </Stack>
          </Box>
        </DialogContent>

        {/* Footer con botones */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1.5,
            bgcolor: 'background.paper'
          }}
        >
          <Button 
            onClick={handleEditClose} 
            disabled={saving}
            sx={{ 
              color: 'text.secondary',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: 5,
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary'
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ 
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: 5,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 2
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground'
              }
            }}
          >
            {saving ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={18} color="inherit" />
                Guardando...
              </Box>
            ) : (
              'Guardar'
            )}
          </Button>
        </Box>
      </Dialog>
    </Container>
  );
};

export default PerfilManager;
