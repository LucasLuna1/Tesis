/**
 * Rutas para generación de reportes
 * User Story 1.1: Generar registro de todos los partidos jugados con resultados e incidencias
 */

const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifyAllRoles } = require('../middleware/auth');
const ReportesService = require('../services/ReportesService');

// Generar reporte general de partidos
router.get('/partidos', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const filtros = {
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      estado: req.query.estado,
      torneoId: req.query.torneoId,
      arbitroId: req.query.arbitroId
    };
    
    const reporte = await ReportesService.generarReportePartidos(filtros);
    
    res.json(reporte);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar reporte a formato específico
router.get('/exportar/:formato', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const { formato } = req.params;
    const tipoReporte = req.query.tipo || 'partidos';
    
    if (!['csv', 'json', 'pdf'].includes(formato)) {
      return res.status(400).json({ error: 'Formato no soportado. Use: csv, json, pdf' });
    }
    
    let reporte;
    const filtros = {
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      estado: req.query.estado,
      torneoId: req.query.torneoId
    };
    
    switch (tipoReporte) {
      case 'partidos':
        reporte = await ReportesService.generarReportePartidos(filtros);
        break;
      case 'arbitros':
        reporte = await ReportesService.generarReporteArbitros(filtros);
        break;
      case 'equipos':
        reporte = await ReportesService.generarReporteEquipos(filtros);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de reporte no válido' });
    }
    
    // Configurar headers según formato
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `reporte_${tipoReporte}_${timestamp}`;
    
    switch (formato) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(convertirACSV(reporte));
        break;
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json(reporte);
        break;
      case 'pdf':
        // Para PDF se requeriría una librería como puppeteer o jsPDF
        res.status(501).json({ error: 'Exportación a PDF no implementada aún' });
        break;
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función auxiliar para convertir a CSV
function convertirACSV(reporte) {
  if (!reporte.partidos && !reporte.arbitros && !reporte.equipos) {
    return 'No hay datos para exportar';
  }
  
  let csv = '';
  
  if (reporte.partidos) {
    csv += 'REPORTE DE PARTIDOS\n';
    csv += 'ID,Fecha,Equipo Local,Equipo Visitante,Resultado,Estado,Incidencias,Duración\n';
    
    reporte.partidos.forEach(partido => {
      const resultado = `${partido.resultado?.puntosLocal || 0}-${partido.resultado?.puntosVisitante || 0}`;
      const equipoLocalNombre = partido.equipoLocal?.nombre || partido.equipoLocal || 'Equipo Local';
      const equipoVisitanteNombre = partido.equipoVisitante?.nombre || partido.equipoVisitante || 'Equipo Visitante';
      csv += `${partido.id},${partido.fecha},${equipoLocalNombre},${equipoVisitanteNombre},${resultado},${partido.estado},${partido.totalIncidencias},${partido.duracionTotal}\n`;
    });
  }
  
  return csv;
}

module.exports = router;
