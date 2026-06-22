import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Avatar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Divider,
  Stack,
  alpha,
  Checkbox,
  Card
} from '@mui/material';
import { 
  Close, 
  Save, 
  Edit, 
  PhotoCamera, 
  LocationOn, 
  Email as EmailIcon, 
  Phone, 
  Description,
  Category
} from '@mui/icons-material';
import api from '../../../services/api';
import { getImageUrl } from '../../../services/api';
import toast from 'react-hot-toast';

interface InformacionClubDialogProps {
  open: boolean;
  onClose: () => void;
  club: any;
  onClubActualizado: () => void;
}

const categoriasDisponibles = [
  'M14', 'M15', 'M16', 'M17', 'M18', 'M19',
  'Intermedia', 'Preintermedia', 'Primera'
];

const InformacionClubDialog: React.FC<InformacionClubDialogProps> = ({
  open,
  onClose,
  club,
  onClubActualizado
}) => {
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    codigoPostal: '',
    telefono: '',
    email: '',
    descripcion: '',
    categorias: [] as string[]
  });

  useEffect(() => {
    if (club && open) {
      setFormData({
        nombre: club.nombre || '',
        direccion: club.direccion || '',
        ciudad: club.ciudad || '',
        provincia: club.provincia || '',
        codigoPostal: club.codigoPostal || '',
        telefono: club.telefono || '',
        email: club.email || '',
        descripcion: club.descripcion || '',
        categorias: club.categorias || []
      });
      
      // Cargar logo actual si existe
      if (club.logo) {
        setLogoPreview(getImageUrl(club.logo));
      }
      
      // Limpiar archivo de logo cuando se abre el diálogo
      setLogoFile(null);
    }
  }, [club, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoriasChange = (event: any) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      categorias: typeof value === 'string' ? value.split(',') : value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre del club es requerido');
      return;
    }
    if (!formData.ciudad.trim()) {
      toast.error('La ciudad es requerida');
      return;
    }
    if (!formData.categorias || formData.categorias.length === 0) {
      toast.error('Debe seleccionar al menos una categoría');
      return;
    }

    try {
      setLoading(true);
      
      // Actualizar información del club (incluyendo categorías)
      await api.put(`/managers/club/${club.id}`, formData);
      
      // Si hay logo nuevo, subirlo
      if (logoFile) {
        const formDataLogo = new FormData();
        formDataLogo.append('logo', logoFile);
        
        await api.post(`/managers/club/${club.id}/foto`, formDataLogo, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      toast.success('Club actualizado exitosamente');
      
      // Cerrar el diálogo primero
      onClose();
      
      // Recargar los datos del club después de un pequeño delay
      // para asegurar que el servidor haya procesado todo
      setTimeout(() => {
        onClubActualizado();
      }, 100);
      
    } catch (error: any) {
      console.error('Error actualizando club:', error);
      toast.error(error.response?.data?.error || 'Error al actualizar el club');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          bgcolor: 'background.paper'
        }
      }}
    >
      {/* Header Ultra Moderno con Gradient */}
      <Box
        sx={{
          position: 'relative',
          background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 50%, #b71c1c 100%)',
          px: 3,
          pt: 3,
          pb: 8,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.3
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography 
              variant="h4" 
              fontWeight={700} 
              sx={{ 
                color: 'white',
                mb: 0.5,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              Editar Club
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <Edit fontSize="small" />
              Actualiza la información de tu club
            </Typography>
          </Box>
          <IconButton 
            onClick={onClose} 
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              '&:hover': { 
                bgcolor: 'rgba(255,255,255,0.2)',
                transform: 'rotate(90deg)'
              },
              transition: 'all 0.3s'
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ px: 0, py: 0, mt: -5 }}>
        {/* Logo del Club Flotante */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          mb: 3
        }}>
          <Box 
            sx={{
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: -10,
                background: 'linear-gradient(135deg, #d32f2f, #c62828)',
                borderRadius: '50%',
                opacity: 0.1,
                filter: 'blur(20px)',
                zIndex: -1
              }
            }}
          >
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="logo-club-edit-upload"
              type="file"
              onChange={handleLogoChange}
            />
            <label htmlFor="logo-club-edit-upload" style={{ cursor: 'pointer' }}>
              <Box
                sx={{
                  position: 'relative',
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid',
                  borderColor: 'background.paper',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px) scale(1.05)',
                    boxShadow: '0 12px 48px rgba(211,47,47,0.3)',
                    '& .edit-overlay': {
                      opacity: 1
                    }
                  }
                }}
              >
                <Avatar
                  src={logoPreview}
                  sx={{ 
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary' }} />
                </Avatar>
                
                {/* Overlay de edición */}
                <Box
                  className="edit-overlay"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    bgcolor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.3s',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <Box textAlign="center">
                    <PhotoCamera sx={{ fontSize: 32, color: 'white', mb: 0.5 }} />
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                      Cambiar
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </label>
          </Box>
        </Box>

        <Box sx={{ px: 3, pb: 3 }}>
          <Stack spacing={3}>
            {/* Sección: Información Básica */}
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'error.main',
                  boxShadow: '0 4px 20px rgba(211,47,47,0.1)'
                }
              }}
            >
              {/* Header de la sección */}
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: 'linear-gradient(135deg, rgba(211,47,47,0.05) 0%, rgba(211,47,47,0.02) 100%)',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  color="text.primary"
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(211,47,47,0.3)'
                    }}
                  >
                    <Description sx={{ fontSize: 18, color: 'white' }} />
                  </Box>
                  Información Básica
                </Typography>
              </Box>
              
              <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Nombre del Club *
                </Typography>
                <TextField
                  fullWidth
                  required
                  placeholder="Nombre del club"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Descripción
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Descripción del club..."
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
            </Grid>
              </Box>
            </Card>

            {/* Sección: Categorías */}
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'error.main',
                  boxShadow: '0 4px 20px rgba(211,47,47,0.1)'
                }
              }}
            >
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: 'linear-gradient(135deg, rgba(211,47,47,0.05) 0%, rgba(211,47,47,0.02) 100%)',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  color="text.primary"
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(211,47,47,0.3)'
                    }}
                  >
                    <Category sx={{ fontSize: 18, color: 'white' }} />
                  </Box>
                  Categorías del Club
                </Typography>
              </Box>
              
              <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Selecciona las categorías del club *
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    value={formData.categorias}
                    onChange={handleCategoriasChange}
                    input={<OutlinedInput />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            sx={{
                              background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              height: 28,
                              boxShadow: '0 2px 8px rgba(211,47,47,0.3)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 4px 12px rgba(211,47,47,0.4)'
                              },
                              transition: 'all 0.2s',
                              '& .MuiChip-deleteIcon': {
                                color: 'rgba(255,255,255,0.8)',
                                '&:hover': {
                                  color: 'white'
                                }
                              }
                            }}
                          />
                        ))}
                      </Box>
                    )}
                    sx={{
                      borderRadius: 2
                    }}
                  >
                    {categoriasDisponibles.map((categoria) => (
                      <MenuItem key={categoria} value={categoria}>
                        <Checkbox checked={formData.categorias.indexOf(categoria) > -1} />
                        <Typography>{categoria}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
              </Box>
            </Card>

            {/* Sección: Información de Contacto */}
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'error.main',
                  boxShadow: '0 4px 20px rgba(211,47,47,0.1)'
                }
              }}
            >
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: 'linear-gradient(135deg, rgba(211,47,47,0.05) 0%, rgba(211,47,47,0.02) 100%)',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  color="text.primary"
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(211,47,47,0.3)'
                    }}
                  >
                    <Phone sx={{ fontSize: 18, color: 'white' }} />
                  </Box>
                  Información de Contacto
                </Typography>
              </Box>
              
              <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EmailIcon fontSize="inherit" />
                  Email
                </Typography>
                <TextField
                  fullWidth
                  placeholder="club@ejemplo.com"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Phone fontSize="inherit" />
                  Teléfono
                </Typography>
                <TextField
                  fullWidth
                  placeholder="+54 9 11 1234-5678"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
            </Grid>
              </Box>
            </Card>

            {/* Sección: Ubicación */}
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'error.main',
                  boxShadow: '0 4px 20px rgba(211,47,47,0.1)'
                }
              }}
            >
              <Box 
                sx={{ 
                  px: 3, 
                  py: 2,
                  background: 'linear-gradient(135deg, rgba(211,47,47,0.05) 0%, rgba(211,47,47,0.02) 100%)',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  color="text.primary"
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(211,47,47,0.3)'
                    }}
                  >
                    <LocationOn sx={{ fontSize: 18, color: 'white' }} />
                  </Box>
                  Ubicación
                </Typography>
              </Box>
              
              <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Dirección
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Calle y número"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Ciudad *
                </Typography>
                <TextField
                  fullWidth
                  required
                  placeholder="Ciudad"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleInputChange}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Provincia
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Provincia"
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleInputChange}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Código Postal
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Código postal"
                  name="codigoPostal"
                  value={formData.codigoPostal}
                  onChange={handleInputChange}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
            </Grid>
              </Box>
            </Card>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        px: 3, 
        py: 3, 
        borderTop: '2px solid',
        borderColor: 'divider',
        gap: 2,
        background: 'linear-gradient(180deg, rgba(211,47,47,0.02) 0%, rgba(211,47,47,0.00) 100%)'
      }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          size="large"
          sx={{
            textTransform: 'none',
            borderRadius: 2.5,
            px: 4,
            py: 1.5,
            fontWeight: 600,
            fontSize: '1rem',
            border: '2px solid',
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'text.primary',
              bgcolor: 'action.hover'
            }
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
          sx={{
            textTransform: 'none',
            borderRadius: 2.5,
            px: 4,
            py: 1.5,
            fontWeight: 600,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 50%, #b71c1c 100%)',
            boxShadow: '0 4px 16px rgba(211,47,47,0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 50%, #a31515 100%)',
              boxShadow: '0 6px 20px rgba(211,47,47,0.5)',
              transform: 'translateY(-2px)'
            },
            '&:disabled': {
              background: 'rgba(211,47,47,0.5)',
              boxShadow: 'none'
            },
            transition: 'all 0.3s'
          }}
        >
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InformacionClubDialog;



