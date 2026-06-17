import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { Alert, Container, Typography, Box, CircularProgress } from '@mui/material';
import { Lock } from '@mui/icons-material';

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  requiredPermission = null,
  fallbackPath = '/dashboard',
  showAccessDenied = true 
}) => {
  const authContext = useAuth();
  const { userProfile, loading } = authContext || { userProfile: null, loading: true };
  const permissions = useRolePermissions();

  // 🔄 Esperar a que termine de cargar antes de redirigir
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Verificar si el usuario está autenticado
  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol específico si se requiere
  if (requiredRole && !permissions[`is${requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)}`]) {
    if (showAccessDenied) {
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Lock sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Acceso Denegado
            </Typography>
            <Typography variant="body1" color="text.secondary">
              No tienes permisos para acceder a esta sección.
              Se requiere el rol de <strong>{requiredRole}</strong>.
            </Typography>
          </Box>
        </Container>
      );
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // Verificar permiso específico si se requiere
  if (requiredPermission && !permissions[requiredPermission]()) {
    if (showAccessDenied) {
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Lock sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Acceso Denegado
            </Typography>
            <Typography variant="body1" color="text.secondary">
              No tienes permisos para realizar esta acción.
            </Typography>
          </Box>
        </Container>
      );
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
