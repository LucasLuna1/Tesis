import React, { useState, useCallback } from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import './LogoDisplay.css';

interface LogoDisplayProps {
  src?: string;
  alt?: string;
  size?: 'small' | 'medium' | 'large' | 'extra-large' | number;
  width?: number; // Nueva prop para ancho personalizado
  height?: number; // Nueva prop para alto personalizado
  shape?: 'square' | 'rounded';
  fallbackText?: string;
  className?: string;
  sx?: any;
  variant?: 'default' | 'avatar'; // Para elegir entre el componente personalizado o el Avatar de MUI
}

const LogoDisplay: React.FC<LogoDisplayProps> = React.memo(({
  src,
  alt = 'Logo',
  size = 'medium',
  width, // Nueva prop para ancho
  height, // Nueva prop para alto
  shape = 'square',
  fallbackText = 'Logo',
  className = '',
  sx = {},
  variant = 'default'
}) => {
  const [imageError, setImageError] = useState(false);

  // Tamaños predefinidos
  const sizeMap = React.useMemo(() => ({
    small: 40,
    medium: 60,
    large: 100,
    'extra-large': 120
  }), []);

  // Si es un número, usar ese valor directamente
  const logoSize = typeof size === 'number' ? size : sizeMap[size];
  
  // Usar width/height si se proporcionan, de lo contrario, usar logoSize
  const finalWidth = width || logoSize;
  const finalHeight = height || logoSize;

  // Optimizar manejo de errores de imagen
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Si se solicita la variante Avatar, usar el componente LogoAvatar
  if (variant === 'avatar') {
    return (
      <LogoAvatar
        src={src}
        alt={alt}
        size={size}
        shape={shape}
        fallbackText={fallbackText}
        className={className}
        sx={sx}
      />
    );
  }

  // Si no hay imagen o hubo error, mostrar placeholder
  if (!src || imageError) {
    return (
      <Box
        className={`logo-container logo-${size} logo-${shape} ${className}`}
        sx={{
          width: finalWidth,
          height: finalHeight,
          ...sx
        }}
      >
        <div className="logo-placeholder">
          {fallbackText.substring(0, 2)}
        </div>
      </Box>
    );
  }

  return (
    <Box
      className={`logo-container logo-${size} logo-${shape} ${className}`}
      sx={{
        width: finalWidth,
        height: finalHeight,
        ...sx
      }}
    >
      <img
        src={src}
        alt={alt}
        className="logo-image"
        loading="lazy"
        decoding="async"
        onError={handleImageError}
      />
    </Box>
  );
});

// Componente alternativo usando Material-UI Avatar con estilos personalizados
export const LogoAvatar: React.FC<LogoDisplayProps> = React.memo(({
  src,
  alt = 'Logo',
  size = 'medium',
  shape = 'square',
  fallbackText = 'Logo',
  className = '',
  sx = {}
}) => {
  const sizeMap = {
    small: 40,
    medium: 60,
    large: 100,
    'extra-large': 120
  };

  // Si es un número, usar ese valor directamente
  const logoSize = typeof size === 'number' ? size : sizeMap[size];
  const avatarClass = shape === 'rounded' ? 'logo-avatar-rounded' : 'logo-avatar';

  return (
    <Avatar
      src={src}
      alt={alt}
      className={`${avatarClass} ${className}`}
      sx={{
        width: logoSize,
        height: logoSize,
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        ...sx
      }}
    >
      {!src && (
        <Typography
          variant="caption"
          sx={{
            fontSize: logoSize * 0.3,
            fontWeight: 'bold',
            color: '#9e9e9e',
            textTransform: 'uppercase'
          }}
        >
          {fallbackText.substring(0, 2)}
        </Typography>
      )}
    </Avatar>
  );
});

export default LogoDisplay;
