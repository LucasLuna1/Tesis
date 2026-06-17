import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

// Configuración de la URL del backend
const isDevelopment = process.env.NODE_ENV === 'development';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (isDevelopment ? 'http://localhost:5000' : 'https://kani-deportes.onrender.com');

const RestablecerContrasena = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validatingCode, setValidatingCode] = useState(true);
  const [codeValid, setCodeValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  const verifyResetCode = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oobCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeValid(true);
        setUserEmail(data.email);
      } else {
        setError(data.error || 'Código de recuperación inválido');
      }
    } catch (error) {
      setError('Error al verificar el código de recuperación');
    } finally {
      setValidatingCode(false);
    }
  }, [oobCode]);

  useEffect(() => {
    // Verificar que tenemos el código y el modo correcto
    if (!oobCode || mode !== 'resetPassword') {
      setError('Link de recuperación inválido o expirado');
      setValidatingCode(false);
      return;
    }

    // Verificar que el código es válido
    verifyResetCode();
  }, [oobCode, mode, verifyResetCode]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/confirm-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oobCode,
          newPassword: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success('Contraseña actualizada exitosamente');
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Error al restablecer la contraseña');
      }
    } catch (error) {
      setError('Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (validatingCode) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">
              Verificando código de recuperación...
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  if (success) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
            <Typography component="h1" variant="h4" gutterBottom color="success.main">
              ✓ Contraseña Restablecida
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              Tu contraseña ha sido actualizada exitosamente.
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Serás redirigido al login en unos segundos...
            </Typography>
            
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              fullWidth
            >
              Ir al Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  if (!codeValid) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
            <Typography component="h1" variant="h4" gutterBottom color="error">
              ❌ Link Inválido
            </Typography>
            
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              El link de recuperación es inválido o ha expirado. 
              Solicita uno nuevo.
            </Typography>
            
            <Button
              variant="contained"
              onClick={() => navigate('/olvidar-contrasena')}
              fullWidth
            >
              Solicitar Nuevo Link
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <img
                src="/logo-urt.png"
                alt="URT Deportes"
                style={{ height: 70, objectFit: 'contain', borderRadius: '50%' }}
              />
            </Box>
            <Typography component="h1" variant="h4" gutterBottom>
              Restablecer Contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Para: <strong>{userEmail}</strong>
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Nueva Contraseña"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Nueva Contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Restablecer Contraseña'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RestablecerContrasena;
