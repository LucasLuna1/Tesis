import React, { useState, useEffect } from 'react';
import {
  SwipeableDrawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './NotificacionesSidebar.css';
import { onMessage, messaging } from '../../config/firebase';

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

interface NotificacionesSidebarProps {
  open: boolean;
  onClose: () => void;
  onVerUsuario?: (usuarioId: string) => void;
}

const NotificacionesSidebar: React.FC<NotificacionesSidebarProps> = ({
  open,
  onClose,
  onVerUsuario
}) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      cargarNotificaciones();
    }
  }, [open]);

  // Escucha en tiempo real de mensajes push (cuando la app está en primer plano)
  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      const nueva = {
        id: payload.data?.notificacionId || Date.now().toString(),
        tipo: (payload.data?.tipo as any) || 'general',
        titulo: payload.notification?.title || 'Nueva notificación',
        mensaje: payload.notification?.body || '',
        fecha: new Date().toISOString(),
        leida: false,
        prioridad: 'normal',
        data: payload.data || {}
      } as Notificacion;
      setNotificaciones(prev => [nueva, ...prev]);
    });
    return () => unsubscribe();
  }, []);

  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/notificaciones?limit=20');
      setNotificaciones(response.data.notificaciones || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar notificaciones');
      setNotificaciones([]);
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

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'nuevo_seguidor': return '👥';
      case 'partido': return '⚽';
      case 'sancion': return '⚠️';
      case 'recordatorio': return '🔔';
      case 'noticia_equipo': return '📰';
      case 'noticia_general': return '📰';
      case 'general': return '📢';
      default: return '🔔';
    }
  };

  const formatFecha = (fecha: string) => {
    try {
      let date: Date;
      
      if (typeof fecha === 'string') {
        date = new Date(fecha);
      } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
        date = (fecha as any).toDate();
      } else {
        date = new Date();
      }
      
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

  const handleNotificacionClick = async (notificacion: Notificacion) => {
    // Marcar como leída si no lo está
    if (!notificacion.leida) {
      await marcarComoLeida(notificacion.id);
    }

    // Navegar según el tipo de notificación
    if (notificacion.tipo === 'nuevo_seguidor' && notificacion.data?.seguidorId && onVerUsuario) {
      onVerUsuario(notificacion.data.seguidorId);
    } else if ((notificacion.tipo === 'noticia_general' || notificacion.tipo === 'noticia_equipo') && notificacion.data?.noticiaId) {
      navigate(`/noticias/${notificacion.data.noticiaId}`);
      onClose();
    }
  };

  const getAvatarSrc = (notificacion: Notificacion) => {
    if (notificacion.tipo === 'nuevo_seguidor' && notificacion.data?.seguidorFoto) {
      return notificacion.data.seguidorFoto;
    }
    return null;
  };

  const getAvatarFallback = (notificacion: Notificacion) => {
    if (notificacion.tipo === 'nuevo_seguidor' && notificacion.data?.seguidorNombre) {
      return notificacion.data.seguidorNombre.charAt(0).toUpperCase();
    }
    return getTipoIcon(notificacion.tipo);
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      className="notificaciones-sidebar"
      transitionDuration={{ enter: 200, exit: 200 }}
      swipeAreaWidth={20}
      ModalProps={{
        keepMounted: true,
        closeAfterTransition: true,
        style: { zIndex: 1400 },
      }}
      PaperProps={{
        style: { zIndex: 1400 },
      }}
    >
      <Box className="sidebar-header">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div" className="sidebar-title">
             Notificaciones
          </Typography>
          <IconButton onClick={onClose} size="small" className="close-button">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box className="sidebar-content">
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : notificaciones.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography className="empty-message">
              No tienes notificaciones
            </Typography>
          </Box>
        ) : (
          <List className="notifications-list">
            {notificaciones.map((notificacion, index) => (
              <React.Fragment key={notificacion.id}>
                <ListItem
                  button
                  onClick={() => handleNotificacionClick(notificacion)}
                  className={`notification-item ${notificacion.leida ? 'read' : 'unread'}`}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={getAvatarSrc(notificacion)}
                      className={`notification-avatar ${notificacion.leida ? 'read' : 'unread'}`}
                    >
                      {getAvatarFallback(notificacion)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body2"
                          className={`notification-title ${notificacion.leida ? 'read' : 'unread'}`}
                        >
                          {notificacion.titulo}
                        </Typography>
                        <Chip
                          label={notificacion.tipo.replace('_', ' ')}
                          size="small"
                          color={getTipoColor(notificacion.tipo) as any}
                          variant="outlined"
                          className="notification-chip"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="body2"
                          className={`notification-message ${notificacion.leida ? 'read' : 'unread'}`}
                        >
                          {notificacion.mensaje}
                        </Typography>
                        <Typography variant="caption" className="notification-time">
                          {formatFecha(notificacion.fecha)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < notificaciones.length - 1 && <Divider className="notification-divider" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

             <Box className="sidebar-footer">
               <Button
                 fullWidth
                 variant="outlined"
                 startIcon={<NotificationsIcon />}
                 className="view-all-button"
                 onClick={() => {
                   navigate('/notificaciones');
                   onClose();
                 }}
               >
                 Ver todas las notificaciones
               </Button>
             </Box>
    </SwipeableDrawer>
  );
};

export default NotificacionesSidebar;
