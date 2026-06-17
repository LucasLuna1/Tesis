import React from 'react';
import { Button, ButtonProps } from '@mui/material';

export interface BaseButtonProps extends ButtonProps {
  soft?: boolean;
}

const BaseButton: React.FC<BaseButtonProps> = ({ soft = false, sx, children, ...props }) => {
  return (
    <Button
      {...props}
      sx={{
        borderRadius: 1.5,
        fontWeight: 600,
        px: 2,
        py: 0.75,
        ...(soft
          ? {
              bgcolor: 'action.hover',
              color: 'text.primary',
              '&:hover': { bgcolor: 'action.selected' }
            }
          : {}),
        ...sx,
      }}
    >
      {children}
    </Button>
  );
};

export default BaseButton;


