import React from 'react';
import { Grid, Card, CardContent, CardActions, Button, Box, Typography } from '@mui/material';
import { Add, SportsRugby, EmojiEvents, Groups, Gavel, Assessment, Article, LocationOn } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRolePermissions } from '../../hooks/useRolePermissions';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactElement;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  onClick: () => void;
  permission: () => boolean;
}

const QuickActions: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const rolePermissions = useRolePermissions();

  // Memoizar las funciones de navegación para evitar recreaciones innecesarias
  const navigationHandlers = React.useMemo(() => ({
    crearPartido: () => navigate('/crear-partido'),
    partidoLive: () => navigate('/partido-live'),
    torneos: () => navigate('/torneos'),
    equipos: () => navigate('/equipos'),
    arbitros: () => navigate('/arbitros'),
    canchas: () => navigate('/canchas'),
    reportes: () => navigate('/reportes'),
    noticias: () => navigate('/noticias')
  }), [navigate]);

  // Memoizar las acciones para evitar recreaciones innecesarias
  const actions: QuickAction[] = React.useMemo(() => [
    {
      title: 'Crear Partido',
      description: 'Registra un nuevo encuentro',
      icon: <Add />,
      color: 'success',
      onClick: navigationHandlers.crearPartido,
      permission: () => rolePermissions.canCreatePartidos()
    },
    {
      title: 'Gestión en Vivo',
      description: 'Gestiona partidos en tiempo real',
      icon: <SportsRugby />,
      color: 'primary',
      onClick: navigationHandlers.partidoLive,
      permission: () => true
    },
    {
      title: 'Gestionar Torneos',
      description: 'Crear y administrar torneos',
      icon: <EmojiEvents />,
      color: 'warning',
      onClick: navigationHandlers.torneos,
      permission: () => rolePermissions.canManageTorneos()
    },
    {
      title: 'Gestionar Equipos',
      description: 'Administrar equipos y jugadores',
      icon: <Groups />,
      color: 'secondary',
      onClick: navigationHandlers.equipos,
      permission: () => rolePermissions.canManageEquipos()
    },
    {
      title: 'Gestionar Árbitros',
      description: 'Administrar árbitros y asignaciones',
      icon: <Gavel />,
      color: 'error',
      onClick: navigationHandlers.arbitros,
      permission: () => rolePermissions.canManageArbitros()
    },
    {
      title: 'Gestionar Canchas',
      description: 'Administrar canchas y sedes',
      icon: <LocationOn />,
      color: 'info',
      onClick: navigationHandlers.canchas,
      permission: () => rolePermissions.canManageCanchas()
    },
    {
      title: 'Reportes',
      description: 'Generar reportes y estadísticas',
      icon: <Assessment />,
      color: 'info',
      onClick: navigationHandlers.reportes,
      permission: () => rolePermissions.canGenerateReports()
    },
    {
      title: 'Noticias',
      description: rolePermissions.canManageNews() ? 'Gestionar noticias y comunicados' : 'Ver noticias y comunicados',
      icon: <Article />,
      color: 'primary',
      onClick: navigationHandlers.noticias,
      permission: () => rolePermissions.canViewNews()
    }
  ], [navigationHandlers, rolePermissions]);

  return (
    <Grid container spacing={3}>
      {actions.map((action, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ color: `${action.color}.main`, mr: 1 }}>
                  {action.icon}
                </Box>
                <Typography variant="h6">{action.title}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {action.description}
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                variant="contained"
                color={action.color}
                onClick={action.onClick}
                disabled={!action.permission()}
              >
                {action.title}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
});

export default QuickActions;
