import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Chip,
  Grid
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  MarkEmailRead as MarkEmailReadIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import NotificacionSeguidor from '../components/Notificaciones/NotificacionSeguidor';

interface NotificacionSeguidor {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  data: {
    seguidorId: string;
    seguidorNombre: string;
    equipoId: string;
    equipoNombre: string;
    seguimientoId: string;
  };
}

const NotificacionesSeguidores: React.FC = () => {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState<NotificacionSeguidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/notificaciones/tipo/nuevo_seguidor');
      setNotificaciones(response.data.notificaciones || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar notificaciones de seguidores');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeida = async (id: string) => {
    try {
      await api.patch(`/notificaciones/${id}/marcar-leida`);
      setNotificaciones(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, leida: true } : notif
        )
      );
    } catch (err: any) {
      console.error('Error al marcar como leída:', err);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      await api.patch('/notificaciones/marcar-todas-leidas');
      setNotificaciones(prev => 
        prev.map(notif => ({ ...notif, leida: true }))
      );
    } catch (err: any) {
      console.error('Error al marcar todas como leídas:', err);
    }
  };

  const verPerfilSeguidor = (seguidorId: string) => {
    navigate(`/jugadores/${seguidorId}`);
  };

  const verEquipo = (equipoId: string) => {
    navigate(`/equipos/${equipoId}/jugadores`);
  };

  const notificacionesFiltradas = notificaciones.filter(notif => {
    if (tabValue === 0) return true; // Todas
    if (tabValue === 1) return !notif.leida; // No leídas
    return true;
  });

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Notificaciones de Seguidores
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Ve quién está siguiendo a tu equipo
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <IconButton onClick={cargarNotificaciones} size="small">
              <RefreshIcon />
            </IconButton>
            {notificacionesNoLeidas > 0 && (
              <Button
                variant="outlined"
                startIcon={<MarkEmailReadIcon />}
                onClick={marcarTodasComoLeidas}
                size="small"
              >
                Marcar todas como leídas
              </Button>
            )}
          </Box>
        </Box>

        <Box display="flex" gap={2} alignItems="center" mb={3}>
          <Chip
            icon={<PersonAddIcon />}
            label={`${notificaciones.length} notificaciones`}
            color="primary"
            variant="outlined"
          />
          {notificacionesNoLeidas > 0 && (
            <Chip
              label={`${notificacionesNoLeidas} no leídas`}
              color="error"
              variant="filled"
            />
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label={`Todas (${notificaciones.length})`} />
        <Tab label={`No leídas (${notificacionesNoLeidas})`} />
      </Tabs>

      {notificacionesFiltradas.length === 0 ? (
        <Box textAlign="center" py={6}>
          <PersonAddIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {tabValue === 1 ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones de seguidores'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tabValue === 1 
              ? 'Todas tus notificaciones han sido leídas'
              : 'Cuando alguien empiece a seguir a tu equipo, aparecerá aquí'
            }
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {notificacionesFiltradas.map((notificacion) => (
            <Grid item xs={12} key={notificacion.id}>
              <NotificacionSeguidor
                notificacion={notificacion}
                onVerPerfil={verPerfilSeguidor}
                onVerEquipo={verEquipo}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default NotificacionesSeguidores;

