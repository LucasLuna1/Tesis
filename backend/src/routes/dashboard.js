const express = require('express');
const { db } = require('../config/firebase');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = express.Router();

// Obtener estadísticas del dashboard
router.get('/stats', verifyFirebaseToken, async (req, res) => {
  try {
    // 🚀 OPTIMIZACIÓN: Usar count() en lugar de get() para evitar descargar todos los documentos
    const [torneosCount, partidosCount, jugadoresCount, arbitrosCount, equiposCount] = await Promise.all([
      db.collection('torneos').count().get(),
      db.collection('partidos').count().get(),
      db.collection('jugadores').count().get(),
      db.collection('arbitros').count().get(),
      db.collection('equipos').count().get()
    ]);

    const stats = {
      torneos: torneosCount.data().count,
      partidos: partidosCount.data().count,
      jugadores: jugadoresCount.data().count,
      arbitros: arbitrosCount.data().count,
      equipos: equiposCount.data().count
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener actividad reciente
router.get('/activity', verifyFirebaseToken, async (req, res) => {
  try {
    // Obtener los últimos 5 partidos creados
    const partidosSnapshot = await db.collection('partidos')
      .orderBy('fechaCreacion', 'desc')
      .limit(5)
      .get();

    const activity = partidosSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        descripcion: `Partido creado: ${data.equipoLocal?.nombre || 'Equipo Local'} vs ${data.equipoVisitante?.nombre || 'Equipo Visitante'}`,
        fecha: data.fechaCreacion || new Date(),
        tipo: 'partido'
      };
    });

    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    console.error('❌ Error obteniendo actividad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener próximos partidos
router.get('/upcoming-matches', verifyFirebaseToken, async (req, res) => {
  try {
    const now = new Date();
    
    // Obtener partidos programados, en curso y pausados
    const [programadosSnapshot, enCursoSnapshot, pausadosSnapshot] = await Promise.all([
      db.collection('partidos')
        .where('estado', '==', 'programado')
        .limit(100)
        .get(),
      db.collection('partidos')
        .where('estado', '==', 'En Curso')
        .limit(100)
        .get(),
      db.collection('partidos')
        .where('estado', '==', 'pausado')
        .limit(100)
        .get()
    ]);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const normalizeLogo = (url) => {
      if (!url) return null;
      if (typeof url !== 'string') return null;
      if (url.startsWith('http')) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return `${baseUrl}/${url}`;
    };

    // Combinar todos los partidos
    const todosPartidos = [];
    const partidosIds = new Set();
    
    // Agregar partidos programados (solo futuros o de hoy)
    programadosSnapshot.forEach(doc => {
      const data = doc.data();
      let fechaVal = null;
      try {
        if (data.fecha?.toDate) {
          fechaVal = data.fecha.toDate();
        } else if (typeof data.fecha === 'object' && (data.fecha.seconds || data.fecha._seconds)) {
          const secs = data.fecha.seconds ?? data.fecha._seconds;
          fechaVal = new Date(secs * 1000);
        } else if (typeof data.fecha === 'number') {
          fechaVal = new Date(data.fecha);
        } else if (typeof data.fecha === 'string') {
          const tmp = new Date(data.fecha);
          fechaVal = isNaN(tmp.getTime()) ? null : tmp;
        }
      } catch (_) {
        fechaVal = null;
      }
      
      if (fechaVal && fechaVal >= now) {
        todosPartidos.push({ id: doc.id, ...data });
        partidosIds.add(doc.id);
      }
    });
    
    // Agregar partidos en curso (siempre incluirlos)
    enCursoSnapshot.forEach(doc => {
      if (!partidosIds.has(doc.id)) {
        todosPartidos.push({ id: doc.id, ...doc.data() });
        partidosIds.add(doc.id);
      }
    });
    
    // Agregar partidos pausados (siempre incluirlos)
    pausadosSnapshot.forEach(doc => {
      if (!partidosIds.has(doc.id)) {
        todosPartidos.push({ id: doc.id, ...doc.data() });
        partidosIds.add(doc.id);
      }
    });
    
    // Ordenar por fecha (partidos en curso/pausados primero)
    todosPartidos.sort((a, b) => {
      const estadoA = a.estado || '';
      const estadoB = b.estado || '';
      
      // Priorizar partidos en curso o pausados
      if ((estadoA === 'En Curso' || estadoA === 'pausado') && 
          (estadoB !== 'En Curso' && estadoB !== 'pausado')) {
        return -1;
      }
      if ((estadoB === 'En Curso' || estadoB === 'pausado') && 
          (estadoA !== 'En Curso' && estadoA !== 'pausado')) {
        return 1;
      }
      
      // Si ambos tienen el mismo tipo de estado, ordenar por fecha
      let fechaA = null;
      let fechaB = null;
      try {
        if (a.fecha?.toDate) fechaA = a.fecha.toDate();
        else if (a.fecha?.seconds) fechaA = new Date(a.fecha.seconds * 1000);
        else if (typeof a.fecha === 'number') fechaA = new Date(a.fecha);
        else if (typeof a.fecha === 'string') fechaA = new Date(a.fecha);
        
        if (b.fecha?.toDate) fechaB = b.fecha.toDate();
        else if (b.fecha?.seconds) fechaB = new Date(b.fecha.seconds * 1000);
        else if (typeof b.fecha === 'number') fechaB = new Date(b.fecha);
        else if (typeof b.fecha === 'string') fechaB = new Date(b.fecha);
      } catch (_) {}
      
      if (!fechaA && !fechaB) return 0;
      if (!fechaA) return 1;
      if (!fechaB) return -1;
      return fechaA - fechaB;
    });
    
    // Limitar a 5 resultados
    const partidosLimitados = todosPartidos.slice(0, 5);

    const upcomingMatches = await Promise.all(partidosLimitados.map(async (data) => {
      let fechaVal = null;
      try {
        if (data.fecha?.toDate) {
          fechaVal = data.fecha.toDate();
        } else if (typeof data.fecha === 'object' && (data.fecha.seconds || data.fecha._seconds)) {
          const secs = data.fecha.seconds ?? data.fecha._seconds;
          fechaVal = new Date(secs * 1000);
        } else if (typeof data.fecha === 'number') {
          fechaVal = new Date(data.fecha);
        } else if (typeof data.fecha === 'string') {
          const tmp = new Date(data.fecha);
          fechaVal = isNaN(tmp.getTime()) ? null : tmp;
        }
      } catch (_) {
        fechaVal = null;
      }
      const equipoLocalNombre = typeof data.equipoLocal === 'object' ? (data.equipoLocal?.nombre || data.equipoLocalNombre) : (data.equipoLocal || data.equipoLocalNombre || 'Equipo Local');
      const equipoVisitanteNombre = typeof data.equipoVisitante === 'object' ? (data.equipoVisitante?.nombre || data.equipoVisitanteNombre) : (data.equipoVisitante || data.equipoVisitanteNombre || 'Equipo Visitante');
      const equipoLocalLogo = normalizeLogo(data.equipoLocalLogo || data.equipoLocal?.logo || null);
      const equipoVisitanteLogo = normalizeLogo(data.equipoVisitanteLogo || data.equipoVisitante?.logo || null);
      const canchaNombre = typeof data.cancha === 'object' ? (data.cancha?.nombre || 'Sin cancha asignada') : (data.cancha || 'Sin cancha asignada');
      // Obtener nombre del torneo si no viene en el documento
      let torneoNombre = data.torneoNombre || null;
      if (!torneoNombre && data.torneoId) {
        try {
          const torneoDoc = await db.collection('torneos').doc(data.torneoId).get();
          if (torneoDoc.exists) {
            const torneoData = torneoDoc.data();
            torneoNombre = torneoData.nombre || torneoData.titulo || null;
          }
        } catch (e) {
          // Ignorar errores de lookup
        }
      }

      return {
        id: data.id,
        equipoLocal: equipoLocalNombre,
        equipoLocalNombre: equipoLocalNombre,
        equipoLocalLogo,
        equipoVisitante: equipoVisitanteNombre,
        equipoVisitanteNombre: equipoVisitanteNombre,
        equipoVisitanteLogo,
        categoria: data.categoria || null,
        torneoNombre,
        fecha: fechaVal ? fechaVal.toISOString() : null,
        horaInicio: data.horaInicio,
        cancha: canchaNombre,
        estado: data.estado || 'programado'
      };
    }));

    res.json({
      success: true,
      data: upcomingMatches
    });

  } catch (error) {
    console.error('❌ Error obteniendo próximos partidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
