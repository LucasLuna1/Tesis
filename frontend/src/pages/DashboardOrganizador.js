import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  SportsRugby,
  People,
  Gavel,
  EmojiEvents,
  AutoFixHigh,
  FileDownload,
  Delete,
  Edit,
  Warning
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useNavigate } from 'react-router-dom';
import FixtureGenerator from '../components/Fixture/FixtureGenerator';
import ExportadorReportes from '../components/Reportes/ExportadorReportes';
import LogoDisplay from '../components/common/LogoDisplay';
import { 
  useTorneos, 
  useEquipos, 
  useDashboardStats,
  useDeleteTorneo
} from '../hooks/useQueryHooks';

const DashboardOrganizador = () => {
  const { userProfile } = useAuth();
  const rolePermissions = useRolePermissions();

  // Función para formatear el estado del torneo
  const formatearEstado = (estado) => {
    const estados = {
      'en_curso': 'En Curso',
      'programado': 'Programado',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado',
      'pausado': 'Pausado'
    };
    return estados[estado] || estado;
  };

  // Función para formatear fechas
  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      let date;
      
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
      console.error('Error formateando fecha:', error, fecha);
      return 'Fecha inválida';
    }
  };
  const navigate = useNavigate();
  
  // React Query - Cargar datos con caché automático
  const { data: stats = {}, isLoading: loadingStats } = useDashboardStats();
  const { data: torneos = [], isLoading: loadingTorneos, refetch: refetchTorneos } = useTorneos();
  const { data: equipos = [], isLoading: loadingEquipos } = useEquipos({});
  const deleteTorneoMutation = useDeleteTorneo();
  
  const loading = loadingStats || loadingTorneos || loadingEquipos;
  
  // Estados para diálogos
  const [openFixtureDialog, setOpenFixtureDialog] = useState(false);
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [torneoToDelete, setTorneoToDelete] = useState(null);
  
  // Verificar permisos
  useEffect(() => {
    if (!rolePermissions.isOrganizador && !rolePermissions.isAdmin) {
      navigate('/dashboard');
      return;
    }
  }, [rolePermissions, navigate]);


  const handleFixtureGenerado = () => {
    refetchTorneos(); // Refrescar torneos después de generar fixture
  };

  const handleDeleteTorneo = (torneo) => {
    setTorneoToDelete(torneo);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteTorneo = async () => {
    if (!torneoToDelete) return;
    deleteTorneoMutation.mutate(torneoToDelete.id, {
      onSuccess: () => {
        setOpenDeleteDialog(false);
        setTorneoToDelete(null);
      }
    });
  };

  const cancelDeleteTorneo = () => {
    setOpenDeleteDialog(false);
    setTorneoToDelete(null);
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ width: '100%', height: '100%', display: 'flex' }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 }, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: '60px' }}>
          <Box sx={{ 
            p: 0.75, 
            borderRadius: 2, 
            bgcolor: `${color}.light`, 
            color: `${color}.main`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 40,
            width: 40,
            height: 40,
            flexShrink: 0
          }}>
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: `${color}.main`, lineHeight: 1.2, mb: 0.25 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mb: subtitle ? 0.25 : 0 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ title, description, icon, color, onClick, disabled = false }) => (
    <Card 
      sx={{ 
        width: '100%',
        height: '100%',
        display: 'flex',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s ease',
        '&:hover': disabled ? {} : {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 }, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: '60px' }}>
          <Box sx={{ 
            p: 0.75, 
            borderRadius: 2, 
            bgcolor: `${color}.light`, 
            color: `${color}.main`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 40,
            width: 40,
            height: 40,
            flexShrink: 0
          }}>
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.25, lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {description}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Saludo */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {`Bienvenido${userProfile?.nombre ? ',' : ''} ${userProfile?.nombre || 'Organizador'}`}
        </Typography>
      </Box>

      {/* Estadísticas principales y Acciones rápidas - Layout 50-50 con mismas propiedades EXACTAS */}
      <Grid container spacing={3} sx={{ mb: 4, alignItems: 'stretch' }}>
        {/* Columna izquierda: Estadísticas principales */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 1.5, fontWeight: 'bold' }}>
            Estadísticas principales
          </Typography>
          <Grid container spacing={1.5} sx={{ flex: 1 }}>
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <StatCard
                title="Torneos Activos"
                value={stats.torneos}
                icon={<EmojiEvents />}
                color="primary"
                subtitle="En curso"
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <StatCard
                title="Equipos Registrados"
                value={stats.equipos}
                icon={<People />}
                color="secondary"
                subtitle="Participantes"
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <StatCard
                title="Partidos Programados"
                value={stats.partidos}
                icon={<SportsRugby />}
                color="success"
                subtitle="Esta semana"
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <StatCard
                title="Árbitros Disponibles"
                value={stats.arbitros}
                icon={<Gavel />}
                color="warning"
                subtitle="Certificados"
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Columna derecha: Acciones rápidas - MISMAS PROPIEDADES EXACTAS */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 1.5, fontWeight: 'bold' }}>
            Acciones Rápidas
          </Typography>
          <Grid container spacing={1.5} sx={{ flex: 1 }}>
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <QuickActionCard
                title="Generar Fixture"
                description="Crear calendario automático de partidos"
                icon={<AutoFixHigh />}
                color="primary"
                onClick={() => setOpenFixtureDialog(true)}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <QuickActionCard
                title="Gestionar Equipos"
                description="Administrar equipos y jugadores"
                icon={<People />}
                color="secondary"
                onClick={() => navigate('/equipos')}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <QuickActionCard
                title="Exportar Reportes"
                description="Generar reportes en PDF o Excel"
                icon={<FileDownload />}
                color="success"
                onClick={() => setOpenExportDialog(true)}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <QuickActionCard
                title="Crear Torneo"
                description="Organizar nuevo torneo"
                icon={<EmojiEvents />}
                color="warning"
                onClick={() => navigate('/torneos')}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>


      {/* Componentes de diálogo */}
      <FixtureGenerator
        open={openFixtureDialog}
        onClose={() => setOpenFixtureDialog(false)}
        torneos={torneos}
        onFixtureGenerated={handleFixtureGenerado}
      />
      
      <ExportadorReportes
        open={openExportDialog}
        onClose={() => setOpenExportDialog(false)}
      />

      {/* Diálogo de confirmación para eliminar torneo */}
      <Dialog open={openDeleteDialog} onClose={cancelDeleteTorneo} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            Confirmar Eliminación
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ¿Estás seguro de que quieres eliminar el torneo "{torneoToDelete?.nombre}"?
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer. El torneo y todos sus datos asociados serán eliminados permanentemente.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            <strong>Estado del torneo:</strong> {torneoToDelete?.estado}<br/>
            <strong>Equipos inscritos:</strong> {torneoToDelete?.equipos?.length || 0}<br/>
            <strong>Período:</strong> {torneoToDelete?.fechaInicio && new Date(torneoToDelete.fechaInicio).toLocaleDateString()} - {torneoToDelete?.fechaFin && new Date(torneoToDelete.fechaFin).toLocaleDateString()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteTorneo} disabled={deleteTorneoMutation.isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmDeleteTorneo} 
            color="error" 
            variant="contained"
            disabled={deleteTorneoMutation.isLoading}
            startIcon={deleteTorneoMutation.isLoading ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleteTorneoMutation.isLoading ? 'Eliminando...' : 'Eliminar Torneo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DashboardOrganizador;
