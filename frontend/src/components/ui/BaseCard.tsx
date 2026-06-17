import React from 'react';
import { Card, CardProps } from '@mui/material';

export interface BaseCardProps extends CardProps {
  interactive?: boolean;
  dense?: boolean;
}

const BaseCard: React.FC<BaseCardProps> = ({ interactive = true, dense = true, sx, children, ...props }) => {
  return (
    <Card
      {...props}
      sx={{
        borderRadius: 2,
        border: 'none',
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(interactive
          ? {
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(0,0,0,0.15)' }
            }
          : {}),
        ...(dense ? { } : {}),
        ...sx,
      }}
    >
      {children}
    </Card>
  );
};

export default BaseCard;


