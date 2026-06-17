import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Typography
} from '@mui/material';
import {
  PhotoCamera,
  Delete,
  CloudUpload
} from '@mui/icons-material';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LogoDisplay from './LogoDisplay';

interface LogoUploadBackendProps {
  currentLogoUrl?: string;
  onLogoUpload: (logoUrl: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large' | 'extra-large' | number;
  teamId?: string;
}

const LogoUploadBackend: React.FC<LogoUploadBackendProps> = ({
  currentLogoUrl,
  onLogoUpload,
  disabled = false,
  size = 'medium',
  teamId
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar preview cuando cambie la imagen actual
  useEffect(() => {
    setPreviewUrl(null);
  }, [currentLogoUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande. Máximo 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        setDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0] || !teamId) {
      toast.error('Error: archivo o equipo no encontrado');
      return;
    }

    try {
      setUploading(true);
      
      const file = fileInputRef.current.files[0];
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.put(`/equipos/${teamId}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.equipo?.logo) {
        // Llamar al callback con la nueva URL
        onLogoUpload(response.data.equipo.logo);
        toast.success('Imagen subida correctamente');
        setDialogOpen(false);
        // No limpiar previewUrl aquí, se limpiará cuando se actualice la prop currentLogoUrl
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Forzar actualización del componente padre
        window.dispatchEvent(new CustomEvent('team-logo-updated', { 
          detail: { logo: response.data.equipo.logo } 
        }));
      } else {
        throw new Error('No se recibió URL de la imagen');
      }
    } catch (error: any) {
      console.error('❌ Error subiendo imagen:', error);
      const errorMessage = error.response?.data?.error || 'Error al subir la imagen';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!currentLogoUrl || !teamId) {
      toast.error('Error: no hay imagen para eliminar o equipo no encontrado');
      return;
    }

    try {
      setUploading(true);
      
      const response = await api.delete(`/equipos/${teamId}/logo`);

      if (response.data.logo === '') {
        // Llamar al callback con la URL vacía
        onLogoUpload('');
        toast.success('Imagen eliminada correctamente');
        
        // Forzar actualización del componente padre
        window.dispatchEvent(new CustomEvent('team-logo-updated', { 
          detail: { logo: '' } 
        }));
      } else {
        throw new Error('No se recibió confirmación de eliminación');
      }
    } catch (error: any) {
      console.error('❌ Error eliminando imagen:', error);
      const errorMessage = error.response?.data?.error || 'Error al eliminar la imagen';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <LogoDisplay
          src={previewUrl || currentLogoUrl}
          size={size}
          shape="square"
          fallbackText="Logo"
          sx={{ 
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.6 : 1
          }}
        />
        
        {!disabled && (
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              width: 24,
              height: 24
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <PhotoCamera sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        
        {(currentLogoUrl || previewUrl) && !disabled && (
          <IconButton
            size="small"
            disabled={uploading}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': { bgcolor: 'error.dark' },
              '&:disabled': { bgcolor: 'grey.400' },
              width: 24,
              height: 24,
              zIndex: 1
            }}
            onClick={handleDelete}
          >
            {uploading ? <CircularProgress size={12} color="inherit" /> : <Delete sx={{ fontSize: 14 }} />}
          </IconButton>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar imagen</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {previewUrl && (
              <LogoDisplay
                src={previewUrl}
                size="large"
                shape="square"
                fallbackText="Logo"
                sx={{ 
                  mx: 'auto', 
                  mb: 2,
                }}
              />
            )}
            <Typography variant="body1">
              ¿Confirmas que quieres subir esta imagen?
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancelar</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}
          >
            {uploading ? 'Subiendo...' : 'Subir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LogoUploadBackend;
