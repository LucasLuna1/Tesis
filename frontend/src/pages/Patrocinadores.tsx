import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  alpha,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Avatar,
  Link as MuiLink,
  Divider,
  Stack,
  Zoom,
  Slide,
  LinearProgress,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Business,
  Add,
  Edit,
  Delete,
  Language,
  Email,
  Phone,
  Save,
  Close,
  CloudUpload,
  Image as ImageIcon,
  CheckCircle,
  Star,
  EmojiEvents,
  Favorite,
  OpenInNew
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api, { getImageUrl } from '../services/api';
import toast from 'react-hot-toast';

interface Sponsor {
  id?: string;
  nombre: string;
  categoria: 'oro' | 'plata' | 'bronce' | 'colaborador';
  logo: string;
  descripcion: string;
  website?: string;
  email?: string;
  telefono?: string;
  sector?: string;
  activo?: boolean;
  organizadorId?: string;
}

const MAX_DESCRIPCION = 200;

const Patrocinadores: React.FC = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentSponsor, setCurrentSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState<Sponsor>({
    nombre: '',
    categoria: 'bronce',
    logo: '',
    descripcion: '',
    website: '',
    email: '',
    telefono: '',
    sector: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const esOrganizador = userProfile?.tipoUsuario === 'organizador';

  const getCategoriaColor = (categoria: string) => {
    const colores = {
      oro: { primary: '#FFD700', secondary: '#FFA500', gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' },
      plata: { primary: '#C0C0C0', secondary: '#A8A8A8', gradient: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' },
      bronce: { primary: '#CD7F32', secondary: '#B87333', gradient: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)' },
      colaborador: { primary: '#2196f3', secondary: '#1976d2', gradient: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)' }
    };
    return colores[categoria as keyof typeof colores] || colores.colaborador;
  };

  const getCategoriaIcon = (categoria: string) => {
    const iconos = {
      oro: <Star sx={{ fontSize: 20 }} />,
      plata: <EmojiEvents sx={{ fontSize: 20 }} />,
      bronce: <Favorite sx={{ fontSize: 20 }} />,
      colaborador: <Business sx={{ fontSize: 20 }} />
    };
    return iconos[categoria as keyof typeof iconos] || iconos.colaborador;
  };

  const cargarPatrocinadores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/patrocinadores');
      setSponsors(response.data.patrocinadores || []);
    } catch (error: any) {
      setError('Error al cargar patrocinadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPatrocinadores();
  }, [cargarPatrocinadores]);

  const handleOpenDialog = (sponsor?: Sponsor) => {
    if (sponsor) {
      setCurrentSponsor(sponsor);
      setFormData(sponsor);
    } else {
      setCurrentSponsor(null);
      setFormData({
        nombre: '',
        categoria: 'bronce',
        logo: '',
        descripcion: '',
        website: '',
        email: '',
        telefono: '',
        sector: ''
      });
    }
    setSelectedImage(null);
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setCurrentSponsor(null);
    setSelectedImage(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.nombre || !formData.categoria) {
        toast.error('Nombre y categoría son obligatorios');
        setSaving(false);
        return;
      }

      if (formData.descripcion && formData.descripcion.length > MAX_DESCRIPCION) {
        toast.error(`La descripción no puede superar los ${MAX_DESCRIPCION} caracteres`);
        setSaving(false);
        return;
      }

      let sponsorId = currentSponsor?.id;

      if (currentSponsor?.id) {
        await api.put(`/patrocinadores/${currentSponsor.id}`, formData);
      } else {
        const response = await api.post('/patrocinadores', formData);
        sponsorId = response.data.patrocinador.id;
      }

      if (selectedImage && sponsorId) {
        setUploadingImage(true);
        
        try {
          const imageFormData = new FormData();
          imageFormData.append('logo', selectedImage);

          await api.post(`/patrocinadores/${sponsorId}/logo`, imageFormData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          toast.success(currentSponsor?.id ? 'Patrocinador y logo actualizados' : 'Patrocinador creado con logo');
        } catch (uploadError: any) {
          toast.error('Patrocinador guardado pero hubo un error al subir el logo');
        }
      } else {
        toast.success(currentSponsor?.id ? 'Patrocinador actualizado' : 'Patrocinador creado');
      }

      handleCloseDialog();
      await cargarPatrocinadores();
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.mensaje || 'Error al guardar';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!currentSponsor?.id) return;

    try {
      setDeleting(true);
      await api.delete(`/patrocinadores/${currentSponsor.id}`);
      toast.success('Patrocinador eliminado');
      setDeleteDialogOpen(false);
      setCurrentSponsor(null);
      cargarPatrocinadores();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona una imagen');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen es muy grande. Máximo 5MB');
        return;
      }
      setSelectedImage(file);
      toast.success('Imagen cargada. Haz clic en Guardar para subirla');
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
          Cargando patrocinadores...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Grid de patrocinadores mejorado */}
      <Grid container spacing={3}>
        {sponsors.map((sponsor, index) => {
          const categoriaColor = getCategoriaColor(sponsor.categoria);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={sponsor.id}>
              <Zoom in timeout={300 + (index * 100)}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: `linear-gradient(135deg, ${alpha('#1e1e1e', 0.02)} 0%, ${alpha('#000', 0.02)} 100%)`,
                    border: '2px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      transform: 'translateY(-12px) scale(1.02)',
                      boxShadow: `0 16px 40px ${alpha(categoriaColor.primary, 0.3)}`,
                      borderColor: categoriaColor.primary,
                      '& .logo-container': {
                        transform: 'scale(1.05)',
                      },
                      '& .contact-info': {
                        opacity: 1,
                        transform: 'translateY(0)'
                      }
                    }
                  }}
                >
                  {/* Badge de categoría en esquina */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      zIndex: 2,
                      background: categoriaColor.gradient,
                      borderRadius: 3,
                      px: 2,
                      py: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      boxShadow: 3,
                      color: sponsor.categoria === 'plata' ? '#000' : '#fff'
                    }}
                  >
                    {getCategoriaIcon(sponsor.categoria)}
                    <Typography variant="caption" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {sponsor.categoria}
                    </Typography>
                  </Box>

                  {/* Botones de acción */}
                  {esOrganizador && (
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 16, 
                      right: 16, 
                      zIndex: 3,
                      display: 'flex',
                      gap: 1
                    }}>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(sponsor)}
                          sx={{ 
                            bgcolor: 'background.paper',
                            boxShadow: 3,
                            backdropFilter: 'blur(10px)',
                            '&:hover': { 
                              bgcolor: 'primary.main', 
                              color: 'white',
                              transform: 'rotate(15deg) scale(1.1)'
                            },
                            transition: 'all 0.3s'
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setCurrentSponsor(sponsor);
                            setDeleteDialogOpen(true);
                          }}
                          sx={{ 
                            bgcolor: 'background.paper',
                            boxShadow: 3,
                            backdropFilter: 'blur(10px)',
                            '&:hover': { 
                              bgcolor: 'error.main', 
                              color: 'white',
                              transform: 'rotate(15deg) scale(1.1)'
                            },
                            transition: 'all 0.3s'
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}

                  {/* Logo del patrocinador - Mejorado */}
                  <Box 
                    className="logo-container"
                    sx={{ 
                      position: 'relative',
                      height: 240,
                      overflow: 'hidden',
                      background: `linear-gradient(180deg, ${alpha('#f5f5f5', 0.1)} 0%, ${alpha('#e0e0e0', 0.05)} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.4s ease',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: categoriaColor.gradient,
                        opacity: 0.03,
                        zIndex: 0
                      }
                    }}
                  >
                    {sponsor.logo ? (
                      <Box
                        sx={{
                          position: 'relative',
                          zIndex: 1,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 3
                        }}
                      >
                        <img
                          src={getImageUrl(sponsor.logo)}
                          alt={sponsor.nombre}
                          style={{ 
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                          }}
                        />
                      </Box>
                    ) : (
                      <Business 
                        sx={{ 
                          fontSize: 100, 
                          color: categoriaColor.primary,
                          opacity: 0.15,
                          position: 'relative',
                          zIndex: 1
                        }} 
                      />
                    )}

                    {/* Overlay gradiente sutil */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '40%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
                        zIndex: 1
                      }}
                    />
                  </Box>

                  <CardContent sx={{ flexGrow: 1, p: 3, position: 'relative' }}>
                    <Stack spacing={2}>
                      {/* Nombre y sector */}
                      <Box>
                        <Typography 
                          variant="h5" 
                          fontWeight="800" 
                          gutterBottom
                          sx={{
                            background: categoriaColor.gradient,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1
                          }}
                        >
                          {sponsor.nombre}
                        </Typography>

                        {sponsor.sector && (
                          <Chip 
                            label={sponsor.sector}
                            size="small"
                            sx={{ 
                              fontWeight: 600,
                              background: alpha(categoriaColor.primary, 0.1),
                              color: categoriaColor.secondary,
                              border: `1px solid ${alpha(categoriaColor.primary, 0.3)}`
                            }}
                          />
                        )}
                      </Box>

                      {/* Descripción */}
                      {sponsor.descripcion && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            lineHeight: 1.7,
                            minHeight: 60,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {sponsor.descripcion}
                        </Typography>
                      )}

                      <Divider sx={{ my: 1 }} />

                      {/* Información de contacto - Con animación */}
                      <Stack 
                        spacing={1.5} 
                        className="contact-info"
                        sx={{
                          opacity: 0.8,
                          transform: 'translateY(4px)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {sponsor.website && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 2,
                                background: alpha('#2196f3', 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Language sx={{ fontSize: 18, color: 'primary.main' }} />
                            </Box>
                            <MuiLink 
                              href={sponsor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                color: 'primary.main',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                '&:hover': { 
                                  textDecoration: 'underline',
                                  gap: 1,
                                  transition: 'all 0.2s'
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Visitar sitio web
                              <OpenInNew sx={{ fontSize: 14 }} />
                            </MuiLink>
                          </Box>
                        )}
                        
                        {sponsor.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 2,
                                background: alpha('#757575', 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Email sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </Box>
                            <MuiLink 
                              href={`mailto:${sponsor.email}`}
                              sx={{ 
                                color: 'text.secondary',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                '&:hover': { color: 'primary.main' }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {sponsor.email}
                            </MuiLink>
                          </Box>
                        )}

                        {sponsor.telefono && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 2,
                                background: alpha('#757575', 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Phone sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {sponsor.telefono}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>

                  {/* Footer decorativo */}
                  <Box
                    sx={{
                      height: 6,
                      background: categoriaColor.gradient
                    }}
                  />
                </Card>
              </Zoom>
            </Grid>
          );
        })}
      </Grid>

      {/* Empty State mejorado */}
      {sponsors.length === 0 && (
        <Paper sx={{ 
          p: 8, 
          textAlign: 'center',
          borderRadius: 4,
          border: '2px dashed',
          borderColor: 'divider',
          background: `linear-gradient(135deg, ${alpha('#2196f3', 0.03)} 0%, ${alpha('#9c27b0', 0.03)} 100%)`
        }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#9c27b0', 0.1)} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <Business sx={{ fontSize: 60, color: 'primary.main' }} />
          </Box>
          
          <Typography variant="h4" gutterBottom fontWeight="bold">
            {esOrganizador ? 'Comienza a construir tu red' : 'No hay patrocinadores'}
          </Typography>
          
          {esOrganizador && (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                Agrega empresas que apoyan tu proyecto deportivo y muestra su compromiso con la comunidad
              </Typography>
              
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 'bold',
                  boxShadow: 4
                }}
              >
                Agregar Primer Patrocinador
              </Button>
            </>
          )}
        </Paper>
      )}

      {/* FAB Mejorado */}
      {esOrganizador && sponsors.length > 0 && (
        <Zoom in>
          <Fab
            color="primary"
            aria-label="agregar patrocinador"
            sx={{ 
              position: 'fixed', 
              bottom: 24, 
              right: 24,
              width: 64,
              height: 64,
              boxShadow: 6,
              background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
              '&:hover': {
                transform: 'scale(1.15) rotate(90deg)',
                boxShadow: 12
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={() => handleOpenDialog()}
          >
            <Add sx={{ fontSize: 32 }} />
          </Fab>
        </Zoom>
      )}

      {/* Diálogo Ultra Moderno de Edición/Creación */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: 24,
            background: 'background.paper'
          }
        }}
      >
        <Box sx={{ 
          background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
          p: 3,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decoración de fondo */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              filter: 'blur(40px)'
            }}
          />
          
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, backdropFilter: 'blur(10px)' }}>
                {currentSponsor ? <Edit sx={{ color: 'white' }} /> : <Add sx={{ color: 'white' }} />}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                  {currentSponsor ? 'Editar Patrocinador' : 'Nuevo Patrocinador'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {currentSponsor ? 'Actualiza la información' : 'Agrega un nuevo sponsor'}
                </Typography>
              </Box>
            </Stack>
            <IconButton 
              onClick={handleCloseDialog}
              sx={{ 
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.2)',
                  transform: 'rotate(90deg)',
                  transition: 'all 0.3s' 
                } 
              }}
            >
              <Close />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent 
          sx={{ 
            pt: 4, 
            pb: 2,
            bgcolor: 'background.default',
            // Ocultar scrollbar pero mantener funcionalidad
            '&::-webkit-scrollbar': {
              width: '8px'
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent'
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'transparent',
              borderRadius: '4px'
            },
            '&:hover::-webkit-scrollbar-thumb': {
              background: alpha('#888', 0.3)
            },
            scrollbarWidth: 'thin',
            scrollbarColor: 'transparent transparent'
          }}
        >
          {uploadingImage && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          
          <Stack spacing={3}>
            {/* Logo Upload Ultra Moderno */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 3,
                border: '2px dashed',
                borderColor: selectedImage ? 'success.main' : 'divider',
                bgcolor: selectedImage ? alpha('#4caf50', 0.03) : alpha('#2196f3', 0.02),
                transition: 'all 0.3s',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decoración de fondo */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: selectedImage 
                    ? alpha('#4caf50', 0.05)
                    : alpha('#2196f3', 0.05),
                  filter: 'blur(30px)'
                }}
              />

              <Stack spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={
                      selectedImage 
                        ? URL.createObjectURL(selectedImage)
                        : formData.logo 
                          ? getImageUrl(formData.logo)
                          : ''
                    }
                    sx={{ 
                      width: 140, 
                      height: 140,
                      border: '4px solid',
                      borderColor: selectedImage ? 'success.main' : 'primary.main',
                      boxShadow: 6,
                      transition: 'all 0.3s'
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 60 }} />
                  </Avatar>
                  
                  {selectedImage && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -8,
                        right: -8,
                        bgcolor: 'success.main',
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 3
                      }}
                    >
                      <CheckCircle sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                  )}
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="logo-upload-button"
                    type="file"
                    onChange={handleImageSelect}
                  />
                  <label htmlFor="logo-upload-button">
                    <Button
                      variant={selectedImage ? "outlined" : "contained"}
                      component="span"
                      startIcon={selectedImage ? <CheckCircle /> : <CloudUpload />}
                      color={selectedImage ? "success" : "primary"}
                      size="large"
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 'bold',
                        textTransform: 'none',
                        boxShadow: selectedImage ? 0 : 3
                      }}
                    >
                      {selectedImage ? 'Imagen Lista' : 'Seleccionar Logo'}
                    </Button>
                  </label>
                  
                  {selectedImage && (
                    <Typography variant="caption" display="block" color="success.main" sx={{ mt: 1.5, fontWeight: 600 }}>
                      ✓ {selectedImage.name}
                    </Typography>
                  )}
                  
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    JPG, PNG o GIF • Máximo 5MB
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Información Básica */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business sx={{ color: 'primary.main' }} />
                INFORMACIÓN BÁSICA
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Nombre del Patrocinador"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Ej: Empresa SA"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Categoría"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                    required
                  >
                    <MenuItem value="oro">🥇 Oro</MenuItem>
                    <MenuItem value="plata">🥈 Plata</MenuItem>
                    <MenuItem value="bronce">🥉 Bronce</MenuItem>
                    <MenuItem value="colaborador">🤝 Colaborador</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Sector/Industria"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="Ej: Tecnología, Deportes, Salud..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Descripción"
                    value={formData.descripcion}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_DESCRIPCION) {
                        setFormData({ ...formData, descripcion: e.target.value });
                      }
                    }}
                    placeholder="Breve descripción del patrocinador..."
                    helperText={`${formData.descripcion?.length || 0}/${MAX_DESCRIPCION} caracteres`}
                    inputProps={{ maxLength: MAX_DESCRIPCION }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Información de Contacto */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email sx={{ color: 'primary.main' }} />
                INFORMACIÓN DE CONTACTO
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Sitio Web"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.ejemplo.com"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Language sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contacto@ejemplo.com"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+598 99 123 456"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ 
          px: 4, 
          py: 3, 
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Button 
            onClick={handleCloseDialog}
            disabled={saving || uploadingImage}
            size="large"
            sx={{ px: 3 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            disabled={saving || uploadingImage}
            startIcon={saving || uploadingImage ? <CircularProgress size={20} /> : <Save />}
            size="large"
            sx={{ 
              px: 4,
              background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
              boxShadow: 3
            }}
          >
            {saving || uploadingImage ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Eliminación Ultra Moderno */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: 24
          }
        }}
      >
        <Box sx={{ 
          background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
          p: 3
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, backdropFilter: 'blur(10px)' }}>
              <Delete sx={{ color: 'white', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                ¿Eliminar Patrocinador?
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Esta acción no se puede deshacer
              </Typography>
            </Box>
          </Stack>
        </Box>

        <DialogContent sx={{ 
          py: 3,
          bgcolor: 'background.default'
        }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="body2" fontWeight="600">
              ¿Estás seguro que deseas eliminar a <strong>{currentSponsor?.nombre}</strong>?
            </Typography>
          </Alert>
          
          <Typography variant="body2" color="text.secondary">
            El patrocinador será marcado como inactivo y no aparecerá en la lista pública.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ 
          px: 3, 
          py: 3, 
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            size="large"
            sx={{ px: 3 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="contained"
            color="error"
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <Delete />}
            size="large"
            sx={{ px: 4 }}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Patrocinadores;
