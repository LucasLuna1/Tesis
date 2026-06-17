/**
 * Servicio para generación de reportes de partidos
 * User Story 1.1: Generar registro de todos los partidos jugados con resultados e incidencias
 */

const { db } = require('../config/firebase');

class ReportesService {
  
  // Generar reporte completo de partidos
  static async generarReportePartidos(filtros = {}) {
    try {
      let query = db.collection('partidos');
      
      // Aplicar filtros
      if (filtros.fechaDesde) {
        query = query.where('fecha', '>=', new Date(filtros.fechaDesde));
      }
      
      if (filtros.fechaHasta) {
        query = query.where('fecha', '<=', new Date(filtros.fechaHasta));
      }
      
      if (filtros.estado) {
        query = query.where('estado', '==', filtros.estado);
      }
      
      if (filtros.torneoId) {
        query = query.where('torneoId', '==', filtros.torneoId);
      }
      
      if (filtros.arbitroId) {
        query = query.where('arbitros.principal.id', '==', filtros.arbitroId);
      }
      
      const snapshot = await query.orderBy('fecha', 'desc').get();
      const partidos = [];
      
      snapshot.forEach(doc => {
        const partido = doc.data();
        partidos.push({
          id: doc.id,
          ...partido,
          // Agregar información calculada para el reporte
          duracionTotal: this.calcularDuracionTotal(partido),
          totalIncidencias: partido.incidencias?.length || 0,
          puntosTotal: (partido.resultado?.puntosLocal || 0) + (partido.resultado?.puntosVisitante || 0),
          triesTotal: (partido.resultado?.triesLocal || 0) + (partido.resultado?.triesVisitante || 0),
          arbitrosAsignados: this.contarArbitrosAsignados(partido.arbitros),
          tieneActa: !!partido.actaOficial
        });
      });
      
      return {
        partidos,
        total: partidos.length,
        resumen: this.generarResumenReporte(partidos),
        fechaGeneracion: new Date(),
        filtrosAplicados: filtros
      };
      
    } catch (error) {
      throw new Error(`Error generando reporte de partidos: ${error.message}`);
    }
  }
  
  // Generar reporte de incidencias por partido
  static async generarReporteIncidencias(partidoId) {
    try {
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      
      if (!partidoDoc.exists) {
        throw new Error('Partido no encontrado');
      }
      
      const partido = partidoDoc.data();
      const incidencias = partido.incidencias || [];
      
      // Agrupar incidencias por tipo
      const incidenciasPorTipo = this.agruparIncidenciasPorTipo(incidencias);
      
      // Estadísticas de incidencias
      const estadisticas = {
        total: incidencias.length,
        porTipo: incidenciasPorTipo,
        porEquipo: this.agruparIncidenciasPorEquipo(incidencias),
        porMinuto: this.agruparIncidenciasPorMinuto(incidencias),
        masFrecuente: this.obtenerIncidenciaMasFrecuente(incidenciasPorTipo)
      };
      
      return {
        partido: {
          id: partidoId,
          equipos: partido.equipoLocal?.nombre + ' vs ' + partido.equipoVisitante?.nombre,
          fecha: partido.fecha,
          resultado: partido.resultado
        },
        incidencias,
        estadisticas,
        fechaGeneracion: new Date()
      };
      
    } catch (error) {
      throw new Error(`Error generando reporte de incidencias: ${error.message}`);
    }
  }
  
  // Generar reporte de rendimiento de árbitros
  static async generarReporteArbitros(filtros = {}) {
    try {
      const arbitrosSnapshot = await db.collection('arbitros')
        .where('activo', '==', true)
        .get();
      
      const arbitros = [];
      
      for (const doc of arbitrosSnapshot.docs) {
        const arbitro = doc.data();
        const arbitroId = doc.id;
        
        // Obtener partidos del árbitro
        const partidosSnapshot = await db.collection('partidos')
          .where('arbitros.principal.id', '==', arbitroId)
          .get();
        
        const partidos = [];
        partidosSnapshot.forEach(partidoDoc => {
          partidos.push({ id: partidoDoc.id, ...partidoDoc.data() });
        });
        
        // Calcular estadísticas
        const estadisticas = this.calcularEstadisticasArbitro(partidos);
        
        arbitros.push({
          id: arbitroId,
          nombre: arbitro.nombre,
          apellido: arbitro.apellido,
          certificacion: arbitro.certificacion,
          especialidad: arbitro.especialidad,
          partidos: partidos,
          estadisticas
        });
      }
      
      return {
        arbitros,
        total: arbitros.length,
        resumen: this.generarResumenArbitros(arbitros),
        fechaGeneracion: new Date()
      };
      
    } catch (error) {
      throw new Error(`Error generando reporte de árbitros: ${error.message}`);
    }
  }
  
