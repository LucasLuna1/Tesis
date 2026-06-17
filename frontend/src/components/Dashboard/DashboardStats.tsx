import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { SportsRugby, Schedule, People, Gavel } from '@mui/icons-material';
import { DashboardStats as DashboardStatsType } from '@/types';

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const statItems = [
    {
      title: 'Torneos',
      value: stats.torneos,
      icon: <SportsRugby />,
      color: 'primary.main'
    },
    {
      title: 'Partidos',
      value: stats.partidos,
      icon: <Schedule />,
      color: 'secondary.main'
    },
    {
      title: 'Jugadores',
      value: stats.jugadores,
      icon: <People />,
      color: 'success.main'
    },
    {
      title: 'Árbitros',
      value: stats.arbitros,
      icon: <Gavel />,
      color: 'warning.main'
    }
  ];

  return (
    <Grid container spacing={3}>
      {statItems.map((item, index) => (
        <Grid item xs={12} md={3} key={index}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ color: item.color, mr: 1 }}>
                  {item.icon}
                </Box>
                <Typography variant="h6">{item.title}</Typography>
              </Box>
              <Typography variant="h4">{item.value}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default DashboardStats;
