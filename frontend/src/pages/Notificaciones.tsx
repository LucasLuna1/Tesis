import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { NotificacionesList } from '../components/Notificaciones';

const Notificaciones: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      
      <NotificacionesList />
    </Container>
  );
};

export default Notificaciones;
