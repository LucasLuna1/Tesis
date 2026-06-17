const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifyManager, verifyManagerOrAdmin, verifyOwnership } = require('../middleware/auth');
const { db, admin, storage } = require('../config/firebase');
const PartidoService = require('../services/PartidoService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir fotos/logos de clubes
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/equipos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: multerStorage,
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

// Configuración de multer para procesar archivos en memoria (para Firebase Storage)
const uploadMemory = multer({
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

// Subir foto del manager
router.post('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), uploadMemory.single('foto'), async (req, res) => {
  try {
    const managerId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido' });
    }
    
    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(req.file.originalname);
    const filename = `manager-${timestamp}-${random}${extension}`;
    
    let publicUrl = '';
    
    // Subir a Firebase Storage
    const filePath = `managers/${filename}`;
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
      db.collection('managers').doc(managerId).update(updateData),
      db.collection('users').doc(managerId).update(updateData)
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

// Eliminar foto del manager
router.delete('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const managerId = req.params.id;
    
    // Obtener datos del manager para obtener la URL de la foto actual
    const managerDoc = await db.collection('managers').doc(managerId).get();
    if (!managerDoc.exists) {
      return res.status(404).json({ error: 'Manager no encontrado' });
    }
    
    const managerData = managerDoc.data();
    const fotoActual = managerData.foto;
    
    // Si hay una foto actual y es de Firebase Storage, eliminarla
    if (fotoActual && fotoActual.includes('storage.googleapis.com')) {
      try {
        // Extraer el path del archivo de la URL
        const urlParts = fotoActual.split('/');
        const filePath = urlParts.slice(4).join('/'); // managers/filename.jpg
        
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
      db.collection('managers').doc(managerId).update(updateData),
      db.collection('users').doc(managerId).update(updateData)
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

/**
 * @route GET /api/managers/mi-club
 * @desc Obtener el club del manager autenticado
 * @access Private (Manager)
 */
router.get('/mi-club', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const managerId = req.user.uid;
    
    // Buscar el club/equipo del manager en la colección equipos
    // Primero buscar si lo creó
    let equiposSnapshot = await db.collection('equipos')
      .where('creadoPor', '==', managerId)
      .limit(1)
      .get();
    
    // Si no lo creó, buscar si está en el array de managers
    if (equiposSnapshot.empty) {
      equiposSnapshot = await db.collection('equipos')
        .where('managers', 'array-contains', managerId)
        .limit(1)
        .get();
    }
    
    if (equiposSnapshot.empty) {
      return res.json({ club: null, message: 'No tienes un club creado aún' });
    }
    
    const clubDoc = equiposSnapshot.docs[0];
    const clubData = clubDoc.data();
    
    // Migración: si tiene 'foto' en lugar de 'logo', migrar el campo
    if (clubData.foto && !clubData.logo) {
      await db.collection('equipos').doc(clubDoc.id).update({
        logo: clubData.foto,
        fechaActualizacion: new Date()
      });
      clubData.logo = clubData.foto;
      delete clubData.foto;
    }
    
    // Calcular estadísticas dinámicas
    const totalJugadores = clubData.jugadores ? clubData.jugadores.length : 0;
    
    // Actualizar estadísticas si no existen o si totalJugadores cambió
    if (!clubData.estadisticas) {
      clubData.estadisticas = {};
    }
    clubData.estadisticas.totalJugadores = totalJugadores;
    
    const club = {
      id: clubDoc.id,
      ...clubData
    };
    
    res.json({ club });
  } catch (error) {
    console.error('Error obteniendo club del manager:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/managers/club
 * @desc Crear un nuevo club (se guarda en la colección equipos)
 * @access Private (Manager)
 */
router.post('/club', verifyFirebaseToken, verifyManager, upload.single('logo'), async (req, res) => {
  try {
    const managerId = req.user.uid;
    
    // Verificar que el manager no tenga ya un club
    const equiposSnapshot = await db.collection('equipos')
      .where('creadoPor', '==', managerId)
      .limit(1)
      .get();
    
    if (!equiposSnapshot.empty) {
      return res.status(400).json({ error: 'Ya tienes un club creado' });
    }
    
    const { 
      nombre, 
      club,
      categorias,
      ciudad, 
      pais,
      telefono, 
      email, 
      sitioWeb,
      descripcion,
      deporte,
      division
    } = req.body;
    
    // Validaciones
    if (!nombre || !club || !ciudad) {
      return res.status(400).json({ error: 'El nombre, club y ciudad son requeridos' });
    }
    
    // Parsear categorías si viene como string
    let categoriasArray = [];
    if (categorias) {
      try {
        categoriasArray = typeof categorias === 'string' ? JSON.parse(categorias) : categorias;
      } catch (error) {
        categoriasArray = [];
      }
    }
    
    // Crear datos del equipo/club con la estructura completa
    const equipoData = {
      nombre: nombre.trim(),
      club: club.trim(),
      descripcion: descripcion || '',
      logo: '',
      categorias: Array.isArray(categoriasArray) ? categoriasArray : [],
      ciudad: ciudad || '',
      pais: pais || 'Argentina',
      telefono: telefono || '',
      email: email || '',
      sitioWeb: sitioWeb || '',
      deporte: deporte || 'Rugby',
      division: division || 'Primera',
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
      creadoPor: managerId,
      actualizadoPor: managerId
    };
    
    // Si hay logo, agregar la URL
    if (req.file) {
      equipoData.logo = `/uploads/equipos/${req.file.filename}`;
    }
    
    // Guardar en la colección equipos
    const equipoRef = await db.collection('equipos').add(equipoData);
    
    // Actualizar el perfil del manager con el equipoId
    await db.collection('users').doc(managerId).update({
      equipoId: equipoRef.id,
      equipoNombre: nombre,
      fechaActualizacion: new Date()
    });
    
    res.status(201).json({
      message: 'Club creado exitosamente',
      club: {
        id: equipoRef.id,
        ...equipoData
      }
    });
  } catch (error) {
    console.error('Error creando club:', error);
    
    // Si hay error y se subió un archivo, eliminarlo
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /api/managers/club/:id
 * @desc Actualizar información del club
 * @access Private (Manager)
 */
router.put('/club/:id', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const clubId = req.params.id;
    const managerId = req.user.uid;
    
    // Verificar que el club/equipo existe y pertenece al manager
    const equipoDoc = await db.collection('equipos').doc(clubId).get();
    
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const puedeGestionar = equipoData.creadoPor === managerId || 
                          equipoData.actualizadoPor === managerId ||
                          (equipoData.managers && equipoData.managers.includes(managerId));
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos para editar este club' });
    }
    
    // Migración: si tiene 'foto' en lugar de 'logo', migrar el campo
    if (equipoData.foto && !equipoData.logo) {
      await db.collection('equipos').doc(clubId).update({
        logo: equipoData.foto,
        fechaActualizacion: new Date()
      });
      equipoData.logo = equipoData.foto;
      delete equipoData.foto;
    }
    
    const updates = req.body;
    const allowedFields = ['nombre', 'club', 'categorias', 'ciudad', 'pais', 'telefono', 'email', 'sitioWeb', 'descripcion', 'deporte', 'division'];
    
    const updateData = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });
    
    // Parsear categorías si viene como string
    if (updateData.categorias) {
      try {
        updateData.categorias = typeof updateData.categorias === 'string' ? JSON.parse(updateData.categorias) : updateData.categorias;
      } catch (error) {
        // Si hay error, mantener el valor anterior
        delete updateData.categorias;
      }
    }
    
    updateData.fechaActualizacion = new Date();
    updateData.actualizadoPor = managerId;
    
    await db.collection('equipos').doc(clubId).update(updateData);
    
    res.json({
      message: 'Club actualizado exitosamente',
      club: {
        id: clubId,
        ...equipoData,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Error actualizando club:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/managers/club/:id/foto
 * @desc Subir foto/logo del club
 * @access Private (Manager)
 */
router.post('/club/:id/foto', verifyFirebaseToken, verifyManager, upload.single('logo'), async (req, res) => {
  try {
    const clubId = req.params.id;
    const managerId = req.user.uid;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido' });
    }
    
    // Verificar que el club/equipo pertenece al manager
    const equipoDoc = await db.collection('equipos').doc(clubId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const puedeGestionar = equipoData.creadoPor === managerId || 
                          equipoData.actualizadoPor === managerId ||
                          (equipoData.managers && equipoData.managers.includes(managerId));
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    // Migración: si tiene 'foto' en lugar de 'logo', usar foto como logo
    if (equipoData.foto && !equipoData.logo) {
      equipoData.logo = equipoData.foto;
    }
    
    // Eliminar logo anterior si existe
    if (equipoData.logo && equipoData.logo.startsWith('/uploads/equipos/')) {
      const logoAnterior = path.join(__dirname, '../../uploads/equipos', path.basename(equipoData.logo));
      if (fs.existsSync(logoAnterior)) {
        fs.unlinkSync(logoAnterior);
      }
    }
    
    const logoUrl = `/uploads/equipos/${req.file.filename}`;
    
    await db.collection('equipos').doc(clubId).update({
      logo: logoUrl,
      fechaActualizacion: new Date(),
      actualizadoPor: managerId
    });
    
    res.json({ 
      message: 'Logo actualizado correctamente',
      logo: logoUrl
    });
  } catch (error) {
    console.error('Error subiendo logo:', error);
    
    // Si hay error y se subió un archivo, eliminarlo
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/managers/club/:id/jugadores
 * @desc Obtener jugadores del club
 * @access Private (Manager)
 */
router.get('/club/:id/jugadores', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const clubId = req.params.id;
    const managerId = req.user.uid;
    
    // Verificar permisos
    const equipoDoc = await db.collection('equipos').doc(clubId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const puedeGestionar = equipoData.creadoPor === managerId || 
                          equipoData.actualizadoPor === managerId ||
                          (equipoData.managers && equipoData.managers.includes(managerId));
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    const jugadoresIds = equipoData.jugadores || [];
    
    // Obtener datos completos de cada jugador
    const jugadores = [];
    for (const jugadorId of jugadoresIds) {
      try {
        // Obtener datos básicos del jugador
        const jugadorDoc = await db.collection('users').doc(jugadorId).get();
        if (jugadorDoc.exists) {
          const jugadorData = jugadorDoc.data();
          
          // Buscar foto en la colección jugadores
          let jugadorFoto = null;
          try {
            const jugadorFotoDoc = await db.collection('jugadores').doc(jugadorId).get();
            if (jugadorFotoDoc.exists) {
              const jugadorFotoData = jugadorFotoDoc.data();
              jugadorFoto = jugadorFotoData.foto || jugadorFotoData.fotoPerfil || null;
            }
          } catch (error) {
            console.error('Error obteniendo foto del jugador:', error);
          }
          
          // Obtener categoría del jugador en este equipo (si está guardada)
          const categoria = jugadorData.categoria || 'Sin categoría';
          
          jugadores.push({
            jugadorId: jugadorId,
            nombre: jugadorData.nombre || '',
            apellido: jugadorData.apellido || '',
            email: jugadorData.email || '',
            telefono: jugadorData.telefono || '',
            posicion: jugadorData.posicion || '',
            categoria: categoria,
            foto: jugadorFoto,
            fechaIncorporacion: new Date() // Fecha aproximada
          });
        }
      } catch (error) {
        console.error('Error obteniendo datos del jugador:', jugadorId, error);
        // Agregar jugador con datos mínimos si hay error
        jugadores.push({
          jugadorId: jugadorId,
          nombre: 'Error cargando',
          apellido: '',
          email: '',
          telefono: '',
          posicion: '',
          categoria: 'Sin categoría',
          foto: null,
          fechaIncorporacion: new Date()
        });
      }
    }
    
    res.json({ jugadores });
  } catch (error) {
    console.error('Error obteniendo jugadores:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/managers/club/:id/jugadores
 * @desc Agregar jugador al club
 * @access Private (Manager)
 */
router.post('/club/:id/jugadores', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const clubId = req.params.id;
    const managerId = req.user.uid;
    const { jugadorId, categoria } = req.body;
    
    if (!jugadorId || !categoria) {
      return res.status(400).json({ error: 'jugadorId y categoria son requeridos' });
    }
    
    // Verificar permisos
    const equipoDoc = await db.collection('equipos').doc(clubId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const puedeGestionar = equipoData.creadoPor === managerId || 
                          equipoData.actualizadoPor === managerId ||
                          (equipoData.managers && equipoData.managers.includes(managerId));
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    // Obtener info del jugador
    const jugadorDoc = await db.collection('users').doc(jugadorId).get();
    if (!jugadorDoc.exists) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    const jugadorData = jugadorDoc.data();
    const jugadores = equipoData.jugadores || [];
    
    // Verificar que no esté ya en el club
    if (jugadores.includes(jugadorId)) {
      return res.status(400).json({ error: 'El jugador ya está en el club' });
    }
    
    // Agregar jugador
    jugadores.push(jugadorId);
    
    await db.collection('equipos').doc(clubId).update({
      jugadores,
      fechaActualizacion: new Date(),
      actualizadoPor: managerId
    });
    
    // Actualizar el jugador con el equipoId en users
    await db.collection('users').doc(jugadorId).update({
      equipoId: clubId,
      equipoNombre: equipoData.nombre,
      fechaActualizacion: new Date()
    });
    
    // También actualizar en la colección jugadores si existe
    const jugadorDoc2 = await db.collection('jugadores').doc(jugadorId).get();
    if (jugadorDoc2.exists) {
      await db.collection('jugadores').doc(jugadorId).update({
        equipoId: clubId,
        equipoNombre: equipoData.nombre,
        fechaActualizacion: new Date()
      });
    }
    
    res.json({
      message: 'Jugador agregado exitosamente',
      jugadorId: jugadorId
    });
  } catch (error) {
    console.error('Error agregando jugador:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /api/managers/club/:id/jugadores/:jugadorId
 * @desc Remover jugador del club
 * @access Private (Manager)
 */
router.delete('/club/:id/jugadores/:jugadorId', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const clubId = req.params.id;
    const jugadorId = req.params.jugadorId;
    const managerId = req.user.uid;
    
    // Verificar permisos
    const equipoDoc = await db.collection('equipos').doc(clubId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const puedeGestionar = equipoData.creadoPor === managerId || 
                          equipoData.actualizadoPor === managerId ||
                          (equipoData.managers && equipoData.managers.includes(managerId));
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    const jugadores = equipoData.jugadores || [];
    
    // Verificar que el jugador esté en el club
    const index = jugadores.indexOf(jugadorId);
    if (index === -1) {
      return res.status(400).json({ error: 'El jugador no está en este club' });
    }
    
    // Remover jugador del club
    jugadores.splice(index, 1);
    
    await db.collection('equipos').doc(clubId).update({
      jugadores,
      fechaActualizacion: new Date(),
      actualizadoPor: managerId
    });
    
    // Actualizar el jugador para remover la referencia al club
    await db.collection('users').doc(jugadorId).update({
      equipoId: null,
      equipoNombre: null,
      fechaActualizacion: new Date()
    });

    // También actualizar en la colección jugadores si existe
    try {
      const jugadorPerfilDoc = await db.collection('jugadores').doc(jugadorId).get();
      if (jugadorPerfilDoc.exists) {
        await db.collection('jugadores').doc(jugadorId).update({
          equipoId: null,
          equipoNombre: 'Sin equipo',
          fechaActualizacion: new Date()
        });
      }
    } catch (e) {

    }
    
    res.json({
      message: 'Jugador removido del club exitosamente',
      jugadores: jugadores
    });
  } catch (error) {
    console.error('Error removiendo jugador:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/managers/perfil
 * @desc Obtener perfil del manager actual
 * @access Private (Manager)
 */
router.get('/perfil', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const managerId = req.user.uid;
    
    // Obtener datos del usuario
    const userDoc = await db.collection('users').doc(managerId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Manager no encontrado' });
    }
    
    const userData = userDoc.data();
    
    // Verificar que sea manager
    if (userData.tipoUsuario !== 'manager') {
      return res.status(400).json({ error: 'Este usuario no es un manager' });
    }
    
    res.json({
      id: userDoc.id,
      ...userData
    });
  } catch (error) {
    console.error('Error obteniendo perfil del manager:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /api/managers/perfil
 * @desc Actualizar perfil del manager actual
 * @access Private (Manager)
 */
router.put('/perfil', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const managerId = req.user.uid;
    const updates = req.body;
    
    // Campos permitidos para actualización
    const allowedFields = ['nombre', 'apellido', 'telefono'];
    
    const updateData = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }
    
    updateData.fechaActualizacion = new Date();
    
    await db.collection('users').doc(managerId).update(updateData);
    
    res.json({
      message: 'Perfil actualizado exitosamente',
      ...updateData
    });
  } catch (error) {
    console.error('Error actualizando perfil del manager:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/managers/perfil/foto
 * @desc Subir foto de perfil del manager
 * @access Private (Manager)
 */
router.post('/perfil/foto', verifyFirebaseToken, verifyManager, uploadMemory.single('foto'), async (req, res) => {
  try {

    const managerId = req.user.uid;

    if (!req.file) {

      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    // Validar que sea una imagen
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'El archivo debe ser una imagen' });
    }

    // Obtener el manager actual para eliminar la foto anterior si existe
    const userDoc = await db.collection('users').doc(managerId).get();
    const oldFoto = userDoc.exists ? userDoc.data().foto : null;

    // Eliminar foto anterior si existe (del sistema de archivos local)
    if (oldFoto) {
      try {
        const oldFileName = oldFoto.split('/').pop();
        const oldPath = path.join(__dirname, '../../uploads/managers', oldFileName);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);

        }
      } catch (error) {

      }
    }

    // Guardar nueva foto en el sistema de archivos local
    const fileName = `manager-${managerId}-${Date.now()}${path.extname(req.file.originalname)}`;
    const uploadPath = path.join(__dirname, '../../uploads/managers');
    
    // Asegurar que el directorio existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    const filePath = path.join(uploadPath, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const fotoUrl = `/uploads/managers/${fileName}`;

    // Actualizar en users
    await db.collection('users').doc(managerId).update({
      foto: fotoUrl,
      fechaActualizacion: new Date()
    });

    // Actualizar en managers si existe
    const managerDoc = await db.collection('managers').doc(managerId).get();
    if (managerDoc.exists) {
      await db.collection('managers').doc(managerId).update({
        foto: fotoUrl,
        fechaActualizacion: new Date()
      });

    }


    res.json({
      message: 'Foto de perfil actualizada exitosamente',
      foto: fotoUrl
    });
  } catch (error) {
    console.error('❌ [FOTO-PERFIL] Error subiendo foto de perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /api/managers/jugador/:id/categoria
 * @desc Actualizar categoría de un jugador del club
 * @access Private (Manager)
 */
router.put('/jugador/:id/categoria', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const jugadorId = req.params.id;
    const managerId = req.user.uid;
    const { categoria } = req.body;
    
    if (!categoria) {
      return res.status(400).json({ error: 'Categoría es requerida' });
    }
    
    // Verificar que el jugador existe
    const jugadorDoc = await db.collection('users').doc(jugadorId).get();
    if (!jugadorDoc.exists) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    const jugadorData = jugadorDoc.data();
    
    // Verificar que el manager tiene un club y el jugador pertenece a ese club
    const equiposSnapshot = await db.collection('equipos')
      .where('creadoPor', '==', managerId)
      .get();
    
    let jugadorPerteneceAlClub = false;
    equiposSnapshot.forEach(doc => {
      const equipoData = doc.data();
      if (equipoData.jugadores && equipoData.jugadores.includes(jugadorId)) {
        jugadorPerteneceAlClub = true;
      }
    });
    
    if (!jugadorPerteneceAlClub) {
      return res.status(403).json({ error: 'No tienes permisos para actualizar este jugador' });
    }
    
    // Actualizar la categoría del jugador
    await db.collection('users').doc(jugadorId).update({
      categoria: categoria,
      fechaActualizacion: new Date()
    });
    
    res.json({
      message: 'Categoría actualizada exitosamente',
      jugadorId: jugadorId,
      categoria: categoria
    });
  } catch (error) {
    console.error('Error actualizando categoría del jugador:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/managers/solicitudes-gestion
 * @desc Obtener solicitudes de gestión de equipos pendientes (para managers dueños)
 * @access Private (Manager)
 */
router.get('/solicitudes-gestion', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const managerId = req.user.uid;
    
    // Buscar equipos donde este usuario es manager (creador o en array managers)
    const [equiposCreados, equiposGestionados] = await Promise.all([
      db.collection('equipos').where('creadoPor', '==', managerId).get(),
      db.collection('equipos').where('managers', 'array-contains', managerId).get()
    ]);
    
    // Combinar resultados eliminando duplicados
    const equiposIdsSet = new Set();
    equiposCreados.forEach(doc => {
      equiposIdsSet.add(doc.id);
    });
    equiposGestionados.forEach(doc => {
      equiposIdsSet.add(doc.id);
    });
    
    if (equiposIdsSet.size === 0) {
      return res.json({ solicitudes: [] });
    }
    
    const equiposIds = Array.from(equiposIdsSet);
    
    // Buscar solicitudes de gestión para todos los equipos del manager
    const solicitudesPromises = equiposIds.map(async (equipoId) => {
      try {
        const snapshot = await db.collection('solicitudes_gestion_equipos')
          .where('equipoId', '==', equipoId)
          .where('estado', '==', 'pendiente')
          .get();
        return snapshot.docs;
      } catch (error) {

        return [];
      }
    });
    
    const todasLasSolicitudes = await Promise.all(solicitudesPromises);
    const docs = todasLasSolicitudes.flat();
    
    const solicitudes = [];
    docs.forEach(doc => {
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
    
    res.json({ solicitudes });
  } catch (error) {
    console.error('❌ Error obteniendo solicitudes de gestión:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/managers/solicitudes-gestion/:id/responder
 * @desc Aceptar o rechazar una solicitud de gestión de equipo
 * @access Private (Manager)
 */
router.post('/solicitudes-gestion/:id/responder', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const solicitudId = req.params.id;
    const managerId = req.user.uid;
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
    
    // Verificar que el equipo pertenece al manager
    const equipoDoc = await db.collection('equipos').doc(solicitudData.equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const puedeGestionar = equipoData.creadoPor === managerId || 
                          equipoData.actualizadoPor === managerId ||
                          (equipoData.managers && equipoData.managers.includes(managerId));
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos para responder esta solicitud' });
    }
    
    // Actualizar solicitud
    await db.collection('solicitudes_gestion_equipos').doc(solicitudId).update({
      estado: respuesta,
      fechaRespuesta: new Date(),
      respondidoPor: managerId,
      respondidoPorTipo: 'manager'
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

/**
 * @route GET /api/managers/solicitudes
 * @desc Obtener solicitudes pendientes para el club/equipo del manager
 * @access Private (Manager)
 */
router.get('/solicitudes', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const managerId = req.user.uid;
    
    // Buscar equipos donde este usuario es manager (creador, actualizador o en array managers)
    const [equiposCreados, equiposActualizados, equiposGestionados] = await Promise.all([
      db.collection('equipos').where('creadoPor', '==', managerId).get(),
      db.collection('equipos').where('actualizadoPor', '==', managerId).get(),
      db.collection('equipos').where('managers', 'array-contains', managerId).get()
    ]);
    
    // Combinar ambos resultados y eliminar duplicados
    const todosLosEquipos = new Map();
    
    equiposCreados.forEach(doc => {
      todosLosEquipos.set(doc.id, doc);
    });
    
    equiposActualizados.forEach(doc => {
      todosLosEquipos.set(doc.id, doc);
    });
    
    equiposGestionados.forEach(doc => {
      todosLosEquipos.set(doc.id, doc);
    });
    
    if (todosLosEquipos.size === 0) {

      return res.json({ solicitudes: [] });
    }
    
    const equiposIds = [];
    todosLosEquipos.forEach((doc, id) => {
      equiposIds.push(id);
    });
    
    // Buscar solicitudes para todos los equipos del manager
    const solicitudesPromises = equiposIds.map(async (equipoId) => {
      try {
        const snapshot = await db.collection('solicitudes_equipos')
          .where('equipoId', '==', equipoId)
          .where('estado', '==', 'pendiente')
          .get();
        return snapshot.docs;
      } catch (error) {

        return [];
      }
    });
    
    const todasLasSolicitudes = await Promise.all(solicitudesPromises);
    const docs = todasLasSolicitudes.flat();
    
    const solicitudes = [];
    
    for (const doc of docs) {
      const solicitudData = doc.data();
      
      // Los datos del jugador ya están guardados en la solicitud
      solicitudes.push({
        id: doc.id,
        ...solicitudData,
        jugadorFoto: solicitudData.foto // Mapear foto a jugadorFoto para el frontend
      });
    }
    
    // Ordenar en memoria si no se pudo hacer en la query
    solicitudes.sort((a, b) => {
      const fechaA = a.fechaSolicitud?.toDate?.() || new Date(a.fechaSolicitud);
      const fechaB = b.fechaSolicitud?.toDate?.() || new Date(b.fechaSolicitud);
      return fechaB - fechaA;
    });
    
    res.json({ solicitudes });
  } catch (error) {
    console.error('❌ Error obteniendo solicitudes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/managers/solicitudes/:id/responder
 * @desc Aceptar o rechazar una solicitud
 * @access Private (Manager)
 */
router.post('/solicitudes/:id/responder', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const solicitudId = req.params.id;
    const managerId = req.user.uid;
    const { respuesta, categoria } = req.body; // respuesta: 'aceptada' | 'rechazada'
    
    console.log('🔍 Respondiendo solicitud:', { solicitudId, managerId, respuesta, categoria });
    
    if (!respuesta || !['aceptada', 'rechazada'].includes(respuesta)) {
      return res.status(400).json({ error: 'Respuesta inválida' });
    }
    
    // Obtener solicitud de solicitudes_equipos
    const solicitudDoc = await db.collection('solicitudes_equipos').doc(solicitudId).get();
    if (!solicitudDoc.exists) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    
    const solicitudData = solicitudDoc.data();
    console.log('📋 Datos de la solicitud:', solicitudData);
    
    // Verificar que el equipo/club pertenece al manager
    const equipoDoc = await db.collection('equipos').doc(solicitudData.equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    const puedeGestionar = equipoData.creadoPor === managerId || 
                          equipoData.actualizadoPor === managerId ||
                          (equipoData.managers && equipoData.managers.includes(managerId));
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    
    // Actualizar solicitud
    await db.collection('solicitudes_equipos').doc(solicitudId).update({
      estado: respuesta,
      fechaRespuesta: new Date(),
      respondidoPor: managerId
    });
    
    // Si fue aceptada, agregar jugador al club/equipo
    if (respuesta === 'aceptada') {
      const jugadores = equipoData.jugadores || [];
      
      // Usar jugadorId (así se guarda la solicitud) o usuarioId como fallback
      const jugadorId = solicitudData.jugadorId || solicitudData.usuarioId;
      
      if (!jugadorId) {
        return res.status(400).json({ error: 'Solicitud sin ID de jugador válido' });
      }
      
      // Verificar que no esté ya en el equipo
      if (!jugadores.includes(jugadorId)) {
        jugadores.push(jugadorId);
        
        await db.collection('equipos').doc(solicitudData.equipoId).update({
          jugadores,
          fechaActualizacion: new Date(),
          actualizadoPor: managerId
        });
        
        // Actualizar jugador en users
        await db.collection('users').doc(jugadorId).update({
          equipoId: solicitudData.equipoId,
          equipoNombre: solicitudData.equipoNombre || equipoData.nombre,
          categoria: categoria || solicitudData.categoria,
          fechaActualizacion: new Date()
        });
        
        // También actualizar en la colección jugadores si existe
        const jugadorDoc3 = await db.collection('jugadores').doc(jugadorId).get();
        if (jugadorDoc3.exists) {
          await db.collection('jugadores').doc(jugadorId).update({
            equipoId: solicitudData.equipoId,
            equipoNombre: solicitudData.equipoNombre || equipoData.nombre,
            categoria: categoria || solicitudData.categoria || jugadorDoc3.data().categoria,
            fechaActualizacion: new Date()
          });
        }
      }
    }
    
    console.log('✅ Solicitud procesada exitosamente');
    
    res.json({
      message: respuesta === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud rechazada'
    });
  } catch (error) {
    console.error('❌ Error respondiendo solicitud:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/managers/jugadores-disponibles
 * @desc Buscar jugadores disponibles para agregar al club
 * @access Private (Manager)
 */
router.get('/jugadores-disponibles', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const { search = '' } = req.query;
    
    let query = db.collection('users')
      .where('tipoUsuario', '==', 'jugador')
      .where('activo', '==', true);
    
    if (search) {
      // Buscar por nombre (limitado por Firestore)
      query = query.where('nombre', '>=', search)
                   .where('nombre', '<=', search + '\uf8ff');
    }
    
    const snapshot = await query.limit(50).get();
    
    const jugadores = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      jugadores.push({
        id: doc.id,
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        foto: data.foto,
        equipoId: data.equipoId,
        equipoNombre: data.equipoNombre
      });
    });
    
    res.json({ jugadores });
  } catch (error) {
    console.error('Error buscando jugadores:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ENDPOINTS PARA GESTIÓN DE CONVOCADOS =====

// Endpoints de debug removidos - problema corregido en endpoint original

// Endpoints de debug removidos - ya se creó un partido futuro de prueba

// Endpoints de debug removidos - el manager ya tiene equipos asociados

// Obtener equipos del manager
router.get('/mis-equipos', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const managerId = req.user.uid;
    
    // Obtener datos del manager
    const managerDoc = await db.collection('managers').doc(managerId).get();
    const managerData = managerDoc.exists ? managerDoc.data() : {};
    
    // Obtener equipos del manager de dos formas:
    // 1. Desde el array equipos del manager
    const equipos = [];
    const equiposIds = new Set(); // Para evitar duplicados
    
    if (managerData.equipos && Array.isArray(managerData.equipos)) {
      for (const equipoRef of managerData.equipos) {
        try {
          const equipoId = typeof equipoRef === 'object' ? equipoRef.id : equipoRef;
          const equipoDoc = await db.collection('equipos').doc(equipoId).get();
          if (equipoDoc.exists) {
            equiposIds.add(equipoId);
            equipos.push({
              id: equipoDoc.id,
              ...equipoDoc.data()
            });
          }
        } catch (err) {
          console.error('Error obteniendo equipo:', err);
        }
      }
    }
    
    // 2. Buscar equipos creados por el manager (método alternativo)
    const equiposCreadosSnapshot = await db.collection('equipos')
      .where('creadoPor', '==', managerId)
      .get();
    
    equiposCreadosSnapshot.forEach(doc => {
      const equipoId = doc.id;
      if (!equiposIds.has(equipoId)) {
        equiposIds.add(equipoId);
        equipos.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });
    
    // 3. Buscar equipos donde el manager es actualizadoPor (backup)
    const equiposActualizadosSnapshot = await db.collection('equipos')
      .where('actualizadoPor', '==', managerId)
      .get();
    
    equiposActualizadosSnapshot.forEach(doc => {
      const equipoId = doc.id;
      if (!equiposIds.has(equipoId)) {
        equiposIds.add(equipoId);
        equipos.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });
    
    // 4. Buscar equipos donde el manager está en el array de managers
    const equiposGestionadosSnapshot = await db.collection('equipos')
      .where('managers', 'array-contains', managerId)
      .get();
    
    equiposGestionadosSnapshot.forEach(doc => {
      const equipoId = doc.id;
      if (!equiposIds.has(equipoId)) {
        equiposIds.add(equipoId);
        equipos.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });
    

    res.json({ equipos });
    
  } catch (error) {
    console.error('Error obteniendo equipos del manager:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener jugadores de un equipo por categoría
router.get('/equipos/:equipoId/jugadores', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const { equipoId } = req.params;
    const { categoria } = req.query;
    const managerId = req.user.uid;
    
    // Verificar que el manager puede gestionar este equipo (métodos múltiples)
    const managerDoc = await db.collection('managers').doc(managerId).get();
    const managerData = managerDoc.exists ? managerDoc.data() : {};
    
    // Verificar si puede gestionar desde el array de equipos
    const puedeGestionarDesdeArray = managerData.equipos?.some(equipo => {
      const id = typeof equipo === 'object' ? equipo.id : equipo;
      return id === equipoId;
    });
    
    // Verificar si creó el equipo
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    let puedeGestionar = puedeGestionarDesdeArray;
    
    if (!puedeGestionar && equipoDoc.exists) {
      const equipoData = equipoDoc.data();
      puedeGestionar = equipoData.creadoPor === managerId || equipoData.actualizadoPor === managerId;
    }
    
    if (!puedeGestionar) {

      return res.status(403).json({ error: 'No tienes permisos para gestionar este equipo' });
    }
    
    let jugadores = [];
    
    // Buscar jugadores en la colección 'jugadores'
    let jugadoresQuery = db.collection('jugadores')
      .where('equipoId', '==', equipoId)
      .where('activo', '==', true);
    
    const jugadoresSnapshot = await jugadoresQuery.get();
    
    jugadoresSnapshot.forEach(doc => {
      const jugadorData = { id: doc.id, ...doc.data() };
      
      // Si se especifica categoría, filtrar por ella
      if (categoria) {
        // Verificar si la categoría coincide (puede ser string o array)
        let coincideCategoria = false;
        if (jugadorData.categoria) {
          if (Array.isArray(jugadorData.categoria)) {
            coincideCategoria = jugadorData.categoria.includes(categoria);
          } else if (typeof jugadorData.categoria === 'string') {
            coincideCategoria = jugadorData.categoria === categoria || jugadorData.categoria.includes(categoria);
          }
        }
        
        if (coincideCategoria) {
          jugadores.push({
            id: jugadorData.id,
            nombre: jugadorData.nombre,
            apellido: jugadorData.apellido,
            numero: jugadorData.numero,
            posicion: jugadorData.posicion,
            categoria: jugadorData.categoria,
            foto: jugadorData.foto,
            equipoId: jugadorData.equipoId,
            equipoNombre: jugadorData.equipoNombre
          });
        }
      } else {
        jugadores.push({
          id: jugadorData.id,
          nombre: jugadorData.nombre,
          apellido: jugadorData.apellido,
          numero: jugadorData.numero,
          posicion: jugadorData.posicion,
          categoria: jugadorData.categoria,
          foto: jugadorData.foto,
          equipoId: jugadorData.equipoId,
          equipoNombre: jugadorData.equipoNombre
        });
      }
    });
    
    // Si no se encuentran jugadores en 'jugadores', buscar en 'users'
    if (jugadores.length === 0) {
      let usersQuery = db.collection('users')
        .where('equipoId', '==', equipoId)
        .where('tipoUsuario', '==', 'jugador')
        .where('activo', '==', true);
      
      const usersSnapshot = await usersQuery.get();
      
      usersSnapshot.forEach(doc => {
        const userData = { id: doc.id, ...doc.data() };
        
        // Si se especifica categoría, filtrar por ella
        if (categoria) {
          // Verificar si la categoría coincide (puede ser string o array)
          let coincideCategoria = false;
          if (userData.categoria) {
            if (Array.isArray(userData.categoria)) {
              coincideCategoria = userData.categoria.includes(categoria);
            } else if (typeof userData.categoria === 'string') {
              coincideCategoria = userData.categoria === categoria || userData.categoria.includes(categoria);
            }
          }
          
          if (coincideCategoria) {
            jugadores.push({
              id: userData.id,
              nombre: userData.nombre,
              apellido: userData.apellido,
              numero: userData.numero,
              posicion: userData.posicion,
              categoria: userData.categoria,
              foto: userData.foto,
              equipoId: userData.equipoId,
              equipoNombre: userData.equipoNombre
            });
          }
        } else {
          jugadores.push({
            id: userData.id,
            nombre: userData.nombre,
            apellido: userData.apellido,
            numero: userData.numero,
            posicion: userData.posicion,
            categoria: userData.categoria,
            foto: userData.foto,
            equipoId: userData.equipoId,
            equipoNombre: userData.equipoNombre
          });
        }
      });
    }
    
    // Ordenar por nombre
    jugadores.sort((a, b) => {
      const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase();
      const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase();
      return nombreA.localeCompare(nombreB);
    });
    
    res.json({ jugadores });
    
  } catch (error) {
    console.error('❌ Error obteniendo jugadores del equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener partidos próximos del equipo para crear convocados
router.get('/equipos/:equipoId/partidos-proximos', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const { equipoId } = req.params;
    const { categoria } = req.query; // Agregar filtro por categoría
    const managerId = req.user.uid;
    
    // Verificar que el manager puede gestionar este equipo (métodos múltiples)
    const managerDoc = await db.collection('managers').doc(managerId).get();
    const managerData = managerDoc.exists ? managerDoc.data() : {};
    
    // Verificar si puede gestionar desde el array de equipos
    const puedeGestionarDesdeArray = managerData.equipos?.some(equipo => {
      const id = typeof equipo === 'object' ? equipo.id : equipo;
      return id === equipoId;
    });
    
    // Verificar si creó el equipo
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    let puedeGestionar = puedeGestionarDesdeArray;
    
    if (!puedeGestionar && equipoDoc.exists) {
      const equipoData = equipoDoc.data();
      puedeGestionar = equipoData.creadoPor === managerId || equipoData.actualizadoPor === managerId;
    }
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos para gestionar este equipo' });
    }
    
    // Buscar partidos próximos del equipo
    const ahora = new Date();
    const en30Dias = new Date();
    en30Dias.setDate(ahora.getDate() + 30);
    
    // Convertir a Firestore Timestamp si es necesario
    const ahoraTimestamp = admin.firestore.Timestamp.fromDate(ahora);
    const en30DiasTimestamp = admin.firestore.Timestamp.fromDate(en30Dias);
    
    // Buscar partidos donde el equipo es local o visitante
    let query = db.collection('partidos')
      .where('estado', '==', 'programado')
      .where('fecha', '>=', ahoraTimestamp)
      .where('fecha', '<=', en30DiasTimestamp);
    
    // Si se especifica categoría, filtrar por ella
    if (categoria) {
      query = query.where('categoria', '==', categoria);
    }
    
    const partidosSnapshot = await query.get();
    
    const partidosProximos = [];
    
    partidosSnapshot.forEach(doc => {
      const partido = doc.data();
      
      // Solo mostrar partidos que YA tienen equipos asignados (no referencias pendientes)
      if (!partido.equipoLocalId || !partido.equipoVisitanteId) {
        return; // Saltar partidos sin equipos definidos (con referencias pendientes)
      }
      
      // Verificar si el equipo es local o visitante
      if (partido.equipoLocalId === equipoId || partido.equipoVisitanteId === equipoId) {
        // Convertir fecha de Timestamp a Date si es necesario
        let fechaPartido = partido.fecha;
        if (fechaPartido && fechaPartido.toDate) {
          fechaPartido = fechaPartido.toDate();
        }
        
        const partidoData = {
          id: doc.id,
          fecha: fechaPartido,
          horaInicio: partido.horaInicio,
          equipoLocal: partido.equipoLocal,
          equipoLocalId: partido.equipoLocalId,
          equipoVisitante: partido.equipoVisitante,
          equipoVisitanteId: partido.equipoVisitanteId,
          cancha: partido.cancha,
          categoria: partido.categoria,
          torneoNombre: partido.torneoNombre,
          esLocal: partido.equipoLocalId === equipoId
        };
        
        partidosProximos.push(partidoData);
      }
    });
    
    // Ordenar por fecha
    partidosProximos.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaA - fechaB;
    });
    
    res.json({ partidos: partidosProximos });
    
  } catch (error) {
    console.error('Error obteniendo partidos próximos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los partidos próximos del manager por categoría
router.get('/partidos-proximos', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const { categoria } = req.query;
    const managerId = req.user.uid;
    
    // Obtener equipos del manager
    const equiposIds = new Set();
    
    console.log('🔍 ManagerId:', managerId);
    
    // Buscar equipos desde el array del manager
    const managerDoc = await db.collection('managers').doc(managerId).get();
    if (managerDoc.exists) {
      const managerData = managerDoc.data();
      console.log('📋 Datos del manager:', {
        nombre: managerData.nombre,
        apellido: managerData.apellido,
        tieneEquipos: !!managerData.equipos,
        equiposLength: managerData.equipos?.length || 0,
        equipos: managerData.equipos
      });
      
      if (managerData.equipos && Array.isArray(managerData.equipos)) {
        managerData.equipos.forEach(equipo => {
          const id = typeof equipo === 'object' ? equipo.id : equipo;
          equiposIds.add(id);
          console.log('  ✅ Equipo desde array:', id);
        });
      }
    } else {
      console.log('⚠️ No se encontró documento del manager');
    }
    
    // Buscar equipos creados por el manager
    const equiposCreadosSnapshot = await db.collection('equipos')
      .where('creadoPor', '==', managerId)
      .get();
    
    console.log('📋 Equipos creados por el manager:', equiposCreadosSnapshot.size);
    
    equiposCreadosSnapshot.forEach(doc => {
      equiposIds.add(doc.id);
      console.log('  ✅ Equipo creado por manager:', doc.id, '-', doc.data().nombre);
    });
    
    // 3. Buscar equipos donde el manager es actualizadoPor (backup)
    const equiposActualizadosSnapshot = await db.collection('equipos')
      .where('actualizadoPor', '==', managerId)
      .get();
    
    console.log('📋 Equipos actualizados por el manager:', equiposActualizadosSnapshot.size);
    
    equiposActualizadosSnapshot.forEach(doc => {
      const equipoId = doc.id;
      if (!equiposIds.has(equipoId)) {
        equiposIds.add(equipoId);
        console.log('  ✅ Equipo actualizado por manager:', doc.id, '-', doc.data().nombre);
      }
    });
    
    // 4. Buscar equipos donde el manager está en el array de managers
    const equiposGestionadosSnapshot = await db.collection('equipos')
      .where('managers', 'array-contains', managerId)
      .get();
    
    console.log('📋 Equipos con manager en array managers:', equiposGestionadosSnapshot.size);
    
    equiposGestionadosSnapshot.forEach(doc => {
      const equipoId = doc.id;
      if (!equiposIds.has(equipoId)) {
        equiposIds.add(equipoId);
        console.log('  ✅ Equipo gestionado (array managers):', doc.id, '-', doc.data().nombre);
      }
    });
    
    if (equiposIds.size === 0) {
      console.log('⚠️ Manager no tiene equipos asignados');
      return res.json({ partidos: [] });
    }
    
    console.log('🔍 Equipos del manager:', Array.from(equiposIds));
    console.log('🔍 Categoría solicitada:', categoria);
    
    // Buscar partidos programados
    // TODO: Optimizar búsqueda de partidos próximos con índices compuestos
    let query = db.collection('partidos').where('estado', '==', 'programado');
    
    if (categoria) {
      query = query.where('categoria', '==', categoria);
    }
    
    const partidosSnapshot = await query.get();
    console.log('📊 Total partidos encontrados en query:', partidosSnapshot.size);
    
    const partidosProximos = [];
    
    let partidosConReferencias = 0;
    let partidosDeOtrosEquipos = 0;
    
    partidosSnapshot.forEach(doc => {
      const partido = doc.data();
      
      // Solo mostrar partidos que YA tienen equipos asignados (no referencias pendientes)
      // Los partidos con referencias se mostrarán automáticamente cuando se resuelvan
      if (!partido.equipoLocalId || !partido.equipoVisitanteId) {
        partidosConReferencias++;
        return; // Saltar partidos sin equipos definidos (con referencias pendientes)
      }
      
      // Verificar si el partido pertenece a algún equipo del manager
      const esEquipoLocal = equiposIds.has(partido.equipoLocalId);
      const esEquipoVisitante = equiposIds.has(partido.equipoVisitanteId);
      
      if (esEquipoLocal || esEquipoVisitante) {
        // Convertir fecha si es necesario
        let fechaPartido = partido.fecha;
        if (fechaPartido && fechaPartido.toDate) {
          fechaPartido = fechaPartido.toDate();
        }
        
        partidosProximos.push({
          id: doc.id,
          fecha: fechaPartido,
          horaInicio: partido.horaInicio,
          equipoLocal: partido.equipoLocal,
          equipoLocalId: partido.equipoLocalId,
          equipoVisitante: partido.equipoVisitante,
          equipoVisitanteId: partido.equipoVisitanteId,
          cancha: partido.cancha,
          categoria: partido.categoria,
          torneoNombre: partido.torneoNombre,
          esLocal: esEquipoLocal
        });
      } else {
        partidosDeOtrosEquipos++;
      }
    });
    
    console.log('📊 Resumen de filtrado:');
    console.log('  - Partidos con referencias pendientes:', partidosConReferencias);
    console.log('  - Partidos de otros equipos:', partidosDeOtrosEquipos);
    console.log('  - Partidos del manager:', partidosProximos.length);
    
    // 5. Ordenar por fecha
    partidosProximos.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaA - fechaB;
    });
    
    res.json({ partidos: partidosProximos });
    
  } catch (error) {
    console.error('Error obteniendo partidos próximos del manager:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear lista de convocados para un partido
router.post('/convocados', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const managerId = req.user.uid;
    const { partidoId, equipoId, jugadores } = req.body;
    
    if (!partidoId || !equipoId || !jugadores || !Array.isArray(jugadores)) {
      return res.status(400).json({ error: 'Datos requeridos: partidoId, equipoId, jugadores' });
    }
    
    // Evitar duplicados: verificar si ya existe una lista para ese partido y equipo
    const existenteSnap = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .where('equipoId', '==', equipoId)
      .limit(1)
      .get();

    if (!existenteSnap.empty) {
      const existenteDoc = existenteSnap.docs[0];
      return res.status(409).json({
        error: 'Ya existe una lista de convocados para este partido y equipo',
        existenteId: existenteDoc.id,
        existente: existenteDoc.data()
      });
    }

    // Obtener datos del partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    if (!partidoDoc.exists) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    
    const partido = partidoDoc.data();
    
    // Verificar que el equipo pertenece al partido
    if (partido.equipoLocalId !== equipoId && partido.equipoVisitanteId !== equipoId) {
      return res.status(400).json({ error: 'El equipo no pertenece a este partido' });
    }
    
    // Obtener datos del manager
    const managerDoc = await db.collection('managers').doc(managerId).get();
    const managerData = managerDoc.exists ? managerDoc.data() : {};
    
    // Obtener datos del equipo
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    const equipoData = equipoDoc.data();
    
    // Verificar que el manager puede gestionar este equipo (métodos múltiples)
    const puedeGestionarDesdeArray = managerData.equipos?.some(equipo => {
      const id = typeof equipo === 'object' ? equipo.id : equipo;
      return id === equipoId;
    });
    
    let puedeGestionar = puedeGestionarDesdeArray;
    
    // Si no puede desde el array, verificar si creó o actualizó el equipo
    if (!puedeGestionar) {
      puedeGestionar = equipoData.creadoPor === managerId || equipoData.actualizadoPor === managerId;
    }
    
    if (!puedeGestionar) {

      return res.status(403).json({ error: 'No tienes permisos para gestionar este equipo' });
    }
    
    // Crear objeto de convocados
    const Convocados = require('../models/Convocados');
    const convocados = new Convocados({
      partidoId,
      equipoId,
      equipoNombre: equipoData.nombre,
      categoria: partido.categoria || 'M16',
      fechaPartido: partido.fecha,
      torneoId: partido.torneoId,
      torneoNombre: partido.torneoNombre || '',
      jugadores: jugadores,
      managerId,
      managerNombre: `${managerData.nombre} ${managerData.apellido}`,
      estado: 'confirmado',
      creadoPor: managerId,
      modificadoPor: managerId
    });
    
    // Validar datos
    const validacion = Convocados.validate(convocados.toJSON());
    if (!validacion.isValid) {
      return res.status(400).json({ error: `Datos inválidos: ${validacion.errors.join(', ')}` });
    }
    
    // Guardar en base de datos
    const convocadosRef = await db.collection('convocados').add(convocados.toJSON());
    
    res.json({
      success: true,
      convocados: {
        id: convocadosRef.id,
        ...convocados.toJSON()
      }
    });
    
  } catch (error) {
    console.error('Error creando convocados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener lista de convocados existente
router.get('/convocados/partido/:partidoId/equipo/:equipoId', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const { partidoId, equipoId } = req.params;
    const managerId = req.user.uid;
    
    // Verificar permisos del manager
    const managerDoc = await db.collection('managers').doc(managerId).get();
    if (!managerDoc.exists) {
      return res.status(404).json({ error: 'Manager no encontrado' });
    }
    
    const managerData = managerDoc.data();
    let puedeGestionar = managerData.equipos?.some(equipo => {
      const id = typeof equipo === 'object' ? equipo.id : equipo;
      return id === equipoId;
    });
    
    // Fallback: verificar propiedad del equipo
    if (!puedeGestionar) {
      const equipoDoc = await db.collection('equipos').doc(equipoId).get();
      if (equipoDoc.exists) {
        const eq = equipoDoc.data();
        puedeGestionar = eq.creadoPor === managerId || eq.actualizadoPor === managerId;
      }
    }
    
    if (!puedeGestionar) {
      return res.status(403).json({ error: 'No tienes permisos para gestionar este equipo' });
    }
    
    // Buscar convocados existentes
    const convocadosSnapshot = await db.collection('convocados')
      .where('partidoId', '==', partidoId)
      .where('equipoId', '==', equipoId)
      .limit(1)
      .get();
    
    if (convocadosSnapshot.empty) {
      return res.status(404).json({ error: 'Lista de convocados no encontrada' });
    }
    
    const convocadosDoc = convocadosSnapshot.docs[0];
    const convocados = convocadosDoc.data();
    
    res.json({
      id: convocadosDoc.id,
      ...convocados
    });
    
  } catch (error) {
    console.error('Error obteniendo convocados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar lista de convocados
router.put('/convocados/:convocadosId', verifyFirebaseToken, verifyManager, async (req, res) => {
  try {
    const { convocadosId } = req.params;
    const { jugadores, estado } = req.body;
    const managerId = req.user.uid;
    
    // Obtener convocados existentes
    const convocadosDoc = await db.collection('convocados').doc(convocadosId).get();
    if (!convocadosDoc.exists) {
      return res.status(404).json({ error: 'Lista de convocados no encontrada' });
    }
    
    const convocadosData = convocadosDoc.data();
    const equipoId = convocadosData.equipoId;
    
    // Verificar permisos (múltiples métodos)
    const managerDoc = await db.collection('managers').doc(managerId).get();
    const managerData = managerDoc.exists ? managerDoc.data() : {};
    
    // Verificar si es el manager que creó la lista
    let puedeGestionar = convocadosData.managerId === managerId;
    
    // Si no es el manager original, verificar si puede gestionar el equipo
    if (!puedeGestionar && equipoId) {
      const equipoDoc = await db.collection('equipos').doc(equipoId).get();
      if (equipoDoc.exists) {
        const equipoData = equipoDoc.data();
        
        // Verificar desde array de equipos
        const puedeGestionarDesdeArray = managerData.equipos?.some(equipo => {
          const id = typeof equipo === 'object' ? equipo.id : equipo;
          return id === equipoId;
        });
        
        puedeGestionar = puedeGestionarDesdeArray || 
                        equipoData.creadoPor === managerId || 
                        equipoData.actualizadoPor === managerId;
      }
    }
    
    if (!puedeGestionar) {

      return res.status(403).json({ error: 'No tienes permisos para modificar esta lista' });
    }
    
    // Actualizar datos
    const updateData = {
      modificadoPor: managerId,
      fechaActualizacion: new Date()
    };
    
    if (jugadores && Array.isArray(jugadores)) {
      updateData.jugadores = jugadores;
    }
    
    if (estado) {
      updateData.estado = estado;
    }
    
    // Actualizar en base de datos
    await db.collection('convocados').doc(convocadosId).update(updateData);
    
    res.json({ success: true, message: 'Lista de convocados actualizada' });
    
  } catch (error) {
    console.error('Error actualizando convocados:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



