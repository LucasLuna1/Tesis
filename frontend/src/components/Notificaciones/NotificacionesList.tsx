import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../services/api';

interface Notificacion {
  id: string;
  tipo: 'partido' | 'sancion' | 'recordatorio' | 'general' | 'noticia_equipo' | 'noticia_general' | 'nuevo_seguidor';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  prioridad: 'alta' | 'normal' | 'baja';
  data?: any;
}

interface NotificacionesListProps {
  onClose?: () => void;
}

const NotificacionesList: React.FC<NotificacionesListProps> = ({ onClose }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null
  });

  const tabs = useMemo(() => [
    { label: 'Todas', value: 0, filter: null },
    { label: 'No leídas', value: 1, filter: 'no-leidas' },
    { label: 'Partidos', value: 2, filter: 'partido' },
    { label: 'Sanciones', value: 3, filter: 'sancion' },
    { label: 'Recordatorios', value: 4, filter: 'recordatorio' },
    { label: 'Seguidores', value: 5, filter: 'nuevo_seguidor' },
    { label: 'Noticias', value: 6, filter: 'noticia_general' }
  ], []);

  const cargarNotificaciones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filtro = tabs[tabValue].filter;
      let endpoint = '/notificaciones';
      
      if (filtro === 'no-leidas') {
        endpoint = '/notificaciones/no-leidas';
      } else if (filtro) {
        endpoint = `/notificaciones/tipo/${filtro}`;
      }

      const response = await api.get(endpoint);
      setNotificaciones(response.data.notificaciones || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar notificaciones');
      setNotificaciones([]);
    } finally {
      setLoading(false);
    }
  }, [tabValue, tabs]);

  useEffect(() => {
    cargarNotificaciones();
  }, [tabValue, cargarNotificaciones]);

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

  const eliminarNotificacion = async (id: string) => {
    try {
      await api.delete(`/notificaciones/${id}`);
      setNotificaciones(prev => prev.filter(notif => notif.id !== id));
      setDeleteDialog({ open: false, id: null });
    } catch (err: any) {
      console.error('Error al eliminar notificación:', err);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'partido': return 'primary';
      case 'sancion': return 'error';
      case 'recordatorio': return 'warning';
      case 'noticia_equipo': return 'success';
      case 'noticia_general': return 'info';
      case 'nuevo_seguidor': return 'secondary';
      case 'general': return 'info';
      default: return 'default';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'error';
      case 'normal': return 'default';
      case 'baja': return 'success';
      default: return 'default';
    }
  };

  const formatFecha = (fecha: string) => {
    try {
      // Manejar diferentes formatos de fecha
      let date: Date;
      
      if (typeof fecha === 'string') {
        // Si es un string, intentar parsearlo
        date = new Date(fecha);
      } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
        // Si es un Timestamp de Firestore
        date = (fecha as any).toDate();
      } else {
        // Fallback a fecha actual
        date = new Date();
      }
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return 'Fecha no válida';
      }
      
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        return 'Hace unos minutos';
      } else if (diffInHours < 24) {
        return `Hace ${Math.floor(diffInHours)} horas`;
      } else if (diffInHours < 48) {
        return 'Ayer';
      } else {
        return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
      }
    } catch (error) {
      console.error('Error formateando fecha:', error, 'Fecha original:', fecha);
      return 'Fecha no válida';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Notificaciones
        </Typography>
        <Box>
          <IconButton onClick={cargarNotificaciones} size="small">
            <RefreshIcon />
          </IconButton>
          {notificaciones.some(n => !n.leida) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MarkEmailReadIcon />}
              onClick={marcarTodasComoLeidas}
              sx={{ ml: 1 }}
            >
              Marcar todas como leídas
            </Button>
          )}
        </Box>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} />
        ))}
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {notificaciones.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={3}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No hay notificaciones
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tabValue === 1 ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones en esta categoría'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <List>
          {notificaciones.map((notificacion, index) => (
            <React.Fragment key={notificacion.id}>
              <ListItem
                sx={{
                  bgcolor: notificacion.leida ? 'transparent' : 'action.hover',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={notificacion.leida ? 'normal' : 'bold'}
                      >
                        {notificacion.titulo}
                      </Typography>
                      {!notificacion.leida && (
                        <Badge color="primary" variant="dot" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {notificacion.mensaje}
                      </Typography>
                      <Box display="flex" gap={1} alignItems="center">
                        <Chip
                          label={notificacion.tipo}
                          size="small"
                          color={getTipoColor(notificacion.tipo) as any}
                        />
                        <Chip
                          label={notificacion.prioridad}
                          size="small"
                          color={getPrioridadColor(notificacion.prioridad) as any}
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatFecha(notificacion.fecha)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box display="flex" gap={0.5}>
                    {!notificacion.leida && (
                      <IconButton
                        size="small"
                        onClick={() => marcarComoLeida(notificacion.id)}
                        title="Marcar como leída"
                      >
                        <MarkEmailReadIcon />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => setDeleteDialog({ open: true, id: notificacion.id })}
                      title="Eliminar"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              {index < notificaciones.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
      >
        <DialogTitle>Eliminar notificación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar esta notificación? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>
            Cancelar
          </Button>
          <Button
            onClick={() => deleteDialog.id && eliminarNotificacion(deleteDialog.id)}
            color="error"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificacionesList;
