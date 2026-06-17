import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Avatar,
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

interface ImageUploadBackendProps {
  currentImageUrl?: string;
  onImageUpload: (imageUrl: string) => void;
  disabled?: boolean;
  size?: number;
  userId?: string;
  userType?: 'jugador' | 'arbitro' | 'organizador' | 'manager' | 'usuario'; // Tipo de usuario para endpoint correcto
}

const ImageUploadBackend: React.FC<ImageUploadBackendProps> = ({
  currentImageUrl,
  onImageUpload,
  disabled = false,
  size = 120,
  userId,
  userType = 'jugador'
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!fileInputRef.current?.files?.[0] || !userId) {
      toast.error('Error: archivo o usuario no encontrado');
      return;
    }

    try {
      setUploading(true);
      
      const file = fileInputRef.current.files[0];
      const formData = new FormData();
      formData.append('foto', file);

      let endpoint = `/jugadores/foto/${userId}`; // default
      if (userType === 'arbitro') endpoint = `/arbitros/foto/${userId}`;
      else if (userType === 'organizador') endpoint = `/organizadores/foto/${userId}`;
      else if (userType === 'manager') endpoint = `/managers/foto/${userId}`;
      else if (userType === 'usuario') endpoint = `/usuarios/foto/${userId}`;
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.foto) {
        // Llamar al callback con la nueva URL
        onImageUpload(response.data.foto);
        toast.success('Imagen subida correctamente');
        setDialogOpen(false);
        setPreviewUrl(null);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Forzar actualización del componente padre
        window.dispatchEvent(new CustomEvent('profile-photo-updated', { 
          detail: { foto: response.data.foto } 
        }));
      } else {
        throw new Error('No se recibió URL de la imagen');
      }
    } catch (error: any) {
      console.error('❌ Error subiendo imagen:', error);
      const errorMessage = error.response?.data?.error || 'Error al subir la imagen';
      toast.error(errorMessage);
      
      // Si el error es por Firebase Storage, sugerir usar almacenamiento local
      if (errorMessage.includes('bucket') || errorMessage.includes('Storage')) {

      }
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
    if (!currentImageUrl || !userId) {
      toast.error('Error: no hay imagen para eliminar o usuario no encontrado');
      return;
    }

    try {
      setUploading(true);
      
      let endpoint = `/jugadores/foto/${userId}`; // default
      if (userType === 'arbitro') endpoint = `/arbitros/foto/${userId}`;
      else if (userType === 'organizador') endpoint = `/organizadores/foto/${userId}`;
      else if (userType === 'manager') endpoint = `/managers/foto/${userId}`;
      else if (userType === 'usuario') endpoint = `/usuarios/foto/${userId}`;
      
      const response = await api.delete(endpoint);

      if (response.data.foto === '') {
        // Llamar al callback con la URL vacía
        onImageUpload('');
        toast.success('Imagen eliminada correctamente');
        
        // Forzar actualización del componente padre
        window.dispatchEvent(new CustomEvent('profile-photo-updated', { 
          detail: { foto: '' } 
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
        <Avatar
          src={currentImageUrl}
          sx={{ 
            width: size, 
            height: size,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.6 : 1
          }}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          {!currentImageUrl && <PhotoCamera />}
        </Avatar>
        
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
              width: 32,
              height: 32
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <PhotoCamera fontSize="small" />
          </IconButton>
        )}
        
        {currentImageUrl && !disabled && (
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
              width: 32,
              height: 32
            }}
            onClick={handleDelete}
          >
            {uploading ? <CircularProgress size={16} color="inherit" /> : <Delete fontSize="small" />}
          </IconButton>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar imagen</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {previewUrl && (
              <Avatar
                src={previewUrl}
                sx={{ 
                  width: 200, 
                  height: 200, 
                  mx: 'auto', 
                  mb: 2,
                  borderRadius: '50%'
                }}
              />
            )}
            <Typography variant="body1">
              ¿Confirmas que quieres subir esta imagen?
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={uploading}>
            Cancelar
          </Button>
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

export default ImageUploadBackend;