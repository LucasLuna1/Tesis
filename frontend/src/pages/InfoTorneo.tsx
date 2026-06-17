import { asText } from '../utils/text';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Avatar,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  CalendarToday,
  LocationOn,
  People,
  EmojiEvents,
  SportsRugby,
  Person
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { torneosService } from '../services/api';

interface Torneo {
  id: string;
  nombre: string;
  categoria: string;
  organizadorNombre?: string;
  fechaInicio: any;
  fechaFin: any;
  equipos?: any[];
  partidosJugados?: number;
  partidosPendientes?: number;
  ubicaciones?: string[];
  formato?: string;
}

interface Estadisticas {
  totalTries?: number;
  promedioTriesPorPartido?: number;
  equipoMasAnotador?: string;
  mejorDefensa?: string;
}

const InfoTorneo: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { darkMode } = useTheme();

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Función para formatear fechas
  const formatearFecha = (fecha: any): string => {
    if (!fecha) return 'Fecha no disponible';
    try {
      let date: Date;
      
      // Si es un objeto Timestamp de Firestore
      if (fecha.seconds) {
        date = new Date(fecha.seconds * 1000);
      }
      // Si es un objeto con _seconds (otro formato de Firestore)
      else if (fecha._seconds) {
        date = new Date(fecha._seconds * 1000);
      }
      // Si es una fecha en formato string o Date
      else {
        date = new Date(fecha);
      }
      
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para formatear el estado del torneo
  const formatearEstado = (estado: string): string => {
    const estados: { [key: string]: string } = {
      'en_curso': 'En Curso',
      'programado': 'Programado',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado',
      'pausado': 'Pausado',
      'pendiente': 'Pendiente'
    };
    return estados[estado] || estado;
  };

  useEffect(() => {
    const cargarDatos = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Cargar datos del torneo
        const torneoResponse = await torneosService.getById(id);
        const torneoData = (torneoResponse.data as any)?.torneo || torneoResponse.data;
        setTorneo(torneoData);

        // Cargar estadísticas del torneo
        try {
          const estadisticasResponse = await torneosService.getEstadisticas(id);
          setEstadisticas(estadisticasResponse.data as Estadisticas);
        } catch (error) {

          setEstadisticas({
            totalTries: 0,
            promedioTriesPorPartido: 0,
            equipoMasAnotador: 'N/A',
            mejorDefensa: 'N/A'
          });
        }
        
      } catch (error) {
        console.error('Error cargando datos del torneo:', error);
        setError('Error cargando información del torneo');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !torneo) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Alert severity="error">
          {error || 'Torneo no encontrado'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5',
      pb: 8
    }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: darkMode ? '#1e1e1e' : 'white', 
        px: 2, 
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        borderBottom: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
      }}>
        <IconButton onClick={() => navigate(`/torneos/${id}`)} sx={{ mr: 1 }}>
          <ArrowBack sx={{ color: '#2196f3' }} />
        </IconButton>
        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
          Información del Torneo
        </Typography>
      </Box>

      <Container maxWidth="sm" sx={{ px: 2, py: 3 }}>
        {/* Info principal */}
        <Paper sx={{ 
          p: 3, 
          mb: 3, 
          bgcolor: darkMode ? '#1e1e1e' : 'white',
          textAlign: 'center'
          
        }}>
          <Avatar 
            sx={{ 
              width: 80, 
              height: 80, 
              mx: 'auto', 
              mb: 2,
              bgcolor: '#1976d2'
            }}
          >
            <EmojiEvents sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography variant="h5" sx={{ 
            color: darkMode ? '#e0e0e0' : '#424242', 
            fontWeight: 'bold',
            mb: 1
          }}>
            {torneo.nombre}
          </Typography>
          
          <Chip 
            label={asText(torneo.categoria)} 
            color="primary"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <Person sx={{ fontSize: 18, color: darkMode ? '#b0b0b0' : '#757575' }} />
            <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
              Organizado por: {torneo.organizadorNombre || 'Organizador'}
            </Typography>
          </Box>
        </Paper>

        {/* Detalles del torneo */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: darkMode ? '#1e1e1e' : 'white' }}>
          <Typography variant="subtitle2" sx={{ 
            color: darkMode ? '#b0b0b0' : '#757575', 
            mb: 2,
            fontWeight: 600
          }}>
            DETALLES
          </Typography>

          <List sx={{ p: 0 }}>
            <ListItem sx={{ px: 0, py: 1 }}>
              <CalendarToday sx={{ fontSize: 20, mr: 1.5, color: darkMode ? '#b0b0b0' : '#757575' }} />
              <ListItemText 
                primary="Fecha de Inicio"
                secondary={formatearFecha(torneo.fechaInicio)}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: { color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 600 }
                }}
                secondaryTypographyProps={{
                  sx: { color: darkMode ? '#b0b0b0' : '#757575' }
                }}
              />
            </ListItem>

            <ListItem sx={{ px: 0, py: 1 }}>
              <CalendarToday sx={{ fontSize: 20, mr: 1.5, color: darkMode ? '#b0b0b0' : '#757575' }} />
              <ListItemText 
                primary="Fecha de Finalización"
                secondary={formatearFecha(torneo.fechaFin)}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: { color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 600 }
                }}
                secondaryTypographyProps={{
                  sx: { color: darkMode ? '#b0b0b0' : '#757575' }
                }}
              />
            </ListItem>

            <ListItem sx={{ px: 0, py: 1 }}>
              <People sx={{ fontSize: 20, mr: 1.5, color: darkMode ? '#b0b0b0' : '#757575' }} />
              <ListItemText 
                primary="Equipos Participantes"
                secondary={`${torneo.equipos?.length || 0} equipos`}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: { color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 600 }
                }}
                secondaryTypographyProps={{
                  sx: { color: darkMode ? '#b0b0b0' : '#757575' }
                }}
              />
            </ListItem>

            <ListItem sx={{ px: 0, py: 1 }}>
              <SportsRugby sx={{ fontSize: 20, mr: 1.5, color: darkMode ? '#b0b0b0' : '#757575' }} />
              <ListItemText 
                primary="Formato"
                secondary={torneo.formato}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: { color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 600 }
                }}
                secondaryTypographyProps={{
                  sx: { color: darkMode ? '#b0b0b0' : '#757575' }
                }}
              />
            </ListItem>
          </List>
        </Paper>

        {/* Progreso */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: darkMode ? '#1e1e1e' : 'white' }}>
          <Typography variant="subtitle2" sx={{ 
            color: darkMode ? '#b0b0b0' : '#757575', 
            mb: 2,
            fontWeight: 600
          }}>
            PROGRESO
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                {torneo.partidosJugados || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                Jugados
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                {torneo.partidosPendientes || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                Pendientes
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
                {(torneo.partidosJugados || 0) + (torneo.partidosPendientes || 0)}
              </Typography>
              <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                Total
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Estadísticas */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: darkMode ? '#1e1e1e' : 'white' }}>
          <Typography variant="subtitle2" sx={{ 
            color: darkMode ? '#b0b0b0' : '#757575', 
            mb: 2,
            fontWeight: 600
          }}>
            ESTADÍSTICAS DESTACADAS
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
                Total de Tries
              </Typography>
              <Typography variant="body2" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
                {estadisticas?.totalTries || 0}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
                Promedio por Partido
              </Typography>
              <Typography variant="body2" sx={{ color: darkMode ? '#e0e0e0' : '#424242', fontWeight: 'bold' }}>
                {estadisticas?.promedioTriesPorPartido || 0}
              </Typography>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
                Equipo Más Anotador
              </Typography>
              <Chip 
                label={estadisticas?.equipoMasAnotador || 'N/A'}
                size="small"
                color="success"
                sx={{ height: 24 }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
                Mejor Defensa
              </Typography>
              <Chip 
                label={estadisticas?.mejorDefensa || 'N/A'}
                size="small"
                color="primary"
                sx={{ height: 24 }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Ubicaciones */}
        <Paper sx={{ p: 2, bgcolor: darkMode ? '#1e1e1e' : 'white' }}>
          <Typography variant="subtitle2" sx={{ 
            color: darkMode ? '#b0b0b0' : '#757575', 
            mb: 2,
            fontWeight: 600
          }}>
            SEDES
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {torneo.ubicaciones?.map((ubicacion: string, index: number) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn sx={{ fontSize: 18, color: '#1976d2' }} />
                <Typography variant="body2" sx={{ color: darkMode ? '#e0e0e0' : '#424242' }}>
                  {ubicacion}
                </Typography>
              </Box>
            )) || (
              <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>
                No hay ubicaciones disponibles
              </Typography>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default InfoTorneo;

