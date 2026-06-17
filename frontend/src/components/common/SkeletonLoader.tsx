import React from 'react';
import { Skeleton, Card, CardContent, Box, Grid } from '@mui/material';

/**
 * 🚀 OPTIMIZACIÓN: Skeleton loader genérico
 * Muestra placeholders mientras se cargan los datos
 * Mejora la percepción de velocidad de carga
 */

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'table' | 'fixture' | 'text';
  count?: number;
  height?: number | string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'card', 
  count = 3,
  height = 200 
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <Grid container spacing={2}>
            {Array.from({ length: count }).map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="40%" sx={{ mt: 1 }} />
                    <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Skeleton variant="text" width="30%" />
                      <Skeleton variant="text" width="30%" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 'list':
        return (
          <Box>
            {Array.from({ length: count }).map((_, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        );

      case 'table':
        return (
          <Box>
            <Skeleton variant="rectangular" height={56} sx={{ mb: 1 }} />
            {Array.from({ length: count }).map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={48} sx={{ mb: 1 }} />
            ))}
          </Box>
        );

      case 'fixture':
        return (
          <Box>
            {Array.from({ length: count }).map((_, jornadaIndex) => (
              <Box key={jornadaIndex} sx={{ mb: 4 }}>
                <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {Array.from({ length: 3 }).map((_, partidoIndex) => (
                    <Grid item xs={12} md={6} lg={4} key={partidoIndex}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Skeleton variant="text" width="30%" />
                            <Skeleton variant="text" width="20%" />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Skeleton variant="circular" width={32} height={32} />
                              <Skeleton variant="text" width={100} />
                            </Box>
                            <Skeleton variant="text" width={40} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Skeleton variant="text" width={100} />
                              <Skeleton variant="circular" width={32} height={32} />
                            </Box>
                          </Box>
                          <Skeleton variant="text" width="60%" sx={{ mt: 2 }} />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Box>
        );

      case 'text':
      default:
        return (
          <Box>
            {Array.from({ length: count }).map((_, index) => (
              <Skeleton key={index} variant="text" height={height} sx={{ mb: 1 }} />
            ))}
          </Box>
        );
    }
  };

  return <>{renderSkeleton()}</>;
};

export default SkeletonLoader;

