import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import { Add, Groups } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CrearClubDialog from './components/CrearClubDialog';
import DashboardClub from './components/DashboardClub';

const MiClub: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<any>(null);
  const [openCrearClub, setOpenCrearClub] = useState(false);

  useEffect(() => {
    cargarClub();
  }, []);

  const cargarClub = async () => {
    try {
      setLoading(true);
      const response = await api.get('/managers/mi-club');
      
      if (response.data.club) {
        setClub(response.data.club);
      } else {
        setClub(null);
      }
    } catch (error) {
      console.error('Error cargando club:', error);
      toast.error('Error al cargar información del club');
    } finally {
      setLoading(false);
    }
  };

  const handleClubCreado = (nuevoClub: any) => {
    setClub(nuevoClub);
    setOpenCrearClub(false);
    toast.success('¡Club creado exitosamente!');
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando...
        </Typography>
      </Container>
    );
  }

  // Si no tiene club, mostrar pantalla de bienvenida
  if (!club) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <Groups sx={{ fontSize: 100, color: 'primary.main', mb: 3 }} />
          
          <Typography variant="h3" gutterBottom>
            Bienvenido, Manager
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Aún no tienes un club creado
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Para comenzar a gestionar tu equipo, jugadores y participar en torneos,
            primero necesitas crear tu club. Completa la información básica y
            empieza a construir tu equipo.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setOpenCrearClub(true)}
              sx={{ px: 4, py: 1.5 }}
            >
              Crear Mi Club
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/manager/buscar-club')}
              sx={{ px: 4, py: 1.5 }}
            >
              Buscar Club Existente
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 4, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>Nota:</strong> Si ya perteneces a un club existente, usa la opción
              "Buscar Club" para solicitar unirte como manager.
            </Typography>
          </Alert>
        </Paper>

        <CrearClubDialog
          open={openCrearClub}
          onClose={() => setOpenCrearClub(false)}
          onClubCreado={handleClubCreado}
        />
      </Container>
    );
  }

  // Si tiene club, mostrar dashboard
  return (
    <DashboardClub club={club} onClubActualizado={cargarClub} />
  );
};

export default MiClub;



