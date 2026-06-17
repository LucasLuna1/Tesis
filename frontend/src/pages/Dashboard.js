import React from 'react';
import {
  Container,
  CircularProgress,
  Alert,
  Typography
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useRolePermissions } from '../hooks/useRolePermissions';
import DashboardOrganizador from './DashboardOrganizador';
import DashboardJugadorArbitro from './DashboardJugadorArbitro';
import DashboardManager from './Manager/DashboardManager';
import DashboardUsuario from './DashboardUsuario';

const Dashboard = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const rolePermissions = useRolePermissions();

  // Mostrar loading solo mientras se carga el auth
  if (authLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando perfil...
        </Typography>
      </Container>
    );
  }

  // Si no hay perfil después de cargar, mostrar error
  if (!userProfile) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          No se pudo cargar tu perfil. Por favor, intenta cerrar sesión y volver a iniciarla.
        </Alert>
      </Container>
    );
  }

  // Mostrar dashboard específico para organizadores
  if (rolePermissions.isOrganizador || rolePermissions.isAdmin) {
    return <DashboardOrganizador />;
  }

  // Mostrar dashboard específico para managers
  if (rolePermissions.isManager) {
    return <DashboardManager />;
  }

  // Mostrar dashboard específico para usuarios y jugadores
  if (rolePermissions.isUsuario || rolePermissions.isJugador) {
    return <DashboardUsuario />;
  }

  // Mostrar dashboard para árbitros
  if (rolePermissions.isArbitro) {
    return <DashboardJugadorArbitro />;
  }


  // Fallback para usuarios sin rol definido
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" color="text.secondary">
        No se pudo determinar tu rol. Por favor, contacta al administrador.
      </Typography>
    </Container>
  );
};

export default Dashboard;
