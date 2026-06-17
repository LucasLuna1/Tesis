import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Person,
  CheckCircle,
  Cancel,
  ArrowBack,
  GroupAdd
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const GestionSolicitudes: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [solicitudesGestion, setSolicitudesGestion] = useState<any[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<{[key: string]: string}>({});
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    cargarSolicitudes();
    cargarSolicitudesGestion();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/managers/solicitudes');
      setSolicitudes(response.data.solicitudes || []);
    } catch (error) {      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const cargarSolicitudesGestion = async () => {
    try {
      const response = await api.get('/managers/solicitudes-gestion');
      setSolicitudesGestion(response.data.solicitudes || []);
    } catch (error) {
      console.error('Error cargando solicitudes de gestión:', error);
    }
  };

  const handleResponderSolicitud = async (solicitudId: string, respuesta: 'aceptada' | 'rechazada', jugadorNombre: string) => {
    const categoria = selectedCategoria[solicitudId];
    
    if (respuesta === 'aceptada' && (!categoria || categoria.trim() === '')) {
      toast.error('Selecciona una categoría antes de aceptar');
      return;
    }

    try {
      await api.post(`/managers/solicitudes/${solicitudId}/responder`, {
        respuesta,
        categoria
      });

      toast.success(
        respuesta === 'aceptada' 
          ? `Solicitud de ${jugadorNombre} aceptada` 
          : `Solicitud de ${jugadorNombre} rechazada`
      );
      
      cargarSolicitudes(); // Recargar lista
    } catch (error: any) {      toast.error(error.response?.data?.error || 'Error al procesar solicitud');
    }
  };

  const handleResponderSolicitudGestion = async (solicitudId: string, respuesta: 'aceptada' | 'rechazada', managerNombre: string) => {
    try {
      await api.post(`/managers/solicitudes-gestion/${solicitudId}/responder`, {
        respuesta
      });

      toast.success(
        respuesta === 'aceptada' 
          ? `Solicitud de ${managerNombre} aceptada` 
          : `Solicitud de ${managerNombre} rechazada`
      );
      
      cargarSolicitudesGestion(); // Recargar lista
    } catch (error: any) {      toast.error(error.response?.data?.error || 'Error al procesar solicitud');
    }
  };

  const categorias = ['M14', 'M15', 'M16', 'M17', 'M18', 'M19', 'Intermedia', 'Preintermedia', 'Primera'];

  // Función para formatear fechas de Firestore
  const formatDate = (fecha: any) => {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      // Si es un objeto de Firestore Timestamp
      if (fecha && typeof fecha === 'object' && fecha.toDate && typeof fecha.toDate === 'function') {
        return fecha.toDate().toLocaleString();
      }
      
      // Si es un objeto con seconds y nanoseconds (otro formato de Firestore)
      if (fecha && typeof fecha === 'object' && fecha.seconds) {
        return new Date(fecha.seconds * 1000).toLocaleString();
      }
      
      // Si es un string o número
      const date = new Date(fecha);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formateando fecha:', error, fecha);
      return 'Error al formatear fecha';
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando solicitudes...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/manager/mi-club')}
          sx={{ mb: 2 }}
        >
          Volver a Mi Club
        </Button>
        
        <Typography variant="h4" gutterBottom>
          Solicitudes Pendientes
        </Typography>
      </Box>

      {/* Tabs para Jugadores y Managers */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabIndex} 
          onChange={(e, newValue) => setTabIndex(newValue)} 
          variant="fullWidth"
        >
          <Tab 
            label={
              <Badge badgeContent={solicitudes.length} color="primary">
                Solicitudes de Jugadores
              </Badge>
            } 
            icon={<Person />} 
          />
          <Tab 
            label={
              <Badge badgeContent={solicitudesGestion.length} color="secondary">
                Solicitudes de Gestión
              </Badge>
            } 
            icon={<GroupAdd />} 
          />
        </Tabs>
      </Paper>

      {/* Contenido de las tabs */}
      {tabIndex === 0 && (
        <>
          {/* Lista de Solicitudes de Jugadores */}
          {solicitudes.length === 0 ? (
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <Alert severity="info">
            No hay solicitudes pendientes
          </Alert>
        </Paper>
      ) : (
        <Paper elevation={3} sx={{ p: 3 }}>
          <List>
            {solicitudes.map((solicitud, index) => (
              <React.Fragment key={solicitud.id}>
                {index > 0 && <Divider sx={{ my: 2 }} />}
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 1
                  }}
                >
                  <Box display="flex" width="100%" alignItems="center" mb={2}>
                    <ListItemAvatar>
                      <Avatar 
                        src={solicitud.jugadorFoto ? `http://localhost:5000${solicitud.jugadorFoto}` : ''}
                      >
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="h6">
                          {solicitud.jugadorNombre}
                        </Typography>
                      }
                      secondary={solicitud.jugadorEmail}
                    />
                    {solicitud.categoria && (
                      <Chip
                        label={solicitud.categoria}
                        size="small"
                        color="primary"
                      />
                    )}
                  </Box>

                  {solicitud.mensaje && (
                    <Box width="100%" mb={2} p={2} bgcolor="background.paper" borderRadius={1}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Mensaje:
                      </Typography>
                      <Typography variant="body2">
                        {solicitud.mensaje}
                      </Typography>
                    </Box>
                  )}

                  <Box width="100%" mb={1}>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de solicitud: {formatDate(solicitud.fechaSolicitud)}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={2} width="100%" alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Categoría *</InputLabel>
                      <Select
                        value={selectedCategoria[solicitud.id] || solicitud.categoria || ''}
                        label="Categoría *"
                        onChange={(e) =>
                          setSelectedCategoria({
                            ...selectedCategoria,
                            [solicitud.id]: e.target.value
                          })
                        }
                        placeholder="Selecciona una categoría"
                        required
                      >
                        {categorias.map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={() =>
                        handleResponderSolicitud(
                          solicitud.id,
                          'aceptada',
                          solicitud.jugadorNombre
                        )
                      }
                      disabled={!selectedCategoria[solicitud.id]}
                    >
                      Aceptar
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Cancel />}
                      onClick={() =>
                        handleResponderSolicitud(
                          solicitud.id,
                          'rechazada',
                          solicitud.jugadorNombre
                        )
                      }
                    >
                      Rechazar
                    </Button>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
          )}
        </>
      )}

      {tabIndex === 1 && (
        <>
          {/* Lista de Solicitudes de Gestión */}
          {solicitudesGestion.length === 0 ? (
            <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
              <Alert severity="info">
                No hay solicitudes de gestión pendientes
              </Alert>
            </Paper>
          ) : (
            <Paper elevation={3}>
              <List>
                {solicitudesGestion.map((solicitud, index) => (
                  <React.Fragment key={solicitud.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <GroupAdd />
                        </Avatar>
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={
                          <Box>
                            <Typography variant="h6" component="span">
                              {solicitud.managerNombre}
                            </Typography>
                            <Chip 
                              label="Manager" 
                              size="small" 
                              color="secondary" 
                              sx={{ ml: 1 }} 
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Quiere gestionar:</strong> {solicitud.equipoNombre}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Email:</strong> {solicitud.managerEmail}
                            </Typography>
                            {solicitud.mensaje && (
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ fontStyle: 'italic', mt: 1 }}
                              >
                                "{solicitud.mensaje}"
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              Solicitado el {formatDate(solicitud.fechaSolicitud)}
                            </Typography>
                          </Box>
                        }
                      />
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() =>
                            handleResponderSolicitudGestion(
                              solicitud.id,
                              'aceptada',
                              solicitud.managerNombre
                            )
                          }
                        >
                          Aceptar
                        </Button>
                        
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={() =>
                            handleResponderSolicitudGestion(
                              solicitud.id,
                              'rechazada',
                              solicitud.managerNombre
                            )
                          }
                        >
                          Rechazar
                        </Button>
                      </Box>
                    </ListItem>
                    
                    {index < solicitudesGestion.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </>
      )}
    </Container>
  );
};

export default GestionSolicitudes;

