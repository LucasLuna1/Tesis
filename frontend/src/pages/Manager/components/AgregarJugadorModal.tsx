import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  InputAdornment,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Alert
} from '@mui/material';
import {
  Close,
  Search,
  PersonAdd,
  Person,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import api from '../../../services/api';
import toast from 'react-hot-toast';

interface AgregarJugadorModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  onJugadorAgregado: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`agregar-jugador-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const AgregarJugadorModal: React.FC<AgregarJugadorModalProps> = ({
  open,
  onClose,
  clubId,
  onJugadorAgregado
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<{[key: string]: string}>({});

  const buscarJugadores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/managers/jugadores-disponibles', {
        params: { search: searchQuery }
      });
      setJugadores(response.data.jugadores || []);
    } catch (error) {
      console.error('Error buscando jugadores:', error);
      toast.error('Error al buscar jugadores');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const cargarSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/managers/solicitudes');
      setSolicitudes(response.data.solicitudes || []);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      if (tabValue === 0) {
        buscarJugadores();
      } else {
        cargarSolicitudes();
      }
    }
  }, [open, tabValue, buscarJugadores, cargarSolicitudes]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = () => {
    buscarJugadores();
  };

  const handleAgregarJugador = async (jugadorId: string) => {
    const categoria = selectedCategoria[jugadorId];
    if (!categoria) {
      toast.error('Selecciona una categoría para el jugador');
      return;
    }

    try {
      await api.post(`/managers/club/${clubId}/jugadores`, {
        jugadorId,
        categoria
      });
      
      toast.success('Jugador agregado exitosamente');
      onJugadorAgregado();
      buscarJugadores(); // Refrescar lista
    } catch (error: any) {
      console.error('Error agregando jugador:', error);
      toast.error(error.response?.data?.error || 'Error al agregar jugador');
    }
  };

  const handleResponderSolicitud = async (solicitudId: string, respuesta: 'aceptada' | 'rechazada', categoria?: string) => {
    try {
      await api.post(`/managers/solicitudes/${solicitudId}/responder`, {
        respuesta,
        categoria
      });

      toast.success(respuesta === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud rechazada');
      onJugadorAgregado();
      cargarSolicitudes(); // Refrescar lista
    } catch (error: any) {
      console.error('Error respondiendo solicitud:', error);
      toast.error(error.response?.data?.error || 'Error al procesar solicitud');
    }
  };

  const categorias = ['M14', 'M15', 'M16', 'M17', 'M18', 'M19', 'Intermedia', 'Preintermedia', 'Primera'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PersonAdd color="primary" />
            <Typography variant="h6">Agregar Jugadores</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label={`Buscar Jugadores`} />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                Solicitudes
                {solicitudes.length > 0 && (
                  <Chip 
                    label={solicitudes.length} 
                    size="small" 
                    color="primary"
                  />
                )}
              </Box>
            } 
          />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Tab: Buscar Jugadores */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3 }}>
            <TextField
              fullWidth
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={handleSearch}>Buscar</Button>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            {loading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : jugadores.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Person sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">
                  No se encontraron jugadores
                </Typography>
              </Box>
            ) : (
              <List>
                {jugadores.map((jugador) => (
                  <ListItem
                    key={jugador.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1
                    }}
                  >
                    <Box display="flex" width="100%" alignItems="center">
                      <ListItemAvatar>
                        <Avatar src={jugador.foto ? `http://localhost:5000${jugador.foto}` : ''}>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${jugador.nombre} ${jugador.apellido}`}
                        secondary={jugador.email}
                      />
                      {jugador.equipoNombre && (
                        <Chip
                          label={`Ya en: ${jugador.equipoNombre}`}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Box display="flex" gap={1} width="100%" alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Categoría</InputLabel>
                        <Select
                          value={selectedCategoria[jugador.id] || ''}
                          label="Categoría"
                          onChange={(e) =>
                            setSelectedCategoria({
                              ...selectedCategoria,
                              [jugador.id]: e.target.value
                            })
                          }
                        >
                          {categorias.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                              {cat}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PersonAdd />}
                        onClick={() => handleAgregarJugador(jugador.id)}
                        disabled={!selectedCategoria[jugador.id] || !!jugador.equipoId}
                      >
                        Agregar
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* Tab: Solicitudes */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3 }}>
            {loading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : solicitudes.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Alert severity="info">
                  No hay solicitudes pendientes
                </Alert>
              </Box>
            ) : (
              <List>
                {solicitudes.map((solicitud) => (
                  <ListItem
                    key={solicitud.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 2,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 2
                    }}
                  >
                    <Box display="flex" width="100%" alignItems="center">
                      <ListItemAvatar>
                        <Avatar>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={solicitud.jugadorNombre}
                        secondary={solicitud.jugadorEmail}
                      />
                      <Chip
                        label={solicitud.categoria || 'Sin categoría'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    {solicitud.mensaje && (
                      <>
                        <Divider sx={{ width: '100%' }} />
                        <Typography variant="body2" color="text.secondary">
                          <strong>Mensaje:</strong> {solicitud.mensaje}
                        </Typography>
                      </>
                    )}

                    <Box display="flex" gap={1} width="100%" alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Categoría</InputLabel>
                        <Select
                          value={selectedCategoria[solicitud.id] || solicitud.categoria || ''}
                          label="Categoría"
                          onChange={(e) =>
                            setSelectedCategoria({
                              ...selectedCategoria,
                              [solicitud.id]: e.target.value
                            })
                          }
                        >
                          {categorias.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                              {cat}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() =>
                          handleResponderSolicitud(
                            solicitud.id,
                            'aceptada',
                            selectedCategoria[solicitud.id] || solicitud.categoria
                          )
                        }
                        disabled={!selectedCategoria[solicitud.id] && !solicitud.categoria}
                      >
                        Aceptar
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Cancel />}
                        onClick={() => handleResponderSolicitud(solicitud.id, 'rechazada')}
                      >
                        Rechazar
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarJugadorModal;

