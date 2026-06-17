const { db } = require('../config/firebase');

/**
 * Crea un usuario en Firestore según su rol
 * @param {Object} data - Datos del usuario
 * @param {string} data.uid - ID único del usuario
 * @param {string} data.nombre - Nombre del usuario
 * @param {string} data.apellido - Apellido del usuario
 * @param {string} data.email - Email del usuario
 * @param {string} data.telefono - Teléfono del usuario
 * @param {string} data.tipoUsuario - Tipo de usuario: "organizador", "arbitro", "jugador"
 * @param {string} data.fechaNacimiento - Fecha de nacimiento en formato YYYY-MM-DD
 * @param {Object} data.rolEspecifico - Campos específicos según el rol
 * @returns {Promise<Object>} - Resultado de la operación
 */
const createUsuario = async (data) => {
  try {
    // Validar que tipoUsuario existe y es válido
    const tiposValidos = ['organizador', 'arbitro', 'jugador', 'usuario'];
    if (!data.tipoUsuario || !tiposValidos.includes(data.tipoUsuario)) {
      throw new Error('tipoUsuario es requerido y debe ser: organizador, arbitro, jugador o usuario');
    }

    // Validar campos comunes requeridos
    const camposRequeridos = ['uid', 'nombre', 'apellido', 'email', 'tipoUsuario'];
    for (const campo of camposRequeridos) {
      if (!data[campo]) {
        throw new Error(`El campo ${campo} es requerido`);
      }
    }

    // Campos comunes para todos los usuarios
    const usuarioComun = {
      uid: data.uid,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono || '',
      tipoUsuario: data.tipoUsuario,
      activo: data.activo !== undefined ? data.activo : true,
      fechaNacimiento: data.fechaNacimiento || '',
      fechaCreacion: new Date(),
      updatedAt: new Date()
    };

    let usuarioCompleto = { ...usuarioComun };

    // Agregar campos específicos según el rol
    switch (data.tipoUsuario) {
      case 'organizador':
        usuarioCompleto = {
          ...usuarioComun,
          cargo: data.rolEspecifico?.cargo || '',
          organizacion: data.rolEspecifico?.organizacion || '',
          torneosCreados: data.rolEspecifico?.torneosCreados || 0,
          partidosGestionados: data.rolEspecifico?.partidosGestionados || 0,
          permisos: {
            generarReportes: data.rolEspecifico?.permisos?.generarReportes || false,
            gestionarArbitros: data.rolEspecifico?.permisos?.gestionarArbitros || false,
            gestionarEquipos: data.rolEspecifico?.permisos?.gestionarEquipos || false,
            gestionarJugadores: data.rolEspecifico?.permisos?.gestionarJugadores || false,
            gestionarPartidos: data.rolEspecifico?.permisos?.gestionarPartidos || false,
            gestionarPatrocinadores: data.rolEspecifico?.permisos?.gestionarPatrocinadores || false,
            gestionarTorneos: data.rolEspecifico?.permisos?.gestionarTorneos || false,
            publicarNoticias: data.rolEspecifico?.permisos?.publicarNoticias || false,
            supervisarPartidos: data.rolEspecifico?.permisos?.supervisarPartidos || false,
            verHistorial: data.rolEspecifico?.permisos?.verHistorial || false
          }
        };
        break;

      case 'arbitro':
        usuarioCompleto = {
          ...usuarioComun,
          categoria: Array.isArray(data.rolEspecifico?.categoria) ? data.rolEspecifico.categoria : [data.rolEspecifico?.categoria].filter(Boolean),
          especialidad: data.rolEspecifico?.especialidad || '',
          experiencia: data.rolEspecifico?.experiencia || 0,
          partidosArbitrados: data.rolEspecifico?.partidosArbitrados || 0,
          estadisticas: {
            penalesSeñalados: data.rolEspecifico?.estadisticas?.penalesSeñalados || 0,
            tarjetasAmarillas: data.rolEspecifico?.estadisticas?.tarjetasAmarillas || 0,
            tarjetasRojas: data.rolEspecifico?.estadisticas?.tarjetasRojas || 0
          }
        };
        break;

      case 'jugador':
        usuarioCompleto = {
          ...usuarioComun,
          equipoId: data.rolEspecifico?.equipoId || null,
          posicion: data.rolEspecifico?.posicion || '',
          edad: data.rolEspecifico?.edad || 0,
          categoria: Array.isArray(data.rolEspecifico?.categoria) ? data.rolEspecifico.categoria : [data.rolEspecifico?.categoria].filter(Boolean),
          numero: data.rolEspecifico?.numero || null,
          altura: data.rolEspecifico?.altura || 0,
          peso: data.rolEspecifico?.peso || 0,
          fotoPerfil: data.rolEspecifico?.fotoPerfil || '',
          estadisticas: {
            tries: data.rolEspecifico?.estadisticas?.tries || 0,
            partidosJugados: data.rolEspecifico?.estadisticas?.partidosJugados || 0,
            tarjetasAmarillas: data.rolEspecifico?.estadisticas?.tarjetasAmarillas || 0,
            tarjetasRojas: data.rolEspecifico?.estadisticas?.tarjetasRojas || 0
          }
        };
        break;

      case 'usuario':
        usuarioCompleto = {
          ...usuarioComun,
          foto: data.rolEspecifico?.foto || ''
        };
        break;
    }

    // Guardar en Firestore
    await db.collection('usuarios').doc(data.uid).set(usuarioCompleto);

    return {
      success: true,
      message: 'Usuario creado correctamente',
      data: {
        uid: data.uid,
        tipoUsuario: data.tipoUsuario,
        nombre: data.nombre,
        apellido: data.apellido
      }
    };

  } catch (error) {
    console.error('Error creando usuario:', error);
    return {
      success: false,
      message: error.message || 'Error interno del servidor',
      error: error.message
    };
  }
};

/**
 * Obtiene un usuario específico por UID
 * @param {string} uid - ID único del usuario
 * @returns {Promise<Object>} - Datos del usuario
 */
const getUsuarioPorId = async (uid) => {
  try {
    if (!uid) {
      throw new Error('UID es requerido');
    }

    const usuarioDoc = await db.collection('usuarios').doc(uid).get();
    
    if (!usuarioDoc.exists) {
      throw new Error('Usuario no encontrado');
    }

    return {
      success: true,
      message: 'Usuario obtenido correctamente',
      data: {
        id: usuarioDoc.id,
        ...usuarioDoc.data()
      }
    };

  } catch (error) {
    console.error('Error obteniendo usuario por ID:', error);
    return {
      success: false,
      message: error.message || 'Error interno del servidor',
      error: error.message
    };
  }
};

module.exports = {
  createUsuario,
  getUsuarioPorId
};
