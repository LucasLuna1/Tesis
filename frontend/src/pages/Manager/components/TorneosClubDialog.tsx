import { asText } from '../../../utils/text';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Close,
  EmojiEvents,
  Star,
  TrendingUp,
  History
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

interface TorneosClubDialogProps {
  open: boolean;
  onClose: () => void;
  club: any;
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
      id={`torneos-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const TorneosClubDialog: React.FC<TorneosClubDialogProps> = ({ open, onClose, club }) => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [torneosActivos, setTorneosActivos] = useState<any[]>([]);
  const [torneosFinalizados, setTorneosFinalizados] = useState<any[]>([]);
  const [posiciones, setPosiciones] = useState<any[]>([]);

  const cargarTorneos = useCallback(async () => {
    if (!club?.id) {

      return;
    }

    try {
      setLoading(true);

      // Obtener torneos del club desde la API
      const response = await api.get(`/torneos/equipo/${club.id}`);

      const { torneosActivos: activos, torneosFinalizados: finalizados, posiciones: pos } = response.data;
      
      setTorneosActivos(activos || []);
      setTorneosFinalizados(finalizados || []);
      setPosiciones(pos || []);
      
    } catch (error: any) {
      console.error('Error cargando torneos:', error);
      const mensajeError = error.response?.data?.error || 'Error al cargar información de torneos';
      toast.error(mensajeError);
      
      // Si hay error, limpiar los estados
      setTorneosActivos([]);
      setTorneosFinalizados([]);
      setPosiciones([]);
    } finally {
      setLoading(false);
    }
  }, [club?.id]);

  useEffect(() => {
    if (open && club?.id) {
      cargarTorneos();
    }
  }, [open, club, cargarTorneos]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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
            <EmojiEvents color="primary" />
            <Typography variant="h6">Torneos del Club</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab 
            label="Posición Actual" 
            icon={<Star />} 
            iconPosition="start"
          />
          <Tab 
            label={`Activos (${torneosActivos.length})`}
            icon={<TrendingUp />}
            iconPosition="start"
          />
          <Tab 
            label={`Histórico (${torneosFinalizados.length})`}
            icon={<History />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        {loading ? (
          <Box textAlign="center" py={6}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Cargando información de torneos...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Tab: Posición Actual */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ px: 3 }}>
                {posiciones.length === 0 ? (
                  <Alert severity="info">
                    No estás participando en ningún torneo actualmente
                  </Alert>
                ) : (
                  <List>
                    {posiciones.map((pos: any, index: number) => (
                      <Card 
                        key={index} 
                        sx={{ 
                          mb: 2,
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s ease-in-out'
                          }
                        }}
                        onClick={() => navigate(`/torneos/${pos.torneoId}`)}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="h6">{pos.torneoNombre}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {pos.categoria}
                              </Typography>
                            </Box>
                            <Chip
                              label={`Posición ${pos.posicion}`}
                              color={pos.posicion <= 3 ? 'success' : 'default'}
                              size="medium"
                            />
                          </Box>
                          <Divider sx={{ my: 2 }} />
                          <Box display="flex" gap={4}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Puntos
                              </Typography>
                              <Typography variant="h6">{pos.puntos}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Partidos Jugados
                              </Typography>
                              <Typography variant="h6">{pos.partidosJugados}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Ganados
                              </Typography>
                              <Typography variant="h6" color="success.main">
                                {pos.ganados}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </List>
                )}
              </Box>
            </TabPanel>

            {/* Tab: Torneos Activos */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ px: 3 }}>
                {torneosActivos.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <EmojiEvents sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                      No hay torneos activos
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Inscríbete en torneos desde la sección "Torneos"
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {torneosActivos.map((torneo: any) => (
                      <ListItem
                        key={torneo.id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            boxShadow: 2,
                            transform: 'translateX(4px)',
                            transition: 'all 0.2s ease-in-out'
                          }
                        }}
                        onClick={() => navigate(`/torneos/${torneo.id}`)}
                      >
                        <Box width="100%" display="flex" justifyContent="space-between" alignItems="center">
                          <ListItemText
                            primary={torneo.nombre}
                            secondary={asText(torneo.categoria)}
                          />
                          <Chip
                            label={torneo.estado === 'en_curso' ? 'En Curso' : 'Planificado'}
                            color={torneo.estado === 'en_curso' ? 'success' : 'info'}
                            size="small"
                          />
                        </Box>
                        <Box width="100%" display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                          <Typography variant="caption" color="text.secondary">
                            Inicio: {torneo.fechaInicioFormatted || (torneo.fechaInicio ? new Date(torneo.fechaInicio).toLocaleDateString() : 'N/A')}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/torneos/${torneo.id}`);
                            }}
                            sx={{ mt: -1 }}
                          >
                            Ver Detalles
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </TabPanel>

            {/* Tab: Histórico */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ px: 3 }}>
                {torneosFinalizados.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <History sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                      No hay torneos finalizados
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {torneosFinalizados.map((torneo: any) => (
                      <ListItem
                        key={torneo.id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            boxShadow: 2,
                            transform: 'translateX(4px)',
                            transition: 'all 0.2s ease-in-out'
                          }
                        }}
                        onClick={() => navigate(`/torneos/${torneo.id}`)}
                      >
                        <Box width="100%" display="flex" justifyContent="space-between" alignItems="center">
                          <ListItemText
                            primary={torneo.nombre}
                            secondary={torneo.categoria}
                          />
                          {torneo.posicionFinal && (
                            <Chip
                              label={`${torneo.posicionFinal}° lugar`}
                              color={torneo.posicionFinal <= 3 ? 'success' : 'default'}
                              size="small"
                            />
                          )}
                        </Box>
                        <Box width="100%" display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                          <Typography variant="caption" color="text.secondary">
                            Finalizado: {torneo.fechaFinFormatted || (torneo.fechaFin ? new Date(torneo.fechaFin).toLocaleDateString() : 'N/A')}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/torneos/${torneo.id}`);
                            }}
                            sx={{ mt: -1 }}
                          >
                            Ver Detalles
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </TabPanel>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TorneosClubDialog;

