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
import api, { getImageUrl } from '../../services/api';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (imageUrl: string) => void;
  disabled?: boolean;
  size?: number;
  userId?: string;
  userType?: 'jugador' | 'arbitro' | 'organizador' | 'manager';
}

const ImageUpload: React.FC<ImageUploadProps> = ({
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
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 5MB');
        return;
      }

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        setDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('foto', file);
      
      // Usar el userId pasado como prop o obtener del localStorage
      const currentUserId = userId || localStorage.getItem('userId') || 'current-user';
      
      // Determinar el endpoint según el tipo de usuario
      let endpoint = '';
      switch (userType) {
        case 'jugador':
          endpoint = `/jugadores/foto/${currentUserId}`;
          break;
        case 'arbitro':
          endpoint = `/arbitros/foto/${currentUserId}`;
          break;
        case 'organizador':
          endpoint = `/organizadores/foto/${currentUserId}`;
          break;
        case 'manager':
          endpoint = `/managers/foto/${currentUserId}`;
          break;
        default:
          endpoint = `/jugadores/foto/${currentUserId}`;
      }
      
      // Subir archivo al backend
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Llamar callback con la nueva URL
      onImageUpload(response.data.foto);
      
      toast.success('Imagen subida correctamente');
      setDialogOpen(false);
      setPreviewUrl(null);
      
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      toast.error('Error al subir la imagen');
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

  const handleRemoveImage = () => {
    onImageUpload('');
    toast.success('Imagen eliminada');
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Avatar
          src={currentImageUrl ? getImageUrl(currentImageUrl) : undefined}
          sx={{ 
            width: size, 
            height: size,
            fontSize: size * 0.4
          }}
        >
          {!currentImageUrl && 'Sin foto'}
        </Avatar>
        
        {!disabled && (
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <PhotoCamera />
          </IconButton>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {currentImageUrl && !disabled && (
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            color="error"
            startIcon={<Delete />}
            onClick={handleRemoveImage}
          >
            Eliminar
          </Button>
        </Box>
      )}

      {/* Diálogo de preview y confirmación */}
      <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar imagen</DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Avatar
                src={previewUrl}
                sx={{ 
                  width: 200, 
                  height: 200,
                  mx: 'auto',
                  mb: 2
                }}
              />
              <Typography variant="body2" color="text.secondary">
                ¿Confirmas que quieres subir esta imagen?
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
          >
            {uploading ? 'Subiendo...' : 'Subir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageUpload;
