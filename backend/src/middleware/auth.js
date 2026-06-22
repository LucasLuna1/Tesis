const { admin } = require('../config/firebase');
const { userTypes } = require('../models');

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de Firebase requerido',
        details: 'Debes iniciar sesión para acceder a este recurso'
      });
    }

    // Verificar token de Firebase
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (tokenError) {
      console.error('❌ Error verificando token de Firebase:', tokenError.message);
      
      const errorMessages = {
        'auth/argument-error': {
          error: 'Token de Firebase inválido',
          details: 'El token proporcionado no es válido. Por favor, inicia sesión nuevamente.'
        },
        'auth/id-token-expired': {
          error: 'Token expirado',
          details: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
        }
      };

      const errorResponse = errorMessages[tokenError.code] || {
        error: 'Error de autenticación',
        details: tokenError.message
      };
      
      return res.status(401).json(errorResponse);
    }
    
    // Obtener perfil del usuario desde Firestore - buscar en múltiples colecciones
    let userProfile = null;
    let tipoUsuario = null;
    
    // Configuración de colecciones a buscar
    const collections = [
      { name: 'users', userType: null },
      { name: 'jugadores', userType: 'jugador' },
      { name: 'managers', userType: 'manager' },
      { name: 'arbitros', userType: 'arbitro' },
      { name: 'organizadores', userType: 'organizador' },
      { name: 'usuarios', userType: 'usuario' }
    ];
    
    // Buscar en las colecciones en paralelo para mejorar rendimiento
    const firestore = admin.firestore();
    const searchPromises = collections.map(collection => 
      firestore.collection(collection.name).doc(decodedToken.uid).get()
    );
    
    const results = await Promise.all(searchPromises);
    
    // Encontrar el primer documento que existe
    for (let i = 0; i < results.length; i++) {
      const doc = results[i];
      if (doc.exists) {
        userProfile = doc.data();
        tipoUsuario = collections[i].userType || userProfile.tipoUsuario;
        break;
      }
    }
    
    if (!userProfile) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado en la base de datos',
        details: 'Tu cuenta no existe en el sistema. Por favor, contacta al administrador.'
      });
    }
    
    // Agregar información del perfil al req.user
    const finalTipoUsuario = tipoUsuario || userProfile.tipoUsuario;
    
    req.user = {
      ...decodedToken,
      tipoUsuario: finalTipoUsuario,
      nombre: userProfile.nombre,
      apellido: userProfile.apellido
    };
    
    next();
  } catch (error) {
    console.error('❌ Error en verifyFirebaseToken:', error);
    res.status(500).json({ 
      error: 'Error interno de autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Ocurrió un error al verificar tu autenticación'
    });
  }
};

// Middleware para validar roles específicos
const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userRole = req.user.tipoUsuario;
    
    if (!allowedRoles.includes(userRole)) {
      console.warn(`⚠️  Acceso denegado para rol: ${userRole}`);
      return res.status(403).json({ 
        error: `Acceso denegado. Rol requerido: ${allowedRoles.join(' o ')}`,
        userRole,
        allowedRoles
      });
    }

    next();
  };
};

// Middlewares específicos para cada rol
const verifyJugador = verifyRole([userTypes.JUGADOR]);
const verifyArbitro = verifyRole([userTypes.ARBITRO]);
const verifyOrganizador = verifyRole([userTypes.ORGANIZADOR]);
const verifyManager = verifyRole([userTypes.MANAGER]);
const verifyAdmin = verifyRole([userTypes.ADMIN]);

// Middleware para roles múltiples
const verifyJugadorOrArbitro = verifyRole([userTypes.JUGADOR, userTypes.ARBITRO]);
const verifyOrganizadorOrAdmin = verifyRole([userTypes.ORGANIZADOR, userTypes.ADMIN]);
const verifyManagerOrAdmin = verifyRole([userTypes.MANAGER, userTypes.ADMIN]);
const verifyAllRoles = verifyRole([userTypes.JUGADOR, userTypes.ARBITRO, userTypes.ORGANIZADOR, userTypes.MANAGER, userTypes.ADMIN, userTypes.USUARIO]);

// Middleware específico para gestión de partidos (User Story 1.1)
const verifyArbitroOrStaff = verifyRole([userTypes.ARBITRO, userTypes.ORGANIZADOR, userTypes.ADMIN]);

// Middleware para verificar que el usuario solo acceda a sus propios datos
const verifyOwnership = (userIdParam = 'id') => {
  return (req, res, next) => {
    const requestedUserId = req.params[userIdParam];
    const currentUserId = req.user.uid;
    
    // Permitir acceso si es el propio usuario o si es admin
    if (requestedUserId === currentUserId || req.user.tipoUsuario === userTypes.ADMIN) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo puedes acceder a tus propios datos' 
    });
  };
};

module.exports = { 
  verifyFirebaseToken,
  verifyRole,
  verifyJugador,
  verifyArbitro,
  verifyOrganizador,
  verifyManager,
  verifyAdmin,
  verifyJugadorOrArbitro,
  verifyOrganizadorOrAdmin,
  verifyManagerOrAdmin,
  verifyAllRoles,
  verifyArbitroOrStaff,
  verifyOwnership
};
