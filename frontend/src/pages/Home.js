import React from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Button,
  Card,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  EmojiEvents,
  Assessment,
  SportsRugby,
  People,
  Gavel,
  Star
} from '@mui/icons-material';

const Home = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f5f5f5',
      pb: 8
    }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        px: 2, 
        py: 1,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Box sx={{ 
          width: 32, 
          height: 32, 
          bgcolor: '#1976d2', 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 2
        }}>
          <SportsRugby sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Kani Deportes
        </Typography>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Bienvenido a Kani Deportes
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            La plataforma integral para la gestión de torneos deportivos, equipos y partidos
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            sx={{ 
              px: 4, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem'
            }}
          >
            Comenzar Ahora
          </Button>
        </Box>

        {/* Features Grid */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                <EmojiEvents sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h6" gutterBottom>
                Gestión de Torneos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crea y administra torneos deportivos con fixtures automáticos y seguimiento de resultados
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                <People sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h6" gutterBottom>
                Equipos y Jugadores
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestiona equipos, jugadores y sus estadísticas de manera eficiente
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                <Gavel sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h6" gutterBottom>
                Árbitros y Staff
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administra árbitros y personal técnico para tus eventos deportivos
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                <Assessment sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h6" gutterBottom>
                Reportes y Estadísticas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Genera reportes detallados y estadísticas de rendimiento
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Benefits Section */}
        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            ¿Por qué elegir Kani Deportes?
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Star sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Gestión Completa" 
                    secondary="Todo lo que necesitas para organizar eventos deportivos en una sola plataforma"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Star sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Tiempo Real" 
                    secondary="Seguimiento en vivo de partidos y actualizaciones instantáneas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Star sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Fácil de Usar" 
                    secondary="Interfaz intuitiva diseñada para organizadores, árbitros y jugadores"
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Star sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Móvil y Responsive" 
                    secondary="Accede desde cualquier dispositivo, en cualquier momento"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Star sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Reportes Automáticos" 
                    secondary="Genera estadísticas y reportes automáticamente"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Star sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Soporte 24/7" 
                    secondary="Equipo de soporte disponible para ayudarte"
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>

        {/* CTA Section */}
        <Box sx={{ textAlign: 'center', bgcolor: 'primary.main', color: 'white', p: 6, borderRadius: 2 }}>
          <Typography variant="h4" gutterBottom>
            ¿Listo para comenzar?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Únete a cientos de organizadores que ya confían en Kani Deportes
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main',
              px: 4, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: 'grey.100'
              }
            }}
          >
            Crear Cuenta Gratis
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;