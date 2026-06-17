import React from 'react';
import { Avatar, Box, Typography, Card, CardContent, Grid } from '@mui/material';
import LogoDisplay from './LogoDisplay';

interface LogoComparisonProps {
  logoUrl?: string;
  teamName?: string;
}

const LogoComparison: React.FC<LogoComparisonProps> = ({ 
  logoUrl = '/path/to/logo.png', 
  teamName = 'Equipo Ejemplo' 
}) => {
  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Comparación: Logo con recorte vs Logo completo
      </Typography>
      
      <Grid container spacing={4}>
        {/* ANTES: Avatar con recorte */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            ❌ ANTES: Con recorte (object-fit: cover)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={logoUrl}
              sx={{ 
                width: 60, 
                height: 60,
                bgcolor: 'primary.main'
              }}
            >
              {teamName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body1" fontWeight="bold">
                {teamName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Logo recortado
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Problema: El logo se recorta y puede perder información importante
          </Typography>
        </Grid>

        {/* DESPUÉS: LogoDisplay completo */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="success.main" gutterBottom>
            ✅ DESPUÉS: Completo (object-fit: contain)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <LogoDisplay
              src={logoUrl}
              size="medium"
              shape="square"
              fallbackText={teamName}
            />
            <Box>
              <Typography variant="body1" fontWeight="bold">
                {teamName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Logo completo
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Solución: El logo se muestra completo manteniendo proporciones
          </Typography>
        </Grid>
      </Grid>

      {/* Ejemplos de diferentes tamaños */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Diferentes tamaños disponibles:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ textAlign: 'center' }}>
            <LogoDisplay src={logoUrl} size="small" fallbackText="S" />
            <Typography variant="caption" display="block">Small (40px)</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <LogoDisplay src={logoUrl} size="medium" fallbackText="M" />
            <Typography variant="caption" display="block">Medium (60px)</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <LogoDisplay src={logoUrl} size="large" fallbackText="L" />
            <Typography variant="caption" display="block">Large (100px)</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <LogoDisplay src={logoUrl} size="extra-large" fallbackText="XL" />
            <Typography variant="caption" display="block">Extra Large (120px)</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <LogoDisplay src={logoUrl} size={80} fallbackText="80" />
            <Typography variant="caption" display="block">Custom (80px)</Typography>
          </Box>
        </Box>
      </Box>

      {/* Ejemplo de logo redondo */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Para logos redondos (futuro):
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LogoDisplay 
            src={logoUrl} 
            size="medium" 
            shape="rounded" 
            fallbackText={teamName}
          />
          <Typography variant="body2" color="text.secondary">
            Simplemente usa shape="rounded" para logos circulares
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default LogoComparison;
