/**
 * Rutas para CRUD de Equipos
 * CRUD completo desde cero
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Middleware de autenticación
const { verifyFirebaseToken } = require('../middleware/auth');
const { db, storage } = require('../config/firebase');
const Equipo = require('../models/Equipo');

// Configuración de multer para subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});


// GET /api/equipos - Obtener todos los equipos
router.get('/', async (req, res) => {
  try {
    const { deporte, categoria, estado, ciudad } = req.query;
    
    let query = db.collection('equipos');

    // 🚀 OPTIMIZACIÓN: Aplicar filtros en la query de Firestore
    if (estado) {
      query = query.where('estado', '==', estado);
    }
    
    // Aplicar filtro de ciudad si se proporciona
    if (ciudad) {
      query = query.where('ciudad', '==', ciudad);
    }
    
    // 🚀 OPTIMIZACIÓN: Limitar a 100 equipos por defecto
    query = query.limit(100);
    
    const snapshot = await query.get();
    
    const equipos = [];

    snapshot.forEach(doc => {
      const equipoData = { 
        id: doc.id, 
        ...doc.data() 
      };
      
      // Aplicar filtros en memoria solo si son necesarios
      let incluirEquipo = true;
      
      if (deporte && equipoData.deporte !== deporte) {
        incluirEquipo = false;
      }
      
      if (categoria && (!equipoData.categorias || !equipoData.categorias.includes(categoria))) {
        incluirEquipo = false;
      }
      
      if (incluirEquipo) {
        equipos.push(equipoData);
      }
    });

    // Ordenar por nombre
    equipos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    res.json(equipos);
  } catch (error) {
    console.error('❌ [GET] Error obteniendo equipos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipos/mis-solicitudes - Obtener mis solicitudes de equipos
router.get('/mis-solicitudes', verifyFirebaseToken, async (req, res) => {
  try {
    const usuarioId = req.user.uid;

    // Obtener todas las solicitudes del usuario (buscar por jugadorId)
    const solicitudesSnapshot = await db.collection('solicitudes_equipos')
      .where('jugadorId', '==', usuarioId)
      .get();
    
    const solicitudes = [];
    solicitudesSnapshot.forEach(doc => {
      solicitudes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Ordenar por fecha de solicitud (más recientes primero)
    solicitudes.sort((a, b) => {
      const fechaA = a.fechaSolicitud?.toDate ? a.fechaSolicitud.toDate() : new Date(a.fechaSolicitud);
      const fechaB = b.fechaSolicitud?.toDate ? b.fechaSolicitud.toDate() : new Date(b.fechaSolicitud);
      return fechaB - fechaA;
    });

    res.json(solicitudes);
    
  } catch (error) {
    console.error('❌ [GET] Error obteniendo solicitudes de equipos:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/equipos/solicitud/:id - Eliminar/cancelar una solicitud
router.delete('/solicitud/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const solicitudId = req.params.id;
    const usuarioId = req.user.uid;

    // Verificar que la solicitud existe y pertenece al usuario
    const solicitudDoc = await db.collection('solicitudes_equipos').doc(solicitudId).get();
    
    if (!solicitudDoc.exists) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const solicitud = solicitudDoc.data();
    
    // Verificar que la solicitud pertenece al usuario
    if (solicitud.usuarioId !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta solicitud' });
    }

    // Eliminar la solicitud
    await db.collection('solicitudes_equipos').doc(solicitudId).delete();

    res.json({ 
      success: true,
      mensaje: 'Solicitud eliminada exitosamente' 
    });
    
  } catch (error) {
    console.error('❌ [DELETE] Error eliminando solicitud:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipos/:id - Obtener equipo por ID
router.get('/:id', async (req, res) => {
  try {
    const equipoId = req.params.id;

    const equipoDoc = await db.collection('equipos').doc(equipoId).get();

    if (!equipoDoc.exists) {

      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = { id: equipoId, ...equipoDoc.data() };

    res.json(equipo);
  } catch (error) {
    console.error('❌ [GET] Error obteniendo equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/equipos - Crear nuevo equipo
router.post('/', verifyFirebaseToken, upload.single('logo'), async (req, res) => {
  try {


    const { nombre, categorias, descripcion, club, ciudad, pais, telefono, email, sitioWeb } = req.body;
    const usuarioId = req.user.uid;
    
    // Validar campos requeridos
    if (!nombre || !categorias) {
      return res.status(400).json({ 
        error: 'Nombre y categorías son campos requeridos'
      });
    }

    // Parsear categorías
    let categoriasArray;
    try {
      categoriasArray = typeof categorias === 'string' ? JSON.parse(categorias) : categorias;
    } catch (error) {
      return res.status(400).json({ 
        error: 'Formato de categorías inválido'
      });
    }
    
    if (!Array.isArray(categoriasArray) || categoriasArray.length === 0) {
      return res.status(400).json({ 
        error: 'Debe seleccionar al menos una categoría'
      });
    }

    // Crear datos del equipo
    const equipoData = {
      nombre: nombre.trim(),
      descripcion: descripcion || '',
      categorias: categoriasArray,
      club: club || '',
      ciudad: ciudad || '',
      pais: pais || 'Argentina',
      telefono: telefono || '',
      email: email || '',
      sitioWeb: sitioWeb || '',
      deporte: 'Rugby',
      division: 'Primera',
      estado: 'activo',
      jugadores: [],
      entrenadorId: null,
      asistenteEntrenadorId: null,
      delegadoId: null,
      estadisticas: {
        partidosJugados: 0,
        partidosGanados: 0,
        partidosEmpatados: 0,
        partidosPerdidos: 0,
        puntosAFavor: 0,
        puntosEnContra: 0,
        diferenciaPuntos: 0,
        triesAFavor: 0,
        triesEnContra: 0,
        conversiones: 0,
        penales: 0,
        drops: 0,
        tarjetasAmarillas: 0,
        tarjetasRojas: 0,
        posicionTabla: 0,
        rankingFairPlay: 0
      },
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      creadoPor: usuarioId,
      actualizadoPor: usuarioId
    };

    // Si hay logo, procesarlo
    if (req.file) {
      // Crear nombre único para el archivo
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000000);
      const extension = path.extname(req.file.originalname);
      const filename = `imagen-${timestamp}-${random}${extension}`;
      
      // Subir a Firebase Storage
      const filePath = `equipos/${filename}`;
      const bucket = storage.bucket();
      const file = bucket.file(filePath);
      
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });
      
      // Hacer el archivo público
      await file.makePublic();
      
      // Obtener URL pública de Firebase Storage
      const logoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      equipoData.logo = logoUrl;
    }

    // Validar datos
    const validation = Equipo.validate(equipoData);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Datos inválidos',
        details: validation.errors
      });
    }

    // Crear equipo
    const equipo = new Equipo(equipoData);
    const equipoRef = await db.collection('equipos').add(equipo.toJSON());
    const equipoId = equipoRef.id;

    res.status(201).json({
      message: 'Equipo creado correctamente',
      equipo: { 
        id: equipoId,
        ...equipo.toJSON() 
      }
    });
  } catch (error) {
    console.error('❌ [POST] Error creando equipo:', error);
    
    // Si hay error y se subió un archivo, eliminarlo
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/equipos/:id/logo - Eliminar imagen del equipo
router.delete('/:id/logo', verifyFirebaseToken, async (req, res) => {
  try {
    const equipoId = req.params.id;
    
    // Verificar que el equipo existe
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const logoActual = equipoData.logo;
    
    // Si hay un logo actual y es de Firebase Storage, eliminarlo
    if (logoActual && logoActual.includes('storage.googleapis.com')) {
      try {
        // Extraer el path del archivo de la URL
        const urlParts = logoActual.split('/');
        const filePath = urlParts.slice(4).join('/'); // equipos/filename.jpg
        
        const bucket = storage.bucket();
        const file = bucket.file(filePath);
        
        await file.delete();
      } catch (storageError) {

        // Continuar aunque falle la eliminación del archivo
      }
    }
    
    // Actualizar Firestore eliminando el logo
    const updateData = {
      logo: '',
      fechaActualizacion: new Date(),
      actualizadoPor: req.user.uid
    };
    
    await db.collection('equipos').doc(equipoId).update(updateData);
    
    res.json({ 
      message: 'Imagen eliminada correctamente',
      logo: ''
    });
  } catch (error) {
    console.error('❌ Error eliminando imagen:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/equipos/:id/logo - Actualizar solo la imagen del equipo
router.put('/:id/logo', verifyFirebaseToken, upload.single('logo'), async (req, res) => {
  try {
    const equipoId = req.params.id;
    
    // Verificar que el equipo existe
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const usuarioId = req.user.uid;
    
    // Si se sube un archivo, procesarlo
    if (req.file) {
      const fileName = `equipos/${equipoId}-${Date.now()}-${Math.floor(Math.random() * 100000000)}.${req.file.originalname.split('.').pop()}`;
      const file = storage.bucket().file(fileName);
      
      // Crear stream de escritura
      const stream = file.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });
      
      // Escribir el archivo
      stream.end(req.file.buffer);
      
      // Esperar a que termine la escritura
      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
      });
      
      // Hacer el archivo público
      await file.makePublic();
      
      // Obtener URL pública de Firebase Storage
      const logoUrl = `https://storage.googleapis.com/${storage.bucket().name}/${fileName}`;
      
      // Actualizar solo el logo en Firestore
      const updateData = {
        logo: logoUrl,
        fechaActualizacion: new Date(),
        actualizadoPor: usuarioId
      };
      
      await db.collection('equipos').doc(equipoId).update(updateData);
      
      res.json({
        message: 'Imagen actualizada correctamente',
        equipo: {
          id: equipoId,
          logo: logoUrl
        }
      });
    } else {
        res.status(400).json({ error: 'No se proporcionó ningún archivo de imagen' });
    }
  } catch (error) {
    console.error('❌ Error actualizando imagen:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/equipos/:id - Actualizar equipo
router.put('/:id', verifyFirebaseToken, upload.single('logo'), async (req, res) => {
  try {
    const equipoId = req.params.id;


    const { nombre, categorias, descripcion, club, ciudad, pais, telefono, email, sitioWeb, estado } = req.body;
    const usuarioId = req.user.uid;

    // Verificar que el equipo existe
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {

      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    // Validar campos requeridos
    if (!nombre || !categorias) {
      return res.status(400).json({ 
        error: 'Nombre y categorías son campos requeridos'
      });
    }

    // Parsear categorías
    let categoriasArray;
    try {
      categoriasArray = typeof categorias === 'string' ? JSON.parse(categorias) : categorias;
    } catch (error) {
      return res.status(400).json({ 
        error: 'Formato de categorías inválido'
      });
    }
    
    if (!Array.isArray(categoriasArray) || categoriasArray.length === 0) {
      return res.status(400).json({ 
        error: 'Debe seleccionar al menos una categoría'
      });
    }

    // Preparar datos de actualización
    const updateData = {
      nombre: nombre.trim(),
      descripcion: descripcion || '',
      categorias: categoriasArray,
      club: club || '',
      ciudad: ciudad || '',
      pais: pais || 'Colombia',
      telefono: telefono || '',
      email: email || '',
      sitioWeb: sitioWeb || '',
      estado: estado || 'activo',
      fechaActualizacion: new Date(),
      actualizadoPor: usuarioId
    };

    // Si hay nuevo logo, agregar la URL y eliminar el anterior
    if (req.file) {
      // Eliminar logo anterior si existe
      const equipoActual = equipoDoc.data();
      if (equipoActual.logo && equipoActual.logo.startsWith('/uploads/equipos/')) {
        const logoAnterior = path.join(__dirname, '../../uploads/equipos', path.basename(equipoActual.logo));
        if (fs.existsSync(logoAnterior)) {
          fs.unlinkSync(logoAnterior);
        }
      }
      updateData.logo = `/uploads/equipos/${req.file.filename}`;
    }

    // Actualizar equipo
    await db.collection('equipos').doc(equipoId).update(updateData);

    res.json({
      message: 'Equipo actualizado correctamente',
      equipo: { 
        id: equipoId,
        ...updateData
      }
    });
  } catch (error) {
    console.error('❌ [PUT] Error actualizando equipo:', error);
    
    // Si hay error y se subió un archivo, eliminarlo
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/equipos/:id - Eliminar equipo
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const equipoId = req.params.id;

    // Verificar que el equipo existe
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {

      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    // Obtener datos del equipo para limpiar archivos
    const equipo = equipoDoc.data();

    // Eliminar logo del servidor si existe
    if (equipo.logo && equipo.logo.startsWith('/uploads/equipos/')) {
      const logoPath = path.join(__dirname, '../../uploads/equipos', path.basename(equipo.logo));
      if (fs.existsSync(logoPath)) {

        fs.unlinkSync(logoPath);
      }
    }

    // Eliminar el equipo de la base de datos
    await db.collection('equipos').doc(equipoId).delete();

    res.json({
      message: 'Equipo eliminado correctamente',
      equipoId: equipoId,
      nombre: equipo.nombre
    });
  } catch (error) {
    console.error('❌ [DELETE] Error eliminando equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipos/:id/jugadores - Obtener jugadores del equipo con datos completos
router.get('/:id/jugadores', async (req, res) => {
  try {
    const equipoId = req.params.id;

    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = equipoDoc.data();
    const jugadoresIds = equipo.jugadores || [];

    // 🚀 OPTIMIZACIÓN: Obtener datos de jugadores en paralelo
    const jugadoresCompletos = [];
    
    if (jugadoresIds.length > 0) {
      // Crear promesas para obtener usuarios y jugadores en paralelo
      const promises = jugadoresIds.map(jugadorId => 
        Promise.all([
          db.collection('users').doc(jugadorId).get(),
          db.collection('jugadores').doc(jugadorId).get()
        ])
      );
      
      const results = await Promise.all(promises);
      
      // Procesar resultados
      results.forEach(([userDoc, jugadorDoc], index) => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          
          // Obtener foto del jugador
          let foto = null;
          if (jugadorDoc.exists) {
            const jugadorData = jugadorDoc.data();
            foto = jugadorData.foto || jugadorData.fotoPerfil || null;
          }
          
          jugadoresCompletos.push({
            jugadorId: jugadoresIds[index],
            nombre: userData.nombre || '',
            apellido: userData.apellido || '',
            email: userData.email || '',
            telefono: userData.telefono || '',
            foto: foto,
            posicion: userData.posicion || '',
            categoria: userData.categoria || '',
            numero: userData.numero || null
          });
        }
      });
    }

    res.json({ jugadores: jugadoresCompletos });
  } catch (error) {
    console.error('❌ [GET] Error obteniendo jugadores:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/equipos/:id/jugadores - Agregar jugador al equipo
router.post('/:id/jugadores', verifyFirebaseToken, async (req, res) => {
  try {
    const equipoId = req.params.id;
    const { jugadorId } = req.body;

    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = equipoDoc.data();
    const jugadores = equipo.jugadores || [];
    
    if (!jugadores.includes(jugadorId)) {
      jugadores.push(jugadorId);
      await db.collection('equipos').doc(equipoId).update({
        jugadores: jugadores,
        fechaActualizacion: new Date(),
        actualizadoPor: req.user.uid
      });

    }

    res.json({
      message: 'Jugador agregado al equipo',
      jugadores: jugadores
    });
  } catch (error) {
    console.error('❌ [POST] Error agregando jugador:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/equipos/:id/jugadores/:jugadorId - Remover jugador del equipo
router.delete('/:id/jugadores/:jugadorId', verifyFirebaseToken, async (req, res) => {
  try {
    const { id: equipoId, jugadorId } = req.params;
    const usuarioActual = req.user.uid;


    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = equipoDoc.data();
    const jugadores = equipo.jugadores || [];
    
    // Verificar que el jugador esté en el equipo
    const index = jugadores.indexOf(jugadorId);
    if (index === -1) {
      return res.status(404).json({ error: 'El jugador no pertenece a este equipo' });
    }

    // Verificar permisos: solo el manager o el propio jugador pueden eliminar
    const esManager = equipo.creadoPor === usuarioActual || 
                     equipo.actualizadoPor === usuarioActual ||
                     (equipo.managers && equipo.managers.includes(usuarioActual));
    const esPropioJugador = jugadorId === usuarioActual;

    if (!esManager && !esPropioJugador) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }

    // Usar batch para actualizar todo de forma atómica
    const batch = db.batch();

    // 1. Remover jugador del equipo
    jugadores.splice(index, 1);
    const equipoRef = db.collection('equipos').doc(equipoId);
    batch.update(equipoRef, {
      jugadores: jugadores,
      fechaActualizacion: new Date(),
      actualizadoPor: usuarioActual
    });

    // 2. Actualizar información del jugador en users
    const userDoc = await db.collection('users').doc(jugadorId).get();
    if (userDoc.exists) {
      const userRef = db.collection('users').doc(jugadorId);
      batch.update(userRef, {
        equipoId: null,
        equipoNombre: null,
        categoria: null,
        posicion: null,
        numero: null,
        fechaActualizacion: new Date()
      });

    }

    // 3. Actualizar información del jugador en jugadores
    const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
    if (jugadorDoc.exists) {
      const jugadorRef = db.collection('jugadores').doc(jugadorId);
      batch.update(jugadorRef, {
        equipoId: null,
        equipoNombre: null,
        categoria: null,
        posicion: null,
        numero: null,
        fechaActualizacion: new Date()
      });

    }

    // 4. Eliminar solicitudes pendientes del jugador para este equipo (si las hay)
    const solicitudesSnapshot = await db.collection('solicitudes_equipos')
      .where('equipoId', '==', equipoId)
      .where('usuarioId', '==', jugadorId)
      .where('estado', '==', 'pendiente')
      .get();
    
    solicitudesSnapshot.forEach(doc => {
      batch.delete(doc.ref);

    });

    // Ejecutar todas las operaciones de forma atómica
    await batch.commit();

    const mensaje = esPropioJugador 
      ? 'Has salido del equipo exitosamente' 
      : 'Jugador removido del equipo';

    res.json({
      message: mensaje,
      equipoId: null,
      equipoNombre: null,
      jugadores: jugadores
    });
  } catch (error) {
    console.error('❌ [SALIR-CLUB] Error removiendo jugador:', error);
    res.status(500).json({ error: error.message || 'Error al salir del equipo' });
  }
});

// POST /api/equipos/:id/solicitar-unirse - Solicitar unirse a un equipo
router.post('/:id/solicitar-unirse', verifyFirebaseToken, async (req, res) => {
  try {
    const equipoId = req.params.id;
    const { mensaje, posicion } = req.body;
    const usuarioId = req.user.uid;

    // Verificar que el equipo existe
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {

      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = equipoDoc.data();
    
    // Verificar que el usuario no sea ya miembro del equipo
    if (equipo.jugadores && equipo.jugadores.includes(usuarioId)) {
      return res.status(400).json({ 
        error: 'Ya eres miembro de este equipo' 
      });
    }

    // Obtener datos completos del jugador desde la colección 'users'
    let jugadorData = {};
    let jugadorFoto = null;
    
    try {
      const jugadorDoc = await db.collection('users').doc(usuarioId).get();
      if (jugadorDoc.exists) {
        jugadorData = jugadorDoc.data();
      }
      
      // Buscar específicamente en la colección 'jugadores' para obtener la foto
      const jugadorFotoDoc = await db.collection('jugadores').doc(usuarioId).get();
      if (jugadorFotoDoc.exists) {
        const jugadorFotoData = jugadorFotoDoc.data();
        jugadorFoto = jugadorFotoData.foto || jugadorFotoData.fotoPerfil || null;
      }
    } catch (error) {
      console.error('Error obteniendo datos del jugador:', error);
    }

    // Crear solicitud con datos completos
    const solicitudData = {
      equipoId,
      equipoNombre: equipo.nombre,
      usuarioId,
      jugadorNombre: (jugadorData.nombre || '') + ' ' + (jugadorData.apellido || ''),
      jugadorEmail: jugadorData.email || '',
      mensaje: mensaje || '',
      posicion: posicion || '',
      categoria: jugadorData.categoria || '',
      fechaNacimiento: jugadorData.fechaNacimiento || null,
      telefono: jugadorData.telefono || '',
      foto: jugadorFoto,
      experiencia: jugadorData.experiencia || 0,
      tipoUsuario: jugadorData.tipoUsuario || 'jugador',
      estado: 'pendiente',
      fechaSolicitud: new Date(),
      fechaActualizacion: new Date(),
      fechaCreacion: new Date()
    };

    // Guardar solicitud en la colección de solicitudes
    const solicitudRef = await db.collection('solicitudes_equipos').add(solicitudData);

    res.status(201).json({
      message: 'Solicitud enviada correctamente',
      solicitudId: solicitudRef.id,
      equipo: {
        id: equipoId,
        nombre: equipo.nombre
      }
    });

  } catch (error) {
    console.error('❌ [POST] Error procesando solicitud:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/equipos/:id/solicitar-gestion - Manager solicita gestionar un equipo
router.post('/:id/solicitar-gestion', verifyFirebaseToken, async (req, res) => {
  try {
    const equipoId = req.params.id;
    const { mensaje } = req.body;
    const usuarioId = req.user.uid;

    // Verificar que el equipo existe
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = equipoDoc.data();
    
    // Verificar que el usuario es manager
    const userDoc = await db.collection('users').doc(usuarioId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const userData = userDoc.data();
    if (userData.tipoUsuario !== 'manager') {
      return res.status(403).json({ error: 'Solo los managers pueden solicitar gestionar equipos' });
    }
    
    // Verificar que el usuario no sea ya el manager del equipo
    if (equipo.creadoPor === usuarioId || equipo.actualizadoPor === usuarioId) {
      return res.status(400).json({ 
        error: 'Ya gestionas este equipo' 
      });
    }
    
    // Verificar si ya existe una solicitud pendiente
    const solicitudExistente = await db.collection('solicitudes_gestion_equipos')
      .where('equipoId', '==', equipoId)
      .where('managerId', '==', usuarioId)
      .where('estado', '==', 'pendiente')
      .limit(1)
      .get();
    
    if (!solicitudExistente.empty) {
      return res.status(400).json({ 
        error: 'Ya tienes una solicitud pendiente para este equipo' 
      });
    }

    // Obtener foto del manager
    let managerFoto = null;
    try {
      const managerDoc = await db.collection('managers').doc(usuarioId).get();
      if (managerDoc.exists) {
        const managerData = managerDoc.data();
        managerFoto = managerData.foto || null;
      }
    } catch (error) {
      console.error('Error obteniendo foto del manager:', error);
    }

    // Crear solicitud con datos completos
    const solicitudData = {
      equipoId,
      equipoNombre: equipo.nombre,
      equipoLogo: equipo.logo || '',
      managerId: usuarioId,
      managerNombre: (userData.nombre || '') + ' ' + (userData.apellido || ''),
      managerEmail: userData.email || '',
      managerFoto: managerFoto,
      mensaje: mensaje || '',
      telefono: userData.telefono || '',
      equipoActualManagerId: equipo.creadoPor || null,
      estado: 'pendiente',
      fechaSolicitud: new Date(),
      fechaActualizacion: new Date(),
      fechaCreacion: new Date()
    };

    // Guardar solicitud en la colección de solicitudes de gestión
    
    const solicitudRef = await db.collection('solicitudes_gestion_equipos').add(solicitudData);
    

    res.status(201).json({
      message: 'Solicitud de gestión enviada correctamente',
      solicitudId: solicitudRef.id,
      equipo: {
        id: equipoId,
        nombre: equipo.nombre
      }
    });

  } catch (error) {
    console.error('❌ [POST] Error procesando solicitud de gestión:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;