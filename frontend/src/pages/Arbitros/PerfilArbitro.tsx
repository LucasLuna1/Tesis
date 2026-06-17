import { asText } from '../../utils/text';
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
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  alpha
} from '@mui/material';
import {
  Edit,
  Gavel,
  Person,
  Phone,
  Email,
  CalendarToday,
  Star,
  Assignment,
  Schedule,
  CheckCircle,
  Visibility,
  PhotoCamera,
  EmojiEvents,
  TrendingUp
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ImageUploadBackend from '../../components/common/ImageUploadBackend';
import { useArbitroPerfil } from '../../hooks/useQueryHooks';
import { invalidateQueries } from '../../config/queryClient';
import { construirUrlImagen } from '../../utils/imageUtils';

interface ArbitroData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  foto: string;
  fotoPerfil: string;
  certificacion: string;
  experienciaAnios: number;
  categoriasHabilitadas: string[];
  estadisticas: {
    partidosArbitrados: number;
    partidosCompletados: number;
    tarjetasAmarillas: number;
    tarjetasRojas: number;
    promedioTarjetasPorPartido: number;
    rating: number;
  };
  activo: boolean;
  disponible: boolean;
}

const PerfilArbitro: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authContext = useAuth();
  const currentUser = authContext?.user;
  
  // React Query - Cargar perfil con caché
  const { data: arbitro, isLoading: loading, refetch } = useArbitroPerfil(id);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<ArbitroData>>({});
  const [proximosPartidos, setProximosPartidos] = useState<any[]>([]);
  const [partidosRecientes, setPartidosRecientes] = useState<any[]>([]);
  const [colorDominante, setColorDominante] = useState<string>('#f093fb');

  // Helpers para mostrar nombres cuando el backend devuelve objetos
  const getNombreEquipo = (equipo: any, fallback: string = 'Equipo'): string => {
    if (!equipo) return fallback;
    if (typeof equipo === 'string') return equipo;
    if (typeof equipo === 'object') return equipo.nombre || equipo.id || fallback;
    return fallback;
  };

  const getNombreCancha = (cancha: any, fallback: string = 'Cancha por definir'): string => {
    if (!cancha) return fallback;
    if (typeof cancha === 'string') return cancha;
    if (typeof cancha === 'object') return cancha.nombre || cancha.id || fallback;
    return fallback;
  };

  useEffect(() => {
    let isMounted = true;
    
    const cargarPartidos = async () => {
      if (!id || !arbitro || !isMounted) return;
      
      try {
        // Cargar próximos partidos
        const proximosRes = await api.get(`/arbitros/${id}/partidos/proximos`);
        if (isMounted) {
          setProximosPartidos(proximosRes.data || []);
        }
      } catch (error) {

      }

      try {
        // Cargar partidos recientes
        const recientesRes = await api.get(`/arbitros/${id}/partidos/recientes`);
        if (isMounted) {
          setPartidosRecientes(recientesRes.data || []);
        }
      } catch (error) {

      }
    };

    if (id && arbitro) {
      cargarPartidos();
    }
    
    return () => {
      isMounted = false;
    };
  }, [id, arbitro]);

  const handleEditOpen = () => {
    if (arbitro) {
      setEditData({
        nombre: arbitro.nombre,
        apellido: arbitro.apellido,
        telefono: arbitro.telefono,
        fechaNacimiento: arbitro.fechaNacimiento,
        certificacion: arbitro.certificacion,
        experienciaAnios: arbitro.experienciaAnios,
        categoriasHabilitadas: arbitro.categoriasHabilitadas || []
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
      await api.put(`/arbitros/perfil/${id}`, editData);
      toast.success('Perfil actualizado correctamente');
      
      // Refrescar datos
      refetch();
      invalidateQueries.arbitros();
      
      // Actualizar el userProfile en AuthContext para que el Sidebar y Dashboard se actualicen
      if (currentUser?.uid === id && authContext?.setUserProfile && authContext?.userProfile) {
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
    }
  };

  const handleImageUpload = useCallback(async (imageUrl: string) => {
    try {
      await api.put(`/arbitros/perfil/${id}`, { foto: imageUrl });
      toast.success('Foto actualizada correctamente');
      refetch();
      
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

  const canEdit = currentUser?.uid === id;

  // Extraer color dominante de la foto
  useEffect(() => {
    if (arbitro?.foto) {
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
          setColorDominante('#f093fb');
        };
      };
      
      extraerColorDominante(arbitro.foto);
    }
  }, [arbitro?.foto]);

  const calcularEdad = useCallback((fechaNacimiento: string) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!arbitro) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Árbitro no encontrado</Alert>
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
              backgroundImage: arbitro.foto && construirUrlImagen(arbitro.foto)
                ? `url(${construirUrlImagen(arbitro.foto)})`
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
                  currentImageUrl={construirUrlImagen(arbitro.foto)}
                  onImageUpload={handleImageUpload}
                  size={140}
                  userId={id}
                  userType="arbitro"
                />
              ) : (
                <Avatar
                  src={construirUrlImagen(arbitro.foto)}
                  sx={{ 
                    width: 140, 
                    height: 140,
                    border: '5px solid',
                    borderColor: 'background.paper',
                    boxShadow: 3
                  }}
                >
                  <Gavel sx={{ fontSize: 60 }} />
                </Avatar>
              )}
            </Box>
            
            {/* Botones de acción */}
            {canEdit && (
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
          
          {/* Nombre y detalles */}
          <Typography variant="h4" fontWeight="700" gutterBottom>
            {arbitro.nombre} {arbitro.apellido}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            Árbitro {arbitro.certificacion || 'Certificado'} • {arbitro.experienciaAnios || 0} años de experiencia
          </Typography>
          
          {arbitro.estadisticas?.rating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Star sx={{ color: 'gold', fontSize: 20 }} />
              <Typography variant="body1" fontWeight="600">
                Rating: {arbitro.estadisticas.rating.toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Columna principal */}
        <Grid item xs={12} md={8}>
          {/* Estadísticas */}
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
              Estadísticas de Arbitraje
            </Typography>
            
            <Grid container spacing={2}>
              {[
                { label: 'Partidos Arbitrados', value: arbitro.estadisticas?.partidosArbitrados || 0, icon: <Assignment />, color: 'primary.main' },
                { label: 'Completados', value: arbitro.estadisticas?.partidosCompletados || 0, icon: <CheckCircle />, color: 'success.main' },
                { label: 'Tarjetas Amarillas', value: arbitro.estadisticas?.tarjetasAmarillas || 0, icon: <EmojiEvents />, color: 'warning.main' },
                { label: 'Tarjetas Rojas', value: arbitro.estadisticas?.tarjetasRojas || 0, icon: <TrendingUp />, color: 'error.main' },
              ].map((stat, index) => (
                <Grid item xs={6} sm={3} key={index}>
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

          {/* Información Personal */}
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
                    <Typography variant="body2">{arbitro.email}</Typography>
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
                    <Typography variant="body2">{arbitro.telefono || 'No especificado'}</Typography>
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
                      {arbitro.fechaNacimiento ? calcularEdad(arbitro.fechaNacimiento) : '-'} años
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                    Certificación
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Gavel sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2">{arbitro.certificacion || 'No especificado'}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Detalles */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3,
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
                  Experiencia
                </Typography>
                <Chip 
                  label={`${arbitro.experienciaAnios || 0} años`}
                  size="small"
                  sx={{ fontWeight: 500 }}
                />
              </Box>
              
              {arbitro.categoriasHabilitadas && arbitro.categoriasHabilitadas.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 0.5 }}>
                    Categorías Habilitadas
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {arbitro.categoriasHabilitadas.map((cat: string, index: number) => (
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

      {/* Próximos Partidos (movido fuera) */}
      {false && (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule />
          Próximos Partidos a Arbitrar
        </Typography>
        
        {proximosPartidos.length > 0 ? (
          <List>
            {proximosPartidos.slice(0, 5).map((partido, index) => (
              <ListItem
                key={index}
                sx={{ 
                  border: '1px solid #eee', 
                  borderRadius: 1, 
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => navigate(`/partidos/${partido.id}`)}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body1">
                        {getNombreEquipo(partido.equipoLocal, 'Equipo Local')} vs {getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}
                      </Typography>
                      {partido.categoria && (
                        <Chip label={asText(partido.categoria)} size="small" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={`${new Date(partido.fecha).toLocaleDateString()} - ${getNombreCancha(partido.cancha)}`}
                />
                <IconButton size="small">
                  <Visibility />
                </IconButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">No hay partidos programados</Typography>
        )}
      </Paper>
      )}

      {/* Historial Reciente - eliminado */}
      {false && (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle />
          Partidos Recientes
        </Typography>
        
        {partidosRecientes.length > 0 ? (
          <List>
            {partidosRecientes.slice(0, 5).map((partido, index) => (
              <ListItem
                key={index}
                sx={{ border: '1px solid #eee', borderRadius: 1, mb: 1 }}
              >
                <ListItemText
                  primary={`${getNombreEquipo(partido.equipoLocal, 'Equipo Local')} vs ${getNombreEquipo(partido.equipoVisitante, 'Equipo Visitante')}`}
                  secondary={`${new Date(partido.fecha).toLocaleDateString()} - Resultado: ${partido.resultado?.local || 0} - ${partido.resultado?.visitante || 0}`}
                />
                <Chip 
                  label={partido.estado} 
                  size="small" 
                  color={partido.estado === 'finalizado' ? 'success' : 'default'}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">No hay partidos recientes</Typography>
        )}
      </Paper>
      )}

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
              <TextField
                fullWidth
                label="Fecha de Nacimiento"
                type="date"
                value={editData.fechaNacimiento ? new Date(editData.fechaNacimiento).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditData({ ...editData, fechaNacimiento: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Certificación</InputLabel>
                <Select
                  value={editData.certificacion || ''}
                  onChange={(e) => setEditData({ ...editData, certificacion: e.target.value })}
                  label="Certificación"
                >
                  <MenuItem value="Nivel 1">Nivel 1</MenuItem>
                  <MenuItem value="Nivel 2">Nivel 2</MenuItem>
                  <MenuItem value="Nivel 3">Nivel 3</MenuItem>
                  <MenuItem value="Nacional">Nacional</MenuItem>
                  <MenuItem value="Internacional">Internacional</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Años de Experiencia"
                type="number"
                value={editData.experienciaAnios || ''}
                onChange={(e) => setEditData({ ...editData, experienciaAnios: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Categorías Habilitadas</InputLabel>
                <Select
                  multiple
                  value={editData.categoriasHabilitadas || []}
                  onChange={(e) => setEditData({ ...editData, categoriasHabilitadas: e.target.value as string[] })}
                  label="Categorías Habilitadas"
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

export default PerfilArbitro;

