/**
 * Utilidades y funciones auxiliares para el frontend
 */

import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { PartidoEstado } from '@/types';

// Formateo de fechas
export const formatDate = (date: Date | string | null | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!date) return '-';
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) return '-';
    
    return format(parsedDate, formatStr, { locale: es });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return '-';
  }
};

// Formateo de tiempo
export const formatTime = (time: string | null | undefined): string => {
  if (!time) return '-';
  
  try {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  } catch (error) {
    return time;
  }
};

// Formateo de duración en minutos
export const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  
  return `${mins} min`;
};

// Capitalizar primera letra
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Capitalizar cada palabra
export const capitalizeWords = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.split(' ').map(word => capitalize(word)).join(' ');
};

// Truncar texto
export const truncateText = (text: string | null | undefined, maxLength: number = 100): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Generar iniciales
export const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// Formatear número de teléfono
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Remover caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Formatear según longitud
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

// Validar email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validar teléfono
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Generar ID único simple
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }) as T;
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(func: T, limit: number): T => {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

// Copiar al portapapeles
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback para navegadores más antiguos
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

// Descargar archivo
export const downloadFile = (data: string | Blob, filename: string, type: string = 'text/plain'): void => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Convertir bytes a formato legible
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Obtener diferencia de tiempo relativa
export const getRelativeTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const now = new Date();
    const past = typeof date === 'string' ? parseISO(date) : date;
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'hace un momento';
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return format(past, 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    return formatDate(date);
  }
};

// Validar URL
export const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Obtener color basado en estado
export const getStateColor = (state: PartidoEstado): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'default' => {
  const colors = {
    programado: 'primary' as const,
    'En Curso': 'warning' as const,
    finalizado: 'success' as const,
    suspendido: 'error' as const,
    cancelado: 'default' as const
  };
  
  return colors[state] || 'default';
};

// Obtener texto de estado
export const getStateText = (state: PartidoEstado): string => {
  const texts = {
    programado: 'Programado',
    'En Curso': 'En Curso',
    finalizado: 'Finalizado',
    suspendido: 'Suspendido',
    cancelado: 'Cancelado'
  };
  
  return texts[state] || state;
};
