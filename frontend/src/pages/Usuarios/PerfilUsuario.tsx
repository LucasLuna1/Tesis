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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Edit,
  Person,
  Email,
  Phone,
  CalendarToday,
  Save,
  PhotoCamera
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import ImageUploadBackend from '../../components/common/ImageUploadBackend';
import { construirUrlImagen } from '../../utils/imageUtils';

interface UsuarioData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
  foto?: string;
  activo: boolean;
  fechaCreacion: string;
  tipoUsuario: string;
}

interface EditData {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  fechaNacimiento?: dayjs.Dayjs | null;
}

const PerfilUsuario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const authContext = useAuth();
  const currentUser = authContext?.user;
  
  const [usuario, setUsuario] = useState<UsuarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<EditData>({});
  const [saving, setSaving] = useState(false);
  const [colorDominante, setColorDominante] = useState<string>('#a8edea');

  const isOwnProfile = currentUser?.uid === id;

  // Extraer color dominante de la foto
  useEffect(() => {
    if (usuario?.foto) {
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
          setColorDominante('#a8edea');
        };
      };
      
      extraerColorDominante(usuario.foto);
    }
  }, [usuario?.foto]);

  // Cargar datos del usuario
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        setLoading(true);
        
        // Intentar obtener el perfil desde la API de usuarios
        try {
          const response = await api.get(`/usuarios/${id}`);
          setUsuario(response.data);
        } catch (error: any) {
          // Si no hay ruta de API específica, obtener desde Firestore directamente

          const { db } = await import('../../config/firebase');
          const { doc, getDoc } = await import('firebase/firestore');
          
          const usuarioDoc = await getDoc(doc(db, 'usuarios', id || ''));
          if (usuarioDoc.exists()) {
            setUsuario({ id: usuarioDoc.id, ...usuarioDoc.data() } as UsuarioData);
          } else {
            // También buscar en users como fallback
            const userDoc = await getDoc(doc(db, 'users', id || ''));
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.tipoUsuario === 'usuario') {
                setUsuario({ id: userDoc.id, ...data } as UsuarioData);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error cargando usuario:', error);
        toast.error('Error al cargar el perfil del usuario');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      cargarUsuario();
    }
  }, [id]);

  const handleEditOpen = () => {
    if (usuario) {
      // Convertir fecha de YYYY-MM-DD a dayjs object para el DatePicker
      const fechaObj = usuario.fechaNacimiento 
        ? dayjs(usuario.fechaNacimiento) 
        : null;
      
      setEditData({
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        telefono: usuario.telefono || '',
        fechaNacimiento: fechaObj
      });
      setEditDialogOpen(true);
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditData({});
  };


  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Convertir fecha de dayjs a formato ISO (YYYY-MM-DD)
      const fechaNacimientoFormatoISO = editData.fechaNacimiento 
        ? dayjs(editData.fechaNacimiento).format('YYYY-MM-DD') 
        : '';
      
      const dataToSave = {
        nombre: editData.nombre,
        apellido: editData.apellido,
        telefono: editData.telefono,
        fechaNacimiento: fechaNacimientoFormatoISO,
        updatedAt: new Date()
      };
      
      // Actualizar en Firestore
      const { db } = await import('../../config/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      await updateDoc(doc(db, 'usuarios', id || ''), dataToSave);

      // También actualizar en users
      await updateDoc(doc(db, 'users', id || ''), dataToSave);

      toast.success('Perfil actualizado correctamente');
      
      // Actualizar estado local (convertir fecha dayjs a string si existe)
      setUsuario(prev => {
        if (!prev) return null;
        const updateData: Partial<UsuarioData> = {
          nombre: editData.nombre,
          apellido: editData.apellido,
          telefono: editData.telefono,
          fechaNacimiento: fechaNacimientoFormatoISO
        };
        return { ...prev, ...updateData };
      });
      
      // Actualizar el userProfile en AuthContext
      if (isOwnProfile && authContext?.setUserProfile && authContext?.userProfile) {
        authContext.setUserProfile({
          ...authContext.userProfile,
          nombre: editData.nombre,
          apellido: editData.apellido,
          telefono: editData.telefono,
          fechaNacimiento: fechaNacimientoFormatoISO
        } as any);
      }
      
      handleEditClose();
    } catch (error: any) {
      console.error('Error actualizando perfil:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (imageUrl: string) => {
    try {
      const { db } = await import('../../config/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      await updateDoc(doc(db, 'usuarios', id || ''), {
        foto: imageUrl,
        updatedAt: new Date()
      });

      await updateDoc(doc(db, 'users', id || ''), {
        foto: imageUrl,
        updatedAt: new Date()
      });

      setUsuario(prev => prev ? { ...prev, foto: imageUrl } : null);

      if (isOwnProfile && authContext?.setUserProfile && authContext?.userProfile) {
        authContext.setUserProfile({
          ...authContext.userProfile,
          foto: imageUrl
        });
      }

      toast.success('Foto actualizada correctamente');
    } catch (error) {
      console.error('Error actualizando foto:', error);
      toast.error('Error al actualizar la foto');
    }
  };

  const calcularEdad = (fechaNacimiento?: string): number | null => {
    if (!fechaNacimiento) return null;
    
    const fecha = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mes = hoy.getMonth() - fecha.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    
    return edad;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!usuario) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          No se pudo cargar el perfil del usuario
        </Alert>
      </Container>
    );
  }

  const edad = calcularEdad(usuario.fechaNacimiento);

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
        {/* Foto de portada con blur */}
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
              backgroundImage: usuario.foto && construirUrlImagen(usuario.foto)
                ? `url(${construirUrlImagen(usuario.foto)})`
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
        
        {/* Información principal */}
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
                  currentImageUrl={construirUrlImagen(usuario.foto)}
                  onImageUpload={handleImageUpload}
                  size={140}
                  userId={id}
                  userType="usuario"
                />
              ) : (
                <Avatar
                  src={construirUrlImagen(usuario.foto)}
                  sx={{ 
                    width: 140, 
                    height: 140,
                    border: '5px solid',
                    borderColor: 'background.paper',
                    boxShadow: 3
                  }}
                >
                  {usuario.nombre?.[0]}{usuario.apellido?.[0]}
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
            {usuario.nombre} {usuario.apellido}
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            Usuario de la plataforma
          </Typography>
        </Box>
      </Paper>

      {/* Información del perfil */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 3 }}>
          Información Personal
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                Email
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">{usuario.email}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                Teléfono
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">{usuario.telefono || 'No especificado'}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                Edad
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {edad ? `${edad} años` : 'No especificada'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Dialog de edición */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Perfil</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={editData.nombre || ''}
                onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido"
                value={editData.apellido || ''}
                onChange={(e) => setEditData({ ...editData, apellido: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={editData.telefono || ''}
                onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <DatePicker
                  label="Fecha de Nacimiento"
                  value={editData.fechaNacimiento ?? null}
                  onChange={(value) => {
                    setEditData({ ...editData, fechaNacimiento: value as dayjs.Dayjs | null });
                  }}
                  maxDate={dayjs()}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<Save />}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PerfilUsuario;

