/**
 * Utilidades para manejo de respuestas HTTP estandarizadas
 */

const responseHandler = {
  // Respuesta exitosa
  success: (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de error
  error: (res, message = 'Error interno del servidor', statusCode = 500, details = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      error: details,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de validación
  validationError: (res, errors) => {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de recurso no encontrado
  notFound: (res, resource = 'Recurso') => {
    return res.status(404).json({
      success: false,
      message: `${resource} no encontrado`,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de acceso denegado
  forbidden: (res, message = 'Acceso denegado') => {
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de no autorizado
  unauthorized: (res, message = 'No autorizado') => {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de recurso creado
  created: (res, data, message = 'Recurso creado exitosamente') => {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de recurso actualizado
  updated: (res, data, message = 'Recurso actualizado exitosamente') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de recurso eliminado
  deleted: (res, message = 'Recurso eliminado exitosamente') => {
    return res.status(200).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  },

  // Respuesta de lista paginada
  paginated: (res, data, pagination, message = 'Lista obtenida exitosamente') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
      },
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = responseHandler;
