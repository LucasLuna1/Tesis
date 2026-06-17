import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Assessment,
  SportsRugby,
  Gavel,
  People,
  Download,
  Refresh,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import api from '../../services/api';

const Reportes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
    estado: '',
    tipoReporte: 'partidos'
  });
  
  // Estados para datos
  const [reportePartidos, setReportePartidos] = useState(null);
  const [reporteArbitros, setReporteArbitros] = useState(null);
  const [reporteEquipos, setReporteEquipos] = useState(null);
  const [reporteConsolidado, setReporteConsolidado] = useState(null);
  const [saludSistema, setSaludSistema] = useState(null);

  // Helpers: derivar reportes de árbitros/equipos/consolidado desde partidos
  const buildFromPartidos = (partidosData) => {
    if (!partidosData) return { arbitros: { lista: [] }, equipos: { lista: [] }, consolidado: { totales: {} } };
    const partidos = partidosData.partidos || [];
    const arbitroIdToStats = new Map();
    const equipoIdToStats = new Map();
    partidos.forEach((p) => {
      // Árbitros
      const arbitro = p.arbitros?.principal || p.arbitro || p.arbitroPrincipal;
      if (arbitro) {
        const key = arbitro.id || arbitro.nombre || JSON.stringify(arbitro);
        const stat = arbitroIdToStats.get(key) || { id: arbitro.id || key, nombre: arbitro.nombre || key, partidos: 0, ratingPromedio: 0, _ratings: [], tarjetas: 0, ultimoPartido: null };
        stat.partidos += 1;
        if (p.ratingArbitro != null) stat._ratings.push(Number(p.ratingArbitro));
        const tarjetas = (p.incidencias || []).filter(i => i.tipo && (''+i.tipo).toLowerCase().includes('tarjeta')).length;
        stat.tarjetas += tarjetas;
        const fecha = p.fecha?.toDate ? p.fecha.toDate() : new Date(p.fecha);
        if (!stat.ultimoPartido || (fecha && fecha > new Date(stat.ultimoPartido))) stat.ultimoPartido = fecha?.toISOString();
        arbitroIdToStats.set(key, stat);
      }
      // Equipos
      const equipos = [p.equipoLocal, p.equipoVisitante].filter(Boolean);
      equipos.forEach((eq, idx) => {
        const key = (typeof eq === 'object' ? (eq.id || eq.nombre) : eq) || `eq_${idx}`;
        const nombre = typeof eq === 'object' ? (eq.nombre || key) : key;
        const stat = equipoIdToStats.get(key) || { id: key, nombre, jugados: 0, ganados: 0, empatados: 0, perdidos: 0, puntos: 0 };
        stat.jugados += 1;
        if (p.resultado) {
          const l = Number(p.resultado.puntosLocal || 0);
          const v = Number(p.resultado.puntosVisitante || 0);
          const isLocal = idx === 0;
          const misPuntos = isLocal ? l : v;
          const susPuntos = isLocal ? v : l;
          if (misPuntos > susPuntos) stat.ganados += 1;
          else if (misPuntos === susPuntos) stat.empatados += 1;
          else stat.perdidos += 1;
          stat.puntos += misPuntos;
        }
        equipoIdToStats.set(key, stat);
      });
    });
    // calcular promedios
    const arbitrosLista = Array.from(arbitroIdToStats.values()).map(a => ({ ...a, ratingPromedio: a._ratings.length ? a._ratings.reduce((s,x)=>s+x,0)/a._ratings.length : 0 }));
    const equiposLista = Array.from(equipoIdToStats.values());
    const consolidado = {
      totales: {
        torneos: partidosData.resumen?.torneos ?? partidosData.torneos?.length ?? 0,
        equipos: equiposLista.length,
        partidos: partidos.length,
        arbitros: arbitrosLista.length,
      }
    };
    return { arbitros: { lista: arbitrosLista }, equipos: { lista: equiposLista }, consolidado };
  };
  
  // Estados para diálogos
  const [openDetalles, setOpenDetalles] = useState(false);
  const [detallesSeleccionados, setDetallesSeleccionados] = useState(null);

  const cargarReportePartidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros.estado) params.append('estado', filtros.estado);
      
      const response = await api.get(`/reportes/partidos?${params.toString()}`);
      setReportePartidos(response.data);
    } catch (error) {
      setError('Error cargando reporte de partidos');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.fechaDesde, filtros.fechaHasta, filtros.estado]);


  const cargarValidaciones = async () => {
    setLoading(true);
    try {
      const response = await api.get('/validaciones/sistema');
      setSaludSistema(response.data);
    } catch (error) {
      setError('Error cargando validaciones del sistema');
    } finally {
      setLoading(false);
    }
  };

  const exportarReporte = async (formato) => {
    try {
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros.estado) params.append('estado', filtros.estado);
      params.append('tipo', filtros.tipoReporte);
      
      const response = await api.get(`/reportes/exportar/${formato}?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${filtros.tipoReporte}_${new Date().toISOString().split('T')[0]}.${formato}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError('Error exportando reporte');
    }
  };

  const verDetalles = (tipo, datos) => {
    setDetallesSeleccionados({ tipo, datos });
    setOpenDetalles(true);
  };

  useEffect(() => {
    if (tabValue === 0) {
      cargarReportePartidos();
    }
  }, [tabValue, cargarReportePartidos]);

  useEffect(() => {
    // Ajustar tipoReporte a opciones válidas del Select (evita warning MUI)
    if (tabValue === 0 && filtros.tipoReporte !== 'partidos') setFiltros(prev => ({ ...prev, tipoReporte: 'partidos' }));
    if (tabValue === 1 && filtros.tipoReporte !== 'arbitros') setFiltros(prev => ({ ...prev, tipoReporte: 'arbitros' }));
    if (tabValue === 2 && filtros.tipoReporte !== 'equipos') setFiltros(prev => ({ ...prev, tipoReporte: 'equipos' }));
    if (tabValue === 3 && filtros.tipoReporte !== 'partidos') setFiltros(prev => ({ ...prev, tipoReporte: 'partidos' }));
    if (tabValue === 4 && filtros.tipoReporte !== 'partidos') setFiltros(prev => ({ ...prev, tipoReporte: 'partidos' }));
  }, [tabValue, filtros.tipoReporte]);

  const cargarReporteArbitros = useCallback(async () => {
    setLoading(true);
    try {
      // Backend puede no tener endpoint dedicado; derivamos desde partidos
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      const response = await api.get(`/reportes/partidos?${params.toString()}`);
      const derived = buildFromPartidos(response.data);
      setReporteArbitros(derived.arbitros);
    } catch (error) {
      setError('Error cargando reporte de árbitros');
    } finally {
      setLoading(false);
    }
  }, [filtros.fechaDesde, filtros.fechaHasta]);

  const cargarReporteEquipos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      const response = await api.get(`/reportes/partidos?${params.toString()}`);
      const derived = buildFromPartidos(response.data);
      setReporteEquipos(derived.equipos);
    } catch (error) {
      setError('Error cargando reporte de equipos');
    } finally {
      setLoading(false);
    }
  }, [filtros.fechaDesde, filtros.fechaHasta]);

  const cargarReporteConsolidado = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      const response = await api.get(`/reportes/partidos?${params.toString()}`);
      const derived = buildFromPartidos(response.data);
      setReporteConsolidado(derived.consolidado);
    } catch (error) {
      setError('Error cargando reporte consolidado');
    } finally {
      setLoading(false);
    }
  }, [filtros.fechaDesde, filtros.fechaHasta]);

  useEffect(() => {
    if (tabValue === 1) cargarReporteArbitros();
    if (tabValue === 2) cargarReporteEquipos();
    if (tabValue === 3) cargarReporteConsolidado();
    if (tabValue === 4) cargarValidaciones();
  }, [tabValue, cargarReporteArbitros, cargarReporteEquipos, cargarReporteConsolidado]);

  const renderFiltros = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Filtros de Reporte
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Fecha Desde"
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Fecha Hasta"
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="programado">Programado</MenuItem>
                <MenuItem value="En Curso">En Curso</MenuItem>
                <MenuItem value="finalizado">Finalizado</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Reporte</InputLabel>
              <Select
                value={filtros.tipoReporte}
                onChange={(e) => setFiltros({...filtros, tipoReporte: e.target.value})}
              >
                <MenuItem value="partidos">Partidos</MenuItem>
                <MenuItem value="arbitros">Árbitros</MenuItem>
                <MenuItem value="equipos">Equipos</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => {
              if (tabValue === 0) cargarReportePartidos();
              else if (tabValue === 1) cargarReporteArbitros();
              else if (tabValue === 2) cargarReporteEquipos();
              else if (tabValue === 3) cargarReporteConsolidado();
              else if (tabValue === 4) cargarValidaciones();
            }}
          >
            Actualizar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportarReporte('csv')}
          >
            Exportar CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportarReporte('json')}
          >
            Exportar JSON
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const renderReportePartidos = () => {
    if (!reportePartidos) return null;

    return (
      <Grid container spacing={3}>
        {/* Resumen */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumen de Partidos
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {reportePartidos.resumen.totalPartidos}
                    </Typography>
                    <Typography variant="body2">Total Partidos</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {reportePartidos.resumen.partidosFinalizados}
                    </Typography>
                    <Typography variant="body2">Finalizados</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      {reportePartidos.resumen.totalPuntos}
                    </Typography>
                    <Typography variant="body2">Total Puntos</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {reportePartidos.resumen.totalIncidencias}
                    </Typography>
                    <Typography variant="body2">Incidencias</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Tabla de partidos */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lista de Partidos
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">Fecha</TableCell>
                      <TableCell align="center">Equipos</TableCell>
                      <TableCell align="center">Resultado</TableCell>
                      <TableCell align="center">Estado</TableCell>
                      <TableCell align="center">Incidencias</TableCell>
                      <TableCell align="center">Duración</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportePartidos.partidos.map((partido) => (
                      <TableRow key={partido.id}>
                        <TableCell align="center">
                          {(() => {
                            try {
                              // Manejar tanto objetos Date como Timestamps de Firestore
                              const fecha = partido.fecha?.toDate ? partido.fecha.toDate() : new Date(partido.fecha);
                              return fecha.toLocaleDateString('es-ES');
                            } catch (error) {
                              console.error('Error parseando fecha:', error, partido.fecha);
                              return 'Fecha inválida';
                            }
                          })()}
                        </TableCell>
                        <TableCell align="center">
                          {partido.equipoLocal?.nombre} vs {partido.equipoVisitante?.nombre}
                        </TableCell>
                        <TableCell align="center">
                          {partido.resultado ? 
                            `${partido.resultado.puntosLocal || 0} - ${partido.resultado.puntosVisitante || 0}` : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={partido.estado} 
                            color={partido.estado === 'finalizado' ? 'success' : 
                                   partido.estado === 'en_curso' ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">{partido.totalIncidencias}</TableCell>
                        <TableCell align="center">{partido.duracionTotal} min</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            onClick={() => verDetalles('partido', partido)}
                          >
                            Ver Detalles
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderValidaciones = () => {
    if (!saludSistema) return null;

    return (
      <Grid container spacing={3}>
        {/* Estado del sistema */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estado del Sistema
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color={saludSistema.saludSistema.equipos ? 'success.main' : 'error.main'}>
                      {saludSistema.estadisticas.equipos.activos}
                    </Typography>
                    <Typography variant="body2">Equipos Activos</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color={saludSistema.saludSistema.arbitros ? 'success.main' : 'error.main'}>
                      {saludSistema.estadisticas.arbitros.activos}
                    </Typography>
                    <Typography variant="body2">Árbitros Activos</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color={saludSistema.saludSistema.canchas ? 'success.main' : 'error.main'}>
                      {saludSistema.estadisticas.canchas.activas}
                    </Typography>
                    <Typography variant="body2">Canchas Activas</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {saludSistema.estadisticas.partidos.total}
                    </Typography>
                    <Typography variant="body2">Total Partidos</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recomendaciones */}
        {saludSistema.recomendaciones.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recomendaciones
                </Typography>
                <List>
                  {saludSistema.recomendaciones.map((recomendacion, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={recomendacion} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderReporteArbitros = () => {
    if (!reporteArbitros) return null;
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Árbitros - Desempeño y Asignaciones
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Árbitro</TableCell>
                      <TableCell align="center">Partidos</TableCell>
                      <TableCell align="center">Promedio Calificación</TableCell>
                      <TableCell align="center">Tarjetas Mostradas</TableCell>
                      <TableCell align="center">Último Partido</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reporteArbitros.lista.map((a) => (
                      <TableRow key={a.id} hover>
                        <TableCell>{a.nombre}</TableCell>
                        <TableCell align="center">{a.partidos || 0}</TableCell>
                        <TableCell align="center">{(a.ratingPromedio ?? 0).toFixed(2)}</TableCell>
                        <TableCell align="center">{a.tarjetas || 0}</TableCell>
                        <TableCell align="center">{a.ultimoPartido ? new Date(a.ultimoPartido).toLocaleDateString('es-ES') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderReporteEquipos = () => {
    if (!reporteEquipos) return null;
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Equipos - Rendimiento
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Equipo</TableCell>
                      <TableCell align="center">PJ</TableCell>
                      <TableCell align="center">PG</TableCell>
                      <TableCell align="center">PE</TableCell>
                      <TableCell align="center">PP</TableCell>
                      <TableCell align="center">Pts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reporteEquipos.lista.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell>{e.nombre}</TableCell>
                        <TableCell align="center">{e.jugados || 0}</TableCell>
                        <TableCell align="center">{e.ganados || 0}</TableCell>
                        <TableCell align="center">{e.empatados || 0}</TableCell>
                        <TableCell align="center">{e.perdidos || 0}</TableCell>
                        <TableCell align="center">{e.puntos || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderReporteConsolidado = () => {
    if (!reporteConsolidado) return null;
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consolidado - Resumen General
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">{reporteConsolidado?.totales?.torneos ?? 0}</Typography>
                    <Typography variant="body2">Torneos</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">{reporteConsolidado?.totales?.equipos ?? 0}</Typography>
                    <Typography variant="body2">Equipos</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">{reporteConsolidado?.totales?.partidos ?? 0}</Typography>
                    <Typography variant="body2">Partidos</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">{reporteConsolidado?.totales?.arbitros ?? 0}</Typography>
                    <Typography variant="body2">Árbitros</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4, pb: 10 }}>
      
      {renderFiltros()}
      
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Partidos" icon={<SportsRugby />} />
        <Tab label="Árbitros" icon={<Gavel />} />
        <Tab label="Equipos" icon={<People />} />
        <Tab label="Consolidado" icon={<Assessment />} />
        <Tab label="Validaciones" icon={<CheckCircle />} />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      )}

      {!loading && tabValue === 0 && renderReportePartidos()}
      {!loading && tabValue === 1 && renderReporteArbitros()}
      {!loading && tabValue === 2 && renderReporteEquipos()}
      {!loading && tabValue === 3 && renderReporteConsolidado()}
      {!loading && tabValue === 4 && renderValidaciones()}

      {/* Dialog para detalles */}
      <Dialog open={openDetalles} onClose={() => setOpenDetalles(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Detalles del Partido
        </DialogTitle>
        <DialogContent>
          {detallesSeleccionados && detallesSeleccionados.tipo === 'partido' && (
            <Box sx={{ mt: 2 }}>
              {/* Información básica del partido */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Información General
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Fecha del Partido
                      </Typography>
                      <Typography variant="body1">
                        {(() => {
                          try {
                            const fecha = detallesSeleccionados.datos.fecha?.toDate ? 
                              detallesSeleccionados.datos.fecha.toDate() : 
                              new Date(detallesSeleccionados.datos.fecha);
                            return fecha.toLocaleDateString('es-ES');
                          } catch {
                            return 'Fecha no disponible';
                          }
                        })()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Hora de Inicio
                      </Typography>
                      <Typography variant="body1">
                        {detallesSeleccionados.datos.horaInicio || 'No especificada'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Fase del Torneo
                      </Typography>
                      <Typography variant="body1">
                        {detallesSeleccionados.datos.fase || 'Regular'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Jornada
                      </Typography>
                      <Typography variant="body1">
                        {detallesSeleccionados.datos.jornada || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Equipos participantes */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Equipos Participantes
                  </Typography>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Box textAlign="center">
                        {detallesSeleccionados.datos.equipoLocalLogo && (
                          <img 
                            src={detallesSeleccionados.datos.equipoLocalLogo} 
                            alt="Logo Local" 
                            style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 8 }}
                          />
                        )}
                        <Typography variant="h6">
                          {typeof detallesSeleccionados.datos.equipoLocal === 'object' 
                            ? detallesSeleccionados.datos.equipoLocal?.nombre 
                            : detallesSeleccionados.datos.equipoLocal || 'Equipo Local'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Local
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4} textAlign="center">
                      <Typography variant="h4" color="primary">
                        VS
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box textAlign="center">
                        {detallesSeleccionados.datos.equipoVisitanteLogo && (
                          <img 
                            src={detallesSeleccionados.datos.equipoVisitanteLogo} 
                            alt="Logo Visitante" 
                            style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 8 }}
                          />
                        )}
                        <Typography variant="h6">
                          {typeof detallesSeleccionados.datos.equipoVisitante === 'object' 
                            ? detallesSeleccionados.datos.equipoVisitante?.nombre 
                            : detallesSeleccionados.datos.equipoVisitante || 'Equipo Visitante'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Visitante
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Resultado del partido */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resultado
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
                        <Typography variant="h3" color="primary">
                          {detallesSeleccionados.datos.resultado?.puntosLocal || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {typeof detallesSeleccionados.datos.equipoLocal === 'object' 
                            ? detallesSeleccionados.datos.equipoLocal?.nombre 
                            : detallesSeleccionados.datos.equipoLocal || 'Local'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
                        <Typography variant="h3" color="primary">
                          {detallesSeleccionados.datos.resultado?.puntosVisitante || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {typeof detallesSeleccionados.datos.equipoVisitante === 'object' 
                            ? detallesSeleccionados.datos.equipoVisitante?.nombre 
                            : detallesSeleccionados.datos.equipoVisitante || 'Visitante'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* Estadísticas detalladas del resultado */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Estadísticas Detalladas
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Tries Local</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.resultado?.triesLocal || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Tries Visitante</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.resultado?.triesVisitante || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Conversiones Local</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.resultado?.conversionesLocal || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Conversiones Visitante</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.resultado?.conversionesVisitante || 0}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>

              {/* Estado y estadísticas del partido */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Estado y Estadísticas
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Estado del Partido
                      </Typography>
                      <Chip 
                        label={detallesSeleccionados.datos.estado || 'programado'} 
                        color={detallesSeleccionados.datos.estado === 'finalizado' ? 'success' : 
                               detallesSeleccionados.datos.estado === 'en_curso' ? 'warning' : 'default'}
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Duración Total
                      </Typography>
                      <Typography variant="body1">
                        {detallesSeleccionados.datos.duracionTotal || detallesSeleccionados.datos.duracion || 0} minutos
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total de Incidencias
                      </Typography>
                      <Typography variant="body1">
                        {detallesSeleccionados.datos.totalIncidencias || detallesSeleccionados.datos.incidencias?.length || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Árbitro Principal
                      </Typography>
                      <Typography variant="body1">
                        {detallesSeleccionados.datos.arbitros?.principal?.nombre || 'Por asignar'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Estadísticas avanzadas */}
              {detallesSeleccionados.datos.estadisticas && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Estadísticas Avanzadas
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Scrums Local</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.estadisticas.scrumsLocal || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Scrums Visitante</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.estadisticas.scrumsVisitante || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Lineouts Local</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.estadisticas.lineoutsLocal || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Lineouts Visitante</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.estadisticas.lineoutsVisitante || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Tarjetas Amarillas Local</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.estadisticas.tarjetasAmarillasLocal || 0}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Tarjetas Amarillas Visitante</Typography>
                        <Typography variant="body1">{detallesSeleccionados.datos.estadisticas.tarjetasAmarillasVisitante || 0}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
          
          {/* Fallback para otros tipos de detalles */}
          {detallesSeleccionados && detallesSeleccionados.tipo !== 'partido' && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(detallesSeleccionados.datos, null, 2)}
            </pre>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetalles(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reportes;
