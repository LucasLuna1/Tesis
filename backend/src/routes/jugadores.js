const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyFirebaseToken, verifyJugador, verifyOwnership, verifyAllRoles } = require('../middleware/auth');
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

// Crear perfil automáticamente al registrarse
router.post('/crear-perfil', verifyFirebaseToken, async (req, res) => {
  try {
    const jugadorId = req.user.uid;
    const { nombre, apellido, telefono, fechaNacimiento, posicion, altura, peso } = req.body;
    
    // Verificar si ya existe el perfil
    const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
    
    if (jugadorDoc.exists) {
      return res.status(400).json({ 
        error: 'El perfil ya existe',
        perfil: jugadorDoc.data()
      });
    }
    
    // Crear perfil básico
    const perfilBasico = {
      id: jugadorId,
      nombre: nombre || req.user.nombre || 'Usuario',
      apellido: apellido || '',
      email: req.user.email || '',
      telefono: telefono || '',
      fechaNacimiento: fechaNacimiento || new Date().toISOString(),
      foto: '',
      posicion: posicion || 'Centro',
      altura: altura || 175,
      peso: peso || 70,
      numero: null,
      categoria: [],
      equipoId: null,
      equipoNombre: 'Sin equipo',
      estadisticas: {
        partidosJugados: 0,
        partidosTitular: 0,
        partidosSuplente: 0,
        minutosJugados: 0,
        tries: 0,
        asistencias: 0,
        tarjetasAmarillas: 0,
        tarjetasRojas: 0,
        rating: 0
      },
      activo: true,
      disponible: true,
      sancionado: false,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      tipoUsuario: 'jugador'
    };
    
    await db.collection('jugadores').doc(jugadorId).set(perfilBasico);
    

    res.status(201).json({
      message: 'Perfil creado correctamente',
      perfil: perfilBasico
    });
  } catch (error) {
    console.error('Error creando perfil automático:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener perfil del jugador
router.get('/perfil/:id', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const jugadorId = req.params.id;
    const seguidorId = req.user.uid;
    const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
    
    if (!jugadorDoc.exists) {
      // Verificar primero si el usuario existe en la colección users
      const userDoc = await db.collection('users').doc(jugadorId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userData = userDoc.data();
      
      // Solo crear perfil de jugador si el usuario es realmente un jugador
      if (userData.tipoUsuario !== 'jugador') {
        return res.status(400).json({ 
          error: 'Este endpoint es solo para jugadores. El usuario es un ' + userData.tipoUsuario 
        });
      }
      
      // Si es jugador, crear perfil básico
      const perfilBasico = {
        id: jugadorId,
        nombre: userData.nombre || req.user.nombre || 'Usuario',
        apellido: userData.apellido || '',
        email: userData.email || req.user.email || '',
        telefono: userData.telefono || '',
        fechaNacimiento: userData.fechaNacimiento || new Date().toISOString(),
        foto: userData.foto || '',
        posicion: userData.posicion || 'Centro',
        altura: userData.altura || 175,
        peso: userData.peso || 70,
        numero: userData.numero || null,
        categoria: userData.categoria || [],
        equipoId: userData.equipoId || null,
        equipoNombre: userData.equipoNombre || 'Sin equipo',
        estadisticas: userData.estadisticas || {
          partidosJugados: 0,
          partidosTitular: 0,
          partidosSuplente: 0,
          minutosJugados: 0,
          tries: 0,
          asistencias: 0,
          tarjetasAmarillas: 0,
          tarjetasRojas: 0,
          rating: 0
        },
        activo: userData.activo !== undefined ? userData.activo : true,
        disponible: userData.disponible !== undefined ? userData.disponible : true,
        sancionado: userData.sancionado || false,
        fechaCreacion: userData.fechaCreacion || new Date(),
        fechaActualizacion: new Date(),
        tipoUsuario: 'jugador'
      };
      
      await db.collection('jugadores').doc(jugadorId).set(perfilBasico);
      
      // Verificar si el usuario actual está siguiendo a este jugador
      let siguiendo = false;
      if (seguidorId !== jugadorId) {
        try {
          const seguimientoSnapshot = await db.collection('seguimientos')
            .where('seguidorId', '==', seguidorId)
            .where('jugadorId', '==', jugadorId)
            .limit(1)
            .get();
          siguiendo = !seguimientoSnapshot.empty;
        } catch (error) {

        }
      }
      
      return res.json({ ...perfilBasico, siguiendo });
    }
    
    const jugadorData = jugadorDoc.data();
    
    // Verificar si el usuario actual está siguiendo a este jugador
    let siguiendo = false;
    if (seguidorId !== jugadorId) {
      try {
        const seguimientoSnapshot = await db.collection('seguimientos')
          .where('seguidorId', '==', seguidorId)
          .where('jugadorId', '==', jugadorId)
          .limit(1)
          .get();
        siguiendo = !seguimientoSnapshot.empty;
      } catch (error) {

      }
    }
    
    res.json({ ...jugadorData, siguiendo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar perfil del jugador
router.put('/perfil/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const jugadorId = req.params.id;
    const datosActualizados = req.body;
    
    // Campos permitidos para actualización
    const camposPermitidos = [
      'nombre', 'apellido', 'telefono', 'direccion', 'foto', 'fotoPerfil',
      'posicion', 'piernaHabil', 'altura', 'peso', 'numero', 'edad', 'categoria'
    ];
    
    const datosFiltrados = {};
    Object.keys(datosActualizados).forEach(key => {
      if (camposPermitidos.includes(key)) {
        datosFiltrados[key] = datosActualizados[key];
      }
    });
    
    // Agregar fecha de actualización
    datosFiltrados.fechaActualizacion = new Date();
    
    await db.collection('jugadores').doc(jugadorId).update(datosFiltrados);
    
    // También actualizar en la colección users
    await db.collection('users').doc(jugadorId).update(datosFiltrados);
    
    // Obtener datos actualizados
    const jugadorActualizado = await db.collection('jugadores').doc(jugadorId).get();
    
    res.json({ 
      message: 'Perfil actualizado correctamente',
      jugador: jugadorActualizado.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subir foto del jugador
router.post('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), upload.single('foto'), async (req, res) => {
  try {
    const jugadorId = req.params.id;
    
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
    const filePath = `jugadores/${filename}`;
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
      db.collection('jugadores').doc(jugadorId).update(updateData),
      db.collection('users').doc(jugadorId).update(updateData)
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

// Eliminar foto del jugador
router.delete('/foto/:id', verifyFirebaseToken, verifyOwnership('id'), async (req, res) => {
  try {
    const jugadorId = req.params.id;
    
    // Obtener datos del jugador para obtener la URL de la foto actual
    const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
    if (!jugadorDoc.exists) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    const jugadorData = jugadorDoc.data();
    const fotoActual = jugadorData.foto;
    
    // Si hay una foto actual y es de Firebase Storage, eliminarla
    if (fotoActual && fotoActual.includes('storage.googleapis.com')) {
      try {
        // Extraer el path del archivo de la URL
        const urlParts = fotoActual.split('/');
        const bucketName = urlParts[3]; // kani-deportes.firebasestorage.app
        const filePath = urlParts.slice(4).join('/'); // jugadores/filename.jpg
        
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
      db.collection('jugadores').doc(jugadorId).update(updateData),
      db.collection('users').doc(jugadorId).update(updateData)
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

// Obtener estadísticas del jugador
router.get('/estadisticas/:id', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const jugadorId = req.params.id;
    const partidosSnapshot = await db.collection('partidos')
      .where('participantes', 'array-contains', jugadorId)
      .where('estado', '==', 'finalizado')
      .get();
    
    let estadisticas = {
      partidosJugados: 0,
      tries: 0,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
      partidosGanados: 0
    };
    
    partidosSnapshot.forEach(doc => {
      const partido = doc.data();
      estadisticas.partidosJugados++;
      
      // Contar incidencias del jugador
      if (partido.incidencias) {
        partido.incidencias.forEach(incidencia => {
          if (incidencia.jugadorId === jugadorId) {
            switch (incidencia.tipo) {
              case 'try':
                estadisticas.tries++;
                break;
              case 'tarjeta_amarilla':
                estadisticas.tarjetasAmarillas++;
                break;
              case 'tarjeta_roja':
                estadisticas.tarjetasRojas++;
                break;
            }
          }
        });
      }
    });
    
    res.json(estadisticas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar jugadores
router.get('/buscar', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const { nombre, posicion, equipo, limit, offset = 0 } = req.query;
    const seguidorId = req.user.uid;
    
    let query = db.collection('jugadores');
    
    // Filtro por nombre (búsqueda parcial)
    if (nombre) {
      // Firestore no soporta búsqueda parcial eficiente, así que obtenemos todos y filtramos
      query = query.where('activo', '==', true);
    } else {
      query = query.where('activo', '==', true);
    }
    
    // Filtros adicionales
    if (posicion) {
      query = query.where('posicion', '==', posicion);
    }
    
    if (equipo) {
      query = query.where('equipoId', '==', equipo);
    }
    
    // Si no se especifica límite, cargar TODOS los jugadores (sin límite)
    const snapshot = limit 
      ? await query.limit(parseInt(limit) + parseInt(offset)).get()
      : await query.get();
    let jugadores = [];
    
    snapshot.forEach(doc => {
      const jugadorData = { id: doc.id, ...doc.data() };
      
      // Filtro de nombre en memoria (para búsqueda parcial)
      if (nombre) {
        const nombreCompleto = `${jugadorData.nombre} ${jugadorData.apellido}`.toLowerCase();
        const equipoNombre = (jugadorData.equipoNombre || '').toLowerCase();
        const busquedaNombre = nombre.toLowerCase();
        
        // Buscar en nombre completo o en equipo
        const coincideNombre = nombreCompleto.includes(busquedaNombre);
        const coincideEquipo = equipoNombre.includes(busquedaNombre);
        
        if (!coincideNombre && !coincideEquipo) {
          return; // Saltar este jugador
        }
      }
      
      jugadores.push(jugadorData);
    });
    
    // Aplicar paginación solo si se especificó un límite
    const startIndex = parseInt(offset);
    const paginatedJugadores = limit 
      ? jugadores.slice(startIndex, startIndex + parseInt(limit))
      : jugadores;
    
    // Obtener información de seguimiento para cada jugador
    const jugadoresConSeguimiento = await Promise.all(
      paginatedJugadores.map(async (jugador) => {
        try {
          const seguimientoSnapshot = await db.collection('seguimientos')
            .where('seguidorId', '==', seguidorId)
            .where('jugadorId', '==', jugador.id)
            .limit(1)
            .get();
          
          return {
            ...jugador,
            siguiendo: !seguimientoSnapshot.empty,
            // Ocultar información sensible si no es el perfil propio
            email: jugador.id === seguidorId ? jugador.email : undefined,
            telefono: jugador.id === seguidorId ? jugador.telefono : undefined
          };
        } catch (error) {
          console.error(`Error verificando seguimiento para jugador ${jugador.id}:`, error);
          return {
            ...jugador,
            siguiendo: false,
            email: jugador.id === seguidorId ? jugador.email : undefined,
            telefono: jugador.id === seguidorId ? jugador.telefono : undefined
          };
        }
      })
    );
    
    res.json({
      jugadores: jugadoresConSeguimiento,
      total: jugadores.length,
      hasMore: limit ? (startIndex + parseInt(limit)) < jugadores.length : false
    });
  } catch (error) {
    console.error('Error buscando jugadores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de partidos de un jugador
router.get('/:id/historial', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener datos del jugador
    const jugadorDoc = await db.collection('jugadores').doc(id).get();
    if (!jugadorDoc.exists) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    const jugadorData = jugadorDoc.data();
    
    // Obtener todos los partidos finalizados donde participó el jugador
    const partidosSnapshot = await db.collection('partidos')
      .where('estado', '==', 'finalizado')
      .get();
    
    const partidos = [];
    
    for (const partidoDoc of partidosSnapshot.docs) {
      const partido = partidoDoc.data();
      const partidoId = partidoDoc.id;
      
      // Buscar el jugador en convocados locales y visitantes
      const convocadosLocal = partido.convocadosLocal || [];
      const convocadosVisitante = partido.convocadosVisitante || [];
      const todosConvocados = [...convocadosLocal, ...convocadosVisitante];
      
      const jugadorEnPartido = todosConvocados.find(c => c.jugadorId === id);
      
      if (jugadorEnPartido) {
        // Determinar si es local o visitante
        const esLocal = convocadosLocal.some(c => c.jugadorId === id);
        const rival = esLocal ? partido.equipoVisitante?.nombre : partido.equipoLocal?.nombre;
        const miEquipo = esLocal ? partido.equipoLocal?.nombre : partido.equipoVisitante?.nombre;
        
        // Obtener estadísticas del jugador en este partido
        const estadisticas = jugadorEnPartido.estadisticas || {};
        
        partidos.push({
          id: partidoId,
          fecha: partido.fecha?.toDate ? partido.fecha.toDate() : new Date(partido.fecha),
          torneo: partido.torneoNombre || 'Sin torneo',
          rival: rival || 'Equipo desconocido',
          miEquipo: miEquipo || 'Mi equipo',
          resultado: `${partido.marcadorLocal || 0}-${partido.marcadorVisitante || 0}`,
          gano: esLocal ? 
            (partido.marcadorLocal > partido.marcadorVisitante) : 
            (partido.marcadorVisitante > partido.marcadorLocal),
          tries: estadisticas.tries || 0,
          conversiones: estadisticas.conversiones || 0,
          penalties: estadisticas.penalties || 0,
          drops: estadisticas.drops || 0,
          minutos: estadisticas.minutosJugados || 80,
          tarjetasAmarillas: estadisticas.tarjetasAmarillas || 0,
          tarjetasRojas: estadisticas.tarjetasRojas || 0,
          tackles: estadisticas.tackles || 0,
          asistencias: estadisticas.asistencias || 0
        });
      }
    }
    
    // Ordenar partidos por fecha (más recientes primero)
    partidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Calcular estadísticas totales
    const totales = {
      partidos: partidos.length,
      tries: partidos.reduce((sum, p) => sum + p.tries, 0),
      conversiones: partidos.reduce((sum, p) => sum + p.conversiones, 0),
      penalties: partidos.reduce((sum, p) => sum + p.penalties, 0),
      drops: partidos.reduce((sum, p) => sum + p.drops, 0),
      puntos: partidos.reduce((sum, p) => sum + (p.tries * 5 + p.conversiones * 2 + p.penalties * 3 + p.drops * 3), 0),
      tackles: partidos.reduce((sum, p) => sum + p.tackles, 0),
      asistencias: partidos.reduce((sum, p) => sum + p.asistencias, 0),
      tarjetasAmarillas: partidos.reduce((sum, p) => sum + p.tarjetasAmarillas, 0),
      tarjetasRojas: partidos.reduce((sum, p) => sum + p.tarjetasRojas, 0),
      victorias: partidos.filter(p => p.gano).length
    };
    
    res.json({
      jugador: {
        id: id,
        nombre: jugadorData.nombre,
        apellido: jugadorData.apellido,
        foto: jugadorData.foto,
        posicion: jugadorData.posicion,
        equipo: jugadorData.equipoNombre
      },
      partidos: partidos,
      totales: totales
    });
    
  } catch (error) {
    console.error('Error obteniendo historial del jugador:', error);
    res.status(500).json({ error: error.message });
  }
});

// Seguir/Dejar de seguir jugador
router.post('/seguir/:jugadorId', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const seguidorId = req.user.uid;
    const jugadorId = req.params.jugadorId;
    
    // No permitir seguirse a sí mismo
    if (seguidorId === jugadorId) {
      return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
    }
    
    // Verificar si ya sigue al jugador
    const seguimientoDoc = await db.collection('seguimientos')
      .where('seguidorId', '==', seguidorId)
      .where('jugadorId', '==', jugadorId)
      .get();
    
    if (seguimientoDoc.empty) {
      // Agregar seguimiento
      const nuevoSeguimientoRef = await db.collection('seguimientos').add({
        seguidorId,
        jugadorId,
        fecha: new Date()
      });

      // Crear notificación para el jugador seguido
      try {
        const Notificacion = require('../models/Notificacion');
        
        // Obtener información del seguidor - buscar en múltiples colecciones
        let seguidorData = null;
        let tipoSeguidor = '';
        
        // Intentar buscar en users primero (colección principal)
        const userDoc = await db.collection('users').doc(seguidorId).get();
        if (userDoc.exists) {
          seguidorData = userDoc.data();
          tipoSeguidor = seguidorData.tipoUsuario || 'usuario';
        } else {
          // Buscar en jugadores
          const jugadorSeguidorDoc = await db.collection('jugadores').doc(seguidorId).get();
          if (jugadorSeguidorDoc.exists) {
            seguidorData = jugadorSeguidorDoc.data();
            tipoSeguidor = 'jugador';
          } else {
            // Buscar en managers
            const managerDoc = await db.collection('managers').doc(seguidorId).get();
            if (managerDoc.exists) {
              seguidorData = managerDoc.data();
              tipoSeguidor = 'manager';
            } else {
              // Buscar en arbitros
              const arbitroDoc = await db.collection('arbitros').doc(seguidorId).get();
              if (arbitroDoc.exists) {
                seguidorData = arbitroDoc.data();
                tipoSeguidor = 'arbitro';
              } else {
                // Buscar en usuarios
                const usuarioDoc = await db.collection('usuarios').doc(seguidorId).get();
                if (usuarioDoc.exists) {
                  seguidorData = usuarioDoc.data();
                  tipoSeguidor = 'usuario';
                }
              }
            }
          }
        }
        
        // Obtener información del jugador seguido
        let jugadorData = null;
        
        // Buscar en users primero
        const jugadorUserDoc = await db.collection('users').doc(jugadorId).get();
        if (jugadorUserDoc.exists) {
          jugadorData = jugadorUserDoc.data();
        } else {
          // Buscar en jugadores
          const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
          if (jugadorDoc.exists) {
            jugadorData = jugadorDoc.data();
          }
        }
        
        if (seguidorData && jugadorData) {
          // Determinar el mensaje según el tipo de seguidor
          let mensaje = `${seguidorData.nombre} ${seguidorData.apellido} empezó a seguirte`;
          if (tipoSeguidor === 'manager') {
            mensaje = `${seguidorData.nombre} ${seguidorData.apellido} (Manager) empezó a seguirte`;
          } else if (tipoSeguidor === 'arbitro') {
            mensaje = `${seguidorData.nombre} ${seguidorData.apellido} (Árbitro) empezó a seguirte`;
          }
          
          const notificacionData = {
            usuarioId: jugadorId,
            tipo: 'nuevo_seguidor',
            titulo: '¡Nuevo seguidor!',
            mensaje: mensaje,
            prioridad: 'normal',
            data: {
              seguidorId: seguidorId,
              seguidorNombre: `${seguidorData.nombre} ${seguidorData.apellido}`,
              seguidorFoto: seguidorData.foto || seguidorData.fotoPerfil,
              seguidorTipo: tipoSeguidor,
              jugadorId: jugadorId,
              jugadorNombre: `${jugadorData.nombre} ${jugadorData.apellido}`,
              seguimientoId: nuevoSeguimientoRef.id
            }
          };

          const NotificacionesService = require('../services/NotificacionesService');
          const notificacion = await Notificacion.crear(notificacionData);
          // Intentar enviar push si el jugador registró FCM
          try {
            await NotificacionesService.enviarNotificacionPush(jugadorId, notificacion);
          } catch (pushErr) {

          }
        } else {

        }
      } catch (notifError) {
        console.error('Error al crear notificación de nuevo seguidor:', notifError);
        // No detener el proceso si falla la notificación
      }

      res.json({ message: 'Jugador seguido correctamente', siguiendo: true });
    } else {
      // Eliminar seguimiento
      await seguimientoDoc.docs[0].ref.delete();
      res.json({ message: 'Dejaste de seguir al jugador', siguiendo: false });
    }
  } catch (error) {
    console.error('Error en seguimiento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener jugadores que sigue el usuario actual
router.get('/siguiendo/:userId', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const userId = req.params.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    // Obtener seguimientos (sin orderBy para evitar problemas de índice)
    const seguimientosSnapshot = await db.collection('seguimientos')
      .where('seguidorId', '==', userId)
      .limit(limit + offset)
      .get();
    
    const seguimientos = [];
    seguimientosSnapshot.forEach(doc => {
      seguimientos.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por fecha en memoria
    seguimientos.sort((a, b) => new Date(b.fecha?.toDate?.() || b.fecha) - new Date(a.fecha?.toDate?.() || a.fecha));
    
    // Aplicar paginación
    const paginatedSeguimientos = seguimientos.slice(offset, offset + limit);
    
    // Obtener información de los jugadores seguidos
    const jugadoresSeguidos = await Promise.all(
      paginatedSeguimientos.map(async (seguimiento) => {
        try {
          const jugadorDoc = await db.collection('jugadores').doc(seguimiento.jugadorId).get();
          if (jugadorDoc.exists) {
            const jugadorData = jugadorDoc.data();
            return {
              id: jugadorDoc.id,
              nombre: jugadorData.nombre,
              apellido: jugadorData.apellido,
              foto: jugadorData.foto,
              posicion: jugadorData.posicion,
              equipoNombre: jugadorData.equipoNombre,
              fechaSeguimiento: seguimiento.fecha
            };
          }
          return null;
        } catch (error) {
          console.error(`Error obteniendo jugador ${seguimiento.jugadorId}:`, error);
          return null;
        }
      })
    );
    
    // Filtrar jugadores nulos
    const jugadoresValidos = jugadoresSeguidos.filter(jugador => jugador !== null);
    
    res.json({
      jugadores: jugadoresValidos,
      total: seguimientos.length,
      hasMore: (offset + limit) < seguimientos.length
    });
  } catch (error) {
    console.error('Error obteniendo jugadores seguidos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener seguidores de un jugador
router.get('/seguidores/:jugadorId', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const jugadorId = req.params.jugadorId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    // Obtener seguidores (sin orderBy para evitar problemas de índice)
    const seguidoresSnapshot = await db.collection('seguimientos')
      .where('jugadorId', '==', jugadorId)
      .limit(limit + offset)
      .get();
    
    const seguidores = [];
    seguidoresSnapshot.forEach(doc => {
      seguidores.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por fecha en memoria
    seguidores.sort((a, b) => new Date(b.fecha?.toDate?.() || b.fecha) - new Date(a.fecha?.toDate?.() || a.fecha));
    
    // Aplicar paginación
    const paginatedSeguidores = seguidores.slice(offset, offset + limit);
    
    // Obtener información de los seguidores - buscar en múltiples colecciones
    const seguidoresInfo = await Promise.all(
      paginatedSeguidores.map(async (seguimiento) => {
        try {
          let seguidorData = null;
          let tipoSeguidor = '';
          let coleccion = '';
          
          // Buscar en users primero
          const userDoc = await db.collection('users').doc(seguimiento.seguidorId).get();
          if (userDoc.exists) {
            seguidorData = userDoc.data();
            tipoSeguidor = seguidorData.tipoUsuario || 'usuario';
            coleccion = 'users';
          } else {
            // Buscar en jugadores
            const jugadorDoc = await db.collection('jugadores').doc(seguimiento.seguidorId).get();
            if (jugadorDoc.exists) {
              seguidorData = jugadorDoc.data();
              tipoSeguidor = 'jugador';
              coleccion = 'jugadores';
            } else {
              // Buscar en managers
              const managerDoc = await db.collection('managers').doc(seguimiento.seguidorId).get();
              if (managerDoc.exists) {
                seguidorData = managerDoc.data();
                tipoSeguidor = 'manager';
                coleccion = 'managers';
              } else {
              // Buscar en arbitros
              const arbitroDoc = await db.collection('arbitros').doc(seguimiento.seguidorId).get();
              if (arbitroDoc.exists) {
                seguidorData = arbitroDoc.data();
                tipoSeguidor = 'arbitro';
                coleccion = 'arbitros';
              } else {
                // Buscar en usuarios
                const usuarioDoc = await db.collection('usuarios').doc(seguimiento.seguidorId).get();
                if (usuarioDoc.exists) {
                  seguidorData = usuarioDoc.data();
                  tipoSeguidor = 'usuario';
                  coleccion = 'usuarios';
                }
              }
            }
          }
        }
          
          if (seguidorData) {
            return {
              id: seguimiento.seguidorId,
              nombre: seguidorData.nombre,
              apellido: seguidorData.apellido,
              foto: seguidorData.foto || seguidorData.fotoPerfil,
              posicion: seguidorData.posicion || null,
              equipoNombre: seguidorData.equipoNombre || null,
              tipo: tipoSeguidor,
              coleccion: coleccion,
              fechaSeguimiento: seguimiento.fecha
            };
          }
          return null;
        } catch (error) {
          console.error(`Error obteniendo seguidor ${seguimiento.seguidorId}:`, error);
          return null;
        }
      })
    );
    
    // Filtrar seguidores nulos
    const seguidoresValidos = seguidoresInfo.filter(seguidor => seguidor !== null);
    
    res.json({
      seguidores: seguidoresValidos,
      total: seguidores.length,
      hasMore: (offset + limit) < seguidores.length
    });
  } catch (error) {
    console.error('Error obteniendo seguidores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Votar jugador destacado del partido
router.post('/votar-destacado', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const { partidoId, jugadorId } = req.body;
    const votanteId = req.user.uid;
    
    // Verificar que el votante participó en el partido
    const partidoDoc = await db.collection('partidos').doc(partidoId).get();
    const partido = partidoDoc.data();
    
    if (!partido.participantes.includes(votanteId)) {
      return res.status(403).json({ error: 'No puedes votar en este partido' });
    }
    
    // Registrar voto
    await db.collection('votos_destacado').add({
      partidoId,
      jugadorId,
      votanteId,
      fecha: new Date()
    });
    
    res.json({ message: 'Voto registrado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener notificaciones del jugador (simplificado)
router.get('/notificaciones/:id', verifyFirebaseToken, verifyAllRoles, async (req, res) => {
  try {
    const jugadorId = req.params.id;
    
    // Verificar que el jugador existe
    const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
    if (!jugadorDoc.exists) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    // Por ahora, devolver notificaciones vacías para evitar el problema del índice
    // TODO: Implementar notificaciones cuando sea necesario
    res.json([]);
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancelar solicitud de unión a club (jugador)
// Cambia estado a 'cancelada' si la solicitud pertenece al jugador y está 'pendiente'
router.delete('/solicitudes/:id/cancelar', verifyFirebaseToken, async (req, res) => {
  try {
    const solicitudId = req.params.id;
    const userId = req.user.uid;

    const solicitudDoc = await db.collection('solicitudes_equipos').doc(solicitudId).get();
    if (!solicitudDoc.exists) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const solicitud = solicitudDoc.data();
    // Verificar por jugadorId ya que así se guarda la solicitud
    if (solicitud.jugadorId !== userId && solicitud.usuarioId !== userId) {
      return res.status(403).json({ error: 'No puedes cancelar esta solicitud' });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ error: 'La solicitud no está pendiente' });
    }

    await db.collection('solicitudes_equipos').doc(solicitudId).update({
      estado: 'cancelada',
      fechaCancelacion: new Date(),
      canceladaPor: userId
    });

    return res.json({ message: 'Solicitud cancelada correctamente' });
  } catch (error) {
    console.error('Error cancelando solicitud:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Solicitar unirse a un equipo
router.post('/solicitar-union', verifyFirebaseToken, verifyJugador, async (req, res) => {
  try {
    const jugadorId = req.user.uid;
    const { equipoId, equipoNombre, mensaje } = req.body;

    if (!equipoId) {
      return res.status(400).json({ error: 'El ID del equipo es requerido' });
    }

    // Verificar que el jugador existe y obtener sus datos
    const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
    if (!jugadorDoc.exists) {
      return res.status(404).json({ error: 'Perfil de jugador no encontrado' });
    }

    const jugadorData = jugadorDoc.data();

    // Verificar si el jugador ya pertenece a un equipo
    if (jugadorData.equipoId) {
      return res.status(400).json({ error: 'Ya perteneces a un equipo' });
    }

    // Verificar si ya existe una solicitud pendiente para este equipo
    const solicitudExistente = await db.collection('solicitudes_equipos')
      .where('jugadorId', '==', jugadorId)
      .where('equipoId', '==', equipoId)
      .where('estado', '==', 'pendiente')
      .get();

    if (!solicitudExistente.empty) {
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente para este equipo' });
    }

    // Obtener datos del equipo
    const equipoDoc = await db.collection('equipos').doc(equipoId).get();
    if (!equipoDoc.exists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipoData = equipoDoc.data();

    // Crear la solicitud
    const nuevaSolicitud = {
      jugadorId,
      jugadorNombre: `${jugadorData.nombre || ''} ${jugadorData.apellido || ''}`.trim(),
      jugadorEmail: jugadorData.email || '',
      jugadorFoto: jugadorData.foto || '',
      jugadorPosicion: jugadorData.posicion || '',
      equipoId,
      equipoNombre: equipoData.nombre || equipoNombre,
      equipoLogo: equipoData.logo || '',
      mensaje: mensaje || `Solicitud de ${jugadorData.nombre} para unirse al equipo`,
      estado: 'pendiente',
      fechaSolicitud: new Date(),
      fechaCreacion: new Date()
    };

    const solicitudRef = await db.collection('solicitudes_equipos').add(nuevaSolicitud);

    // Crear notificación para los managers del equipo
    if (equipoData.managers && Array.isArray(equipoData.managers)) {
      const notificacionesPromises = equipoData.managers.map(managerId => {
        return db.collection('notificaciones').add({
          tipo: 'solicitud_union_equipo',
          usuarioId: managerId,
          titulo: 'Nueva Solicitud de Jugador',
          mensaje: `${jugadorData.nombre} ${jugadorData.apellido} quiere unirse a ${equipoData.nombre}`,
          leido: false,
          fechaCreacion: new Date(),
          datos: {
            solicitudId: solicitudRef.id,
            jugadorId,
            equipoId,
            equipoNombre: equipoData.nombre
          }
        });
      });
      await Promise.all(notificacionesPromises);
    }

    res.status(201).json({
      message: 'Solicitud enviada exitosamente',
      solicitud: {
        id: solicitudRef.id,
        ...nuevaSolicitud
      }
    });

  } catch (error) {
    console.error('Error enviando solicitud de unión:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/jugadores - Obtener jugadores con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { equipoId, categoria } = req.query;

    let query = db.collection('jugadores');

    // Aplicar filtros si existen
    if (equipoId) {
      query = query.where('equipoId', '==', equipoId);
    }

    if (categoria) {
      query = query.where('categoria', 'array-contains', categoria);
    }

    const jugadoresSnapshot = await query.get();

    const jugadores = jugadoresSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ 
      jugadores,
      total: jugadores.length 
    });
  } catch (error) {
    console.error('Error obteniendo jugadores:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
