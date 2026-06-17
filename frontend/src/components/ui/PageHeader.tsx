import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightActions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, rightActions }) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{title}</Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary">{subtitle}</Typography>
        )}
      </Box>
      {rightActions && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {rightActions}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;


