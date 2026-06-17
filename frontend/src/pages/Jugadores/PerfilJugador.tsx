import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  Button,
  Grid,
  Card,
  CardContent,
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
  IconButton,
  alpha
} from '@mui/material';
import {
  Edit,
  SportsRugby,
  TrendingUp,
  Person,
  Phone,
  Email,
  CalendarToday,
  Height,
  FitnessCenter,
  Badge,
  LocationOn,
  PersonAdd,
  PersonRemove,
  PhotoCamera,
  EmojiEvents,
  Star
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ImageUploadBackend from '../../components/common/ImageUploadBackend';
import { useJugadorPerfil } from '../../hooks/useQueryHooks';
import { invalidateQueries } from '../../config/queryClient';
import { construirUrlImagen } from '../../utils/imageUtils';

interface JugadorData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  foto: string;
  fotoPerfil: string;
  posicion: string;
  altura: number;
  peso: number;
  edad: number;
  categoria: string[]; // Cambiado a array para múltiples categorías
  numero?: number;
  equipoId: string;
  equipoNombre: string;
  estadisticas: {
    partidosJugados: number;
    partidosTitular: number;
    partidosSuplente: number;
    minutosJugados: number;
    tries: number;
    conversiones: number;
    tarjetasAmarillas: number;
    tarjetasRojas: number;
    rating: number;
  };
  activo: boolean;
  disponible: boolean;
  sancionado: boolean;
  siguiendo?: boolean; // Campo para saber si el usuario actual está siguiendo a este jugador
}

