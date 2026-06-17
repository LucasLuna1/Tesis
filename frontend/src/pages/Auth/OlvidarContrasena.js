import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  CircularProgress
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';

// Configuración de la URL del backend
const isDevelopment = process.env.NODE_ENV === 'development';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (isDevelopment ? 'http://localhost:5000' : 'https://kani-deportes.onrender.com');

const OlvidarContrasena = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Por favor ingresa tu email');
      setLoading(false);
      return;
    }

    try {
      // Método 1: Usar nuestro backend primero (con configuración de Gmail)
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success(data.message);
      } else {
        throw new Error(data.error || 'Error al enviar email');
      }
    } catch (error) {
      // Método 2: Usar Firebase SDK como fallback
      try {
        await sendPasswordResetEmail(auth, email);
        setSuccess(true);
        toast.success('Email de recuperación enviado');
      } catch (firebaseError) {
        let errorMessage = 'Error al enviar email de recuperación';
        
        switch (firebaseError.code) {
          case 'auth/user-not-found':
            // Por seguridad, no revelamos si el email existe
            setSuccess(true);
            break;
          case 'auth/invalid-email':
            errorMessage = 'Email inválido';
            setError(errorMessage);
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Demasiados intentos. Intenta más tarde';
            setError(errorMessage);
            break;
          default:
            setError('No se pudo enviar el email. Verifica tu conexión o intenta más tarde.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

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
              ✓ Email Enviado
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              Si el email <strong>{email}</strong> existe en nuestro sistema, 
              recibirás las instrucciones para restablecer tu contraseña.
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Revisa tu bandeja de entrada y la carpeta de spam.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                fullWidth
              >
                Volver al Login
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                fullWidth
              >
                Intentar con otro email
              </Button>
            </Box>
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
              ¿Olvidaste tu contraseña?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ingresa tu email y te enviaremos un link para restablecer tu contraseña
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
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Enviar Email de Recuperación'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                ¿Recordaste tu contraseña? Volver al login
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default OlvidarContrasena;
