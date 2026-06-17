import { asText } from '../../utils/text';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Divider
} from '@mui/material';
import {
  SportsRugby,
  Schedule,
  LocationOn,
  People,
  PlayArrow
} from '@mui/icons-material';
import { torneosGestionService } from '../../services/api';
import { torneosService } from '../../services/api';
import { arbitrosService } from '../../services/api';
import { canchasService } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CrearPartidoTorneo = ({ 
  open, 
  onClose, 
  onPartidoCreado 
}) => {
  const [torneos, setTorneos] = useState([]);
  const [torneoSeleccionado, setTorneoSeleccionado] = useState('');
  const [equiposTorneo, setEquiposTorneo] = useState([]);
  const [arbitros, setArbitros] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoEquipos, setCargandoEquipos] = useState(false);
  
  const [partidoData, setPartidoData] = useState({
    torneoId: '',
    equipoLocal: '',
    equipoVisitante: '',
    cancha: '',
    arbitro: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '20:00',
    tipoPartido: 'Liga'
  });

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);

      const [torneosRes, arbitrosRes, canchasRes] = await Promise.all([
        torneosService.getAll(),
        arbitrosService.getDisponibles(),
        canchasService.getAll()
      ]);

      // Manejar diferentes estructuras de respuesta
      const torneos = torneosRes.data?.torneos || torneosRes.data || [];
      const arbitros = arbitrosRes.data?.arbitros || arbitrosRes.data || [];
      const canchas = canchasRes.data || [];

      setTorneos(torneos);
      setArbitros(arbitros);
      setCanchas(canchas);
      
      if (arbitros.length === 0) {
        toast.warning('No hay árbitros disponibles');
        
        // Datos de ejemplo para árbitros
        const arbitrosEjemplo = [
          { id: 'arbitro1', nombre: 'Juan', apellido: 'Pérez' },
          { id: 'arbitro2', nombre: 'María', apellido: 'González' },
          { id: 'arbitro3', nombre: 'Carlos', apellido: 'López' }
        ];

        setArbitros(arbitrosEjemplo);
      }
      
      if (torneos.length === 0) {
        toast.warning('No hay torneos disponibles');
        
        // Datos de ejemplo para testing
        const torneosEjemplo = [
          {
            id: 'ejemplo1',
            nombre: 'Copa Rugby Tucumán',
            categoria: 'M14',
            estado: 'En Curso',
            fechaInicio: new Date(),
            fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          {
            id: 'ejemplo2',
            nombre: 'Torneo Intermedia',
            categoria: 'Intermedia',
            estado: 'pendiente',
            fechaInicio: new Date(),
            fechaFin: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
          }
        ];

        setTorneos(torneosEjemplo);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error cargando datos iniciales');
      
      // Datos de ejemplo en caso de error
      const torneosEjemplo = [
        {
          id: 'ejemplo1',
          nombre: 'Copa Rugby Tucumán',
          categoria: 'M14',
          estado: 'En Curso',
          fechaInicio: new Date(),
          fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'ejemplo2',
          nombre: 'Torneo Intermedia',
          categoria: 'Intermedia',
          estado: 'pendiente',
          fechaInicio: new Date(),
          fechaFin: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
        }
      ];

      setTorneos(torneosEjemplo);
      
      // Datos de ejemplo para árbitros en caso de error
      const arbitrosEjemplo = [
        { id: 'arbitro1', nombre: 'Juan', apellido: 'Pérez' },
        { id: 'arbitro2', nombre: 'María', apellido: 'González' },
        { id: 'arbitro3', nombre: 'Carlos', apellido: 'López' }
      ];

      setArbitros(arbitrosEjemplo);
      setCanchas([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarEquiposTorneo = useCallback(async () => {
    try {
      setCargandoEquipos(true);

      const response = await torneosGestionService.getTeamsForMatches(torneoSeleccionado);

      const equipos = response.data?.equipos || response.data || [];

      setEquiposTorneo(equipos);
      
      if (equipos.length === 0) {
        toast.warning('Este torneo no tiene equipos inscritos');
      }
    } catch (error) {
      console.error('Error cargando equipos del torneo:', error);
      toast.error('Error cargando equipos del torneo');
      
      // Datos de ejemplo para equipos
      const equiposEjemplo = [
        { id: 'equipo1', nombre: 'Equipo A', logo: null },
        { id: 'equipo2', nombre: 'Equipo B', logo: null },
        { id: 'equipo3', nombre: 'Equipo C', logo: null }
      ];

      setEquiposTorneo(equiposEjemplo);
    } finally {
      setCargandoEquipos(false);
    }
  }, [torneoSeleccionado]);

  useEffect(() => {
    if (open) {
      cargarDatosIniciales();
    }
  }, [open]);

  useEffect(() => {
    if (torneoSeleccionado) {
      cargarEquiposTorneo();
    }
  }, [torneoSeleccionado, cargarEquiposTorneo]);

  const handleTorneoChange = (event) => {
    const torneoId = event.target.value;
    setTorneoSeleccionado(torneoId);
    setPartidoData(prev => ({
      ...prev,
      torneoId,
      equipoLocal: '',
      equipoVisitante: ''
    }));
  };

  const handleCrearPartido = async () => {
    try {
      if (!partidoData.torneoId || !partidoData.equipoLocal || !partidoData.equipoVisitante || 
          !partidoData.cancha || !partidoData.arbitro) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      if (partidoData.equipoLocal === partidoData.equipoVisitante) {
        toast.error('El equipo local y visitante no pueden ser el mismo');
        return;
      }

      setLoading(true);
      
      // Crear el partido con el torneoId
      const partidoCompleto = {
        ...partidoData,
        fechaHora: new Date(`${partidoData.fecha}T${partidoData.hora}`).toISOString(),
        // Agregar información adicional para el fixture
        equipoLocal: {
          id: partidoData.equipoLocal,
          nombre: equiposTorneo.find(e => e.id === partidoData.equipoLocal)?.nombre || 'Equipo Local'
        },
        equipoVisitante: {
          id: partidoData.equipoVisitante,
          nombre: equiposTorneo.find(e => e.id === partidoData.equipoVisitante)?.nombre || 'Equipo Visitante'
        },
        cancha: {
          id: partidoData.cancha,
          nombre: canchas.find(c => c.id === partidoData.cancha)?.nombre || 'Cancha'
        },
        arbitro: {
          id: partidoData.arbitro,
          nombre: arbitros.find(a => a.id === partidoData.arbitro)?.nombre || 'Árbitro'
        }
      };

      // Crear el partido usando el servicio
      await api.post('/partidos', partidoCompleto);

      toast.success('Partido creado exitosamente y agregado al fixture del torneo');
      onPartidoCreado?.();
      handleClose();
    } catch (error) {
      console.error('Error creando partido:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      
      const errorMessage = error.response?.data?.error || error.message || 'Error al crear el partido';
      toast.error(`Error al crear el partido: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTorneoSeleccionado('');
    setEquiposTorneo([]);
    setPartidoData({
      torneoId: '',
      equipoLocal: '',
      equipoVisitante: '',
      cancha: '',
      arbitro: '',
      fecha: new Date().toISOString().split('T')[0],
      hora: '20:00',
      tipoPartido: 'Liga'
    });
    onClose();
  };

  const torneoSeleccionadoData = torneos.find(t => t.id === torneoSeleccionado);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SportsRugby color="primary" />
          <Typography variant="h6">
            Crear Partido en Torneo
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Selección de Torneo */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Seleccionar Torneo</InputLabel>
              <Select
                value={torneoSeleccionado}
                onChange={handleTorneoChange}
                label="Seleccionar Torneo"
                disabled={loading}
              >
                {loading ? (
                  <MenuItem disabled>
                    <Box display="flex" justifyContent="center" width="100%">
                      <CircularProgress size={20} />
                      <Typography sx={{ ml: 1 }}>Cargando torneos...</Typography>
                    </Box>
                  </MenuItem>
                ) : torneos.length === 0 ? (
                  <MenuItem disabled>
                    <Typography color="text.secondary">No hay torneos disponibles</Typography>
                  </MenuItem>
                ) : (
                  torneos.map((torneo) => (
                    <MenuItem key={torneo.id} value={torneo.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">{torneo.nombre}</Typography>
                        <Chip 
                          label={asText(torneo.categoria)} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                        <Chip 
                          label={torneo.estado} 
                          size="small" 
                          color={torneo.estado === 'En Curso' ? 'success' : 'default'}
                        />
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* Información del Torneo Seleccionado */}
          {torneoSeleccionadoData && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {torneoSeleccionadoData.nombre}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SportsRugby color="primary" />
                        <Typography variant="body2">
                          <strong>Categoría:</strong> {asText(torneoSeleccionadoData.categoria)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Schedule color="primary" />
                        <Typography variant="body2">
                          <strong>Estado:</strong> {torneoSeleccionadoData.estado}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Equipos del Torneo */}
          {torneoSeleccionado && (
            <>
              <Grid item xs={12}>
                <Divider>
                  <Typography variant="subtitle1" color="text.secondary">
                    Equipos del Torneo
                  </Typography>
                </Divider>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Equipo Local</InputLabel>
                  <Select
                    value={partidoData.equipoLocal}
                    onChange={(e) => setPartidoData(prev => ({ ...prev, equipoLocal: e.target.value }))}
                    label="Equipo Local"
                    disabled={cargandoEquipos}
                  >
                    {cargandoEquipos ? (
                      <MenuItem disabled>
                        <Box display="flex" justifyContent="center" width="100%">
                          <CircularProgress size={20} />
                        </Box>
                      </MenuItem>
                    ) : (
                      equiposTorneo.map((equipo) => (
                        <MenuItem key={equipo.id} value={equipo.id}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {equipo.logo && (
                              <CardMedia
                                component="img"
                                sx={{ width: 24, height: 24, borderRadius: 1 }}
                                image={equipo.logo}
                                alt={equipo.nombre}
                              />
                            )}
                            <Typography>{equipo.nombre}</Typography>
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Equipo Visitante</InputLabel>
                  <Select
                    value={partidoData.equipoVisitante}
                    onChange={(e) => setPartidoData(prev => ({ ...prev, equipoVisitante: e.target.value }))}
                    label="Equipo Visitante"
                    disabled={cargandoEquipos}
                  >
                    {cargandoEquipos ? (
                      <MenuItem disabled>
                        <Box display="flex" justifyContent="center" width="100%">
                          <CircularProgress size={20} />
                        </Box>
                      </MenuItem>
                    ) : (
                      equiposTorneo.map((equipo) => (
                        <MenuItem key={equipo.id} value={equipo.id}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {equipo.logo && (
                              <CardMedia
                                component="img"
                                sx={{ width: 24, height: 24, borderRadius: 1 }}
                                image={equipo.logo}
                                alt={equipo.nombre}
                              />
                            )}
                            <Typography>{equipo.nombre}</Typography>
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Cancha y Árbitro */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Cancha</InputLabel>
              <Select
                value={partidoData.cancha}
                onChange={(e) => setPartidoData(prev => ({ ...prev, cancha: e.target.value }))}
                label="Cancha"
              >
                {canchas.map((cancha) => (
                  <MenuItem key={cancha.id} value={cancha.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationOn color="primary" />
                      <Typography>{cancha.nombre}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Árbitro</InputLabel>
              <Select
                value={partidoData.arbitro}
                onChange={(e) => setPartidoData(prev => ({ ...prev, arbitro: e.target.value }))}
                label="Árbitro"
              >
                {arbitros.map((arbitro) => (
                  <MenuItem key={arbitro.id} value={arbitro.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <People color="primary" />
                      <Typography>{arbitro.nombre} {arbitro.apellido}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Fecha y Hora */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Fecha"
              type="date"
              value={partidoData.fecha}
              onChange={(e) => setPartidoData(prev => ({ ...prev, fecha: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Hora"
              type="time"
              value={partidoData.hora}
              onChange={(e) => setPartidoData(prev => ({ ...prev, hora: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        {equiposTorneo.length === 0 && torneoSeleccionado && !cargandoEquipos && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Este torneo no tiene equipos inscritos. Debes agregar equipos antes de crear partidos.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleCrearPartido}
          variant="contained"
          startIcon={<PlayArrow />}
          disabled={loading || !torneoSeleccionado || equiposTorneo.length === 0}
        >
          {loading ? 'Creando...' : 'Crear Partido'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrearPartidoTorneo;
