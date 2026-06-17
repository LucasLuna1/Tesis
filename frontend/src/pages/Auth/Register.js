import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    tipoUsuario: 'usuario',
    telefono: '',
    fechaNacimiento: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      // Crear usuario en Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Actualizar perfil del usuario
      await updateProfile(user, {
        displayName: `${formData.nombre} ${formData.apellido}`
      });

      // Convertir fecha de dayjs a formato ISO (YYYY-MM-DD)
      let fechaNacimientoFormatoISO = formData.fechaNacimiento 
        ? dayjs(formData.fechaNacimiento).format('YYYY-MM-DD') 
        : '';

      // Crear documento en Firestore
      const userData = {
        uid: user.uid,
        email: formData.email,
        nombre: formData.nombre,
        apellido: formData.apellido,
        tipoUsuario: formData.tipoUsuario,
        telefono: formData.telefono,
        fechaNacimiento: fechaNacimientoFormatoISO,
        fechaCreacion: new Date(),
        activo: true
      };

      // Guardar en colección general de usuarios
      await setDoc(doc(db, 'users', user.uid), userData);

      // Guardar en colección específica según tipo de usuario
      if (formData.tipoUsuario === 'usuario') {
        await setDoc(doc(db, 'usuarios', user.uid), {
          ...userData,
          foto: ''
        });
      } else if (formData.tipoUsuario === 'jugador') {
        await setDoc(doc(db, 'jugadores', user.uid), {
          ...userData,
          posicion: '',
          equipoId: null,
          estadisticas: {
            partidosJugados: 0,
            tries: 0,
            tarjetasAmarillas: 0,
            tarjetasRojas: 0
          }
        });
      } else if (formData.tipoUsuario === 'arbitro') {
        await setDoc(doc(db, 'arbitros', user.uid), {
          ...userData,
          certificacion: '',
          especialidad: '',
          partidosArbitrados: 0
        });
      } else if (formData.tipoUsuario === 'organizador') {
        // Crear documento en Firestore
        await setDoc(doc(db, 'organizadores', user.uid), {
          ...userData,
          organizacion: '',
          cargo: '',
          permisos: {
            gestionarTorneos: true,
            gestionarPartidos: true,
            gestionarEquipos: true,
            gestionarJugadores: true,
            gestionarArbitros: true,
            supervisarPartidos: true,
            publicarNoticias: true,
            gestionarPatrocinadores: true,
            generarReportes: true,
            verHistorial: true
          },
          torneosCreados: 0,
          partidosGestionados: 0
        });

        // También crear en el backend
        try {
          const token = await user.getIdToken();
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/organizadores`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              uid: user.uid,
              email: formData.email,
              nombre: formData.nombre,
              apellido: formData.apellido,
              telefono: formData.telefono,
              fechaNacimiento: formData.fechaNacimiento,
              organizacion: '',
              cargo: ''
            })
          });

          if (!response.ok) {

          }
        } catch (error) {

        }
      } else if (formData.tipoUsuario === 'manager') {
        // Crear documento en Firestore para Manager
        await setDoc(doc(db, 'managers', user.uid), {
          ...userData,
          clubId: null,
          foto: ''
        });
      }

      // Guardar token para el backend
      const token = await user.getIdToken();
      localStorage.setItem('firebaseToken', token);

      toast.success('¡Cuenta creada exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      let errorMessage = 'Error al crear la cuenta';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Ya existe una cuenta con este email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es muy débil';
          break;
        default:
          errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
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
              Crear Cuenta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Únete a URT Deportes
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="nombre"
                  label="Nombre"
                  name="nombre"
                  autoComplete="given-name"
                  value={formData.nombre}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="apellido"
                  label="Apellido"
                  name="apellido"
                  autoComplete="family-name"
                  value={formData.apellido}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  onKeyDown={(e) => {
                    // Prevenir navegación con Alt + @
                    if (e.altKey && e.keyCode === 64) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Contraseña"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  onKeyDown={(e) => {
                    // Prevenir navegación con Alt + @
                    if (e.altKey && e.keyCode === 64) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirmar Contraseña"
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  onKeyDown={(e) => {
                    // Prevenir navegación con Alt + @
                    if (e.altKey && e.keyCode === 64) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel id="tipoUsuario-label">Tipo de Usuario</InputLabel>
                  <Select
                    labelId="tipoUsuario-label"
                    id="tipoUsuario"
                    name="tipoUsuario"
                    value={formData.tipoUsuario}
                    label="Tipo de Usuario"
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <MenuItem value="usuario">Usuario</MenuItem>
                    <MenuItem value="jugador">Jugador</MenuItem>
                    <MenuItem value="arbitro">Árbitro</MenuItem>
                    <MenuItem value="organizador">Organizador</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="telefono"
                  label="Teléfono"
                  name="telefono"
                  autoComplete="tel"
                  value={formData.telefono}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                  <DatePicker
                    label="Fecha de Nacimiento"
                    value={formData.fechaNacimiento}
                    onChange={(newValue) => {
                      setFormData({
                        ...formData,
                        fechaNacimiento: newValue
                      });
                    }}
                    maxDate={dayjs()}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth disabled={loading} />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Crear Cuenta'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                ¿Ya tienes cuenta? Inicia sesión aquí
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
