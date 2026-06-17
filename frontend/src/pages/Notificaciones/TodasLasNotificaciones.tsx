import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  MarkEmailRead as MarkEmailReadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './TodasLasNotificaciones.css';

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

const TodasLasNotificaciones: React.FC = () => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    cargarTodasLasNotificaciones();
  }, []);

  const cargarTodasLasNotificaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/notificaciones?limit=50'); // Cargar más notificaciones
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

  const marcarTodasComoLeidas = async () => {
    try {
      setMarcandoTodas(true);
      await api.patch('/notificaciones/marcar-todas-leidas');
      setNotificaciones(prev =>
        prev.map(notif => ({ ...notif, leida: true }))
      );
    } catch (err: any) {
      console.error('Error al marcar todas como leídas:', err);
    } finally {
      setMarcandoTodas(false);
    }
  };

  const handleNotificacionClick = (notificacion: Notificacion) => {
    if (!notificacion.leida) {
      marcarComoLeida(notificacion.id);
    }
    
    // Navegar según el tipo de notificación
    if (notificacion.tipo === 'nuevo_seguidor' && notificacion.data?.seguidorId) {
      navigate(`/jugadores/${notificacion.data.seguidorId}`);
    } else if ((notificacion.tipo === 'noticia_general' || notificacion.tipo === 'noticia_equipo') && notificacion.data?.noticiaId) {
      navigate(`/noticias/${notificacion.data.noticiaId}`);
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

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'nuevo_seguidor': return '👥';
      case 'partido': return '⚽';
      case 'sancion': return '⚠️';
      case 'recordatorio': return '🔔';
      case 'noticia_equipo': return '📰';
      case 'general': return '📢';
      default: return '🔔';
    }
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <Box className="todas-notificaciones-page">
      <Container maxWidth="md" className="notifications-container">
        {notificacionesNoLeidas > 0 && (
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<MarkEmailReadIcon />}
              onClick={marcarTodasComoLeidas}
              disabled={marcandoTodas}
              className="mark-all-button"
            >
              {marcandoTodas ? 'Marcando...' : `Marcar todas como leídas (${notificacionesNoLeidas})`}
            </Button>
          </Box>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : notificaciones.length === 0 ? (
          <Box p={4} textAlign="center">
            <NotificationsIcon className="empty-icon" />
            <Typography variant="h6" className="empty-title">
              No tienes notificaciones
            </Typography>
            <Typography variant="body2" className="empty-subtitle">
              Cuando recibas notificaciones, aparecerán aquí
            </Typography>
          </Box>
        ) : (
          <Paper className="notifications-paper">
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
                        src={getAvatarSrc(notificacion) || undefined}
                        className={`notification-avatar ${notificacion.leida ? 'read' : 'unread'}`}
                      >
                        {getAvatarFallback(notificacion)}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          <Typography
                            variant="body1"
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
                          {!notificacion.leida && (
                            <Box className="unread-dot" />
                          )}
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
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default TodasLasNotificaciones;
