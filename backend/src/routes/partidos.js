const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifyAllRoles } = require('../middleware/auth');
const { db, admin } = require('../config/firebase');
const PartidoService = require('../services/PartidoService');
const TorneoService = require('../services/TorneoService');
const cacheService = require('../services/CacheService');

/**
 * Función para actualizar partidos que tienen referencias a un partido finalizado
 * @param {string} partidoFinalizadoId - ID del partido que se finalizó
 * @param {Object} partidoData - Datos del partido finalizado
 */
async function actualizarPartidosConReferencias(partidoFinalizadoId, partidoData) {
  try {
    // Determinar ganador y perdedor
    const puntosLocal = partidoData.resultado?.puntosLocal || 0;
    const puntosVisitante = partidoData.resultado?.puntosVisitante || 0;
    
    let equipoGanador, equipoPerdedor;
    
    if (puntosLocal > puntosVisitante) {
      // Local ganó
      equipoGanador = {
        id: partidoData.equipoLocalId,
        nombre: partidoData.equipoLocal,
        logo: partidoData.equipoLocalLogo
      };
      equipoPerdedor = {
        id: partidoData.equipoVisitanteId,
        nombre: partidoData.equipoVisitante,
        logo: partidoData.equipoVisitanteLogo
      };
    } else if (puntosVisitante > puntosLocal) {
      // Visitante ganó
      equipoGanador = {
        id: partidoData.equipoVisitanteId,
        nombre: partidoData.equipoVisitante,
        logo: partidoData.equipoVisitanteLogo
      };
      equipoPerdedor = {
        id: partidoData.equipoLocalId,
        nombre: partidoData.equipoLocal,
        logo: partidoData.equipoLocalLogo
      };
    } else {
      // Empate - no actualizar referencias por ahora
      return;
    }
    
    // Obtener todos los partidos del torneo
    const partidosSnapshot = await db.collection('partidos')
      .where('torneoId', '==', partidoData.torneoId)
      .get();
    
    // Determinar el número del partido finalizado
    // Para esto, necesitamos contar todos los partidos anteriores del torneo
    const todosPartidos = [];
    partidosSnapshot.forEach(doc => {
      todosPartidos.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por jornada y luego por fecha de creación para determinar el número
    todosPartidos.sort((a, b) => {
      if (a.jornada !== b.jornada) return a.jornada - b.jornada;
      const fechaA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion || 0);
      const fechaB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion || 0);
      return fechaA - fechaB;
    });
    
    // Encontrar el número del partido
    const numeroPartido = todosPartidos.findIndex(p => p.id === partidoFinalizadoId) + 1;
    
    if (numeroPartido === 0) {
      return;
    }
    
    // Buscar partidos con referencias a este partido
    const referenciaGanador = `ganador_${numeroPartido}`;
    const referenciaPerdedor = `perdedor_${numeroPartido}`;
    
    let partidosActualizados = 0;
    
    for (const partidoRef of todosPartidos) {
      let debeActualizar = false;
      const updateData = {};
      
      // Verificar si el equipo local es una referencia
      if (partidoRef.equipoLocalReferencia === referenciaGanador) {
        updateData.equipoLocalId = equipoGanador.id;
        updateData.equipoLocal = equipoGanador.nombre;
        updateData.equipoLocalLogo = equipoGanador.logo || '';
        updateData.equipoLocalReferencia = admin.firestore.FieldValue.delete();
        debeActualizar = true;
      } else if (partidoRef.equipoLocalReferencia === referenciaPerdedor) {
        updateData.equipoLocalId = equipoPerdedor.id;
        updateData.equipoLocal = equipoPerdedor.nombre;
        updateData.equipoLocalLogo = equipoPerdedor.logo || '';
        updateData.equipoLocalReferencia = admin.firestore.FieldValue.delete();
        debeActualizar = true;
      }
      
      // Verificar si el equipo visitante es una referencia
      if (partidoRef.equipoVisitanteReferencia === referenciaGanador) {
        updateData.equipoVisitanteId = equipoGanador.id;
        updateData.equipoVisitante = equipoGanador.nombre;
        updateData.equipoVisitanteLogo = equipoGanador.logo || '';
        updateData.equipoVisitanteReferencia = admin.firestore.FieldValue.delete();
        debeActualizar = true;
      } else if (partidoRef.equipoVisitanteReferencia === referenciaPerdedor) {
        updateData.equipoVisitanteId = equipoPerdedor.id;
        updateData.equipoVisitante = equipoPerdedor.nombre;
        updateData.equipoVisitanteLogo = equipoPerdedor.logo || '';
        updateData.equipoVisitanteReferencia = admin.firestore.FieldValue.delete();
        debeActualizar = true;
      }
      
      // Si hay que actualizar, hacerlo
      if (debeActualizar) {
        await db.collection('partidos').doc(partidoRef.id).update(updateData);
        partidosActualizados++;
      }
    }
    
  } catch (error) {
    console.error('❌ Error actualizando partidos con referencias:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

// Endpoint básico GET /api/partidos - Obtener todos los partidos
router.get('/', async (req, res) => {
  try {
    // 🚀 OPTIMIZACIÓN: Usar caché para consultas frecuentes
    const cacheKey = `partidos_${req.query.limit || 50}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 🚀 OPTIMIZACIÓN: Limitar a 50 partidos más recientes por defecto
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Máximo 100
    const snapshot = await db.collection('partidos')
      .orderBy('fecha', 'desc')
      .limit(limit)
      .get();
      
    const partidos = [];
    
    snapshot.forEach(doc => {
      partidos.push({ id: doc.id, ...doc.data() });
    });
    
    // 🚀 OPTIMIZACIÓN: Guardar en caché por 2 minutos
    cacheService.set(cacheKey, partidos, 120000);
    
    res.json(partidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/partidos/proximos - Obtener próximos partidos
router.get('/proximos', async (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD
    
    // Primero, obtener TODOS los partidos para ver qué estados existen
    const todosPartidosSnapshot = await db.collection('partidos').limit(50).get();
    
    // 🚀 Query simple SIN índice - obtener partidos programados, en curso y pausados
    // Hacer múltiples queries y combinar resultados
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

    const partidos = [];
    const partidosIds = new Set(); // Para evitar duplicados
    
    // Agregar partidos programados
    programadosSnapshot.forEach(doc => {
      const data = doc.data();
      // Filtrar solo partidos futuros o de hoy
      if (data.fecha && data.fecha >= now) {
        const partido = { 
          id: doc.id, 
          ...data 
        };
        if (!partidosIds.has(doc.id)) {
          partidos.push(partido);
          partidosIds.add(doc.id);
        }
      }
    });
    
    // Agregar partidos en curso (siempre incluirlos, independientemente de la fecha)
    enCursoSnapshot.forEach(doc => {
      const data = doc.data();
      if (!partidosIds.has(doc.id)) {
        partidos.push({ 
          id: doc.id, 
          ...data
        });
        partidosIds.add(doc.id);
      }
    });
    
    // También buscar partidos en curso con filtrado manual (por si el estado es ligeramente diferente)
    todosPartidosSnapshot.forEach(doc => {
      const data = doc.data();
      const estado = data.estado || '';
      // Buscar estados que contengan "curso" o "Curso" (case insensitive)
      if (estado && (estado.toLowerCase().includes('curso') || estado.includes('Curso'))) {
        if (!partidosIds.has(doc.id)) {
          // Solo agregar si es realmente "En Curso" o "pausado"
          if (estado === 'En Curso' || estado === 'pausado' || estado === 'en_curso' || estado === 'EnCurso') {
            partidos.push({ 
              id: doc.id, 
              ...data
            });
            partidosIds.add(doc.id);
          }
        }
      }
    });
    
    // Agregar partidos pausados (siempre incluirlos, independientemente de la fecha)
    pausadosSnapshot.forEach(doc => {
      if (!partidosIds.has(doc.id)) {
        partidos.push({ 
          id: doc.id, 
          ...doc.data() 
        });
        partidosIds.add(doc.id);
      }
    });
    
    // Ordenar por fecha en memoria (partidos en curso/pausados primero, luego por fecha)
    partidos.sort((a, b) => {
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
      return (a.fecha || '').localeCompare(b.fecha || '');
    });
    
    // Limitar a 10 resultados
    const partidosFinales = partidos.slice(0, 10);
    
    res.json(partidosFinales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/partidos
 * @desc Crear un nuevo partido
 * @access Private (Organizadores, árbitros y staff)
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const usuarioId = req.user.uid;
    const usuarioNombre = req.user.name || 'Usuario';
    
    const partidoData = req.body;
    
    // Validar campos requeridos
    if (!partidoData.torneoId) {
      return res.status(400).json({ error: 'El torneoId es requerido' });
    }
    
    if (!partidoData.equipoLocal || !partidoData.equipoVisitante) {
      return res.status(400).json({ error: 'Los equipos local y visitante son requeridos' });
    }
    
    if (!partidoData.cancha) {
      return res.status(400).json({ error: 'La cancha es requerida' });
    }
    
    if (!partidoData.arbitro) {
      return res.status(400).json({ error: 'El árbitro es requerido' });
    }
    
    // Crear el partido directamente en la base de datos (RUGBY)
    const partido = {
      torneoId: partidoData.torneoId,
      torneoNombre: partidoData.torneoNombre || '',
      categoria: partidoData.categoria || '', // Agregar categoría del torneo
      jornada: partidoData.jornada || 1,
      fase: partidoData.fase || 'Regular',
      fecha: partidoData.fecha,
      horaInicio: partidoData.hora || '15:00',
      duracion: 80, // Rugby: 80 minutos (2 tiempos de 40)
      
      // Equipos con IDs y logos
      equipoLocal: partidoData.equipoLocal.nombre,
      equipoLocalId: partidoData.equipoLocal.id,
      equipoLocalLogo: partidoData.equipoLocal.logo || '',
      
      equipoVisitante: partidoData.equipoVisitante.nombre,
      equipoVisitanteId: partidoData.equipoVisitante.id,
      equipoVisitanteLogo: partidoData.equipoVisitante.logo || '',
      
      // Árbitros
      arbitroId: partidoData.arbitro.id,
      arbitros: {
        principal: {
          id: partidoData.arbitro.id,
          nombre: partidoData.arbitro.nombre
        }
      },
      
      // Cancha
      canchaId: partidoData.cancha.id,
      cancha: {
        id: partidoData.cancha.id,
        nombre: partidoData.cancha.nombre
      },
      
      estado: 'programado',
      
      // Resultado (RUGBY - no fútbol)
      resultado: {
        puntosLocal: 0,
        puntosVisitante: 0,
        triesLocal: 0,
        triesVisitante: 0,
        conversionesLocal: 0,
        conversionesVisitante: 0,
        penalesLocal: 0,
        penalesVisitante: 0,
        dropsLocal: 0,
        dropsVisitante: 0
      },
      
      // Estadísticas de Rugby
      estadisticas: {
        scrumsLocal: 0,
        scrumsVisitante: 0,
        lineoutsLocal: 0,
        lineoutsVisitante: 0,
        penalesCometidosLocal: 0,
        penalesCometidosVisitante: 0,
        tarjetasAmarillasLocal: 0,
        tarjetasAmarillasVisitante: 0,
        tarjetasRojasLocal: 0,
        tarjetasRojasVisitante: 0,
        tarjetasAzulesLocal: 0,
        tarjetasAzulesVisitante: 0,
        maulesLocal: 0,
        maulesVisitante: 0,
        rucksLocal: 0,
        rucksVisitante: 0
      },
      
      incidencias: [],
      
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      
      auditoria: {
        creadoPor: usuarioId,
        creadoPorNombre: usuarioNombre,
        fechaCreacion: new Date(),
        modificadoPor: usuarioId,
        modificadoPorNombre: usuarioNombre,
        fechaModificacion: new Date()
      }
    };
    
    // Crear referencia con ID automático
    const partidoRef = db.collection('partidos').doc();
    const partidoId = partidoRef.id;
    
    // Agregar el ID al documento
    partido.id = partidoId;
    
    // Guardar en la base de datos
    await partidoRef.set(partido);
    
    // Actualizar fixture del torneo si el partido pertenece a un torneo
    if (partido.torneoId) {
      await PartidoService.actualizarFixtureTorneo(partido.torneoId, partidoId, partido);
    }
    
    res.status(201).json({
      message: 'Partido creado exitosamente',
      partido: {
        id: partidoId,
        ...partido
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Error interno del servidor' 
    });
  }
});

// Obtener partidos por torneo
router.get('/torneo/:torneoId', async (req, res) => {
  try {
    const torneoId = req.params.torneoId;
    const { estado, fecha } = req.query;
    
    let query = db.collection('partidos').where('torneoId', '==', torneoId);
    
    if (estado) {
      query = query.where('estado', '==', estado);
    }
    
    if (fecha) {
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setDate(fechaFin.getDate() + 1);
      
      query = query.where('fecha', '>=', fechaInicio)
                  .where('fecha', '<', fechaFin);
    }
    
    // Ejecutar consulta sin orderBy para evitar necesidad de índice compuesto
    const partidosSnapshot = await query.get();
    const partidos = [];
    
    // Obtener datos completos de equipos para populate
    const equiposMap = new Map();
    
    for (const doc of partidosSnapshot.docs) {
      const partidoData = doc.data();
      
      // Obtener datos del equipo local si no los tenemos
      if (partidoData.equipoLocalId && !equiposMap.has(partidoData.equipoLocalId)) {
        const equipoLocalDoc = await db.collection('equipos').doc(partidoData.equipoLocalId).get();
        if (equipoLocalDoc.exists) {
          equiposMap.set(partidoData.equipoLocalId, {
            id: partidoData.equipoLocalId,
            nombre: equipoLocalDoc.data().nombre,
            logo: equipoLocalDoc.data().logo
          });
        }
      }
      
      // Obtener datos del equipo visitante si no los tenemos
      if (partidoData.equipoVisitanteId && !equiposMap.has(partidoData.equipoVisitanteId)) {
        const equipoVisitanteDoc = await db.collection('equipos').doc(partidoData.equipoVisitanteId).get();
        if (equipoVisitanteDoc.exists) {
          equiposMap.set(partidoData.equipoVisitanteId, {
            id: partidoData.equipoVisitanteId,
            nombre: equipoVisitanteDoc.data().nombre,
            logo: equipoVisitanteDoc.data().logo
          });
        }
      }
      
      // Crear objeto de partido con equipos populados
      const partido = {
        id: doc.id,
        ...partidoData,
        equipoLocal: equiposMap.get(partidoData.equipoLocalId) || {
          id: partidoData.equipoLocalId,
          nombre: partidoData.equipoLocal || 'Equipo Local',
          logo: partidoData.equipoLocalLogo || null
        },
        equipoVisitante: equiposMap.get(partidoData.equipoVisitanteId) || {
          id: partidoData.equipoVisitanteId,
          nombre: partidoData.equipoVisitante || 'Equipo Visitante',
          logo: partidoData.equipoVisitanteLogo || null
        }
      };
      
      partidos.push(partido);
    }
    
    // Ordenar en memoria por fecha
    partidos.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(a.fecha);
      return fechaA - fechaB;
    });
    
    res.json(partidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar tiempo del partido (para sincronización del árbitro)
router.post('/:id/actualizar-tiempo', verifyFirebaseToken, async (req, res) => {
  try {
    const partidoId = req.params.id;
    const { tiempoTranscurrido, estado } = req.body;
    
    // Actualización ligera solo del tiempo
    await db.collection('partidos').doc(partidoId).update({
      tiempoTranscurrido,
      timestamp: Date.now()
    });
    
    res.json({ 
      success: true,
      tiempoTranscurrido
    });
  } catch (error) {
    console.error('Error actualizando tiempo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint ultra ligero para verificar solo el cronómetro (sin caché)
router.get('/:id/cronometro', async (req, res) => {
  try {
    const partidoId = req.params.id;
    
    // Headers para evitar cualquier tipo de caché
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Devolver SOLO datos del cronómetro (respuesta ultra rápida)
    res.json({
      estado: partido.estado,
      tiempoTranscurrido: partido.tiempoTranscurrido || 0,
      tiempo: partido.tiempo || {},
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error obteniendo estado cronómetro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estado en vivo del partido (Público - para espectadores)
// IMPORTANTE: Esta ruta debe estar ANTES de /:id para que funcione correctamente
router.get('/:id/live', async (req, res) => {
  try {
    const partidoId = req.params.id;
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Devolver solo datos relevantes para visualización en vivo
    res.json({
      id: partidoId,
      equipoLocal: partido.equipoLocal,
      equipoVisitante: partido.equipoVisitante,
      equipoLocalId: partido.equipoLocalId,
      equipoVisitanteId: partido.equipoVisitanteId,
      equipoLocalLogo: partido.equipoLocalLogo,
      equipoVisitanteLogo: partido.equipoVisitanteLogo,
      torneoNombre: partido.torneoNombre,
      categoria: partido.categoria,
      cancha: partido.cancha,
      fecha: partido.fecha,
      horaInicio: partido.horaInicio,
      estado: partido.estado,
      tiempoTranscurrido: partido.tiempoTranscurrido || 0,
      tiempo: partido.tiempo || {},
      resultado: partido.resultado || {
        puntosLocal: 0,
        puntosVisitante: 0,
        triesLocal: 0,
        triesVisitante: 0,
        conversionesLocal: 0,
        conversionesVisitante: 0,
        penalesLocal: 0,
        penalesVisitante: 0,
        dropsLocal: 0,
        dropsVisitante: 0
      },
      incidencias: partido.incidencias || [],
      arbitros: partido.arbitros || {},
      estadisticas: partido.estadisticas || {}
    });
  } catch (error) {
    console.error('Error obteniendo partido en vivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener incidencias en tiempo real (Público - para espectadores)
router.get('/:id/incidencias', async (req, res) => {
  try {
    const partidoId = req.params.id;
    
    // Headers anti-caché para actualizaciones en tiempo real
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Calcular hash de incidencias para detección de cambios
    const hashIncidencias = partido.incidencias ? 
      `${partido.incidencias.length}-${partido.timestamp || Date.now()}` : '0';
    
    res.json({
      incidencias: partido.incidencias || [],
      resultado: partido.resultado || {},
      estado: partido.estado,
      tiempoTranscurrido: partido.tiempoTranscurrido || 0,
      marcador: {
        local: partido.resultado?.puntosLocal || 0,
        visitante: partido.resultado?.puntosVisitante || 0
      },
      hash: hashIncidencias,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener convocados del partido (Público)
router.get('/:id/convocados', async (req, res) => {
  try {
    const partidoId = req.params.id;
    
    // Headers anti-caché
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Buscar convocados en la colección
    const convocadosSnapshot = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .get();
    
    let convocadosLocal = null;
    let convocadosVisitante = null;
    
    convocadosSnapshot.forEach(doc => {
      const convocadosData = doc.data();
      if (convocadosData.equipoId === partido.equipoLocalId) {
        convocadosLocal = { id: doc.id, ...convocadosData };
      } else if (convocadosData.equipoId === partido.equipoVisitanteId) {
        convocadosVisitante = { id: doc.id, ...convocadosData };
      }
    });
    
    res.json({
      convocadosLocal: convocadosLocal,
      convocadosVisitante: convocadosVisitante
    });
  } catch (error) {
    console.error('Error obteniendo convocados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener partido específico
// IMPORTANTE: Esta ruta debe estar DESPUÉS de todas las rutas más específicas como /:id/live, /:id/incidencias, etc.
router.get('/:id', async (req, res) => {
  try {
    const partidoId = req.params.id;
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    res.json({ id: partidoId, ...partidoDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar tiempo del partido (cronómetro)
router.put('/:id/tiempo', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const partidoId = req.params.id;
    const { tiempoTranscurrido, estado } = req.body;
    
    // 🚀 OPTIMIZACIÓN: Usar update() solo con campos necesarios
    await db.collection('partidos').doc(partidoId).update({
      tiempoTranscurrido,
      estado,
      timestamp: Date.now()
    });
    
    // Si el partido finalizó, actualizar estadísticas precalculadas
    if (estado === 'finalizado') {
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      const partidoData = partidoDoc.data();
      
      if (partidoData && partidoData.torneoId) {
        // Calcular estadísticas para ambos equipos (Rugby)
        const puntosLocal = partidoData.resultado?.puntosLocal || 0;
        const puntosVisitante = partidoData.resultado?.puntosVisitante || 0;
        const triesLocal = partidoData.resultado?.triesLocal || 0;
        const triesVisitante = partidoData.resultado?.triesVisitante || 0;
        
        // Estadísticas equipo local
        const estadisticasLocal = {
          gano: puntosLocal > puntosVisitante,
          empate: puntosLocal === puntosVisitante,
          perdio: puntosLocal < puntosVisitante,
          puntosAFavor: puntosLocal,
          puntosEnContra: puntosVisitante,
          puntosTabla: puntosLocal > puntosVisitante ? 4 : (puntosLocal === puntosVisitante ? 2 : 0),
          bonusOfensivo: triesLocal >= 4 ? 1 : 0, // Bonus por 4 o más tries
          bonusDefensivo: (puntosLocal < puntosVisitante && (puntosVisitante - puntosLocal) <= 7) ? 1 : 0 // Bonus por perder por 7 o menos
        };
        
        // Estadísticas equipo visitante
        const estadisticasVisitante = {
          gano: puntosVisitante > puntosLocal,
          empate: puntosLocal === puntosVisitante,
          perdio: puntosVisitante < puntosLocal,
          puntosAFavor: puntosVisitante,
          puntosEnContra: puntosLocal,
          puntosTabla: puntosVisitante > puntosLocal ? 4 : (puntosLocal === puntosVisitante ? 2 : 0),
          bonusOfensivo: triesVisitante >= 4 ? 1 : 0,
          bonusDefensivo: (puntosVisitante < puntosLocal && (puntosLocal - puntosVisitante) <= 7) ? 1 : 0
        };
        
        // Actualizar estadísticas precalculadas en la tabla de posiciones
        await TorneoService.actualizarEstadisticasEquipo(partidoData.torneoId, partidoData.equipoLocalId, estadisticasLocal);
        await TorneoService.actualizarEstadisticasEquipo(partidoData.torneoId, partidoData.equipoVisitanteId, estadisticasVisitante);
        
        // Actualizar partidos con referencias (formato personalizado)
        await actualizarPartidosConReferencias(partidoId, partidoData);
      }
    }
    
    res.json({ message: 'Tiempo actualizado correctamente' });
  } catch (error) {
    // 🚀 OPTIMIZACIÓN: Manejo de errores de quota
    if (error.code === 'resource-exhausted' || error.message.includes('quota')) {
      console.error('❌ Quota de Firestore excedida:', error);
      return res.status(429).json({ 
        error: 'Se ha alcanzado el límite de operaciones. Por favor, intenta de nuevo en unos minutos.',
        type: 'QUOTA_EXCEEDED'
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Pausar cronómetro del partido (User Story 1.1)
router.post('/:id/pausar', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const partidoId = req.params.id;
    const arbitroId = req.user.uid;
    const { motivo, tiempoTranscurrido } = req.body;
    
    // Verificar que el partido existe
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Validar que el partido esté en curso
    if (partido.estado !== 'En Curso') {
      return res.status(400).json({ 
        error: 'Solo se puede pausar un partido que esté en curso',
        estadoActual: partido.estado,
        estadoEsperado: 'En Curso'
      });
    }
    
    const timestampPausa = Date.now();
    
    // Actualizar estado del partido
    await db.collection('partidos').doc(partidoId).update({
      estado: 'pausado',
      tiempoTranscurrido,
      timestamp: timestampPausa,
      ultimaPausa: {
        arbitroId,
        timestamp: timestampPausa,
        motivo: motivo || 'Interrupción',
        tiempoTranscurrido
      }
    });
    
    // Registrar evento de pausa para historial
    await db.collection('eventos_partido').add({
      partidoId,
      tipo: 'pausa',
      arbitroId,
      timestamp: timestampPausa,
      motivo: motivo || 'Interrupción',
      tiempoTranscurrido,
      datos: {
        estadoAnterior: 'En Curso',
        estadoNuevo: 'pausado'
      }
    });
    
    console.log(`⏸️ Cronómetro pausado - Partido ${partidoId}:`, {
      tiempoTranscurrido,
      timestamp: new Date(timestampPausa).toISOString(),
      motivo: motivo || 'Interrupción'
    });

    res.json({ 
      message: 'Cronómetro pausado correctamente',
      timestamp: timestampPausa,
      motivo: motivo || 'Interrupción',
      tiempoTranscurrido
    });
  } catch (error) {
    console.error('Error pausando cronómetro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reanudar cronómetro del partido
router.post('/:id/reanudar', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const partidoId = req.params.id;
    const arbitroId = req.user.uid;
    const { tiempoTranscurrido } = req.body;
    
    // Verificar que el partido existe
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Validar que el partido esté pausado
    if (partido.estado !== 'pausado') {
      return res.status(400).json({ 
        error: 'Solo se puede reanudar un partido que esté pausado',
        estadoActual: partido.estado,
        estadoEsperado: 'pausado'
      });
    }
    
    const timestampReanudacion = Date.now();
    
    // Calcular duración de la pausa
    const duracionPausa = timestampReanudacion - (partido.ultimaPausa?.timestamp || timestampReanudacion);
    
    // IMPORTANTE: Ajustar tiempo.inicio para que el cronómetro siga desde donde se pausó
    // Si tiempoTranscurrido = 300 segundos, y ahora es 10:05:00
    // entonces tiempo.inicio debe ser 10:00:00 (10:05:00 - 300 segundos)
    const nuevoTiempoInicio = new Date(timestampReanudacion - (tiempoTranscurrido * 1000));
    
    // Actualizar estado del partido
    await db.collection('partidos').doc(partidoId).update({
      estado: 'En Curso',
      tiempoTranscurrido,
      timestamp: timestampReanudacion,
      'tiempo.inicio': nuevoTiempoInicio, // Ajustar tiempo de inicio
      ultimaReanudacion: {
        arbitroId,
        timestamp: timestampReanudacion,
        duracionPausa,
        tiempoTranscurrido
      }
    });
    
    // Registrar evento de reanudación para historial
    await db.collection('eventos_partido').add({
      partidoId,
      tipo: 'reanudacion',
      arbitroId,
      timestamp: timestampReanudacion,
      duracionPausa,
      tiempoTranscurrido,
      datos: {
        estadoAnterior: 'pausado',
        estadoNuevo: 'En Curso',
        pausaAnterior: partido.ultimaPausa
      }
    });
    
    console.log(`✅ Cronómetro reanudado - Partido ${partidoId}:`, {
      tiempoTranscurrido,
      nuevoTiempoInicio: nuevoTiempoInicio.toISOString(),
      duracionPausa: `${Math.floor(duracionPausa / 1000)} segundos`
    });

    res.json({ 
      message: 'Cronómetro reanudado correctamente',
      timestamp: timestampReanudacion,
      duracionPausa,
      tiempoTranscurrido,
      nuevoTiempoInicio: nuevoTiempoInicio.toISOString()
    });
  } catch (error) {
    console.error('Error reanudando cronómetro:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/partidos/:id/procesar-referencias - Procesar referencias manualmente para un partido finalizado
router.post('/:id/procesar-referencias', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const partidoId = req.params.id;
    
    // Obtener datos del partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partidoData = partidoDoc.data();
    
    // Verificar que el partido esté finalizado
    if (partidoData.estado !== 'finalizado' && partidoData.estado !== 'finalizado_con_acta') {
      return res.status(400).json({ 
        error: 'Solo se pueden procesar referencias de partidos finalizados',
        estadoActual: partidoData.estado
      });
    }
    
    // Procesar referencias
    await actualizarPartidosConReferencias(partidoId, partidoData);
    
    res.json({
      message: 'Referencias procesadas correctamente',
      partidoId,
      resultado: {
        puntosLocal: partidoData.resultado?.puntosLocal || 0,
        puntosVisitante: partidoData.resultado?.puntosVisitante || 0
      }
    });
  } catch (error) {
    console.error('Error procesando referencias:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de eventos del cronómetro
router.get('/:id/eventos-cronometro', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const partidoId = req.params.id;
    
    // Verificar que el partido existe
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    // Obtener eventos del cronómetro
    const eventosSnapshot = await db.collection('eventos_partido')
      .where('partidoId', '==', partidoId)
      .where('tipo', 'in', ['pausa', 'reanudacion'])
      .orderBy('timestamp', 'asc')
      .get();
    
    const eventos = [];
    eventosSnapshot.forEach(doc => {
      eventos.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({
      eventos,
      total: eventos.length,
      partido: { id: partidoId, ...partidoDoc.data() }
    });
  } catch (error) {
    console.error('Error obteniendo eventos del cronómetro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas de duración del partido (User Story 1.3)
router.get('/:id/estadisticas-duracion', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const partidoId = req.params.id;
    
    // Verificar que el partido existe
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Si el partido no está finalizado, calcular duración actual
    let estadisticas = {};
    if (partido.estado === 'finalizado' && partido.duracionTotal) {
      estadisticas = {
        duracionTotal: partido.duracionTotal,
        duracionTotalMinutos: partido.duracionTotalMinutos,
        duracionTotalSegundos: partido.duracionTotalSegundos,
        tiempoJugadoEfectivo: partido.tiempoJugadoEfectivo,
        tiempoPausado: partido.tiempoPausado,
        numeroPausas: partido.numeroPausas,
        estado: 'finalizado'
      };
    } else {
      // Calcular duración actual para partidos en curso
      const PartidoService = require('../services/PartidoService');
      try {
        const duracionActual = await PartidoService.calcularDuracionTotalPartido(partidoId);
        estadisticas = {
          duracionTotal: duracionActual,
          duracionTotalMinutos: Math.round(duracionActual.duracionTotalMs / (1000 * 60)),
          duracionTotalSegundos: Math.round(duracionActual.duracionTotalMs / 1000),
          tiempoJugadoEfectivo: duracionActual.tiempoJugadoEfectivo,
          tiempoPausado: duracionActual.tiempoPausado,
          numeroPausas: duracionActual.numeroPausas,
          estado: partido.estado
        };
      } catch (error) {
        return res.status(400).json({ error: 'No se pudo calcular la duración del partido' });
      }
    }
    
    res.json({
      partidoId,
      estadisticas,
      partido: {
        id: partidoId,
        equipoLocal: partido.equipoLocal,
        equipoVisitante: partido.equipoVisitante,
        estado: partido.estado,
        fecha: partido.fecha
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de duración:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /api/partidos/:id
 * @desc Editar un partido (solo organizadores)
 * @access Private (Solo organizadores)
 */
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const partidoId = req.params.id;
    const userId = req.user.uid;
    const updateData = req.body;
    
    // Verificar que el usuario es organizador
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const userData = userDoc.data();
    if (userData.tipoUsuario !== 'organizador') {
      return res.status(403).json({ error: 'Solo los organizadores pueden editar partidos' });
    }
    
    // Verificar que el partido existe
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partidoData = partidoDoc.data();
    
    // Verificar que el usuario es organizador del torneo
    if (partidoData.organizadorId && partidoData.organizadorId !== userId) {
      return res.status(403).json({ error: 'No tienes permisos para editar este partido' });
    }
    
    // Campos permitidos para editar
    const allowedFields = [
      'canchaId', 'arbitroId', 'fecha', 'horaInicio', 
      'duracion', 'observaciones', 'estado', 'fase'
    ];
    
    const updateFields = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        // Si es fecha en formato string YYYY-MM-DD, mantenerla así para evitar problemas de zona horaria
        if (key === 'fecha' && typeof updateData[key] === 'string') {
          updateFields[key] = updateData[key];
        } else {
          updateFields[key] = updateData[key];
        }
      }
    });
    
    // Si cambia la canchaId, sincronizar el objeto cancha { id, nombre }
    if (updateFields.canchaId) {
      try {
        const canchaDoc = await db.collection('canchas').doc(updateFields.canchaId).get();
        if (canchaDoc.exists) {
          const canchaData = canchaDoc.data();
          updateFields.cancha = {
            id: updateFields.canchaId,
            nombre: canchaData?.nombre || canchaData?.titulo || 'Cancha'
          };
        }
      } catch (e) {

      }
    }
    
    // Si cambia el arbitroId, sincronizar el objeto arbitros
    if (updateFields.arbitroId) {
      try {
        const arbitroDoc = await db.collection('arbitros').doc(updateFields.arbitroId).get();
        if (arbitroDoc.exists) {
          const arbitroData = arbitroDoc.data();
          updateFields.arbitros = {
            principal: {
              id: updateFields.arbitroId,
              nombre: `${arbitroData?.nombre || ''} ${arbitroData?.apellido || ''}`.trim()
            }
          };
        }
      } catch (e) {
        console.warn('No se pudo sincronizar datos de árbitro al actualizar partido:', e?.message || e);
      }
    }
    
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }
    
    // Agregar metadatos de actualización
    updateFields.fechaActualizacion = new Date();
    updateFields.actualizadoPor = userId;
    
    // 🚀 OPTIMIZACIÓN: Usar update() en lugar de set()
    await db.collection('partidos').doc(partidoId).update(updateFields);
    
    // Invalidar caché del fixture si el torneo está presente
    if (partidoData.torneoId) {
      cacheService.invalidarFixture(partidoData.torneoId);
    }
    
    res.json({
      message: 'Partido actualizado correctamente',
      partidoId: partidoId,
      camposActualizados: Object.keys(updateFields)
    });
    
  } catch (error) {
    console.error('❌ Error editando partido:', error);
    
    // 🚀 OPTIMIZACIÓN: Manejo de errores de quota
    if (error.code === 'resource-exhausted' || error.message.includes('quota')) {
      return res.status(429).json({ 
        error: 'Se ha alcanzado el límite de operaciones. Por favor, intenta de nuevo en unos minutos.',
        type: 'QUOTA_EXCEEDED'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// POST /api/partidos/actualizar-tabla-posiciones/:torneoId - Actualizar manualmente tabla de posiciones
router.post('/actualizar-tabla-posiciones/:torneoId', verifyFirebaseToken, async (req, res) => {
  try {
    const { torneoId } = req.params;
    
    await PartidoService.actualizarTablaPosicionesManual(torneoId);
    
    res.json({
      message: 'Tabla de posiciones actualizada correctamente',
      torneoId: torneoId
    });
    
  } catch (error) {
    console.error('❌ Error actualizando tabla de posiciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/partidos/equipo/:equipoId - Obtener todos los partidos de un equipo
router.get('/equipo/:equipoId', async (req, res) => {
  try {
    const equipoId = req.params.equipoId;
    const { limit = 10, estado } = req.query;
    

    // Buscar partidos donde el equipo sea local o visitante (SIN orderBy para evitar error de índice)
    const partidosLocalSnapshot = await db.collection('partidos')
      .where('equipoLocalId', '==', equipoId)
      .get();
    
    const partidosVisitanteSnapshot = await db.collection('partidos')
      .where('equipoVisitanteId', '==', equipoId)
      .get();
    
    const partidos = [];
    const partidosIds = new Set();
    
    // Combinar resultados
    partidosLocalSnapshot.forEach(doc => {
      const data = doc.data();
      if (!partidosIds.has(doc.id) && (!estado || data.estado === estado)) {
        partidos.push({ id: doc.id, ...data });
        partidosIds.add(doc.id);
      }
    });
    
    partidosVisitanteSnapshot.forEach(doc => {
      const data = doc.data();
      if (!partidosIds.has(doc.id) && (!estado || data.estado === estado)) {
        partidos.push({ id: doc.id, ...data });
        partidosIds.add(doc.id);
      }
    });
    
    // Ordenar por fecha en memoria (más recientes primero)
    partidos.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaB - fechaA;
    });
    
    // Limitar resultados
    const partidosLimitados = partidos.slice(0, parseInt(limit));
    

    res.json(partidosLimitados);
  } catch (error) {
    console.error('❌ Error obteniendo partidos del equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/partidos/equipo/:equipoId/proximo - Obtener próximo partido de un equipo
router.get('/equipo/:equipoId/proximo', async (req, res) => {
  try {
    const equipoId = req.params.equipoId;
    const now = new Date().toISOString().split('T')[0];
    

    // Buscar partidos programados donde el equipo sea local o visitante
    const [partidosLocalSnapshot, partidosVisitanteSnapshot] = await Promise.all([
      db.collection('partidos')
        .where('equipoLocalId', '==', equipoId)
        .where('estado', '==', 'programado')
        .get(),
      db.collection('partidos')
        .where('equipoVisitanteId', '==', equipoId)
        .where('estado', '==', 'programado')
        .get()
    ]);
    
    const partidos = [];
    
    partidosLocalSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fecha && data.fecha >= now) {
        partidos.push({ id: doc.id, ...data });
      }
    });
    
    partidosVisitanteSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fecha && data.fecha >= now) {
        partidos.push({ id: doc.id, ...data });
      }
    });
    
    // Ordenar por fecha (más cercano primero)
    partidos.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaA - fechaB;
    });
    
    const proximoPartido = partidos[0] || null;

    res.json(proximoPartido);
  } catch (error) {
    console.error('❌ Error obteniendo próximo partido:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/partidos/equipo/:equipoId/ultimo - Obtener último partido finalizado de un equipo
router.get('/equipo/:equipoId/ultimo', async (req, res) => {
  try {
    const equipoId = req.params.equipoId;
    

    // Buscar partidos finalizados donde el equipo sea local o visitante
    const [partidosLocalSnapshot, partidosVisitanteSnapshot] = await Promise.all([
      db.collection('partidos')
        .where('equipoLocalId', '==', equipoId)
        .where('estado', '==', 'finalizado')
        .get(),
      db.collection('partidos')
        .where('equipoVisitanteId', '==', equipoId)
        .where('estado', '==', 'finalizado')
        .get()
    ]);
    
    const partidos = [];
    
    partidosLocalSnapshot.forEach(doc => {
      partidos.push({ id: doc.id, ...doc.data() });
    });
    
    partidosVisitanteSnapshot.forEach(doc => {
      partidos.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por fecha (más reciente primero)
    partidos.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaB - fechaA;
    });
    
    const ultimoPartido = partidos[0] || null;

    res.json(ultimoPartido);
  } catch (error) {
    console.error('❌ Error obteniendo último partido:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
