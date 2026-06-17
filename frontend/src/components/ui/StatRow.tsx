import React from 'react';
import { Box, Typography } from '@mui/material';

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error';
}

const StatRow: React.FC<StatRowProps> = ({ icon, label, value, color = 'primary' }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ p: 0.75, borderRadius: '50%', bgcolor: `${color}.light`, color: `${color}.main`, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{value}</Typography>
    </Box>
  );
};

export default StatRow;