  // Generar reporte de equipos
  static async generarReporteEquipos(filtros = {}) {
    try {
      const equiposSnapshot = await db.collection('equipos').get();
      const equipos = [];
      
      for (const doc of equiposSnapshot.docs) {
        const equipo = doc.data();
        const equipoId = doc.id;
        
        // Obtener partidos del equipo (como local y visitante)
        const partidosLocal = await db.collection('partidos')
          .where('equipoLocal.id', '==', equipoId)
          .get();
        
        const partidosVisitante = await db.collection('partidos')
          .where('equipoVisitante.id', '==', equipoId)
          .get();
        
        const todosPartidos = [];
        partidosLocal.forEach(p => todosPartidos.push({ id: p.id, ...p.data(), tipo: 'local' }));
        partidosVisitante.forEach(p => todosPartidos.push({ id: p.id, ...p.data(), tipo: 'visitante' }));
        
        // Calcular estadísticas
        const estadisticas = this.calcularEstadisticasEquipo(todosPartidos, equipoId);
        
        equipos.push({
          id: equipoId,
          nombre: equipo.nombre,
          partidos: todosPartidos,
          estadisticas
        });
      }
      
      return {
        equipos,
        total: equipos.length,
        resumen: this.generarResumenEquipos(equipos),
        fechaGeneracion: new Date()
      };
      
    } catch (error) {
      throw new Error(`Error generando reporte de equipos: ${error.message}`);
    }
  }
  
  // Métodos auxiliares
  static calcularDuracionTotal(partido) {
    if (partido.duracionTotal) {
      return partido.duracionTotal;
    }
    
    if (partido.tiempo?.inicio && partido.tiempo?.fin) {
      return Math.round((partido.tiempo.fin - partido.tiempo.inicio) / (1000 * 60));
    }
    
    return 0;
  }
  
  static contarArbitrosAsignados(arbitros) {
    let count = 0;
    if (arbitros?.principal) count++;
    if (arbitros?.asistente1) count++;
    if (arbitros?.asistente2) count++;
    if (arbitros?.cuartoArbitro) count++;
    return count;
  }
  
  static generarResumenReporte(partidos) {
    const totalPartidos = partidos.length;
    const partidosFinalizados = partidos.filter(p => p.estado === 'finalizado').length;
    const totalPuntos = partidos.reduce((sum, p) => sum + (p.puntosTotal || 0), 0);
    const totalTries = partidos.reduce((sum, p) => sum + (p.triesTotal || 0), 0);
    const totalIncidencias = partidos.reduce((sum, p) => sum + p.totalIncidencias, 0);
    const duracionPromedio = partidos.length > 0 ? 
      partidos.reduce((sum, p) => sum + p.duracionTotal, 0) / partidos.length : 0;
    
    return {
      totalPartidos,
      partidosFinalizados,
      partidosEnCurso: partidos.filter(p => p.estado === 'en_curso').length,
      partidosProgramados: partidos.filter(p => p.estado === 'programado').length,
      totalPuntos,
      totalTries,
      totalIncidencias,
      duracionPromedio: Math.round(duracionPromedio),
      puntosPorPartido: totalPartidos > 0 ? (totalPuntos / totalPartidos).toFixed(2) : 0,
      triesPorPartido: totalPartidos > 0 ? (totalTries / totalPartidos).toFixed(2) : 0
    };
  }
  
  static agruparIncidenciasPorTipo(incidencias) {
    const agrupadas = {};
    incidencias.forEach(inc => {
      agrupadas[inc.tipo] = (agrupadas[inc.tipo] || 0) + 1;
    });
    return agrupadas;
  }
  
  static agruparIncidenciasPorEquipo(incidencias) {
    const agrupadas = { local: 0, visitante: 0 };
    incidencias.forEach(inc => {
      if (inc.equipo === 'LOCAL' || inc.equipo === 'local') {
        agrupadas.local++;
      } else if (inc.equipo === 'VISITANTE' || inc.equipo === 'visitante') {
        agrupadas.visitante++;
      }
    });
    return agrupadas;
  }
  
  static agruparIncidenciasPorMinuto(incidencias) {
    const agrupadas = {};
    incidencias.forEach(inc => {
      const rango = Math.floor(inc.minuto / 15) * 15; // Agrupar en rangos de 15 minutos
      agrupadas[rango] = (agrupadas[rango] || 0) + 1;
    });
    return agrupadas;
  }
  
