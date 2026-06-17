import React from 'react';
import { Box, Typography } from '@mui/material';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      {icon && <Box sx={{ mb: 1 }}>{icon}</Box>}
      <Typography variant="h6" color="text.secondary" sx={{ mb: 0.5 }}>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{description}</Typography>
      )}
      {action}
    </Box>
  );
};

export default EmptyState;