const PerfilJugador: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authContext = useAuth();
  const currentUser = authContext?.user;
  
  // React Query - Cargar perfil con caché
  const { data: jugador, isLoading: loading, refetch } = useJugadorPerfil(id);
  const estadisticas = jugador?.estadisticas || null;
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<JugadorData>>({});
  const [colorDominante, setColorDominante] = useState<string>('#667eea');

  // Verificar seguimiento
  useEffect(() => {
    // El estado de seguimiento ahora viene directamente del backend
    // React Query ya maneja la carga del perfil
  }, [id, currentUser?.uid, jugador]);

  // Extraer color dominante de la foto
  useEffect(() => {
    if (jugador?.foto) {
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
          setColorDominante('#667eea');
        };
      };
      
      extraerColorDominante(jugador.foto);
    }
  }, [jugador?.foto]);

   // Abrir diálogo de edición
   const handleEditOpen = () => {
     if (jugador) {
       setEditData({
         nombre: jugador.nombre,
         apellido: jugador.apellido,
         telefono: jugador.telefono,
         posicion: jugador.posicion,
         altura: jugador.altura,
         peso: jugador.peso,
         edad: jugador.edad,
         categoria: Array.isArray(jugador.categoria) ? jugador.categoria : [jugador.categoria].filter(Boolean),
         numero: jugador.numero
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
      await api.put(`/jugadores/perfil/${id}`, editData);
      toast.success('Perfil actualizado correctamente');
      
      // Recargar datos
      refetch();
      invalidateQueries.jugadores();
      
      // Actualizar el userProfile en AuthContext para que el Sidebar y Dashboard se actualicen
      if (currentUser?.uid === id && authContext?.setUserProfile && authContext?.userProfile) {
        authContext.setUserProfile({
          ...authContext.userProfile,
          nombre: editData.nombre || authContext.userProfile.nombre,
          apellido: editData.apellido || authContext.userProfile.apellido,
          ...(editData.telefono && { telefono: editData.telefono }),
          ...(editData.posicion && { posicion: editData.posicion }),
          ...(editData.altura && { altura: editData.altura }),
          ...(editData.peso && { peso: editData.peso })
        } as any);
      }
      
      handleEditClose();
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      toast.error('Error al actualizar el perfil');
    }
  };

  // Manejar subida de imagen
  const handleImageUpload = useCallback(async (imageUrl: string) => {
    try {
      // Refrescar datos después de que el backend actualice la foto
      refetch();
      invalidateQueries.jugadores();
      
      // Actualizar el userProfile en AuthContext para que el Sidebar se actualice
      if (currentUser?.uid === id && authContext?.setUserProfile && authContext?.userProfile) {
        authContext.setUserProfile({
          ...authContext.userProfile,
          foto: imageUrl
        });
      }
    } catch (error) {
      console.error('Error actualizando foto:', error);
      toast.error('Error al actualizar la foto');
    }
  }, [id, refetch, currentUser, authContext]);

  // Manejar seguimiento
  const handleSeguir = useCallback(async () => {
    try {
      const response = await api.post(`/jugadores/seguir/${id}`);
      const { siguiendo: nuevoEstado } = response.data;
      
      if (nuevoEstado) {
        toast.success('Ahora sigues a este jugador');
      } else {
        toast.success('Dejaste de seguir a este jugador');
      }
      
      // Refrescar el perfil para obtener el estado actualizado
      refetch();
    } catch (error) {
      console.error('Error siguiendo jugador:', error);
      toast.error('Error al seguir jugador');
    }
  }, [id, refetch]);

  // Verificar si el usuario puede editar
  const canEdit = currentUser?.uid === id;

  // Calcular edad
  const calcularEdad = (fechaNacimiento: string) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>Cargando perfil...</Typography>
      </Box>
    );
  }

  if (!jugador) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" color="error">
          Jugador no encontrado
        </Typography>
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
              backgroundImage: jugador.foto && construirUrlImagen(jugador.foto)
                ? `url(${construirUrlImagen(jugador.foto)})`
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
          {/* Avatar */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            mt: -8,
            mb: 2
          }}>
            <Box sx={{ position: 'relative', zIndex: 10 }}>
              {canEdit ? (
                <ImageUploadBackend
                  currentImageUrl={construirUrlImagen(jugador.foto)}
                  onImageUpload={handleImageUpload}
                  size={140}
                  userId={id}
                />
              ) : (
                <Avatar
                  src={construirUrlImagen(jugador.foto)}
                  sx={{ 
                    width: 140, 
                    height: 140,
                    border: '5px solid',
                    borderColor: 'background.paper',
                    boxShadow: 3
                  }}
                >
                  <Person sx={{ fontSize: 60 }} />
                </Avatar>
              )}
            </Box>
            
            {/* Botones de acción */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {canEdit && (
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
              )}
              {!canEdit && currentUser && (
                <Button
                  variant={jugador.siguiendo ? "outlined" : "contained"}
                  startIcon={jugador.siguiendo ? <PersonRemove /> : <PersonAdd />}
                  onClick={handleSeguir}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    minWidth: 120
                  }}
                >
                  {jugador.siguiendo ? 'Siguiendo' : 'Seguir'}
                </Button>
              )}
            </Box>
          </Box>
          
          {/* Nombre y detalles */}
          <Typography variant="h4" fontWeight="700" gutterBottom>
            {jugador.nombre} {jugador.apellido}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            {jugador.posicion || 'Posición no especificada'} • {jugador.equipoNombre || 'Sin equipo'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {Array.isArray(jugador.categoria) && jugador.categoria.length > 0 && (
              jugador.categoria.map((cat: string, index: number) => (
                <Chip
                  key={index}
                  label={cat}
                  size="small"
                  sx={{ 
                    height: 24,
                    fontWeight: 500,
                    borderRadius: 2
                  }}
                />
              ))
            )}
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Columna principal */}
        <Grid item xs={12} md={8}>
          {/* Información Personal */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              mb: 3,
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
                    <Typography variant="body2">{jugador.email}</Typography>
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
                    <Typography variant="body2">{jugador.telefono || 'No especificado'}</Typography>
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
                    <Typography variant="body2">{jugador.edad || calcularEdad(jugador.fechaNacimiento)} años</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                    Altura / Peso
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Height sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2">{jugador.altura} cm • {jugador.peso} kg</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Estadísticas */}
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
              Estadísticas de Rendimiento
            </Typography>
            
            <Grid container spacing={2}>
              {[
                { label: 'Partidos Jugados', value: estadisticas?.partidosJugados || 0, icon: <SportsRugby />, color: 'primary.main' },
                { label: 'Tries', value: estadisticas?.tries || 0, icon: <EmojiEvents />, color: 'success.main' },
                { label: 'Minutos Jugados', value: estadisticas?.minutosJugados || 0, icon: <span>⏱️</span>, color: 'info.main' },
                { label: 'Tarjetas Amarillas', value: estadisticas?.tarjetasAmarillas || 0, icon: <span>🟨</span>, color: 'warning.main' },
                { label: 'Tarjetas Rojas', value: estadisticas?.tarjetasRojas || 0, icon: <span>🟥</span>, color: 'error.main' },
              ].map((stat, index) => (
                <Grid item xs={6} sm={4} md={2.4} key={index}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      p: 2,
                      textAlign: 'center',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: stat.color,
                        transform: 'translateY(-2px)',
                        boxShadow: 1
                      }
                    }}
                  >
                    <Box sx={{ color: stat.color, mb: 1 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h5" fontWeight="700" color={stat.color}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Sobre mí */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              mb: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 2 }}>
              Detalles
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                  Posición
                </Typography>
                <Chip 
                  label={jugador.posicion || 'No especificada'} 
                  size="small"
                  sx={{ fontWeight: 500 }}
                />
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                  Equipo
                </Typography>
                <Typography variant="body2">{jugador.equipoNombre || 'Sin equipo'}</Typography>
              </Box>
              
              {Array.isArray(jugador.categoria) && jugador.categoria.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                    Categorías
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {jugador.categoria.map((cat: string, index: number) => (
                      <Chip
                        key={index}
                        label={cat}
                        size="small"
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Diálogo de edición */}
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
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido"
                value={editData.apellido || ''}
                onChange={(e) => setEditData({ ...editData, apellido: e.target.value })}
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
              <FormControl fullWidth>
                <InputLabel>Posición</InputLabel>
                <Select
                  value={editData.posicion || ''}
                  onChange={(e) => setEditData({ ...editData, posicion: e.target.value })}
                  label="Posición"
                >
                  <MenuItem value="Pilar">Pilar</MenuItem>
                  <MenuItem value="Hooker">Hooker</MenuItem>
                  <MenuItem value="Segunda línea">Segunda línea</MenuItem>
                  <MenuItem value="Ala">Ala</MenuItem>
                  <MenuItem value="Octavo">Octavo</MenuItem>
                  <MenuItem value="Medio scrum">Medio scrum</MenuItem>
                  <MenuItem value="Apertura">Apertura</MenuItem>
                  <MenuItem value="Centro">Centro</MenuItem>
                  <MenuItem value="Wing">Wing</MenuItem>
                  <MenuItem value="Fullback">Fullback</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número de camiseta"
                type="number"
                value={editData.numero || ''}
                onChange={(e) => setEditData({ ...editData, numero: parseInt(e.target.value) || undefined })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Altura (cm)"
                type="number"
                value={editData.altura || ''}
                onChange={(e) => setEditData({ ...editData, altura: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Peso (kg)"
                type="number"
                value={editData.peso || ''}
                onChange={(e) => setEditData({ ...editData, peso: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Edad"
                type="number"
                value={editData.edad || ''}
                onChange={(e) => setEditData({ ...editData, edad: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Categorías</InputLabel>
                <Select
                  multiple
                  value={editData.categoria || []}
                  onChange={(e) => setEditData({ ...editData, categoria: e.target.value as string[] })}
                  label="Categorías"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="M14">M14</MenuItem>
                  <MenuItem value="M15">M15</MenuItem>
                  <MenuItem value="M16">M16</MenuItem>
                  <MenuItem value="M17">M17</MenuItem>
                  <MenuItem value="M18">M18</MenuItem>
                  <MenuItem value="M19">M19</MenuItem>
                  <MenuItem value="Intermedia">Intermedia</MenuItem>
                  <MenuItem value="Preintermedia">Preintermedia</MenuItem>
                  <MenuItem value="Primera">Primera</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PerfilJugador;
