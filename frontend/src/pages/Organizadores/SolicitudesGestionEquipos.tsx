import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Grid,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  GroupAdd,
  Email,
  Phone
} from '@mui/icons-material';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { construirUrlImagen } from '../../utils/imageUtils';

interface SolicitudGestion {
  id: string;
  equipoId: string;
  equipoNombre: string;
  equipoLogo: string;
  managerId: string;
  managerNombre: string;
  managerEmail: string;
  managerFoto: string;
  mensaje: string;
  telefono: string;
  estado: string;
  fechaSolicitud: any;
}

const SolicitudesGestionEquipos: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<SolicitudGestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/organizadores/solicitudes-gestion-equipos');
      setSolicitudes(response.data.solicitudes || []);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      toast.error('Error al cargar solicitudes de gestión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const handleResponder = async (solicitudId: string, respuesta: 'aceptada' | 'rechazada') => {
    try {
      setRespondiendo(solicitudId);
      await api.post(`/organizadores/solicitudes-gestion-equipos/${solicitudId}/responder`, {
        respuesta
      });
      
      toast.success(respuesta === 'aceptada' ? 'Solicitud aceptada correctamente' : 'Solicitud rechazada');
      cargarSolicitudes();
    } catch (error: any) {
      console.error('Error respondiendo solicitud:', error);
      toast.error(error.response?.data?.error || 'Error al responder solicitud');
    } finally {
      setRespondiendo(null);
    }
  };

  const formatearFecha = (fecha: any) => {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      let date;
      if (fecha.seconds) {
        date = new Date(fecha.seconds * 1000);
      } else if (fecha._seconds) {
        date = new Date(fecha._seconds * 1000);
      } else {
        date = new Date(fecha);
      }
      
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Solicitudes de Gestión de Equipos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Managers solicitando gestionar equipos existentes
        </Typography>
      </Box>

      {solicitudes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <GroupAdd sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No hay solicitudes de gestión pendientes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Las solicitudes de managers aparecerán aquí
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {solicitudes.map((solicitud) => (
            <Grid item xs={12} key={solicitud.id}>
              <Card elevation={2}>
                <CardContent>
                  <Grid container spacing={3}>
                    {/* Información del Manager */}
                    <Grid item xs={12} md={5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={solicitud.managerFoto ? construirUrlImagen(solicitud.managerFoto) : undefined}
                          sx={{ width: 64, height: 64, mr: 2 }}
                        >
                          {solicitud.managerNombre.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {solicitud.managerNombre}
                          </Typography>
                          <Chip label="Manager" size="small" color="primary" sx={{ mt: 0.5 }} />
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Email sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {solicitud.managerEmail}
                        </Typography>
                      </Box>

                      {solicitud.telefono && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Phone sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {solicitud.telefono}
                          </Typography>
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                        Solicitado el {formatearFecha(solicitud.fechaSolicitud)}
                      </Typography>
                    </Grid>

                    {/* Información del Equipo */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Quiere gestionar:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={solicitud.equipoLogo ? construirUrlImagen(solicitud.equipoLogo) : undefined}
                          sx={{ width: 48, height: 48, mr: 2 }}
                        >
                          {solicitud.equipoNombre.charAt(0)}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {solicitud.equipoNombre}
                        </Typography>
                      </Box>

                      {solicitud.mensaje && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Mensaje:
                          </Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                            "{solicitud.mensaje}"
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    {/* Acciones */}
                    <Grid item xs={12} md={3}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', justifyContent: 'center' }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleResponder(solicitud.id, 'aceptada')}
                          disabled={respondiendo === solicitud.id}
                        >
                          {respondiendo === solicitud.id ? 'Procesando...' : 'Aceptar'}
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => handleResponder(solicitud.id, 'rechazada')}
                          disabled={respondiendo === solicitud.id}
                        >
                          Rechazar
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default SolicitudesGestionEquipos;