  static obtenerIncidenciaMasFrecuente(incidenciasPorTipo) {
    let masFrecuente = null;
    let maxCount = 0;
    
    Object.entries(incidenciasPorTipo).forEach(([tipo, count]) => {
      if (count > maxCount) {
        maxCount = count;
        masFrecuente = tipo;
      }
    });
    
    return { tipo: masFrecuente, cantidad: maxCount };
  }
  
  static calcularEstadisticasArbitro(partidos) {
    const totalPartidos = partidos.length;
    const partidosFinalizados = partidos.filter(p => p.estado === 'finalizado').length;
    const totalIncidencias = partidos.reduce((sum, p) => sum + (p.incidencias?.length || 0), 0);
    const duracionPromedio = totalPartidos > 0 ? 
      partidos.reduce((sum, p) => sum + this.calcularDuracionTotal(p), 0) / totalPartidos : 0;
    
    return {
      totalPartidos,
      partidosFinalizados,
      porcentajeFinalizados: totalPartidos > 0 ? (partidosFinalizados / totalPartidos * 100).toFixed(1) : 0,
      totalIncidencias,
      incidenciasPorPartido: totalPartidos > 0 ? (totalIncidencias / totalPartidos).toFixed(2) : 0,
      duracionPromedio: Math.round(duracionPromedio)
    };
  }
  
  static calcularEstadisticasEquipo(partidos, equipoId) {
    const totalPartidos = partidos.length;
    const victorias = partidos.filter(p => {
      if (p.estado !== 'finalizado') return false;
      const puntosLocal = p.resultado?.puntosLocal || 0;
      const puntosVisitante = p.resultado?.puntosVisitante || 0;
      
      if (p.tipo === 'local') {
        return puntosLocal > puntosVisitante;
      } else {
        return puntosVisitante > puntosLocal;
      }
    }).length;
    
    const empates = partidos.filter(p => {
      if (p.estado !== 'finalizado') return false;
      const puntosLocal = p.resultado?.puntosLocal || 0;
      const puntosVisitante = p.resultado?.puntosVisitante || 0;
      return puntosLocal === puntosVisitante;
    }).length;
    
    const derrotas = totalPartidos - victorias - empates;
    const puntosFavor = partidos.reduce((sum, p) => {
      if (p.estado !== 'finalizado') return sum;
      return sum + (p.tipo === 'local' ? (p.resultado?.puntosLocal || 0) : (p.resultado?.puntosVisitante || 0));
    }, 0);
    
    const puntosContra = partidos.reduce((sum, p) => {
      if (p.estado !== 'finalizado') return sum;
      return sum + (p.tipo === 'local' ? (p.resultado?.puntosVisitante || 0) : (p.resultado?.puntosLocal || 0));
    }, 0);
    
    return {
      totalPartidos,
      victorias,
      empates,
      derrotas,
      puntosFavor,
      puntosContra,
      diferenciaPuntos: puntosFavor - puntosContra,
      porcentajeVictorias: totalPartidos > 0 ? (victorias / totalPartidos * 100).toFixed(1) : 0
    };
  }
  
  static generarResumenArbitros(arbitros) {
    const totalArbitros = arbitros.length;
    const totalPartidos = arbitros.reduce((sum, a) => sum + a.estadisticas.totalPartidos, 0);
    const arbitroMasActivo = arbitros.reduce((max, a) => 
      a.estadisticas.totalPartidos > max.estadisticas.totalPartidos ? a : max, arbitros[0] || { estadisticas: { totalPartidos: 0 } });
    
    return {
      totalArbitros,
      totalPartidos,
      promedioPartidosPorArbitro: totalArbitros > 0 ? (totalPartidos / totalArbitros).toFixed(1) : 0,
      arbitroMasActivo: arbitroMasActivo.nombre + ' ' + arbitroMasActivo.apellido
    };
  }
  
  static generarResumenEquipos(equipos) {
    const totalEquipos = equipos.length;
    const totalPartidos = equipos.reduce((sum, e) => sum + e.estadisticas.totalPartidos, 0);
    const equipoMasGanador = equipos.reduce((max, e) => 
      e.estadisticas.victorias > max.estadisticas.victorias ? e : max, equipos[0] || { estadisticas: { victorias: 0 } });
    
    return {
      totalEquipos,
      totalPartidos,
      promedioPartidosPorEquipo: totalEquipos > 0 ? (totalPartidos / totalEquipos).toFixed(1) : 0,
      equipoMasGanador: equipoMasGanador.nombre
    };
  }
}

module.exports = ReportesService;
