const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyFirebaseToken, verifyOrganizador, verifyOwnership, verifyAllRoles } = require('../middleware/auth');
const { db, storage } = require('../config/firebase');
const { generarFixture, generarFixtureConGrupos } = require('../utils/helpers');

// Configurar multer para procesar archivos en memoria (para Firebase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Crear perfil de organizador automáticamente al registrarse
router.post('/crear-perfil', verifyFirebaseToken, async (req, res) => {
  try {
    const organizadorId = req.user.uid;
    const { nombre, apellido, telefono, fechaNacimiento, organizacion, cargo, codigoInvitacion } = req.body;
    
    // VALIDAR CÓDIGO DE INVITACIÓN DE LA UNIÓN
    if (!codigoInvitacion) {
      return res.status(403).json({ 
        error: 'Código de invitación requerido',
        mensaje: 'Usted no tiene permiso para acceder. Solo la Unión puede asignar roles de organizador.'
      });
    }

    // Verificar el código de invitación
    const invitacionesSnapshot = await db.collection('invitaciones_union')
      .where('codigo', '==', codigoInvitacion)
      .limit(1)
      .get();

    if (invitacionesSnapshot.empty) {
      return res.status(403).json({ 
        error: 'Código de invitación inválido',
        mensaje: 'Usted no tiene permiso para acceder. Solo la Unión puede asignar roles de organizador.'
      });
    }

    const invitacionDoc = invitacionesSnapshot.docs[0];
    const invitacionData = invitacionDoc.data();

    // Validar que la invitación esté activa y no expirada
    if (invitacionData.estado !== 'activa') {
      return res.status(403).json({ 
        error: 'Invitación no activa',
        mensaje: 'Usted no tiene permiso para acceder. Esta invitación ya fue utilizada o revocada.'
      });
    }

    if (new Date() > new Date(invitacionData.fechaExpiracion)) {
      return res.status(403).json({ 
        error: 'Invitación expirada',
        mensaje: 'Usted no tiene permiso para acceder. Esta invitación ha expirado.'
      });
    }

    // Verificar si ya existe el perfil
    const organizadorDoc = await db.collection('organizadores').doc(organizadorId).get();
    
    if (organizadorDoc.exists) {
      return res.status(400).json({ 
        error: 'El perfil ya existe',
        perfil: organizadorDoc.data()
      });
    }
    
    // Crear perfil básico
    const perfilBasico = {
      id: organizadorId,
      uid: organizadorId,
      nombre: nombre || req.user.nombre || 'Usuario',
      apellido: apellido || '',
      email: req.user.email || '',
      telefono: telefono || '',
      fechaNacimiento: fechaNacimiento || new Date().toISOString(),
      foto: '',
      organizacion: organizacion || '',
      cargo: cargo || '',
      experiencia: 0,
      torneosCreados: 0,
      partidosOrganizados: 0,
      permisos: {
        gestionarTorneos: true,
        gestionarPartidos: true,
        gestionarEquipos: true,
        gestionarJugadores: true,
        gestionarArbitros: true,
        supervisarPartidos: true,
        publicarNoticias: true,
        gestionarPatrocinadores: true,
        generarReportes: true,
        verHistorial: true
      },
      estadisticas: {
        torneosActivos: 0,
        equiposGestionados: 0,
        jugadoresRegistrados: 0,
        arbitrosContratados: 0
      },
      activo: true,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      tipoUsuario: 'organizador'
    };
    
    await db.collection('organizadores').doc(organizadorId).set(perfilBasico);
    
    // Marcar invitación como usada
    await db.collection('invitaciones_union').doc(invitacionDoc.id).update({
      estado: 'usada',
      fechaUso: new Date(),
      usadaPor: organizadorId,
      usadaPorEmail: req.user.email
    });
    
    res.status(201).json({
      message: 'Perfil de organizador creado correctamente',
      perfil: perfilBasico
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener perfil de organizador (unificado)
router.get('/perfil/:id', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const organizadorId = req.params.id;
    
    // Buscar primero en la colección de organizadores
    const organizadorDoc = await db.collection('organizadores').doc(organizadorId).get();
    
    if (organizadorDoc.exists) {
      // Si existe en organizadores, devolver esos datos con estadísticas
      const organizadorData = organizadorDoc.data();
      
      // Calcular estadísticas
      const torneosSnapshot = await db.collection('torneos')
        .where('organizadorId', '==', organizadorId)
        .get();
      
      const torneosActivos = torneosSnapshot.docs.filter(doc => 
        doc.data().estado === 'en_curso'
      ).length;
      
      const perfilCompleto = {
        id: organizadorDoc.id,
        ...organizadorData,
        torneosCreados: torneosSnapshot.size,
        estadisticas: {
          torneosActivos,
          equiposGestionados: 0,
          jugadoresRegistrados: 0,
          arbitrosContratados: 0
        },
        // Compatibilidad con diferentes nombres de campos
        partidosOrganizados: organizadorData.partidosOrganizados || organizadorData.partidosGestionados || 0,
        experiencia: organizadorData.experiencia || 0
      };
      
      return res.json(perfilCompleto);
    }
    
    // Si no existe en organizadores, buscar en users
    const userDoc = await db.collection('users').doc(organizadorId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Organizador no encontrado' });
    }
    
    const userData = userDoc.data();
    
    // Verificar que sea organizador
    if (userData.tipoUsuario !== 'organizador' && userData.tipoUsuario !== 'admin') {
      return res.status(403).json({ error: 'Este usuario no es un organizador' });
    }
    
    // Calcular estadísticas
    const torneosSnapshot = await db.collection('torneos')
      .where('organizadorId', '==', organizadorId)
      .get();
    
    const torneosActivos = torneosSnapshot.docs.filter(doc => 
      doc.data().estado === 'en_curso'
    ).length;
    
    // Crear perfil básico y guardarlo en organizadores
    const perfilBasico = {
      id: organizadorId,
      uid: organizadorId,
      nombre: userData.nombre || req.user.nombre || 'Usuario',
      apellido: userData.apellido || '',
      email: userData.email || req.user.email || '',
      telefono: userData.telefono || '',
      fechaNacimiento: userData.fechaNacimiento || new Date().toISOString(),
      foto: userData.foto || '',
      organizacion: userData.organizacion || '',
      cargo: userData.cargo || '',
      experiencia: userData.experiencia || 0,
      torneosCreados: torneosSnapshot.size,
      partidosOrganizados: userData.partidosOrganizados || userData.partidosGestionados || 0,
      permisos: {
        gestionarTorneos: true,
        gestionarPartidos: true,
        gestionarEquipos: true,
        gestionarJugadores: true,
        gestionarArbitros: true,
        supervisarPartidos: true,
        publicarNoticias: true,
        gestionarPatrocinadores: true,
        generarReportes: true,
        verHistorial: true
      },
      estadisticas: {
        torneosActivos,
        equiposGestionados: 0,
        jugadoresRegistrados: 0,
        arbitrosContratados: 0
      },
      activo: userData.activo !== undefined ? userData.activo : true,
      fechaCreacion: userData.fechaCreacion || new Date(),
      fechaActualizacion: new Date(),
      tipoUsuario: 'organizador'
    };
    
    await db.collection('organizadores').doc(organizadorId).set(perfilBasico);
    res.json(perfilBasico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar perfil de organizador
router.put('/perfil/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const organizadorId = req.params.id;
    const datosActualizados = req.body;
    
    // Agregar fecha de actualización
    datosActualizados.fechaActualizacion = new Date();
    
    // Actualizar en organizadores
    await db.collection('organizadores').doc(organizadorId).update(datosActualizados);
    
    // También actualizar en la colección users
    await db.collection('users').doc(organizadorId).update(datosActualizados);
    
    res.json({
      message: 'Perfil actualizado correctamente',
      id: organizadorId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subir foto de perfil de organizador
router.post('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), upload.single('foto'), async (req, res) => {
  try {
    const organizadorId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido' });
    }
    
    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(req.file.originalname);
    const filename = `organizador-${timestamp}-${random}${extension}`;
    
    let publicUrl = '';
    
    // Subir a Firebase Storage
    const filePath = `organizadores/${filename}`;
    const bucket = storage.bucket();
    
    const file = bucket.file(filePath);
    
    try {
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
        public: true,
      });
      
      // Obtener URL pública de Firebase Storage
      publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    } catch (storageError) {
      throw storageError;
    }
    
    // Actualizar Firestore en ambas colecciones
    const updateData = {
      foto: publicUrl,
      fechaActualizacion: new Date()
    };
    
    await Promise.all([
      db.collection('organizadores').doc(organizadorId).update(updateData),
      db.collection('users').doc(organizadorId).update(updateData)
    ]);
    
    res.json({ 
      message: 'Foto actualizada correctamente',
      foto: publicUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar foto del organizador
router.delete('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const organizadorId = req.params.id;
    
    // Obtener datos del organizador para obtener la URL de la foto actual
    const organizadorDoc = await db.collection('organizadores').doc(organizadorId).get();
    if (!organizadorDoc.exists) {
      return res.status(404).json({ error: 'Organizador no encontrado' });
    }
    
    const organizadorData = organizadorDoc.data();
    const fotoActual = organizadorData.foto;
    
    // Si hay una foto actual y es de Firebase Storage, eliminarla
    if (fotoActual && fotoActual.includes('storage.googleapis.com')) {
      try {
        // Extraer el path del archivo de la URL
        const urlParts = fotoActual.split('/');
        const filePath = urlParts.slice(4).join('/'); // organizadores/filename.jpg
        
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
      db.collection('organizadores').doc(organizadorId).update(updateData),
      db.collection('users').doc(organizadorId).update(updateData)
    ]);
    
    res.json({ 
      message: 'Foto eliminada correctamente',
      foto: ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear organizador
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email, nombre, apellido, telefono, fechaNacimiento, organizacion, cargo } = req.body;
    
    const organizadorData = {
      uid,
      email,
      nombre,
      apellido,
      telefono,
      fechaNacimiento,
      organizacion: organizacion || '',
      cargo: cargo || '',
      tipoUsuario: 'organizador',
      permisos: {
        gestionarTorneos: true,
        gestionarPartidos: true,
        gestionarEquipos: true,
        gestionarJugadores: true,
        gestionarArbitros: true,
        supervisarPartidos: true,
        publicarNoticias: true,
        gestionarPatrocinadores: true,
        generarReportes: true,
        verHistorial: true
      },
      torneosCreados: 0,
      partidosGestionados: 0,
      fechaCreacion: new Date(),
      activo: true
    };
    
    await db.collection('organizadores').doc(uid).set(organizadorData);
    
    res.status(201).json({ 
      message: 'Organizador creado correctamente',
      organizador: organizadorData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generar fixture automático
router.post('/torneos/:id/fixture', verifyFirebaseToken, verifyOrganizador, async (req, res) => {
  try {
    const torneoId = req.params.id;
    const { 
      tipoFixture = 'todos_contra_todos',
      fechaInicio,
      diasEntreJornadas = 7,
      horarios = {},
      canchas = [],
      arbitros = [],
      partidos = [] // Para modo manual, partidos ya generados desde el frontend
    } = req.body;

    // Obtener datos del torneo (incluyendo equipos)
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    
    const torneoData = torneoDoc.data();
    const equipos = torneoData.equipos || [];
    const formato = torneoData.formato || tipoFixture;
    const idaYvuelta = torneoData.idaYvuelta === true || torneoData.idaYvuelta === 'true';

    if (equipos.length < 2) {
      return res.status(400).json({ error: 'Se necesitan al menos 2 equipos para generar el fixture' });
    }
    
    // Para grupos-playoff, obtener la estructura de grupos del torneo o de la colección grupos
    let gruposData = [];
    if ((tipoFixture === 'grupos_y_playoff' || formato === 'grupos-playoff') && torneoData.cantidadGrupos) {
      // Obtener grupos de la colección grupos
      const gruposSnapshot = await db.collection('grupos')
        .where('torneoId', '==', torneoId)
        .get();
      
      if (!gruposSnapshot.empty) {
        gruposData = gruposSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    }
    
    // Preparar mapa de canchas (id -> datos) para asignar nombre correctamente
    let canchasMap = {};
    if (Array.isArray(canchas) && canchas.length > 0) {
      try {
        const snapshots = await Promise.all(
          canchas.map((canchaId) => db.collection('canchas').doc(canchaId).get())
        );
        snapshots.forEach((snap) => {
          if (snap.exists) {
            canchasMap[snap.id] = snap.data();
          }
        });
      } catch (e) {

      }
    }

    // Generar fixture usando la función helper
    let fixture;
    let usarPartidosManual = false;
    
    if (tipoFixture === 'eliminacion_directa') {
      // Para eliminación directa, usar el servicio específico
      const TorneoService = require('../services/TorneoService');
      const result = await TorneoService.generarFixtureEliminacionDirecta(torneoId, req.user.uid, canchas, arbitros);
      
      res.json({
        message: 'Fixture de eliminación directa generado correctamente',
        estructuraEliminacion: result.estructuraEliminacion,
        partidosGenerados: result.partidosGenerados,
        faseActual: result.faseActual
      });
      return;
    } else if (tipoFixture === 'manual' && partidos && partidos.length > 0) {
      // Modo manual: usar los partidos enviados desde el frontend
      usarPartidosManual = true;
    } else {
      fixture = generarFixture(equipos, tipoFixture, idaYvuelta);
    }

    // 🚀 OPTIMIZACIÓN: Usar batch writes para crear múltiples partidos de forma eficiente
    const partidosIds = [];
    let fechaActual = new Date(fechaInicio);
    let batch = db.batch();
    let operacionesEnBatch = 0;
    const MAX_OPERACIONES_POR_BATCH = 500; // Firestore permite máximo 500 operaciones por batch
    
    // Si es modo manual, usar los partidos del request directamente
    if (usarPartidosManual) {
      for (const partidoManual of partidos) {
        const partidoRef = db.collection('partidos').doc();
        const partidoId = partidoRef.id;
        
        // Crear partido con la estructura que viene del frontend
        const partidoData = {
          ...partidoManual,
          id: partidoId,
          torneoId,
          torneoNombre: torneoData.nombre,
          categoria: torneoData.categoria || '',
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        };
        
        batch.set(partidoRef, partidoData);
        partidosIds.push(partidoId);
        operacionesEnBatch++;
        
        // Si alcanzamos el límite de operaciones, ejecutar el batch y crear uno nuevo
        if (operacionesEnBatch >= MAX_OPERACIONES_POR_BATCH) {
          await batch.commit();
          batch = db.batch();
          operacionesEnBatch = 0;
        }
      }
    } else {
      // Modo automático: generar partidos desde el fixture
      for (let i = 0; i < fixture.length; i++) {
        const jornada = fixture[i];

        for (const partido of jornada) {
          // Asignar cancha y árbitro rotando entre los disponibles
          const canchaAsignada = canchas.length > 0 ? canchas[i % canchas.length] : null;
          const datosCancha = canchaAsignada ? canchasMap[canchaAsignada] : null;
          const arbitroAsignado = arbitros.length > 0 ? arbitros[i % arbitros.length] : null;
          
          const partidoRef = db.collection('partidos').doc(); // Crear referencia con ID automático
          const partidoId = partidoRef.id; // Obtener el ID generado
          
          const partidoData = {
            id: partidoId, // Guardar el ID en el documento
            torneoId,
            torneoNombre: torneoData.nombre,
            categoria: torneoData.categoria || '', // Agregar categoría del torneo
            jornada: i + 1,
            fase: 'Regular',
            
            // Equipos (RUGBY)
            equipoLocalId: partido.local.id,
            equipoLocal: partido.local.nombre,
            equipoLocalLogo: partido.local.logo || '',
            equipoVisitanteId: partido.visitante.id,
            equipoVisitante: partido.visitante.nombre,
            equipoVisitanteLogo: partido.visitante.logo || '',
            
            // Información de grupo (si aplica)
            grupoId: partido.grupoId || null,
            grupo: partido.grupo || null,
            
            fecha: new Date(fechaActual),
            horaInicio: horarios.inicio || '18:00',
            duracion: 80, // Rugby: 80 minutos (2 tiempos de 40)
            
            // Árbitros
            arbitroId: arbitroAsignado,
            arbitros: arbitroAsignado ? {
              principal: {
                id: arbitroAsignado,
                nombre: 'Por asignar' // Se actualizará con datos reales
              }
            } : null,
            
            // Cancha
            canchaId: canchaAsignada,
            cancha: canchaAsignada ? {
              id: canchaAsignada,
              nombre: (datosCancha && (datosCancha.nombre || datosCancha.titulo)) || 'Sin nombre'
            } : null,
            
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
            
            incidencias: [],
            
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
              maulesLocal: 0,
              maulesVisitante: 0,
              rucksLocal: 0,
              rucksVisitante: 0
            },
            
            fechaCreacion: new Date(),
            fechaActualizacion: new Date()
          };
          
          
          batch.set(partidoRef, partidoData);
          partidosIds.push(partidoId);
          operacionesEnBatch++;
          
          // Si alcanzamos el límite de operaciones, ejecutar batch y crear uno nuevo
          if (operacionesEnBatch >= MAX_OPERACIONES_POR_BATCH) {
            await batch.commit();
            batch = db.batch();
            operacionesEnBatch = 0;
          }
        }
        
        // Avanzar fecha para la siguiente jornada
        fechaActual.setDate(fechaActual.getDate() + diasEntreJornadas);
      }
    }
    
    // Ejecutar batch final si hay operaciones pendientes
    if (operacionesEnBatch > 0) {
      await batch.commit();
    }
    
    // Crear estructura de tabla de posiciones según el tipo de fixture
    let estructuraTabla = {};
    
    if (tipoFixture === 'manual') {
      // Modo manual: No crear tabla de posiciones automática
      estructuraTabla = { esPersonalizado: true };
    } else if (tipoFixture === 'todos_contra_todos') {
      // Crear tabla de posiciones para todos contra todos
      estructuraTabla.tablaPosiciones = equipos.map(equipo => ({
        equipoId: equipo.id,
        nombreEquipo: equipo.nombre,
        partidosJugados: 0,
        ganados: 0,
        empatados: 0,
        perdidos: 0,
        puntosAFavor: 0,
        puntosEnContra: 0,
        diferencia: 0,
        bonusOfensivo: 0,
        bonusDefensivo: 0,
        puntosTotales: 0
      }));
    } else if (tipoFixture === 'eliminacion_directa') {
      // Crear estructura para eliminación directa
      estructuraTabla.eliminacion = {
        rondaActual: "Primera Ronda",
        partidosJugados: 0,
        equiposClasificados: []
      };
    } else if (tipoFixture === 'grupos_y_playoff') {
      // Crear estructura para grupos + playoff
      const grupos = {};
      const equiposPorGrupo = Math.ceil(equipos.length / 4); // Dividir en grupos de máximo 4 equipos
      let grupoActual = 'A';
      
      for (let i = 0; i < equipos.length; i += equiposPorGrupo) {
        const equiposGrupo = equipos.slice(i, i + equiposPorGrupo);
        const nombreGrupo = `Grupo ${grupoActual}`;
        
        grupos[nombreGrupo] = {
          tablaPosiciones: equiposGrupo.map(equipo => ({
            equipoId: equipo.id,
            nombreEquipo: equipo.nombre,
            partidosJugados: 0,
            ganados: 0,
            empatados: 0,
            perdidos: 0,
            puntosAFavor: 0,
            puntosEnContra: 0,
            diferencia: 0,
            bonusOfensivo: 0,
            bonusDefensivo: 0,
            puntosTotales: 0
          }))
        };
        
        grupoActual = String.fromCharCode(grupoActual.charCodeAt(0) + 1);
      }
      
      estructuraTabla.grupos = grupos;
    }

    // Calcular fechas del torneo basándose en los partidos generados
    let fechaInicioTorneo = fechaInicio;
    let fechaFinTorneo = fechaInicio;
    
    if (partidosIds.length > 0) {
      // Obtener todos los partidos creados para calcular fecha de inicio y fin
      const partidosGeneradosSnapshot = await db.collection('partidos')
        .where('torneoId', '==', torneoId)
        .get();
      
      const fechasPartidos = [];
      partidosGeneradosSnapshot.forEach(doc => {
        const p = doc.data();
        if (p.fecha) {
          fechasPartidos.push(p.fecha);
        }
      });
      
      if (fechasPartidos.length > 0) {
        fechasPartidos.sort();
        fechaInicioTorneo = fechasPartidos[0]; // Primera fecha
        fechaFinTorneo = fechasPartidos[fechasPartidos.length - 1]; // Última fecha
      }
    }
    
    // Actualizar torneo con los partidos generados, la estructura de tabla y las fechas
    await db.collection('torneos').doc(torneoId).update({
      partidos: partidosIds,
      estado: 'en_curso',
      fixtureGenerado: true,
      fechaInicio: fechaInicioTorneo,
      fechaFin: fechaFinTorneo,
      fechaActualizacion: new Date(),
      ...estructuraTabla
    });

    res.json({ 
      message: 'Fixture generado correctamente',
      totalPartidos: partidosIds.length,
      totalJornadas: usarPartidosManual ? partidos.length : (fixture?.length || 0),
      partidosIds,
      estructuraTabla,
      tipoFixture
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tabla de posiciones de un torneo
router.get('/torneos/:id/tabla-posiciones', verifyFirebaseToken, async (req, res) => {
  try {
    const torneoId = req.params.id;
    
    // Obtener datos del torneo
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    
    const torneoData = torneoDoc.data();
    
    // Determinar qué tipo de estructura devolver
    if (torneoData.tablaPosiciones) {
      // Todos contra todos
      res.json({
        tipo: 'todos_contra_todos',
        tablaPosiciones: torneoData.tablaPosiciones
      });
    } else if (torneoData.eliminacion) {
      // Eliminación directa
      res.json({
        tipo: 'eliminacion_directa',
        eliminacion: torneoData.eliminacion
      });
    } else if (torneoData.grupos) {
      // Grupos + playoff
      res.json({
        tipo: 'grupos_y_playoff',
        grupos: torneoData.grupos
      });
    } else {
      res.json({
        tipo: 'sin_estructura',
        message: 'El torneo no tiene estructura de tabla de posiciones configurada'
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar tabla de posiciones después de un partido
router.put('/torneos/:id/tabla-posiciones', verifyFirebaseToken, verifyOrganizador, async (req, res) => {
  try {
    const torneoId = req.params.id;
    const { partidoId, resultado } = req.body;
    
    // Obtener datos del torneo
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    
    const torneoData = torneoDoc.data();
    
    // Obtener datos del partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partidoData = partidoDoc.data();
    
    // Actualizar tabla de posiciones según el tipo de fixture
    if (torneoData.tablaPosiciones) {
      // Todos contra todos
      const tablaActualizada = actualizarTablaTodosContraTodos(
        torneoData.tablaPosiciones,
        partidoData,
        resultado
      );
      
      await db.collection('torneos').doc(torneoId).update({
        tablaPosiciones: tablaActualizada
      });
      
      res.json({
        message: 'Tabla de posiciones actualizada',
        tablaPosiciones: tablaActualizada
      });
      
    } else if (torneoData.grupos) {
      // Grupos + playoff
      const gruposActualizados = actualizarTablaGrupos(
        torneoData.grupos,
        partidoData,
        resultado
      );
      
      await db.collection('torneos').doc(torneoId).update({
        grupos: gruposActualizados
      });
      
      res.json({
        message: 'Tablas de grupos actualizadas',
        grupos: gruposActualizados
      });
      
    } else {
      res.status(400).json({ error: 'Tipo de fixture no soportado para actualización automática' });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función auxiliar para actualizar tabla todos contra todos
function actualizarTablaTodosContraTodos(tablaPosiciones, partidoData, resultado) {
  const tabla = [...tablaPosiciones];
  
  // Encontrar los equipos en la tabla
  const equipoLocalIndex = tabla.findIndex(equipo => equipo.equipoId === partidoData.equipoLocalId);
  const equipoVisitanteIndex = tabla.findIndex(equipo => equipo.equipoId === partidoData.equipoVisitanteId);
  
  if (equipoLocalIndex !== -1 && equipoVisitanteIndex !== -1) {
    const equipoLocal = tabla[equipoLocalIndex];
    const equipoVisitante = tabla[equipoVisitanteIndex];
    
    // Actualizar estadísticas
    equipoLocal.partidosJugados += 1;
    equipoVisitante.partidosJugados += 1;
    
    equipoLocal.puntosAFavor += resultado.puntosLocal || 0;
    equipoLocal.puntosEnContra += resultado.puntosVisitante || 0;
    equipoVisitante.puntosAFavor += resultado.puntosVisitante || 0;
    equipoVisitante.puntosEnContra += resultado.puntosLocal || 0;
    
    equipoLocal.diferencia = equipoLocal.puntosAFavor - equipoLocal.puntosEnContra;
    equipoVisitante.diferencia = equipoVisitante.puntosAFavor - equipoVisitante.puntosEnContra;
    
    // Determinar ganador
    if (resultado.puntosLocal > resultado.puntosVisitante) {
      equipoLocal.ganados += 1;
      equipoLocal.puntosTotales += 4; // 4 puntos por ganar
      equipoVisitante.perdidos += 1;
      
      // Bonus defensivo para el perdedor si perdió por 7 puntos o menos
      if (resultado.puntosLocal - resultado.puntosVisitante <= 7) {
        equipoVisitante.bonusDefensivo += 1;
        equipoVisitante.puntosTotales += 1;
      }
    } else if (resultado.puntosVisitante > resultado.puntosLocal) {
      equipoVisitante.ganados += 1;
      equipoVisitante.puntosTotales += 4; // 4 puntos por ganar
      equipoLocal.perdidos += 1;
      
      // Bonus defensivo para el perdedor si perdió por 7 puntos o menos
      if (resultado.puntosVisitante - resultado.puntosLocal <= 7) {
        equipoLocal.bonusDefensivo += 1;
        equipoLocal.puntosTotales += 1;
      }
    } else {
      // Empate
      equipoLocal.empatados += 1;
      equipoLocal.puntosTotales += 2; // 2 puntos por empatar
      equipoVisitante.empatados += 1;
      equipoVisitante.puntosTotales += 2; // 2 puntos por empatar
    }
    
    // Bonus ofensivo si anotó 4 o más tries
    if (resultado.triesLocal >= 4) {
      equipoLocal.bonusOfensivo += 1;
      equipoLocal.puntosTotales += 1;
    }
    if (resultado.triesVisitante >= 4) {
      equipoVisitante.bonusOfensivo += 1;
      equipoVisitante.puntosTotales += 1;
    }
  }
  
  // Ordenar por puntos totales (descendente)
  tabla.sort((a, b) => {
    if (b.puntosTotales !== a.puntosTotales) {
      return b.puntosTotales - a.puntosTotales;
    }
    return b.diferencia - a.diferencia;
  });
  
  return tabla;
}

// Función auxiliar para actualizar tabla de grupos
function actualizarTablaGrupos(grupos, partidoData, resultado) {
  const gruposActualizados = { ...grupos };
  
  // Buscar en qué grupo están los equipos
  for (const [nombreGrupo, grupo] of Object.entries(gruposActualizados)) {
    const equipoLocalIndex = grupo.tablaPosiciones.findIndex(equipo => equipo.equipoId === partidoData.equipoLocalId);
    const equipoVisitanteIndex = grupo.tablaPosiciones.findIndex(equipo => equipo.equipoId === partidoData.equipoVisitanteId);
    
    if (equipoLocalIndex !== -1 && equipoVisitanteIndex !== -1) {
      // Actualizar la tabla del grupo
      gruposActualizados[nombreGrupo].tablaPosiciones = actualizarTablaTodosContraTodos(
        grupo.tablaPosiciones,
        partidoData,
        resultado
      );
      break;
    }
  }
  
  return gruposActualizados;
}

// Obtener estadísticas del torneo
router.get('/torneos/:id/estadisticas', verifyFirebaseToken, async (req, res) => {
  try {
    const torneoId = req.params.id;
    
    // Obtener datos del torneo
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    
    const torneoData = torneoDoc.data();
    
    // Obtener partidos del torneo
    const partidosSnapshot = await db.collection('partidos')
      .where('torneoId', '==', torneoId)
      .get();
    
    const partidos = partidosSnapshot.docs.map(doc => doc.data());
    
    // Calcular estadísticas generales
    const estadisticas = {
      totalPartidos: partidos.length,
      partidosJugados: partidos.filter(p => p.estado === 'finalizado').length,
      partidosPendientes: partidos.filter(p => p.estado === 'programado').length,
      partidosEnCurso: partidos.filter(p => p.estado === 'En Curso').length,
      totalTries: 0,
      totalConversiones: 0,
      totalPenales: 0,
      totalDrops: 0
    };
    
    // Calcular estadísticas de partidos finalizados
    partidos.filter(p => p.estado === 'finalizado').forEach(partido => {
      if (partido.resultado) {
        estadisticas.totalTries += (partido.resultado.triesLocal || 0) + (partido.resultado.triesVisitante || 0);
        estadisticas.totalConversiones += (partido.resultado.conversionesLocal || 0) + (partido.resultado.conversionesVisitante || 0);
        estadisticas.totalPenales += (partido.resultado.penalesLocal || 0) + (partido.resultado.penalesVisitante || 0);
        estadisticas.totalDrops += (partido.resultado.dropsLocal || 0) + (partido.resultado.dropsVisitante || 0);
      }
    });
    
    // Agregar información de la estructura del torneo
    if (torneoData.tablaPosiciones) {
      estadisticas.tipoFixture = 'todos_contra_todos';
      estadisticas.tablaPosiciones = torneoData.tablaPosiciones;
    } else if (torneoData.eliminacion) {
      estadisticas.tipoFixture = 'eliminacion_directa';
      estadisticas.eliminacion = torneoData.eliminacion;
    } else if (torneoData.grupos) {
      estadisticas.tipoFixture = 'grupos_y_playoff';
      estadisticas.grupos = torneoData.grupos;
    }
    
    res.json(estadisticas);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Procesar campeón para torneos en formato liga cuando todos los partidos están finalizados
router.post('/torneos/:id/procesar-campeon-liga', verifyFirebaseToken, verifyOrganizador, async (req, res) => {
  try {
    const torneoId = req.params.id;
    
    // Obtener datos del torneo
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    
    if (!torneoDoc.exists) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    
    const torneoData = torneoDoc.data();
    
    // Verificar que sea formato liga
    if (torneoData.formato !== 'liga') {
      return res.status(400).json({ error: 'Este endpoint solo es válido para torneos en formato liga' });
    }
    
    // Verificar si ya tiene campeón
    if (torneoData.campeon) {
      return res.json({
        message: 'El torneo ya tiene campeón asignado',
        campeon: torneoData.campeon,
        subcampeon: torneoData.subcampeon
      });
    }
    
    // Obtener todos los partidos del torneo
    const partidosSnapshot = await db.collection('partidos')
      .where('torneoId', '==', torneoId)
      .get();
    
    if (partidosSnapshot.empty) {
      return res.status(400).json({ error: 'No hay partidos en este torneo' });
    }
    
    const partidos = partidosSnapshot.docs.map(doc => doc.data());
    
    // Verificar que todos los partidos estén finalizados
    const partidosFinalizados = partidos.filter(p => p.estado === 'finalizado');
    const totalPartidos = partidos.length;
    
    if (partidosFinalizados.length !== totalPartidos) {
      return res.status(400).json({ 
        error: 'No todos los partidos están finalizados',
        partidosFinalizados: partidosFinalizados.length,
        totalPartidos: totalPartidos,
        faltantes: totalPartidos - partidosFinalizados.length
      });
    }
    
    // Obtener tabla de posiciones
    if (!torneoData.tablaPosiciones || !Array.isArray(torneoData.tablaPosiciones)) {
      return res.status(400).json({ error: 'No hay tabla de posiciones disponible' });
    }
    
    // Ordenar tabla de posiciones (ya debería estar ordenada, pero por si acaso)
    const tablaOrdenada = [...torneoData.tablaPosiciones].sort((a, b) => {
      // Ordenar por puntos totales (descendente)
      if (b.puntosTotales !== a.puntosTotales) {
        return b.puntosTotales - a.puntosTotales;
      }
      // Si hay empate en puntos, ordenar por diferencia de goles
      return b.diferencia - a.diferencia;
    });
    
    if (tablaOrdenada.length === 0) {
      return res.status(400).json({ error: 'La tabla de posiciones está vacía' });
    }
    
    // Obtener datos completos del campeón (primer lugar)
    const campeonTabla = tablaOrdenada[0];
    const equipoCampeon = torneoData.equipos?.find(e => e.id === campeonTabla.equipoId);
    
    const campeon = {
      id: campeonTabla.equipoId,
      nombre: campeonTabla.nombreEquipo || equipoCampeon?.nombre || 'Equipo',
      logo: equipoCampeon?.logo || ''
    };
    
    // Obtener datos completos del subcampeón (segundo lugar, si existe)
    let subcampeon = null;
    if (tablaOrdenada.length > 1) {
      const subcampeonTabla = tablaOrdenada[1];
      const equipoSubcampeon = torneoData.equipos?.find(e => e.id === subcampeonTabla.equipoId);
      
      subcampeon = {
        id: subcampeonTabla.equipoId,
        nombre: subcampeonTabla.nombreEquipo || equipoSubcampeon?.nombre || 'Equipo',
        logo: equipoSubcampeon?.logo || ''
      };
    }
    
    // Crear clasificación final
    const clasificacionFinal = tablaOrdenada.map((equipo, index) => {
      const equipoCompleto = torneoData.equipos?.find(e => e.id === equipo.equipoId);
      return {
        posicion: index + 1,
        equipo: {
          id: equipo.equipoId,
          nombre: equipo.nombreEquipo || equipoCompleto?.nombre || 'Equipo',
          logo: equipoCompleto?.logo || ''
        },
        puntosTotales: equipo.puntosTotales || 0,
        diferencia: equipo.diferencia || 0,
        premio: index === 0 ? 'Campeón' : index === 1 ? 'Subcampeón' : null
      };
    });
    
    // Actualizar el torneo con el campeón
    await db.collection('torneos').doc(torneoId).update({
      campeon: campeon,
      subcampeon: subcampeon,
      clasificacionFinal: clasificacionFinal,
      estado: 'finalizado',
      fechaFinReal: new Date(),
      fechaFinalizacion: new Date(),
      updatedAt: new Date()
    });
    
    // Guardar clasificación final en colección separada
    await db.collection('clasificacionFinal').add({
      torneoId: torneoId,
      torneoNombre: torneoData.nombre,
      formato: 'liga',
      clasificacion: clasificacionFinal,
      fechaCreacion: new Date()
    });
    
    res.json({
      message: 'Campeón procesado correctamente',
      torneoId,
      campeon: campeon,
      subcampeon: subcampeon,
      clasificacionFinal: clasificacionFinal
    });
    
  } catch (error) {
    console.error('❌ Error procesando campeón de liga:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/organizadores/solicitudes-gestion-equipos
 * @desc Obtener solicitudes de gestión de equipos pendientes (para organizadores)
 * @access Private (Organizador)
 */
router.get('/solicitudes-gestion-equipos', verifyFirebaseToken, verifyOrganizador, async (req, res) => {
  try {
    const organizadorId = req.user.uid;
    
    // Obtener TODAS las solicitudes de gestión pendientes (SIN filtrar por organizador)
    const solicitudesSnapshot = await db.collection('solicitudes_gestion_equipos')
      .where('estado', '==', 'pendiente')
      .get();
    
    const solicitudes = [];
    solicitudesSnapshot.forEach(doc => {
      const data = doc.data();
      solicitudes.push({
        id: doc.id,
        ...data
      });
    });
    
    // Ordenar por fecha de solicitud (más recientes primero)
    solicitudes.sort((a, b) => {
      const fechaA = a.fechaSolicitud?.toDate ? a.fechaSolicitud.toDate() : new Date(a.fechaSolicitud);
      const fechaB = b.fechaSolicitud?.toDate ? b.fechaSolicitud.toDate() : new Date(b.fechaSolicitud);
      return fechaB - fechaA;
    });
    
    res.json({ solicitudes });
  } catch (error) {
    console.error('❌ [ORGANIZADOR] Error obteniendo solicitudes de gestión:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/organizadores/solicitudes-gestion-equipos/:id/responder
 * @desc Aceptar o rechazar una solicitud de gestión de equipo
 * @access Private (Organizador)
 */
router.post('/solicitudes-gestion-equipos/:id/responder', verifyFirebaseToken, verifyOrganizador, async (req, res) => {
  try {
    const solicitudId = req.params.id;
    const organizadorId = req.user.uid;
    const { respuesta } = req.body; // 'aceptada' | 'rechazada'
    
    if (!respuesta || !['aceptada', 'rechazada'].includes(respuesta)) {
      return res.status(400).json({ error: 'Respuesta inválida' });
    }
    
    // Obtener solicitud
    const solicitudDoc = await db.collection('solicitudes_gestion_equipos').doc(solicitudId).get();
    if (!solicitudDoc.exists) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    
    const solicitudData = solicitudDoc.data();
    
    // Verificar que el equipo existe
    const equipoDoc = await db.collection('equipos').doc(solicitudData.equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    // Actualizar solicitud
    await db.collection('solicitudes_gestion_equipos').doc(solicitudId).update({
      estado: respuesta,
      fechaRespuesta: new Date(),
      respondidoPor: organizadorId,
      respondidoPorTipo: 'organizador'
    });
    
    // Si fue aceptada, agregar manager al equipo
    if (respuesta === 'aceptada') {
      const equipoData = equipoDoc.data();
      
      // Crear o actualizar array de managers
      let managers = equipoData.managers || [];
      if (!managers.includes(solicitudData.managerId)) {
        managers.push(solicitudData.managerId);
      }
      
      // Actualizar el equipo con el nuevo manager
      await db.collection('equipos').doc(solicitudData.equipoId).update({
        managers: managers,
        actualizadoPor: solicitudData.managerId,
        fechaActualizacion: new Date()
      });
      
      // Actualizar el perfil del manager en users
      await db.collection('users').doc(solicitudData.managerId).update({
        equipoId: solicitudData.equipoId,
        equipoNombre: solicitudData.equipoNombre,
        fechaActualizacion: new Date()
      });
      
      // Actualizar el perfil del manager en la colección managers
      const managerDoc = await db.collection('managers').doc(solicitudData.managerId).get();
      if (managerDoc.exists) {
        await db.collection('managers').doc(solicitudData.managerId).update({
          equipoId: solicitudData.equipoId,
          equipoNombre: solicitudData.equipoNombre,
          fechaActualizacion: new Date()
        });
      } else {
        // Crear perfil de manager si no existe
        await db.collection('managers').doc(solicitudData.managerId).set({
          equipoId: solicitudData.equipoId,
          equipoNombre: solicitudData.equipoNombre,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        });
      }
    }
    
    res.json({
      message: respuesta === 'aceptada' ? 'Solicitud de gestión aceptada' : 'Solicitud de gestión rechazada'
    });
  } catch (error) {
    console.error('❌ Error respondiendo solicitud de gestión:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
