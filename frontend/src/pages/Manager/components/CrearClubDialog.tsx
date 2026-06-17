import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Avatar,
  MenuItem,
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';
import { Close, PhotoCamera, Groups } from '@mui/icons-material';
import api from '../../../services/api';
import toast from 'react-hot-toast';

interface CrearClubDialogProps {
  open: boolean;
  onClose: () => void;
  onClubCreado: (club: any) => void;
}

const CATEGORIAS_DISPONIBLES = [
  'M14', 'M15', 'M16', 'M17', 'M18', 'M19',
  'Preintermedia', 'Intermedia', 'Primera'
];

const CrearClubDialog: React.FC<CrearClubDialogProps> = ({ open, onClose, onClubCreado }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    club: '',
    categorias: [] as string[],
    ciudad: '',
    pais: 'Argentina',
    telefono: '',
    email: '',
    sitioWeb: '',
    descripcion: '',
    deporte: 'Rugby',
    division: 'Primera'
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoriasChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      categorias: typeof value === 'string' ? value.split(',') : value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error('El nombre del equipo es requerido');
      return;
    }
    if (!formData.club.trim()) {
      toast.error('El nombre del club es requerido');
      return;
    }
    if (!formData.ciudad.trim()) {
      toast.error('La ciudad es requerida');
      return;
    }

    try {
      setLoading(true);

      // Preparar datos para enviar con FormData (para incluir el logo)
      const formDataToSend = new FormData();
      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('club', formData.club);
      formDataToSend.append('categorias', JSON.stringify(formData.categorias));
      formDataToSend.append('ciudad', formData.ciudad);
      formDataToSend.append('pais', formData.pais);
      formDataToSend.append('telefono', formData.telefono);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('sitioWeb', formData.sitioWeb);
      formDataToSend.append('descripcion', formData.descripcion);
      formDataToSend.append('deporte', formData.deporte);
      formDataToSend.append('division', formData.division);

      // Si hay logo, agregarlo
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }

      // Crear el club
      const response = await api.post('/managers/club', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const clubCreado = response.data.club;

      toast.success('Club creado exitosamente');
      onClubCreado(clubCreado);
      
      // Reset form
      setFormData({
        nombre: '',
        club: '',
        categorias: [],
        ciudad: '',
        pais: 'Argentina',
        telefono: '',
        email: '',
        sitioWeb: '',
        descripcion: '',
        deporte: 'Rugby',
        division: 'Primera'
      });
      setLogoFile(null);
      setLogoPreview('');
    } catch (error: any) {
      console.error('Error creando club:', error);
      toast.error(error.response?.data?.error || 'Error al crear el club');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Groups color="primary" />
            <Typography variant="h6">Crear Mi Club</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Logo del club */}
          <Grid item xs={12} display="flex" justifyContent="center">
            <Box textAlign="center">
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="logo-club-upload"
                type="file"
                onChange={handleLogoChange}
              />
              <label htmlFor="logo-club-upload" style={{ cursor: 'pointer' }}>
                <Avatar
                  src={logoPreview}
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    border: '2px dashed',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <PhotoCamera sx={{ fontSize: 32 }} />
                </Avatar>
              </label>
              <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                Logo del club (opcional)
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Nombre del Equipo"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              placeholder="Ej: Aguará Guazú"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Nombre del Club"
              name="club"
              value={formData.club}
              onChange={handleInputChange}
              placeholder="Ej: Aguará Guazú Rugby Club"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Categorías</InputLabel>
              <Select
                multiple
                value={formData.categorias}
                onChange={handleCategoriasChange}
                input={<OutlinedInput label="Categorías" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {CATEGORIAS_DISPONIBLES.map((categoria) => (
                  <MenuItem key={categoria} value={categoria}>
                    {categoria}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Ciudad"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleInputChange}
              placeholder="Ej: Aguilares"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="País"
              name="pais"
              value={formData.pais}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Teléfono"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              placeholder="Ej: +54 381 1234567"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="contacto@club.com"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descripción"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              placeholder="Describe tu club, su historia, valores..."
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Groups />}
        >
          {loading ? 'Creando...' : 'Crear Club'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrearClubDialog;



