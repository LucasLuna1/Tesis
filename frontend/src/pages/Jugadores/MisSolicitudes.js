import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,
  Stack,
  Paper,
  Divider,
  alpha,
  Zoom,
  Tooltip
} from '@mui/material';
import {
  Groups,
  Schedule,
  CheckCircle,
  Cancel,
  Pending,
  Message,
  Person,
  Delete,
  DeleteOutline,
  Info,
  Close,
  Warning
} from '@mui/icons-material';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MisSolicitudes = () => {
  const [solicitudesEquipos, setSolicitudesEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSolicitudes();
  }, []);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const equiposResponse = await api.get('/equipos/mis-solicitudes');
      
      setSolicitudesEquipos(Array.isArray(equiposResponse.data) ? equiposResponse.data : []);
    } catch (error) {
      setError('Error al cargar solicitudes');
      toast.error('Error al cargar solicitudes');
      setSolicitudesEquipos([]);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'aprobada':
        return 'success';
      case 'rechazada':
        return 'error';
      case 'pendiente':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'aprobada':
        return <CheckCircle />;
      case 'rechazada':
        return <Cancel />;
      case 'pendiente':
        return <Pending />;
      default:
        return <Pending />;
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  const handleVerDetalles = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setDeleteDialogOpen(true);
  };

  const handleEliminarSolicitud = async () => {
    if (!solicitudSeleccionada?.id) return;

    try {
      setDeleting(true);
      await api.delete(`/equipos/solicitud/${solicitudSeleccionada.id}`);
      
      toast.success('Solicitud eliminada');
      setDeleteDialogOpen(false);
      setSolicitudSeleccionada(null);
      
      // Actualizar lista local
      setSolicitudesEquipos(prev => prev.filter(s => s.id !== solicitudSeleccionada.id));
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al eliminar solicitud');
    } finally {
      setDeleting(false);
    }
  };

  const SolicitudCard = ({ solicitud, index }) => {
    const estadoColor = getEstadoColor(solicitud.estado);
    
    return (
      <Zoom in timeout={300 + (index * 100)}>
        <Card 
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '2px solid',
            borderColor: solicitud.estado === 'aprobada' ? 'success.main' :
                         solicitud.estado === 'rechazada' ? 'error.main' :
                         'warning.main',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6,
              '& .delete-button': {
                // En desktop, aparecer al hover
                opacity: { md: 1 },
                transform: { md: 'translateX(0)' }
              }
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: solicitud.estado === 'aprobada' ? 
                'linear-gradient(90deg, #4caf50 0%, #81c784 100%)' :
                solicitud.estado === 'rechazada' ?
                'linear-gradient(90deg, #f44336 0%, #e57373 100%)' :
                'linear-gradient(90deg, #ff9800 0%, #ffb74d 100%)'
            }
          }}
        >
          <CardContent sx={{ p: 3 }}>
            {/* Header con equipo y estado */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: `${estadoColor}.main`,
                    width: 48,
                    height: 48
                  }}
                >
                  <Groups />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {solicitud.equipoNombre}
                  </Typography>
                  {solicitud.posicion && (
                    <Typography variant="caption" color="text.secondary">
                      {solicitud.posicion}
                    </Typography>
                  )}
                </Box>
              </Stack>

              <Chip
                icon={getEstadoIcon(solicitud.estado)}
                label={getEstadoText(solicitud.estado)}
                color={getEstadoColor(solicitud.estado)}
                sx={{ 
                  fontWeight: 'bold',
                  height: 32
                }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Información */}
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Enviada: {new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', { 
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Typography>
              </Box>

              {solicitud.fechaRespuesta && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Respondida: {new Date(solicitud.fechaRespuesta).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Typography>
                </Box>
              )}

              {solicitud.mensaje && (
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    bgcolor: alpha('#2196f3', 0.05),
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha('#2196f3', 0.1)
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                    <Message sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="caption" fontWeight="bold" color="primary">
                      Tu mensaje:
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {solicitud.mensaje}
                  </Typography>
                </Paper>
              )}

              {solicitud.respuesta && (
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    bgcolor: alpha(
                      solicitud.estado === 'aprobada' ? '#4caf50' : '#f44336', 
                      0.05
                    ),
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha(
                      solicitud.estado === 'aprobada' ? '#4caf50' : '#f44336', 
                      0.2
                    )
                  }}
                >
                  <Typography variant="caption" fontWeight="bold" gutterBottom display="block">
                    Respuesta del equipo:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {solicitud.respuesta}
                  </Typography>
                </Paper>
              )}
            </Stack>

            {/* Botones de acción */}
            <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Info />}
                onClick={() => handleVerDetalles(solicitud)}
                fullWidth
              >
                Ver Detalles
              </Button>
              
              <Tooltip title="Eliminar de la lista">
                <IconButton
                  className="delete-button"
                  size="small"
                  color="error"
                  onClick={() => handleOpenDeleteDialog(solicitud)}
                  sx={{
                    // Siempre visible en móvil, oculto en desktop (hasta hover)
                    opacity: { xs: 1, md: 0 },
                    transform: { xs: 'translateX(0)', md: 'translateX(10px)' },
                    transition: 'all 0.3s',
                    bgcolor: { xs: alpha('#f44336', 0.1), md: 'transparent' },
                    '&:hover': {
                      bgcolor: alpha('#f44336', 0.15),
                      transform: 'translateX(0) scale(1.1)'
                    }
                  }}
                >
                  <DeleteOutline />
                </IconButton>
              </Tooltip>
            </Stack>
          </CardContent>
        </Card>
      </Zoom>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
          Cargando solicitudes...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, pb: 10 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 800,
            background: 'linear-gradient(45deg, #1976d2 30%, #9c27b0 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Mis Solicitudes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona tus solicitudes para unirte a equipos
        </Typography>
      </Box>

      {solicitudesEquipos.length === 0 ? (
        <Paper 
          elevation={0}
          sx={{ 
            textAlign: 'center', 
            py: 10,
            borderRadius: 4,
            border: '2px dashed',
            borderColor: 'divider',
            background: `linear-gradient(135deg, ${alpha('#2196f3', 0.03)} 0%, ${alpha('#9c27b0', 0.03)} 100%)`
          }}
        >
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
            <Message sx={{ fontSize: 60, color: 'primary.main' }} />
          </Box>
          
          <Typography variant="h5" gutterBottom fontWeight="bold">
            No tienes solicitudes
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Ve a la sección de equipos para enviar tu primera solicitud
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<Groups />}
            onClick={() => window.location.href = '/equipos'}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontWeight: 'bold'
            }}
          >
            Explorar Equipos
          </Button>
        </Paper>
      ) : (
        <>
          {/* Resumen */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: alpha('#2196f3', 0.05)
                }}
              >
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {solicitudesEquipos.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: alpha('#ff9800', 0.05)
                }}
              >
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {solicitudesEquipos.filter(s => s.estado === 'pendiente').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pendientes
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: alpha('#4caf50', 0.05)
                }}
              >
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {solicitudesEquipos.filter(s => s.estado === 'aprobada').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Aprobadas
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: alpha('#f44336', 0.05)
                }}
              >
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {solicitudesEquipos.filter(s => s.estado === 'rechazada').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Rechazadas
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Lista de solicitudes */}
          <Grid container spacing={3}>
            {solicitudesEquipos.map((solicitud, index) => (
              <Grid item xs={12} md={6} key={solicitud.id}>
                <SolicitudCard solicitud={solicitud} index={index} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Dialog de detalles mejorado */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <Box sx={{ 
          background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
          p: 3,
          position: 'relative'
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                <Info sx={{ color: 'white' }} />
              </Avatar>
              <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                Detalles de Solicitud
              </Typography>
            </Stack>
            <IconButton 
              onClick={() => setDialogOpen(false)}
              sx={{ color: 'white' }}
            >
              <Close />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent sx={{ pt: 3 }}>
          {solicitudSeleccionada && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  EQUIPO
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {solicitudSeleccionada.equipoNombre}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  ESTADO
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    icon={getEstadoIcon(solicitudSeleccionada.estado)}
                    label={getEstadoText(solicitudSeleccionada.estado)}
                    color={getEstadoColor(solicitudSeleccionada.estado)}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  FECHA DE SOLICITUD
                </Typography>
                <Typography variant="body1">
                  {new Date(solicitudSeleccionada.fechaSolicitud).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              </Box>

              {solicitudSeleccionada.fechaRespuesta && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    FECHA DE RESPUESTA
                  </Typography>
                  <Typography variant="body1">
                    {new Date(solicitudSeleccionada.fechaRespuesta).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Box>
              )}

              {solicitudSeleccionada.posicion && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    POSICIÓN SOLICITADA
                  </Typography>
                  <Typography variant="body1">
                    {solicitudSeleccionada.posicion}
                  </Typography>
                </Box>
              )}

              {solicitudSeleccionada.mensaje && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    TU MENSAJE
                  </Typography>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      mt: 1,
                      bgcolor: alpha('#2196f3', 0.05),
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: alpha('#2196f3', 0.1)
                    }}
                  >
                    <Typography variant="body2">
                      {solicitudSeleccionada.mensaje}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {solicitudSeleccionada.respuesta && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    RESPUESTA DEL EQUIPO
                  </Typography>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      mt: 1,
                      bgcolor: alpha(
                        solicitudSeleccionada.estado === 'aprobada' ? '#4caf50' : '#f44336',
                        0.08
                      ),
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: alpha(
                        solicitudSeleccionada.estado === 'aprobada' ? '#4caf50' : '#f44336',
                        0.3
                      )
                    }}
                  >
                    <Typography variant="body2" fontWeight="500">
                      {solicitudSeleccionada.respuesta}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} size="large">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <Box sx={{ 
          background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
          p: 3
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Delete sx={{ color: 'white', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                ¿Eliminar Solicitud?
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Se eliminará de tu lista permanentemente
              </Typography>
            </Box>
          </Stack>
        </Box>

        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="body2">
              Esta acción solo elimina la solicitud de tu vista. 
              {solicitudSeleccionada?.estado === 'pendiente' && ' El equipo dejará de ver tu solicitud.'}
            </Typography>
          </Alert>

          {solicitudSeleccionada && (
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                {solicitudSeleccionada.equipoNombre}
              </Typography>
              <Chip
                icon={getEstadoIcon(solicitudSeleccionada.estado)}
                label={getEstadoText(solicitudSeleccionada.estado)}
                color={getEstadoColor(solicitudSeleccionada.estado)}
                size="small"
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 3, bgcolor: alpha('#f5f5f5', 0.5) }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            size="large"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEliminarSolicitud}
            disabled={deleting}
            variant="contained"
            color="error"
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <Delete />}
            size="large"
            sx={{ px: 3 }}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MisSolicitudes;
