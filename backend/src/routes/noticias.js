/**
 * Rutas para gestión de noticias
 * Funcionalidad para publicar, editar y eliminar noticias
 */

const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifyAllRoles } = require('../middleware/auth');
const { db, storage, admin } = require('../config/firebase');
const multer = require('multer');
const FieldValue = admin.firestore.FieldValue;

// Configuración de multer para subir imágenes a memoria (Firebase Storage)
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

// Obtener noticias destacadas (DEBE IR ANTES DE /:id)
router.get('/destacadas/lista', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const snapshot = await db.collection('noticias')
      .where('destacada', '==', true)
      .where('estado', '==', 'publicada')
      .orderBy('fechaPublicacion', 'desc')
      .limit(parseInt(limit))
      .get();
    
    const noticias = [];
    
    snapshot.forEach(doc => {
      const noticia = doc.data();
      noticias.push({
        id: doc.id,
        ...noticia,
        fechaPublicacion: noticia.fechaPublicacion?.toDate ? noticia.fechaPublicacion.toDate() : new Date(noticia.fechaPublicacion)
      });
    });
    
    res.json({ noticias });
  } catch (error) {
    console.error('Error obteniendo noticias destacadas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener noticias de equipos seguidos por el usuario (DEBE IR ANTES DE /:id)
router.get('/mis-equipos/feed', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 20, offset = 0 } = req.query;
    
    // Obtener equipos que sigue el usuario
    const seguimientosSnapshot = await db.collection('seguidores_equipos')
      .where('usuarioId', '==', userId)
      .get();
    
    if (seguimientosSnapshot.empty) {
      return res.json({ 
        noticias: [], 
        total: 0,
        mensaje: 'No sigues ningún equipo aún'
      });
    }
    
    const equiposIds = seguimientosSnapshot.docs.map(doc => doc.data().equipoId);
    
    // Obtener todas las noticias de esos equipos
    const noticiasSnapshot = await db.collection('noticias')
      .where('estado', '==', 'publicada')
      .get();
    
    const noticias = [];
    noticiasSnapshot.forEach(doc => {
      const noticia = doc.data();
      // Filtrar solo noticias de equipos seguidos
      if (noticia.equipo && equiposIds.includes(noticia.equipo.id)) {
        noticias.push({
          id: doc.id,
          ...noticia,
          fechaPublicacion: noticia.fechaPublicacion?.toDate ? noticia.fechaPublicacion.toDate() : new Date(noticia.fechaPublicacion),
          fechaActualizacion: noticia.fechaActualizacion?.toDate ? noticia.fechaActualizacion.toDate() : new Date(noticia.fechaActualizacion)
        });
      }
    });
    
    // Ordenar por fecha de publicación (más reciente primero)
    noticias.sort((a, b) => new Date(b.fechaPublicacion) - new Date(a.fechaPublicacion));
    
    // Aplicar paginación
    const noticiasPaginadas = noticias.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      noticias: noticiasPaginadas,
      total: noticias.length,
      hasMore: parseInt(offset) + parseInt(limit) < noticias.length
    });
  } catch (error) {
    console.error('Error obteniendo noticias de equipos seguidos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener noticias de un equipo específico (DEBE IR ANTES DE /:id)
router.get('/equipo/:equipoId', async (req, res) => {
  try {
    const { equipoId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const snapshot = await db.collection('noticias')
      .where('estado', '==', 'publicada')
      .get();
    
    const noticias = [];
    snapshot.forEach(doc => {
      const noticia = doc.data();
      // Filtrar solo noticias de este equipo
      if (noticia.equipo && noticia.equipo.id === equipoId) {
        noticias.push({
          id: doc.id,
          ...noticia,
          fechaPublicacion: noticia.fechaPublicacion?.toDate ? noticia.fechaPublicacion.toDate() : new Date(noticia.fechaPublicacion),
          fechaActualizacion: noticia.fechaActualizacion?.toDate ? noticia.fechaActualizacion.toDate() : new Date(noticia.fechaActualizacion)
        });
      }
    });
    
    // Ordenar por fecha de publicación
    noticias.sort((a, b) => new Date(b.fechaPublicacion) - new Date(a.fechaPublicacion));
    
    // Aplicar paginación
    const noticiasPaginadas = noticias.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      noticias: noticiasPaginadas,
      total: noticias.length,
      hasMore: parseInt(offset) + parseInt(limit) < noticias.length
    });
  } catch (error) {
    console.error('Error obteniendo noticias del equipo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las noticias
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, destacada } = req.query;
    
    let query = db.collection('noticias')
      .orderBy('fechaPublicacion', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    if (destacada !== undefined) {
      query = query.where('destacada', '==', destacada === 'true');
    }
    
    const snapshot = await query.get();
    const noticias = [];
    
    snapshot.forEach(doc => {
      const noticia = doc.data();
      noticias.push({
        id: doc.id,
        ...noticia,
        // Convertir timestamp a fecha
        fechaPublicacion: noticia.fechaPublicacion?.toDate ? noticia.fechaPublicacion.toDate() : new Date(noticia.fechaPublicacion),
        fechaActualizacion: noticia.fechaActualizacion?.toDate ? noticia.fechaActualizacion.toDate() : new Date(noticia.fechaActualizacion)
      });
    });
    
    res.json({
      noticias,
      total: noticias.length,
      hasMore: noticias.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error obteniendo noticias:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener una noticia por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('noticias').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    
    const noticia = doc.data();
    res.json({
      id: doc.id,
      ...noticia,
      fechaPublicacion: noticia.fechaPublicacion?.toDate ? noticia.fechaPublicacion.toDate() : new Date(noticia.fechaPublicacion),
      fechaActualizacion: noticia.fechaActualizacion?.toDate ? noticia.fechaActualizacion.toDate() : new Date(noticia.fechaActualizacion)
    });
  } catch (error) {
    console.error('Error obteniendo noticia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva noticia
router.post('/', verifyFirebaseToken, verifyAllRoles, upload.array('imagenes', 10), async (req, res) => {
  try {
    const usuarioId = req.user.uid;
    const usuarioNombre = req.user.displayName || req.user.email;
    
    const {
      titulo,
      contenido,
      destacada = false,
      categoria = 'general',
      etiquetas = [],
      equipoId = null // ID del equipo al que pertenece la noticia (opcional)
    } = req.body;
    
    // Validaciones
    if (!titulo || !contenido) {
      return res.status(400).json({ error: 'Título y contenido son requeridos' });
    }
    
    if (titulo.length < 5 || titulo.length > 200) {
      return res.status(400).json({ error: 'El título debe tener entre 5 y 200 caracteres' });
    }
    
    if (contenido.length < 20 || contenido.length > 5000) {
      return res.status(400).json({ error: 'El contenido debe tener entre 20 y 5000 caracteres' });
    }

    // Verificar que el equipo existe si se proporciona
    let equipoData = null;
    if (equipoId) {
      const equipoDoc = await db.collection('equipos').doc(equipoId).get();
      if (!equipoDoc.exists) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }
      equipoData = {
        id: equipoId,
        nombre: equipoDoc.data().nombre,
        logo: equipoDoc.data().logo
      };
    }
    
    // Subir imágenes a Firebase Storage si existen
    let imagenesUrls = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const bucket = storage.bucket();
      
      for (const file of req.files) {
        const extension = file.originalname.split('.').pop();
        const nombreArchivo = `noticias/noticia-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
        const archivo = bucket.file(nombreArchivo);
        
        await archivo.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
          },
        });
        
        // Hacer el archivo público
        await archivo.makePublic();
        
        // Obtener la URL pública
        const imagenUrl = `https://storage.googleapis.com/${bucket.name}/${nombreArchivo}`;
        imagenesUrls.push(imagenUrl);
      }
    }
    
    // Mantener compatibilidad con el campo 'imagen' (primera imagen si existe)
    const imagenUrl = imagenesUrls.length > 0 ? imagenesUrls[0] : null;
    
    const noticia = {
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      destacada: destacada === 'true' || destacada === true,
      categoria: categoria.trim(),
      etiquetas: Array.isArray(etiquetas) ? etiquetas.filter(tag => tag.trim()) : [],
      imagen: imagenUrl, // Mantener compatibilidad hacia atrás
      imagenes: imagenesUrls, // Array de múltiples imágenes
      equipo: equipoData, // Información del equipo (null si es noticia general)
      autor: {
        id: usuarioId,
        nombre: usuarioNombre
      },
      fechaPublicacion: new Date(),
      fechaActualizacion: new Date(),
      estado: 'publicada',
      vistas: 0,
      likes: 0,
      comentarios: [],
      
      // Auditoría
      auditoria: {
        creadoPor: usuarioId,
        creadoPorNombre: usuarioNombre,
        fechaCreacion: new Date(),
        modificadoPor: usuarioId,
        modificadoPorNombre: usuarioNombre,
        fechaModificacion: new Date()
      }
    };
    
    const docRef = await db.collection('noticias').add(noticia);
    
    // Notificar usuarios según el tipo de noticia
    try {
      const Notificacion = require('../models/Notificacion');
      
      if (equipoData && equipoData.id) {
        // Si la noticia pertenece a un equipo, notificar solo a sus seguidores
        const seguidoresSnapshot = await db.collection('seguidores_equipos')
          .where('equipoId', '==', equipoData.id)
          .where('notificarNoticias', '==', true)
          .get();
        
        if (!seguidoresSnapshot.empty) {
          const seguidoresIds = seguidoresSnapshot.docs.map(doc => doc.data().usuarioId);
          
          // Crear notificaciones para los seguidores del equipo
          const notificacionesData = {
            tipo: 'noticia_equipo',
            titulo: `Nueva noticia de ${equipoData.nombre}`,
            mensaje: titulo.substring(0, 100),
            prioridad: 'normal',
            leida: false,
            enviada: false,
            data: {
              noticiaId: docRef.id,
              equipoId: equipoData.id,
              equipoNombre: equipoData.nombre
            }
          };
          
          await Notificacion.crearMasivas(seguidoresIds, notificacionesData);
        }
      } else {
        // Si la noticia es general (sin equipo), notificar a todos los jugadores
        const jugadoresSnapshot = await db.collection('jugadores').get();
        
        if (!jugadoresSnapshot.empty) {
          const jugadoresIds = jugadoresSnapshot.docs.map(doc => doc.id);
          
          // Crear notificaciones para todos los jugadores
          const notificacionesData = {
            tipo: 'noticia_general',
            titulo: '¡Nueva noticia!',
            mensaje: titulo.substring(0, 100),
            prioridad: 'normal',
            leida: false,
            enviada: false,
            data: {
              noticiaId: docRef.id,
              categoria: categoria
            }
          };
          
          await Notificacion.crearMasivas(jugadoresIds, notificacionesData);
        }
      }
    } catch (notifError) {
      console.error('⚠️ Error al crear notificaciones:', notifError);
      // No detener la creación de la noticia si falla el envío de notificaciones
    }
    
    res.status(201).json({
      message: 'Noticia creada exitosamente',
      noticia: {
        id: docRef.id,
        ...noticia
      }
    });
    
  } catch (error) {
    console.error('Error creando noticia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar noticia
router.put('/:id', verifyFirebaseToken, verifyAllRoles, upload.array('imagenes', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.uid;
    const usuarioNombre = req.user.displayName || req.user.email;
    
    const doc = await db.collection('noticias').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    
    const noticiaExistente = doc.data();
    
    // Verificar permisos (solo el autor o admin puede editar)
    if (noticiaExistente.autor.id !== usuarioId && !req.user.admin) {
      return res.status(403).json({ error: 'No tienes permisos para editar esta noticia' });
    }
    
    const {
      titulo,
      contenido,
      destacada,
      categoria,
      etiquetas
    } = req.body;
    
    const updates = {
      fechaActualizacion: new Date(),
      auditoria: {
        ...noticiaExistente.auditoria,
        modificadoPor: usuarioId,
        modificadoPorNombre: usuarioNombre,
        fechaModificacion: new Date()
      }
    };
    
    // Solo actualizar campos que se envían
    if (titulo !== undefined) {
      if (titulo.length < 5 || titulo.length > 200) {
        return res.status(400).json({ error: 'El título debe tener entre 5 y 200 caracteres' });
      }
      updates.titulo = titulo.trim();
    }
    
    if (contenido !== undefined) {
      if (contenido.length < 20 || contenido.length > 5000) {
        return res.status(400).json({ error: 'El contenido debe tener entre 20 y 5000 caracteres' });
      }
      updates.contenido = contenido.trim();
    }
    
    if (destacada !== undefined) {
      updates.destacada = destacada === 'true' || destacada === true;
    }
    
    if (categoria !== undefined) {
      updates.categoria = categoria.trim();
    }
    
    if (etiquetas !== undefined) {
      updates.etiquetas = Array.isArray(etiquetas) ? etiquetas.filter(tag => tag.trim()) : [];
    }
    
    // Manejar actualización de imágenes en Firebase Storage
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const bucket = storage.bucket();
      const imagenesUrls = [];
      
      // Eliminar imágenes anteriores si existen (si el usuario quiere reemplazarlas todas)
      // Nota: Si el usuario quiere agregar imágenes sin eliminar las anteriores,
      // esto se puede ajustar con una lógica adicional en el frontend
      
      // Subir nuevas imágenes
      for (const file of req.files) {
        const extension = file.originalname.split('.').pop();
        const nombreArchivo = `noticias/noticia-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
        const archivo = bucket.file(nombreArchivo);
        
        await archivo.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
          },
        });
        
        // Hacer el archivo público
        await archivo.makePublic();
        
        // Obtener la URL pública
        const imagenUrl = `https://storage.googleapis.com/${bucket.name}/${nombreArchivo}`;
        imagenesUrls.push(imagenUrl);
      }
      
      // Si hay imágenes existentes y queremos agregar a ellas, combinarlas
      // Por ahora, reemplazamos todas las imágenes con las nuevas
      updates.imagenes = imagenesUrls;
      updates.imagen = imagenesUrls.length > 0 ? imagenesUrls[0] : null; // Compatibilidad hacia atrás
    }
    
    await db.collection('noticias').doc(id).update(updates);
    
    // Obtener la noticia actualizada
    const docActualizado = await db.collection('noticias').doc(id).get();
    const noticiaActualizada = docActualizado.data();
    
    res.json({
      message: 'Noticia actualizada exitosamente',
      noticia: {
        id: docActualizado.id,
        ...noticiaActualizada,
        fechaPublicacion: noticiaActualizada.fechaPublicacion?.toDate ? noticiaActualizada.fechaPublicacion.toDate() : new Date(noticiaActualizada.fechaPublicacion),
        fechaActualizacion: noticiaActualizada.fechaActualizacion?.toDate ? noticiaActualizada.fechaActualizacion.toDate() : new Date(noticiaActualizada.fechaActualizacion)
      }
    });
    
  } catch (error) {
    console.error('Error actualizando noticia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar noticia
router.delete('/:id', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.uid;
    
    const doc = await db.collection('noticias').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    
    const noticia = doc.data();
    
    // Verificar permisos (solo el autor o admin puede eliminar)
    if (noticia.autor.id !== usuarioId && !req.user.admin) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta noticia' });
    }
    
    // Eliminar imagen de Firebase Storage si existe y es de Firebase Storage
    if (noticia.imagen && noticia.imagen.includes('storage.googleapis.com')) {
      try {
        const nombreArchivo = noticia.imagen.split('/').pop();
        const rutaArchivo = `noticias/${nombreArchivo}`;
        const bucket = storage.bucket();
        const archivo = bucket.file(rutaArchivo);
        
        await archivo.delete();
      } catch (storageError) {
        console.warn('⚠️ Error eliminando imagen de Firebase Storage:', storageError.message);
        // Continuar con la eliminación de la noticia aunque falle la eliminación del archivo
      }
    }
    
    await db.collection('noticias').doc(id).delete();
    
    res.json({ message: 'Noticia eliminada exitosamente' });
    
  } catch (error) {
    console.error('Error eliminando noticia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Incrementar vistas de una noticia
router.post('/:id/vista', async (req, res) => {
  try {
    const { id } = req.params;
    
    const noticiaRef = db.collection('noticias').doc(id);
    const doc = await noticiaRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    
    await noticiaRef.update({
      vistas: FieldValue.increment(1)
    });
    
    const noticiaActualizada = await noticiaRef.get();
    const vistas = noticiaActualizada.data().vistas || 0;
    
    res.json({ 
      message: 'Vista registrada',
      vistas
    });
  } catch (error) {
    console.error('Error incrementando vistas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dar/Quitar like a una noticia
router.post('/:id/like', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const noticiaRef = db.collection('noticias').doc(id);
    const doc = await noticiaRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    
    // Verificar si el usuario ya le dio like
    const likeRef = db.collection('noticias_likes').doc(`${id}_${userId}`);
    const likeDoc = await likeRef.get();
    
    let likes = doc.data().likes || 0;
    let liked = false;
    
    if (likeDoc.exists) {
      // Quitar like
      await likeRef.delete();
      await noticiaRef.update({
        likes: FieldValue.increment(-1)
      });
      likes = Math.max(0, likes - 1);
      liked = false;
    } else {
      // Dar like
      await likeRef.set({
        userId,
        noticiaId: id,
        fecha: new Date()
      });
      await noticiaRef.update({
        likes: FieldValue.increment(1)
      });
      likes = likes + 1;
      liked = true;
    }
    
    res.json({ 
      message: liked ? 'Like agregado' : 'Like removido',
      likes,
      liked
    });
  } catch (error) {
    console.error('Error procesando like:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar si el usuario le dio like a una noticia
router.get('/:id/like/estado', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const likeRef = db.collection('noticias_likes').doc(`${id}_${userId}`);
    const likeDoc = await likeRef.get();
    
    res.json({ 
      liked: likeDoc.exists
    });
  } catch (error) {
    console.error('Error verificando like:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
