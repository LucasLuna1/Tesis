/**
 * Utilidades para manejar URLs de imágenes
 */

const API_BASE_URL = 'http://localhost:5000';

/**
 * Construye la URL completa para una imagen
 * @param imageUrl URL de la imagen (puede ser relativa o absoluta)
 * @returns URL completa de la imagen
 */
export const construirUrlImagen = (imageUrl: string | undefined | null): string => {
  if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'undefined' || imageUrl === 'null') {
    return '';
  }

  const url = imageUrl.trim();

  // Si ya es una URL completa (http/https o Firebase Storage), devolverla tal cual
  if (url.startsWith('http://') || 
      url.startsWith('https://') || 
      url.startsWith('data:')) {
    return url;
  }
  
  // Si es una URL de Firebase Storage, devolverla tal cual
  // Nota: En localhost puede dar error CORS, pero funciona en producción
  if (url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com')) {
    return url;
  }

  // Si es una ruta relativa del backend local, construir URL completa
  if (url.startsWith('/uploads/')) {
    return `${API_BASE_URL}${url}`;
  }

  // Si no tiene el prefijo /uploads/, agregarlo
  if (url.includes('uploads/')) {
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL}${cleanUrl}`;
  }

  // Cualquier otra ruta relativa
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Verifica si una URL de imagen es válida
 * @param imageUrl URL a verificar
 * @returns true si la URL es válida
 */
export const esUrlImagenValida = (imageUrl: string | undefined | null): boolean => {
  if (!imageUrl) {
    return false;
  }

  return imageUrl.length > 0 && 
         (imageUrl.startsWith('http') || 
          imageUrl.startsWith('/uploads/') || 
          imageUrl.includes('firebasestorage.googleapis.com') ||
          imageUrl.startsWith('data:'));
};


