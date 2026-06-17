const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyFirebaseToken, verifyAllRoles, verifyOwnership } = require('../middleware/auth');
const { db, storage } = require('../config/firebase');

// Configuración de multer para procesar archivos en memoria
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

// Buscar usuarios y jugadores (debe ir antes de /:id)
router.get('/buscar', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const { nombre, limit = 50, offset = 0, tipoUsuario } = req.query;
    
    // Obtener usuarios y jugadores
    const [usuariosSnapshot, jugadoresSnapshot] = await Promise.all([
      db.collection('usuarios').where('activo', '==', true).get(),
      db.collection('jugadores').where('activo', '==', true).get()
    ]);
    
    let resultados = [];
    
    // Procesar usuarios
    usuariosSnapshot.forEach(doc => {
      const usuarioData = { id: doc.id, ...doc.data() };
      
      // Filtro de tipo de usuario
      if (tipoUsuario && tipoUsuario !== 'todos') {
        if (tipoUsuario === 'jugadores') {
          return; // Saltar usuarios si se buscan solo jugadores
        }
        if (tipoUsuario === 'usuarios' && usuarioData.tipoUsuario !== 'usuario') {
          return; // Saltar si no es usuario
        }
      }
      
      // Filtro de nombre en memoria (para búsqueda parcial)
      if (nombre) {
        const nombreCompleto = `${usuarioData.nombre} ${usuarioData.apellido}`.toLowerCase();
        const busquedaNombre = nombre.toLowerCase();
        
        if (!nombreCompleto.includes(busquedaNombre)) {
          return; // Saltar este usuario
        }
      }
      
      resultados.push({
        id: usuarioData.id,
        uid: usuarioData.uid,
        nombre: usuarioData.nombre,
        apellido: usuarioData.apellido,
        email: usuarioData.email,
        telefono: usuarioData.telefono || '',
        fechaNacimiento: usuarioData.fechaNacimiento || '',
        foto: usuarioData.foto || '',
        activo: usuarioData.activo,
        tipoUsuario: usuarioData.tipoUsuario || 'usuario'
      });
    });
    
    // Procesar jugadores
    jugadoresSnapshot.forEach(doc => {
      const jugadorData = { id: doc.id, ...doc.data() };
      
      // Filtro de tipo de usuario
      if (tipoUsuario && tipoUsuario !== 'todos') {
        if (tipoUsuario === 'usuarios') {
          return; // Saltar jugadores si se buscan solo usuarios
        }
        if (tipoUsuario === 'jugadores') {
          // Incluir jugadores
        }
      }
      
      // Filtro de nombre en memoria (para búsqueda parcial)
      if (nombre) {
        const nombreCompleto = `${jugadorData.nombre} ${jugadorData.apellido}`.toLowerCase();
        const busquedaNombre = nombre.toLowerCase();
        
        if (!nombreCompleto.includes(busquedaNombre)) {
          return; // Saltar este jugador
        }
      }
      
      resultados.push({
        id: jugadorData.id,
        uid: jugadorData.uid,
        nombre: jugadorData.nombre,
        apellido: jugadorData.apellido,
        email: jugadorData.email,
        foto: jugadorData.foto || '',
        posicion: jugadorData.posicion || '',
        equipoNombre: jugadorData.equipoNombre || '',
        activo: jugadorData.activo,
        tipoUsuario: 'jugador'
      });
    });
    
    // Aplicar paginación
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsuarios = resultados.slice(startIndex, endIndex);
    
    res.json({
      usuarios: paginatedUsuarios,
      total: resultados.length,
      hasMore: endIndex < resultados.length
    });
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los usuarios (con soporte de búsqueda)
router.get('/', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const { nombre, limit = 50, offset = 0 } = req.query;
    
    // Si hay búsqueda por nombre, usar el endpoint de buscar
    if (nombre) {
      // Redirigir a /buscar
      const query = new URLSearchParams(req.query).toString();
      return res.redirect(`/api/usuarios/buscar?${query}`);
    }
    
    const usuariosSnapshot = await db.collection('usuarios')
      .where('activo', '==', true)
      .limit(parseInt(limit) + parseInt(offset))
      .get();
    
    const usuarios = [];
    usuariosSnapshot.forEach(doc => {
      const data = doc.data();
      usuarios.push({
        id: doc.id,
        uid: data.uid,
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        telefono: data.telefono || '',
        fechaNacimiento: data.fechaNacimiento || '',
        foto: data.foto || '',
        activo: data.activo,
        tipoUsuario: data.tipoUsuario || 'usuario',
        fechaCreacion: data.fechaCreacion
      });
    });
    
    // Aplicar paginación
    const paginatedUsuarios = usuarios.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      usuarios: paginatedUsuarios,
      total: usuarios.length,
      hasMore: usuarios.length > parseInt(offset) + parseInt(limit)
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Subir foto del usuario (debe ir antes de /:id)
router.post('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), upload.single('foto'), async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido' });
    }
    
    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(req.file.originalname);
    const filename = `perfil-${timestamp}-${random}${extension}`;
    
    let publicUrl = '';
    
    // Subir a Firebase Storage
    const filePath = `usuarios/${filename}`;
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
      db.collection('usuarios').doc(userId).update(updateData),
      db.collection('users').doc(userId).update(updateData)
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

// Eliminar foto del usuario
router.delete('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Obtener datos del usuario para obtener la URL de la foto actual
    const usuarioDoc = await db.collection('usuarios').doc(userId).get();
    
    if (!usuarioDoc.exists) {
      // Buscar en users como fallback
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
    }
    
    const usuarioData = usuarioDoc.exists ? usuarioDoc.data() : (await db.collection('users').doc(userId).get()).data();
    
    // Si hay una foto guardada en Firebase Storage, intentar eliminarla
    if (usuarioData.foto && usuarioData.foto.includes('storage.googleapis.com')) {
      try {
        const url = new URL(usuarioData.foto);
        const filePath = url.pathname.substring(1); // Remover el primer slash
        
        const bucket = storage.bucket();
        const file = bucket.file(filePath);
        
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();

        }
      } catch (storageError) {

      }
    }
    
    // Actualizar Firestore en ambas colecciones
    const updateData = {
      foto: '',
      fechaActualizacion: new Date()
    };
    
    await Promise.all([
      db.collection('usuarios').doc(userId).update(updateData),
      db.collection('users').doc(userId).update(updateData)
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

// Obtener perfil de un usuario específico (debe ir después de /foto/:id)
router.get('/:id', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const usuarioDoc = await db.collection('usuarios').doc(usuarioId).get();
    
    if (!usuarioDoc.exists) {
      // Buscar en users como fallback
      const userDoc = await db.collection('users').doc(usuarioId).get();
      
      if (!userDoc.exists || userDoc.data().tipoUsuario !== 'usuario') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userData = userDoc.data();
      return res.json({
        id: userDoc.id,
        ...userData
      });
    }
    
    res.json({
      id: usuarioDoc.id,
      ...usuarioDoc.data()
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

