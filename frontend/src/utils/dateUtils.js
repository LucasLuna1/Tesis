// 🚀 SISTEMA DE MANEJO DE FECHAS - FORMATOS ARGENTINOS
// Utilidades para manejo consistente de fechas en toda la aplicación

/**
 * Utilidades para manejo de fechas con formato argentino
 * @namespace DateUtils
 */
export const DateUtils = {
  /**
   * Obtener fecha de hoy en formato YYYY-MM-DD (para almacenamiento)
   * @returns {string} Fecha en formato YYYY-MM-DD
   */
  getToday: () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Obtener fecha de ayer en formato YYYY-MM-DD (para almacenamiento)
   * @returns {string} Fecha en formato YYYY-MM-DD
   */
  getYesterday: () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Obtener fecha de mañana en formato YYYY-MM-DD (para almacenamiento)
   * @returns {string} Fecha en formato YYYY-MM-DD
   */
  getTomorrow: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Convertir fecha a formato de visualización DD/MM/YYYY (Argentina)
   * @param {string|Date|Object} fecha - Fecha en cualquier formato
   * @returns {string} Fecha formateada en DD/MM/YYYY
   */
  formatDateForDisplay: (fecha) => {
    if (!fecha) return 'Fecha no definida';
    
    try {
      let dateObj;
      
      // Manejar Firebase Timestamps
      if (fecha._seconds) {
        dateObj = new Date(fecha._seconds * 1000);
      } 
      // Manejar strings de fecha
      else if (typeof fecha === 'string') {
        // Si ya tiene formato ISO completo, usarlo directamente
        if (fecha.includes('T')) {
          dateObj = new Date(fecha);
        } 
        // Si es formato YYYY-MM-DD, agregar hora local
        else {
          dateObj = new Date(fecha + 'T00:00:00');
        }
      } 
      // Manejar Date objects
      else {
        dateObj = new Date(fecha);
      }
      
      // Verificar si es una fecha válida
      if (isNaN(dateObj.getTime())) {
        return fecha.toString(); // Retornar original si no es válida
      }
      
      // Formatear con locale argentino
      return dateObj.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return fecha.toString();
    }
  },

  /**
   * Convertir fecha a formato de almacenamiento YYYY-MM-DD
   * @param {string|Date|Object} fecha - Fecha en cualquier formato
   * @returns {string} Fecha en formato YYYY-MM-DD
   */
  formatDateForStorage: (fecha) => {
    if (!fecha) return '';
    
    try {
      let dateObj;
      
      if (fecha._seconds) {
        dateObj = new Date(fecha._seconds * 1000);
      } else {
        dateObj = new Date(fecha);
      }
      
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error convirtiendo fecha para almacenamiento:', error);
      return '';
    }
  },

  /**
   * Formatear fecha completa para visualización (con día de la semana)
   * @param {string|Date|Object} fecha - Fecha en cualquier formato
   * @returns {string} Fecha formateada con día de la semana
   */
  formatFullDateForDisplay: (fecha) => {
    if (!fecha) return 'Fecha no definida';
    
    try {
      let dateObj;
      
      if (fecha._seconds) {
        dateObj = new Date(fecha._seconds * 1000);
      } else if (fecha.includes('T')) {
        dateObj = new Date(fecha);
      } else {
        dateObj = new Date(fecha + 'T00:00:00');
      }
      
      if (isNaN(dateObj.getTime())) {
        return DateUtils.formatDateForDisplay(fecha);
      }
      
      return dateObj.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha completa:', error);
      return DateUtils.formatDateForDisplay(fecha);
    }
  },

  /**
   * Formatear montos con formato argentino (#.###,##)
   * @param {number|string} monto - Monto a formatear
   * @returns {string} Monto formateado en formato argentino
   */
  formatAmount: (monto) => {
    if (monto === null || monto === undefined || isNaN(monto)) {
      return '0,00';
    }
    
    return Number(monto).toLocaleString('es-AR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  },

  /**
   * Formatear número con formato argentino (sin decimales)
   * @param {number|string} numero - Número a formatear
   * @returns {string} Número formateado en formato argentino
   */
  formatNumber: (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) {
      return '0';
    }
    
    return Number(numero).toLocaleString('es-AR');
  },

  /**
   * Verificar si una fecha es válida
   * @param {string|Date|Object} fecha - Fecha a verificar
   * @returns {boolean} true si la fecha es válida
   */
  isValidDate: (fecha) => {
    if (!fecha) return false;
    
    try {
      let dateObj;
      
      if (fecha._seconds) {
        dateObj = new Date(fecha._seconds * 1000);
      } else {
        dateObj = new Date(fecha);
      }
      
      return !isNaN(dateObj.getTime());
    } catch (error) {
      return false;
    }
  },

  /**
   * Obtener diferencia en días entre dos fechas
   * @param {string|Date|Object} fecha1 - Primera fecha
   * @param {string|Date|Object} fecha2 - Segunda fecha
   * @returns {number} Diferencia en días (positiva si fecha1 > fecha2)
   */
  getDaysDifference: (fecha1, fecha2) => {
    try {
      let date1, date2;
      
      if (fecha1._seconds) {
        date1 = new Date(fecha1._seconds * 1000);
      } else {
        date1 = new Date(fecha1);
      }
      
      if (fecha2._seconds) {
        date2 = new Date(fecha2._seconds * 1000);
      } else {
        date2 = new Date(fecha2);
      }
      
      const diffTime = date1.getTime() - date2.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculando diferencia de días:', error);
      return 0;
    }
  }
};

export default DateUtils;
