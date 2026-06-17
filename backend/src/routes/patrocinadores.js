const express = require('express');
const router = express.Router();
const Patrocinador = require('../models/Patrocinador');
const { verifyFirebaseToken } = require('../middleware/auth');
const { storage, db } = require('../config/firebase');
const multer = require('multer');
const path = require('path');

// Configurar multer para memoria (Firebase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
});

// Middleware para verificar si el usuario es organizador
const esOrganizador = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const tipoUsuario = req.user.tipoUsuario || req.user.tipo;
    
    if (tipoUsuario !== 'organizador' && tipoUsuario !== 'admin') {
      return res.status(403).json({ 
        error: 'No tienes permisos para gestionar patrocinadores',
        mensaje: 'Esta acción solo está disponible para organizadores'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando permisos:', error);
    res.status(500).json({ error: 'Error verificando permisos' });
  }
};

// 📋 Obtener todos los patrocinadores (público)
router.get('/', async (req, res) => {
  try {
    const { categoria, organizadorId } = req.query;
    
    const filtros = {
      activo: true
    };

    if (categoria) {
      filtros.categoria = categoria;
    }

    if (organizadorId) {
      filtros.organizadorId = organizadorId;
    }

    const patrocinadores = await Patrocinador.obtenerTodos(filtros);

    res.json({
      success: true,
      patrocinadores
    });
  } catch (error) {
    console.error('Error obteniendo patrocinadores:', error);
    res.status(500).json({ 
      error: 'Error al obtener patrocinadores',
      detalles: error.message 
    });
  }
});

// 📄 Obtener un patrocinador por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patrocinador = await Patrocinador.obtenerPorId(id);

    if (!patrocinador) {
      return res.status(404).json({ error: 'Patrocinador no encontrado' });
    }

    res.json({
      success: true,
      patrocinador
    });
  } catch (error) {
    console.error('Error obteniendo patrocinador:', error);
    res.status(500).json({ 
      error: 'Error al obtener patrocinador',
      detalles: error.message 
    });
  }
});

// ➕ Crear nuevo patrocinador (solo organizadores)
router.post('/', verifyFirebaseToken, esOrganizador, async (req, res) => {
  try {
    const data = {
      ...req.body,
      organizadorId: req.user.uid
    };

    // Validar campos requeridos
    if (!data.nombre || !data.categoria) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos',
        mensaje: 'Nombre y categoría son obligatorios'
      });
    }

    // Validar categoría
    const categoriasValidas = ['oro', 'plata', 'bronce', 'colaborador'];
    if (!categoriasValidas.includes(data.categoria)) {
      return res.status(400).json({ 
        error: 'Categoría inválida',
        mensaje: 'La categoría debe ser: oro, plata, bronce o colaborador'
      });
    }

    const patrocinador = await Patrocinador.crear(data);

    res.status(201).json({
      success: true,
      mensaje: 'Patrocinador creado exitosamente',
      patrocinador
    });
  } catch (error) {
    console.error('Error creando patrocinador:', error);
    res.status(500).json({ 
      error: 'Error al crear patrocinador',
      detalles: error.message 
    });
  }
});

// 📤 Subir logo del patrocinador (Firebase Storage)
router.post('/:id/logo', verifyFirebaseToken, esOrganizador, upload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // Verificar que el patrocinador existe y pertenece al organizador
    const patrocinador = await Patrocinador.obtenerPorId(id);
    
    if (!patrocinador) {
      return res.status(404).json({ error: 'Patrocinador no encontrado' });
    }

    if (patrocinador.organizadorId !== req.user.uid && req.user.tipoUsuario !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para editar este patrocinador' });
    }

    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(req.file.originalname);
    const filename = `logo-${timestamp}-${random}${extension}`;
    
    // Subir a Firebase Storage
    const filePath = `patrocinadores/${filename}`;
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
      public: true,
    });
    
    // Obtener URL pública de Firebase Storage
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Eliminar logo anterior de Firebase Storage si existe
    if (patrocinador.logo && patrocinador.logo.includes('storage.googleapis.com')) {
      try {
        const urlParts = patrocinador.logo.split('/');
        const oldFilePath = urlParts.slice(4).join('/');
        const oldFile = bucket.file(oldFilePath);
        await oldFile.delete().catch(() => {});
      } catch (error) {
        // Ignorar error si no se puede eliminar
      }
    }

    // Actualizar en Firestore
    await Patrocinador.actualizar(id, { logo: publicUrl });

    res.json({
      success: true,
      mensaje: 'Logo actualizado exitosamente',
      logo: publicUrl
    });
  } catch (error) {
    console.error('Error subiendo logo:', error);
    res.status(500).json({ 
      error: 'Error al subir logo',
      detalles: error.message 
    });
  }
});

// ✏️ Actualizar patrocinador (solo organizadores)
router.put('/:id', verifyFirebaseToken, esOrganizador, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el patrocinador existe y pertenece al organizador
    const patrocinador = await Patrocinador.obtenerPorId(id);
    
    if (!patrocinador) {
      return res.status(404).json({ error: 'Patrocinador no encontrado' });
    }

    if (patrocinador.organizadorId !== req.user.uid && req.user.tipoUsuario !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para editar este patrocinador' });
    }

    // Validar categoría si se está actualizando
    if (req.body.categoria) {
      const categoriasValidas = ['oro', 'plata', 'bronce', 'colaborador'];
      if (!categoriasValidas.includes(req.body.categoria)) {
        return res.status(400).json({ 
          error: 'Categoría inválida',
          mensaje: 'La categoría debe ser: oro, plata, bronce o colaborador'
        });
      }
    }

    const patrocinadorActualizado = await Patrocinador.actualizar(id, req.body);

    res.json({
      success: true,
      mensaje: 'Patrocinador actualizado exitosamente',
      patrocinador: patrocinadorActualizado
    });
  } catch (error) {
    console.error('Error actualizando patrocinador:', error);
    res.status(500).json({ 
      error: 'Error al actualizar patrocinador',
      detalles: error.message 
    });
  }
});

// 🗑️ Eliminar patrocinador (soft delete - solo organizadores)
router.delete('/:id', verifyFirebaseToken, esOrganizador, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el patrocinador existe y pertenece al organizador
    const patrocinador = await Patrocinador.obtenerPorId(id);
    
    if (!patrocinador) {
      return res.status(404).json({ error: 'Patrocinador no encontrado' });
    }

    if (patrocinador.organizadorId !== req.user.uid && req.user.tipoUsuario !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este patrocinador' });
    }

    await Patrocinador.eliminar(id);

    res.json({
      success: true,
      mensaje: 'Patrocinador eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando patrocinador:', error);
    res.status(500).json({ 
      error: 'Error al eliminar patrocinador',
      detalles: error.message 
    });
  }
});

// 🔄 Reordenar patrocinadores (solo organizadores)
router.post('/reordenar', verifyFirebaseToken, esOrganizador, async (req, res) => {
  try {
    const { orden } = req.body;

    if (!Array.isArray(orden)) {
      return res.status(400).json({ error: 'El orden debe ser un array' });
    }

    await Patrocinador.reordenar(orden);

    res.json({
      success: true,
      mensaje: 'Orden actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error reordenando patrocinadores:', error);
    res.status(500).json({ 
      error: 'Error al reordenar patrocinadores',
      detalles: error.message 
    });
  }
});

module.exports = router;

