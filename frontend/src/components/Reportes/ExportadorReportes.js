import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  FileDownload,
  PictureAsPdf,
  TableChart,
  DateRange,
  FilterList
} from '@mui/icons-material';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ExportadorReportes = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipoReporte: 'partidos',
    formato: 'pdf',
    fechaDesde: '',
    fechaHasta: '',
    filtros: {
      estado: '',
      categoria: '',
      torneo: '',
      equipo: '',
      arbitro: ''
    },
    incluirGraficos: true,
    incluirEstadisticas: true,
    incluirDetalles: true
  });

  const tiposReporte = [
    {
      id: 'partidos',
      nombre: 'Reporte de Partidos',
      descripcion: 'Listado detallado de partidos con resultados e incidencias',
      icono: '⚽'
    },
    {
      id: 'equipos',
      nombre: 'Reporte de Equipos',
      descripcion: 'Estadísticas y rendimiento de equipos',
      icono: '👥'
    },
    {
      id: 'jugadores',
      nombre: 'Reporte de Jugadores',
      descripcion: 'Rendimiento individual y estadísticas de jugadores',
      icono: '🏃'
    },
    {
      id: 'arbitros',
      nombre: 'Reporte de Árbitros',
      descripcion: 'Actividad y rendimiento de árbitros',
      icono: '👨‍⚖️'
    },
    {
      id: 'torneos',
      nombre: 'Reporte de Torneos',
      descripcion: 'Resumen completo de torneos y clasificaciones',
      icono: '🏆'
    },
    {
      id: 'consolidado',
      nombre: 'Reporte Consolidado',
      descripcion: 'Vista general de toda la actividad deportiva',
      icono: '📊'
    }
  ];

  const formatosDisponibles = [
    {
      id: 'pdf',
      nombre: 'PDF',
      descripcion: 'Formato portable, ideal para impresión',
      icono: <PictureAsPdf color="error" />,
      extensiones: ['pdf']
    },
    {
      id: 'excel',
      nombre: 'Excel',
      descripcion: 'Hoja de cálculo, ideal para análisis',
      icono: <TableChart color="success" />,
      extensiones: ['xlsx', 'xls']
    },
    {
      id: 'csv',
      nombre: 'CSV',
      descripcion: 'Datos separados por comas, universal',
      icono: <TableChart color="info" />,
      extensiones: ['csv']
    }
  ];

  const handleExportar = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('tipo', formData.tipoReporte);
      params.append('formato', formData.formato);
      
      if (formData.fechaDesde) params.append('fechaDesde', formData.fechaDesde);
      if (formData.fechaHasta) params.append('fechaHasta', formData.fechaHasta);
      
      // Agregar filtros
      Object.entries(formData.filtros).forEach(([key, value]) => {
        if (value) params.append(`filtro_${key}`, value);
      });
      
      // Agregar opciones de contenido
      params.append('incluir_graficos', formData.incluirGraficos);
      params.append('incluir_estadisticas', formData.incluirEstadisticas);
      params.append('incluir_detalles', formData.incluirDetalles);
      
      const response = await api.get(`/reportes/exportar/${formData.formato}?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Crear nombre de archivo dinámico
      const fechaActual = new Date().toISOString().split('T')[0];
      const tipoReporte = tiposReporte.find(r => r.id === formData.tipoReporte)?.nombre || 'reporte';
      const extension = formatosDisponibles.find(f => f.id === formData.formato)?.extensiones[0] || formData.formato;
      
      const filename = `reporte_${tipoReporte.toLowerCase().replace(/\s+/g, '_')}_${fechaActual}.${extension}`;
      
      // Descargar archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Reporte exportado exitosamente: ${filename}`);
      onClose();
      
    } catch (error) {
      console.error('Error exportando reporte:', error);
      toast.error('Error exportando reporte: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderFiltros = () => {
    if (formData.tipoReporte === 'partidos') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.filtros.estado}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  filtros: { ...prev.filtros, estado: e.target.value }
                }))}
                label="Estado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="programado">Programado</MenuItem>
                <MenuItem value="en_curso">En curso</MenuItem>
                <MenuItem value="finalizado">Finalizado</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={formData.filtros.categoria}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  filtros: { ...prev.filtros, categoria: e.target.value }
                }))}
                label="Categoría"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="M14">M14</MenuItem>
                <MenuItem value="M15">M15</MenuItem>
                <MenuItem value="M16">M16</MenuItem>
                <MenuItem value="M17">M17</MenuItem>
                <MenuItem value="M18">M18</MenuItem>
                <MenuItem value="M19">M19</MenuItem>
                <MenuItem value="Intermedia">Intermedia</MenuItem>
                <MenuItem value="Preintermedia">Preintermedia</MenuItem>
                <MenuItem value="Primera">Primera</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      );
    }
    
    if (formData.tipoReporte === 'equipos') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={formData.filtros.categoria}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  filtros: { ...prev.filtros, categoria: e.target.value }
                }))}
                label="Categoría"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="M14">M14</MenuItem>
                <MenuItem value="M15">M15</MenuItem>
                <MenuItem value="M16">M16</MenuItem>
                <MenuItem value="M17">M17</MenuItem>
                <MenuItem value="M18">M18</MenuItem>
                <MenuItem value="M19">M19</MenuItem>
                <MenuItem value="Intermedia">Intermedia</MenuItem>
                <MenuItem value="Preintermedia">Preintermedia</MenuItem>
                <MenuItem value="Primera">Primera</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      );
    }
    
    return null;
  };

  const renderOpcionesContenido = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Opciones de contenido
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.incluirGraficos}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    incluirGraficos: e.target.checked
                  }))}
                />
              }
              label="Incluir gráficos"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.incluirEstadisticas}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    incluirEstadisticas: e.target.checked
                  }))}
                />
              }
              label="Incluir estadísticas"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.incluirDetalles}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    incluirDetalles: e.target.checked
                  }))}
                />
              }
              label="Incluir detalles"
            />
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileDownload color="primary" />
          Exportar Reportes
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Selección de tipo de reporte */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Tipo de Reporte
            </Typography>
            <Grid container spacing={2}>
              {tiposReporte.map((tipo) => (
                <Grid item xs={12} md={6} key={tipo.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: formData.tipoReporte === tipo.id ? 2 : 1,
                      borderColor: formData.tipoReporte === tipo.id ? 'primary.main' : 'divider',
                      '&:hover': {
                        boxShadow: 2
                      }
                    }}
                    onClick={() => setFormData(prev => ({ ...prev, tipoReporte: tipo.id }))}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4">{tipo.icono}</Typography>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {tipo.nombre}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tipo.descripcion}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Selección de formato */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Formato de Exportación
            </Typography>
            <Grid container spacing={2}>
              {formatosDisponibles.map((formato) => (
                <Grid item xs={12} md={4} key={formato.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: formData.formato === formato.id ? 2 : 1,
                      borderColor: formData.formato === formato.id ? 'primary.main' : 'divider',
                      '&:hover': {
                        boxShadow: 2
                      }
                    }}
                    onClick={() => setFormData(prev => ({ ...prev, formato: formato.id }))}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <Box sx={{ mb: 1 }}>
                        {formato.icono}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {formato.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formato.descripcion}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Divider sx={{ width: '100%', my: 2 }} />

          {/* Rango de fechas */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              <DateRange sx={{ mr: 1, verticalAlign: 'middle' }} />
              Rango de Fechas
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha desde"
                  type="date"
                  value={formData.fechaDesde}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaDesde: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha hasta"
                  type="date"
                  value={formData.fechaHasta}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaHasta: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Filtros específicos */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filtros Adicionales
            </Typography>
            {renderFiltros()}
          </Grid>

          {/* Opciones de contenido */}
          <Grid item xs={12}>
            {renderOpcionesContenido()}
          </Grid>

          {/* Vista previa de configuración */}
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Configuración seleccionada:</strong><br/>
                • Reporte: {tiposReporte.find(r => r.id === formData.tipoReporte)?.nombre}<br/>
                • Formato: {formatosDisponibles.find(f => f.id === formData.formato)?.nombre}<br/>
                • Fechas: {formData.fechaDesde || 'Sin límite'} - {formData.fechaHasta || 'Sin límite'}<br/>
                • Contenido: {formData.incluirGraficos ? 'Gráficos' : ''} {formData.incluirEstadisticas ? 'Estadísticas' : ''} {formData.incluirDetalles ? 'Detalles' : ''}
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleExportar}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <FileDownload />}
        >
          {loading ? 'Exportando...' : 'Exportar Reporte'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportadorReportes;
