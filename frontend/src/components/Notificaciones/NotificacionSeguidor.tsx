import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Button,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificacionSeguidorProps {
  notificacion: {
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
  };
  onVerPerfil?: (seguidorId: string) => void;
  onVerEquipo?: (equipoId: string) => void;
}

const NotificacionSeguidor: React.FC<NotificacionSeguidorProps> = ({
  notificacion,
  onVerPerfil,
  onVerEquipo
}) => {
  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
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
  };

  return (
    <Card 
      sx={{ 
        mb: 2,
        border: notificacion.leida ? 'none' : '2px solid',
        borderColor: notificacion.leida ? 'transparent' : 'primary.main',
        bgcolor: notificacion.leida ? 'transparent' : 'action.hover'
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <PersonAddIcon />
          </Avatar>
          <Box flex={1}>
            <Typography 
              variant="h6" 
              fontWeight={notificacion.leida ? 'normal' : 'bold'}
              color="primary"
            >
              {notificacion.titulo}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatFecha(notificacion.fecha)}
            </Typography>
          </Box>
          <Chip 
            label="Nuevo seguidor" 
            color="secondary" 
            size="small"
            icon={<PersonAddIcon />}
          />
        </Box>

        <Typography variant="body1" mb={2}>
          {notificacion.mensaje}
        </Typography>

        <Box 
          display="flex" 
          gap={1} 
          flexWrap="wrap" 
          alignItems="center"
          p={2}
          bgcolor="grey.50"
          borderRadius={1}
        >
          <Typography variant="body2" color="text.secondary">
            <strong>Seguidor:</strong> {notificacion.data.seguidorNombre}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Equipo:</strong> {notificacion.data.equipoNombre}
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box display="flex" gap={1}>
          {onVerPerfil && (
            <Button
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={() => onVerPerfil(notificacion.data.seguidorId)}
              variant="outlined"
            >
              Ver perfil
            </Button>
          )}
          {onVerEquipo && (
            <Button
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={() => onVerEquipo(notificacion.data.equipoId)}
              variant="outlined"
            >
              Ver equipo
            </Button>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};

export default NotificacionSeguidor;

