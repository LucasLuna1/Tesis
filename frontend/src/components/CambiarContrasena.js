import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import toast from 'react-hot-toast';

const CambiarContrasena = ({ open, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Todos los campos son requeridos');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las nuevas contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      setLoading(false);
      return;
    }

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || !currentUser.email) {
        throw new Error('No hay usuario autenticado o falta email');
      }

      // 1. Reautenticar para verificar contraseña actual
      const credential = EmailAuthProvider.credential(currentUser.email, formData.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Cambiar a la nueva contraseña
      await updatePassword(currentUser, formData.newPassword);

      toast.success('Contraseña actualizada exitosamente');
      
      // Limpiar formulario y cerrar modal
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      onClose();
      
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      let errorMessage = 'Error al cambiar la contraseña';
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La nueva contraseña es demasiado débil';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setError('');
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Cambiar Contraseña
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ingresa tu contraseña actual y la nueva contraseña
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              required
              name="currentPassword"
              label="Contraseña Actual"
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle current password visibility"
                      onClick={() => togglePasswordVisibility('current')}
                      edge="end"
                    >
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              required
              name="newPassword"
              label="Nueva Contraseña"
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading}
              helperText="Mínimo 6 caracteres"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle new password visibility"
                      onClick={() => togglePasswordVisibility('new')}
                      edge="end"
                    >
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              required
              name="confirmPassword"
              label="Confirmar Nueva Contraseña"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => togglePasswordVisibility('confirm')}
                      edge="end"
                    >
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CambiarContrasena;
