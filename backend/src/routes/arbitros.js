const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyFirebaseToken, verifyArbitro, verifyOwnership, verifyAllRoles, verifyArbitroOrStaff } = require('../middleware/auth');
const { db, storage } = require('../config/firebase');
const PartidoService = require('../services/PartidoService');

// Configuración de multer para procesar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
  }
});

// Obtener todos los árbitros
router.get('/', async (req, res) => {
  try {
    // 🚀 OPTIMIZACIÓN: Limitar a 50 árbitros por defecto
    const limit = parseInt(req.query.limit) || 50;
    const arbitrosSnapshot = await db.collection('arbitros')
      .where('activo', '==', true)
      .limit(limit)
      .get();
    
    const arbitros = [];
    arbitrosSnapshot.forEach(doc => {
      const data = doc.data();
      arbitros.push({
        id: doc.id,
        uid: data.uid,
        nombre: data.nombre,
        apellido: data.apellido,
        especialidad: data.especialidad || 'No especificada',
        certificacion: data.certificacion || 'No especificada',
        partidosArbitrados: data.partidosArbitrados || 0,
        email: data.email,
        telefono: data.telefono,
        fechaNacimiento: data.fechaNacimiento,
        fechaCreacion: data.fechaCreacion,
        activo: data.activo,
        tipoUsuario: data.tipoUsuario
      });
    });
    
    res.json(arbitros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener lista de árbitros disponibles (público para desarrollo)
router.get('/disponibles', async (req, res) => {
  try {
    const arbitrosSnapshot = await db.collection('arbitros')
      .where('activo', '==', true)
      .where('tipoUsuario', '==', 'arbitro')
      .get();
    
    const arbitros = [];
    arbitrosSnapshot.forEach(doc => {
      const data = doc.data();
      arbitros.push({
        id: doc.id,
        uid: data.uid,
        nombre: data.nombre,
        apellido: data.apellido,
        especialidad: data.especialidad || 'No especificada',
        certificacion: data.certificacion || 'No especificada',
        rating: 0, // No hay campo de rating en la estructura real
        partidosArbitrados: data.partidosArbitrados || 0,
        experiencia: 0, // No hay campo de experiencia en la estructura real
        email: data.email,
        telefono: data.telefono,
        fechaNacimiento: data.fechaNacimiento,
        fechaCreacion: data.fechaCreacion,
        activo: data.activo,
        tipoUsuario: data.tipoUsuario
      });
    });
    
    res.json({
      arbitros,
      total: arbitros.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener perfil del árbitro
router.get('/perfil/:id', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const arbitroId = req.params.id;
    const arbitroDoc = await db.collection('arbitros').doc(arbitroId).get();
    
    if (!arbitroDoc.exists) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }
    
    const arbitroData = arbitroDoc.data();
    
    // Formatear estadísticas para el frontend
    const perfilFormateado = {
      ...arbitroData,
      estadisticas: {
        partidosArbitrados: arbitroData.partidosArbitrados || 0,
        partidosCompletados: arbitroData.partidosCompletados || 0,
        tarjetasAmarillas: arbitroData.tarjetasAmarillas || 0,
        tarjetasRojas: arbitroData.tarjetasRojas || 0,
        promedioTarjetasPorPartido: arbitroData.promedioTarjetasPorPartido || 0,
        rating: arbitroData.rating || 0
      }
    };
    
    res.json(perfilFormateado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar perfil del árbitro
router.put('/perfil/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const arbitroId = req.params.id;
    const datosActualizados = req.body;
    
    // Campos permitidos para actualización
    const camposPermitidos = [
      'nombre', 'apellido', 'telefono', 'fechaNacimiento', 'foto', 'fotoPerfil',
      'certificacion', 'experienciaAnios', 'categoriasHabilitadas', 'especialidad'
    ];
    
    const datosFiltrados = {};
    Object.keys(datosActualizados).forEach(key => {
      if (camposPermitidos.includes(key)) {
        datosFiltrados[key] = datosActualizados[key];
      }
    });
    
    // Agregar fecha de actualización
    datosFiltrados.fechaActualizacion = new Date();
    
    await db.collection('arbitros').doc(arbitroId).update(datosFiltrados);
    
    // También actualizar en la colección users
    await db.collection('users').doc(arbitroId).update(datosFiltrados);
    
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subir foto del árbitro a Firebase Storage
router.post('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), upload.single('foto'), async (req, res) => {
  try {
    const arbitroId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido' });
    }
    
    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(req.file.originalname);
    const filename = `arbitro-${timestamp}-${random}${extension}`;
    
    let publicUrl = '';
    
    // Subir a Firebase Storage
    const filePath = `arbitros/${filename}`;
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
      public: true,
    });
    
    // Obtener URL pública de Firebase Storage
    publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Actualizar Firestore en ambas colecciones
    const updateData = {
      foto: publicUrl,
      fechaActualizacion: new Date()
    };
    
    await Promise.all([
      db.collection('arbitros').doc(arbitroId).update(updateData),
      db.collection('users').doc(arbitroId).update(updateData)
    ]);
    
    res.json({ 
      message: 'Foto actualizada correctamente',
      foto: publicUrl
    });
  } catch (error) {
    console.error('❌ Error subiendo foto:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar foto del árbitro
router.delete('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const arbitroId = req.params.id;
    
    // Obtener datos del árbitro para obtener la URL de la foto actual
    const arbitroDoc = await db.collection('arbitros').doc(arbitroId).get();
    if (!arbitroDoc.exists) {
      return res.status(404).json({ error: 'Árbitro no encontrado' });
    }
    
    const arbitroData = arbitroDoc.data();
    const fotoActual = arbitroData.foto;
    
    // Si hay una foto actual y es de Firebase Storage, eliminarla
    if (fotoActual && fotoActual.includes('storage.googleapis.com')) {
      try {
        // Extraer el path del archivo de la URL
        const urlParts = fotoActual.split('/');
        const filePath = urlParts.slice(4).join('/'); // arbitros/filename.jpg
        
        const bucket = storage.bucket();
        const file = bucket.file(filePath);
        
        await file.delete();

      } catch (storageError) {

        // Continuar aunque falle la eliminación del archivo
      }
    }
    
    // Actualizar Firestore eliminando la foto
    const updateData = {
      foto: '',
      fechaActualizacion: new Date()
    };
    
    await Promise.all([
      db.collection('arbitros').doc(arbitroId).update(updateData),
      db.collection('users').doc(arbitroId).update(updateData)
    ]);
    
    res.json({ 
      message: 'Foto eliminada correctamente',
      foto: ''
    });
  } catch (error) {
    console.error('❌ Error eliminando foto:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener partidos asignados al árbitro autenticado
router.get('/partidos', verifyFirebaseToken, async (req, res) => {
  try {
    const arbitroId = req.user.uid;
    const filtros = req.query;
    
    // Obtener todos los partidos y filtrar localmente para compatibilidad
    const partidosSnapshot = await db.collection('partidos').get();
    
    const partidos = [];
    
    // Filtrar partidos donde es árbitro principal o asistente
    partidosSnapshot.forEach(doc => {
      const partido = doc.data();
      
      // Verificar TODAS las posibles estructuras de árbitro:
      // 1. arbitroPrincipalId (campo directo - estructura actual)
      if (partido.arbitroPrincipalId === arbitroId) {
        partidos.push({ ...partido, id: doc.id });
      }
      // 2. arbitros.principal.id (estructura nueva anidada)
      else if (partido.arbitros?.principal?.id === arbitroId) {
        partidos.push({ ...partido, id: doc.id });
      }
      // 3. arbitroId (estructura legacy)
      else if (partido.arbitroId === arbitroId) {
        partidos.push({ ...partido, id: doc.id });
      }
      // 4. arbitrosAsistentesIds (array de IDs directos)
      else if (partido.arbitrosAsistentesIds && partido.arbitrosAsistentesIds.includes(arbitroId)) {
        partidos.push({ ...partido, id: doc.id });
      }
      // 5. arbitros.asistentes (array de objetos)
      else if (partido.arbitros?.asistentes) {
        const esAsistente = partido.arbitros.asistentes.some(asistente => asistente.id === arbitroId);
        if (esAsistente) {
          partidos.push({ ...partido, id: doc.id });
        }
      }
    });
    
    // Ordenar por fecha
    partidos.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaA - fechaB;
    });
    
    res.json(partidos);
  } catch (error) {
    console.error('❌ Error obteniendo partidos del árbitro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener partidos asignados al árbitro por ID específico
router.get('/partidos/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const arbitroId = req.params.id;
    const filtros = req.query;
    
    const partidos = await PartidoService.getPartidosPorArbitro(arbitroId, filtros);
    
    res.json(partidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener encuentros pendientes para árbitros (US 1.1)
router.get('/encuentros-pendientes', verifyFirebaseToken, async (req, res) => {
  try {
    const arbitroId = req.user.uid;
    
    // Obtener partidos programados donde el árbitro es principal
    const partidosSnapshot = await db.collection('partidos')
      .where('arbitros.principal.id', '==', arbitroId)
      .where('estado', '==', 'programado')
      .orderBy('fecha', 'asc')
      .get();
    
    const encuentrosPendientes = [];
    partidosSnapshot.forEach(doc => {
      const data = doc.data();
      encuentrosPendientes.push({
        id: doc.id,
        ...data,
        fechaHoraCompleta: new Date(data.fecha).toLocaleDateString() + ' ' + data.horaInicio
      });
    });
    
    res.json({
      encuentros: encuentrosPendientes,
      total: encuentrosPendientes.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar partido con horario real (US 1.1, 1.2 y 1.3) - Con validación de seguridad
router.post('/partido/iniciar/:partidoId', verifyFirebaseToken, verifyArbitroOrStaff, async (req, res) => {
  try {
    const usuarioId = req.user.uid;
    const usuarioNombre = `${req.user.nombre} ${req.user.apellido}`;
    const partidoId = req.params.partidoId;
    const { horarioRealInicio } = req.body;
    
    // Obtener el partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partidoData = partidoDoc.data();
    
    // Verificar permisos para iniciar partido
    if (req.user.tipoUsuario === 'arbitro') {
      // Solo el árbitro principal puede iniciar el partido
      // Verificar todas las posibles estructuras de árbitro
      const esArbitroPrincipal = partidoData.arbitroPrincipalId === usuarioId ||
                                 partidoData.arbitros?.principal?.id === usuarioId ||
                                 partidoData.arbitroId === usuarioId;
      
      if (!esArbitroPrincipal) {
        return res.status(403).json({ error: 'Solo el árbitro principal puede iniciar este partido' });
      }
    } else if (req.user.tipoUsuario === 'organizador' || req.user.tipoUsuario === 'admin') {
      // Staff autorizado puede iniciar partidos
    } else {
      // Si no tiene tipoUsuario pero es árbitro por email, permitir
      const esArbitroPorEmail = req.user.email?.includes('arbitro') || 
                               req.user.displayName?.toLowerCase().includes('arbitro');
      
      if (esArbitroPorEmail) {
        const esArbitroPrincipal = partidoData.arbitroPrincipalId === usuarioId ||
                                   partidoData.arbitros?.principal?.id === usuarioId ||
                                   partidoData.arbitroId === usuarioId;
        
        if (!esArbitroPrincipal) {
          return res.status(403).json({ error: 'Solo el árbitro principal puede iniciar este partido' });
        }
      } else {
        return res.status(403).json({ error: 'No tienes permisos para iniciar este partido' });
      }
    }
    
    // Verificar que el partido está programado
    if (partidoData.estado !== 'programado') {
      return res.status(400).json({ error: 'El partido no está en estado programado' });
    }
    
    // Actualizar el partido con el horario real de inicio y auditoría
    const horarioInicioReal = horarioRealInicio || new Date();
    const actualizaciones = {
      estado: 'En Curso',
      'tiempo.inicio': horarioInicioReal,
      fechaActualizacion: new Date(),
      'auditoria.iniciadoPor': usuarioId,
      'auditoria.iniciadoPorNombre': usuarioNombre,
      'auditoria.modificadoPor': usuarioId,
      'auditoria.modificadoPorNombre': usuarioNombre
    };
    
    // Registrar el cambio en el historial
    const cambio = {
      timestamp: new Date(),
      usuarioId,
      usuarioNombre,
      accion: 'INICIO',
      detalles: { estadoAnterior: 'programado', estadoNuevo: 'En Curso' },
      estadoAnterior: 'programado'
    };
    
    await db.collection('partidos').doc(partidoId).update({
      ...actualizaciones,
      'auditoria.historialCambios': [...(partidoData.auditoria?.historialCambios || []), cambio]
    });
    
    // Establecer minutoInicio = 0 para todos los jugadores activos en convocados
    const convocadosSnapshot = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .get();
    
    const batch = db.batch();
    convocadosSnapshot.docs.forEach(convocadoDoc => {
      const convocadosData = convocadoDoc.data();
      const jugadoresActualizados = convocadosData.jugadores.map(jugador => {
        if (jugador.activo && jugador.esTitular && jugador.minutoInicio === null) {
          return {
            ...jugador,
            minutoInicio: 0 // Establecer minuto de inicio cuando el partido comienza
          };
        }
        return jugador;
      });
      
      batch.update(convocadoDoc.ref, {
        jugadores: jugadoresActualizados,
        fechaActualizacion: new Date()
      });
    });
    
    await batch.commit();
    
    // Obtener el partido actualizado
    const partidoActualizado = await db.collection('partidos').doc(partidoId).get();
    
    res.json({
      message: 'Partido iniciado correctamente',
      partido: {
        id: partidoId,
        ...partidoActualizado.data()
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Agregar incidencia durante el partido (solo árbitros)
router.post('/partido/:partidoId/incidencia', verifyFirebaseToken, verifyArbitroOrStaff, async (req, res) => {
  try {
    const arbitroId = req.user.uid;
    const partidoId = req.params.partidoId;
    const incidenciaData = req.body;
    
    const incidencia = await PartidoService.agregarIncidencia(partidoId, arbitroId, incidenciaData);
    
    res.json({
      message: 'Incidencia registrada correctamente',
      incidencia
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Procesar campeón cuando se finaliza la final
router.post('/torneo/:torneoId/procesar-campeon', verifyFirebaseToken, verifyArbitroOrStaff, async (req, res) => {
  try {
    const torneoId = req.params.torneoId;
    
    // Obtener datos del torneo
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const torneoData = torneoDoc.data();
    
    if (torneoData.formato !== 'eliminacion_directa') {
      return res.status(400).json({ error: 'No es un torneo de eliminación directa' });
    }

    // Buscar la fase de final
    const estructuraEliminacion = torneoData.estructuraEliminacion;
    const faseFinal = estructuraEliminacion.fases.find(fase => fase.nombre === 'Final');
    if (!faseFinal) {
      return res.status(400).json({ error: 'No se encontró la fase de final' });
    }

    // Obtener el partido de la final finalizado
    const partidosFinal = await db.collection('partidos')
      .where('torneoId', '==', torneoId)
      .where('fase', '==', 'Final')
      .where('estado', '==', 'finalizado')
      .get();

    if (partidosFinal.docs.length === 0) {
      return res.status(400).json({ 
        error: 'No hay partido de final finalizado',
        partidosEncontrados: partidosFinal.docs.length
      });
    }

    const partidoFinal = partidosFinal.docs[0].data();

    // Determinar el campeón
    const TorneoService = require('../services/TorneoService');
    const campeon = TorneoService.determinarGanador(partidoFinal);
    
    if (!campeon) {
      return res.status(400).json({ error: 'No se pudo determinar el campeón' });
    }

    // Determinar el subcampeón
    const subcampeon = partidoFinal.equipoLocalId === campeon.id ? 
      { id: partidoFinal.equipoVisitanteId, nombre: partidoFinal.equipoVisitante, logo: partidoFinal.equipoVisitanteLogo } :
      { id: partidoFinal.equipoLocalId, nombre: partidoFinal.equipoLocal, logo: partidoFinal.equipoLocalLogo };

    // Actualizar el torneo con el campeón
    await db.collection('torneos').doc(torneoId).update({
      campeon: campeon,
      subcampeon: subcampeon,
      estado: 'finalizado',
      fechaFinalizacion: new Date(),
      updatedAt: new Date()
    });

    res.json({
      message: 'Campeón procesado correctamente',
      torneoId,
      campeon: campeon,
      subcampeon: subcampeon,
      resultado: {
        campeon: `${campeon.nombre} (${partidoFinal.equipoLocalId === campeon.id ? partidoFinal.resultado.puntosLocal : partidoFinal.resultado.puntosVisitante})`,
        subcampeon: `${subcampeon.nombre} (${partidoFinal.equipoLocalId === subcampeon.id ? partidoFinal.resultado.puntosLocal : partidoFinal.resultado.puntosVisitante})`
      }
    });

  } catch (error) {
    console.error('❌ Error procesando campeón:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear partido de final con ganadores de semifinales
router.post('/torneo/:torneoId/crear-final', verifyFirebaseToken, verifyArbitroOrStaff, async (req, res) => {
  try {
    const torneoId = req.params.torneoId;
    
    // Obtener datos del torneo
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const torneoData = torneoDoc.data();
    
    if (torneoData.formato !== 'eliminacion_directa') {
      return res.status(400).json({ error: 'No es un torneo de eliminación directa' });
    }

    const estructuraEliminacion = torneoData.estructuraEliminacion;
    if (!estructuraEliminacion || !estructuraEliminacion.fases) {
      return res.status(400).json({ error: 'No hay estructura de eliminación' });
    }

    // Buscar la fase de semifinales
    const faseSemifinales = estructuraEliminacion.fases.find(fase => fase.nombre === 'Semifinales');
    if (!faseSemifinales) {
      return res.status(400).json({ error: 'No se encontró la fase de semifinales' });
    }

    // Buscar la fase de final
    const faseFinal = estructuraEliminacion.fases.find(fase => fase.nombre === 'Final');
    if (!faseFinal) {
      return res.status(400).json({ error: 'No se encontró la fase de final' });
    }

    // Obtener todos los partidos finalizados de semifinales
    const partidosSemifinales = await db.collection('partidos')
      .where('torneoId', '==', torneoId)
      .where('fase', '==', 'Semifinales')
      .where('estado', '==', 'finalizado')
      .get();

    if (partidosSemifinales.docs.length < 2) {
      return res.status(400).json({ 
        error: 'Se necesitan al menos 2 partidos de semifinales finalizados',
        partidosEncontrados: partidosSemifinales.docs.length
      });
    }

    // Determinar los ganadores de cada semifinal
    const ganadores = [];
    const TorneoService = require('../services/TorneoService');

    for (const doc of partidosSemifinales.docs) {
      const partidoData = doc.data();

      const ganador = TorneoService.determinarGanador(partidoData);
      if (ganador) {
        ganadores.push({
          ...ganador,
          nroLlave: partidoData.nroLlave
        });
      }
    }

    if (ganadores.length !== 2) {
      return res.status(400).json({ 
        error: 'Se necesitan exactamente 2 ganadores de semifinales',
        ganadoresEncontrados: ganadores.length
      });
    }

    // Ordenar ganadores por número de llave
    ganadores.sort((a, b) => a.nroLlave - b.nroLlave);

    // Actualizar la estructura de eliminación con los ganadores
    const llaveFinal = faseFinal.llaves[0]; // Asumir que hay solo una llave en la final
    if (!llaveFinal) {
      return res.status(400).json({ error: 'No se encontró la llave de la final' });
    }

    // Asignar ganadores a la final
    llaveFinal.equipo1 = ganadores[0];
    llaveFinal.equipo2 = ganadores[1];

    // Crear el partido de la final
    const partidoId = await PartidoService.crearPartidoIndividual(torneoId, faseFinal, llaveFinal, [], []);
    llaveFinal.partidoId = partidoId;

    // Actualizar el torneo en la base de datos
    await db.collection('torneos').doc(torneoId).update({
      estructuraEliminacion: estructuraEliminacion,
      updatedAt: new Date()
    });

    res.json({
      message: 'Partido de final creado correctamente',
      torneoId,
      partidoFinalId: partidoId,
      ganadores: {
        equipo1: llaveFinal.equipo1.nombre,
        equipo2: llaveFinal.equipo2.nombre
      }
    });

  } catch (error) {
    console.error('❌ Error creando partido de final:', error);
    res.status(500).json({ error: error.message });
  }
});

// Procesar partidos finalizados pendientes
router.post('/torneo/:torneoId/procesar-finalizados', verifyFirebaseToken, verifyArbitroOrStaff, async (req, res) => {
  try {
    const torneoId = req.params.torneoId;
    
    // Obtener datos del torneo
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const torneoData = torneoDoc.data();
    
    if (torneoData.formato !== 'eliminacion_directa') {
      return res.status(400).json({ error: 'No es un torneo de eliminación directa' });
    }

    const estructuraEliminacion = torneoData.estructuraEliminacion;
    if (!estructuraEliminacion || !estructuraEliminacion.fases) {
      return res.status(400).json({ error: 'No hay estructura de eliminación' });
    }

    const faseActual = estructuraEliminacion.fases[estructuraEliminacion.faseActual];
    if (!faseActual) {
      return res.status(400).json({ error: 'No hay fase actual' });
    }

    // Obtener todos los partidos finalizados de la fase actual
    const partidosFaseActual = await db.collection('partidos')
      .where('torneoId', '==', torneoId)
      .where('fase', '==', faseActual.nombre)
      .where('estado', '==', 'finalizado')
      .get();

    if (partidosFaseActual.docs.length === 0) {
      return res.json({
        message: 'No hay partidos finalizados para procesar',
        torneoId,
        faseActual: faseActual.nombre
      });
    }

    // Procesar cada partido finalizado
    for (const doc of partidosFaseActual.docs) {
      await PartidoService.procesarPartidoIndividual(torneoId, doc.id, estructuraEliminacion, faseActual);
    }
    
    res.json({
      message: 'Partidos finalizados procesados correctamente',
      torneoId,
      partidosProcesados: partidosFaseActual.docs.length,
      faseActual: faseActual.nombre
    });
  } catch (error) {
    console.error('❌ Error procesando partidos finalizados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug: Verificar estado del partido
router.get('/partido/:partidoId/debug', verifyFirebaseToken, async (req, res) => {
  try {
    const partidoId = req.params.partidoId;
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partidoData = partidoDoc.data();
    res.json({
      id: partidoId,
      estado: partidoData.estado,
      arbitros: partidoData.arbitros,
      arbitroPrincipalId: partidoData.arbitroPrincipalId,
      arbitroId: partidoData.arbitroId,
      fechaPartido: partidoData.fechaPartido,
      horaInicio: partidoData.horaInicio
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalizar gestión del partido (solo árbitros)
router.post('/partido/:partidoId/finalizar', verifyFirebaseToken, verifyArbitroOrStaff, async (req, res) => {
  try {
    const arbitroId = req.user.uid;
    const partidoId = req.params.partidoId;
    const resumen = req.body;
    
    const partido = await PartidoService.finalizarPartido(partidoId, arbitroId, resumen);
    
    res.json({
      message: 'Partido finalizado correctamente',
      partido
    });
  } catch (error) {
    console.error('❌ Error finalizando partido:', error);
    res.status(400).json({ error: error.message });
  }
});

// Finalizar partido con acta oficial (User Stories 1.1, 1.2, 1.3)
router.post('/partido/:partidoId/finalizar-con-acta', verifyFirebaseToken, async (req, res) => {
  try {
    const arbitroId = req.user.uid;
    const partidoId = req.params.partidoId;
    const { acta } = req.body;
    
    // Verificar que el partido existe
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partidoData = partidoDoc.data();
    
    // Verificar que el árbitro es el principal asignado
    if (partidoData.arbitros.principal.id !== arbitroId) {
      return res.status(403).json({ error: 'Solo el árbitro principal puede finalizar el partido con acta' });
    }
    
    // Verificar que el partido está en curso
    if (partidoData.estado !== 'En Curso') {
      return res.status(400).json({ error: 'El partido debe estar en curso para finalizar con acta' });
    }
    
    // Calcular duración total del partido
    const duracionTotal = await PartidoService.calcularDuracionTotalPartido(partidoId);
    
    // Crear el acta oficial con todos los datos
    const actaOficial = {
      ...acta,
      id: `acta_${partidoId}_${Date.now()}`,
      fechaCreacion: new Date(),
      duracionTotal: duracionTotal,
      estado: 'FINALIZADO_CON_ACTA',
      version: '1.0'
    };
    
    // Actualizar el partido con el acta
    await db.collection('partidos').doc(partidoId).update({
      estado: 'finalizado_con_acta',
      actaOficial: actaOficial,
      fechaActualizacion: new Date(),
      fechaFinalizacion: new Date(),
      duracionTotal: duracionTotal
    });
    
    // Guardar el acta como documento independiente para auditoría
    await db.collection('actas_partidos').add(actaOficial);
    
    // Registrar evento de finalización con acta
    await db.collection('eventos_partido').add({
      partidoId,
      tipo: 'finalizacion_con_acta',
      arbitroId,
      timestamp: Date.now(),
      datos: {
        actaId: actaOficial.id,
        firmaDigital: actaOficial.firmaDigital
      }
    });

    // Actualizar estadísticas de los jugadores
    const Partido = require('../models/Partido');
    const partidoModel = new Partido(partidoData);
    await PartidoService.actualizarEstadisticasJugadores(partidoId, partidoModel);
    
    // 🆕 NUEVO: Actualizar partidos con referencias (formato personalizado)
    const partidoDataActualizado = (await db.collection('partidos').doc(partidoId).get()).data();
    await PartidoService.actualizarPartidosConReferencias(partidoId, partidoDataActualizado);

    res.json({
      message: 'Partido finalizado correctamente con acta oficial',
      acta: actaOficial,
      partido: {
        id: partidoId,
        estado: 'finalizado_con_acta',
        actaOficial: actaOficial
      }
    });
  } catch (error) {
    console.error('❌ Error finalizando partido con acta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener detalles de un partido específico
router.get('/partido/:partidoId', verifyFirebaseToken, async (req, res) => {
  try {
    const partidoId = req.params.partidoId;
    
    const partido = await PartidoService.getPartidoById(partidoId);
    
    res.json(partido);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
