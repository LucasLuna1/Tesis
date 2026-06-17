import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  Edit,
  LocationOn,
  SportsRugby
} from '@mui/icons-material';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { DateUtils } from '../../utils/dateUtils';

const EditarPartidoDialog = ({ open, onClose, partido, canchas = [], arbitros = [], onPartidoUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    canchaId: '',
    arbitroId: '',
    fecha: '',
    horaInicio: '',
    duracion: 90,
    observaciones: '',
    estado: 'programado'
  });

  useEffect(() => {
    if (partido && open) {
      setFormData({
        canchaId: partido.canchaId || '',
        arbitroId: partido.arbitroId || '',
        fecha: DateUtils.formatDateForStorage(partido.fecha),
        horaInicio: partido.horaInicio || '',
        duracion: partido.duracion || 90,
        observaciones: partido.observaciones || '',
        estado: partido.estado || 'programado'
      });
    }
  }, [partido, open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const updateData = {
        canchaId: formData.canchaId,
        arbitroId: formData.arbitroId,
        // 🚀 OPTIMIZACIÓN: Mantener la fecha como string YYYY-MM-DD para evitar problemas de zona horaria
        fecha: formData.fecha || null,
        horaInicio: formData.horaInicio,
        duracion: parseInt(formData.duracion),
        observaciones: formData.observaciones,
        estado: formData.estado
      };


      await api.put(`/partidos/${partido.id}`, updateData);
      
      toast.success('Partido actualizado correctamente');
      
      if (onPartidoUpdated) {
        onPartidoUpdated();
      }
      
      onClose();
      
    } catch (error) {
      console.error('❌ Error actualizando partido:', error);
      toast.error('Error al actualizar el partido: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit color="primary" />
          <Typography variant="h6">
            Editar Partido
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {partido && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Equipo Local' : partido.equipoLocal || 'Equipo Local'} vs {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Equipo Visitante' : partido.equipoVisitante || 'Equipo Visitante'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Jornada {partido.jornada} - {partido.torneoNombre}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Cancha */}
          <FormControl fullWidth>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn fontSize="small" />
                Cancha
              </Box>
            </InputLabel>
            <Select
              value={formData.canchaId}
              onChange={(e) => handleInputChange('canchaId', e.target.value)}
              label="Cancha"
            >
              <MenuItem value="">
                <em>Sin cancha asignada</em>
              </MenuItem>
              {canchas.map((cancha) => (
                <MenuItem key={cancha.id} value={cancha.id}>
                  {cancha.nombre} - {cancha.ubicacion}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Árbitro */}
          <FormControl fullWidth>
            <InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SportsRugby fontSize="small" />
                Árbitro
              </Box>
            </InputLabel>
            <Select
              value={formData.arbitroId}
              onChange={(e) => handleInputChange('arbitroId', e.target.value)}
              label="Árbitro"
            >
              <MenuItem value="">
                <em>Sin árbitro asignado</em>
              </MenuItem>
              {arbitros.map((arbitro) => (
                <MenuItem key={arbitro.id} value={arbitro.id}>
                  {arbitro.nombre} {arbitro.apellido}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Fecha */}
          <TextField
            fullWidth
            label="Fecha del partido"
            type="date"
            value={formData.fecha}
            onChange={(e) => handleInputChange('fecha', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Hora de inicio */}
          <TextField
            fullWidth
            label="Hora de inicio"
            type="time"
            value={formData.horaInicio}
            onChange={(e) => handleInputChange('horaInicio', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Duración */}
          <TextField
            fullWidth
            label="Duración (minutos)"
            type="number"
            value={formData.duracion}
            onChange={(e) => handleInputChange('duracion', e.target.value)}
            inputProps={{ min: 60, max: 120 }}
          />

          {/* Estado */}
          <FormControl fullWidth>
            <InputLabel>Estado del partido</InputLabel>
            <Select
              value={formData.estado}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              label="Estado del partido"
            >
              <MenuItem value="programado">Programado</MenuItem>
              <MenuItem value="En Curso">En curso</MenuItem>
              <MenuItem value="finalizado">Finalizado</MenuItem>
              <MenuItem value="cancelado">Cancelado</MenuItem>
              <MenuItem value="aplazado">Aplazado</MenuItem>
            </Select>
          </FormControl>

          {/* Observaciones */}
          <TextField
            fullWidth
            label="Observaciones"
            multiline
            rows={3}
            value={formData.observaciones}
            onChange={(e) => handleInputChange('observaciones', e.target.value)}
            placeholder="Notas adicionales sobre cambios o urgencias..."
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Edit />}
        >
          {loading ? 'Actualizando...' : 'Actualizar Partido'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditarPartidoDialog;
