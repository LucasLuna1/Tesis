import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en milisegundos
}

interface CacheContextType {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T, ttl?: number) => void;
  invalidate: (key: string) => void;
  clear: () => void;
  getStats: () => { size: number; keys: string[] };
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

const DEFAULT_TTL = 60 * 1000; // 1 minuto por defecto

export const CacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());

  /**
   * Obtener dato del caché
   * Retorna null si no existe o si expiró
   */
  const get = useCallback(<T,>(key: string): T | null => {
    const entry = cacheRef.current.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      // Eliminar entrada expirada
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data as T;
  }, []);

  /**
   * Guardar dato en caché
   */
  const set = useCallback(<T,>(key: string, data: T, ttl: number = DEFAULT_TTL) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, []);

  /**
   * Invalidar (eliminar) una entrada del caché
   */
  const invalidate = useCallback((key: string) => {
    cacheRef.current.delete(key);
  }, []);

  /**
   * Limpiar todo el caché
   */
  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  /**
   * Obtener estadísticas del caché
   */
  const getStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      keys: Array.from(cacheRef.current.keys())
    };
  }, []);

  const value: CacheContextType = {
    get,
    set,
    invalidate,
    clear,
    getStats
  };

  return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>;
};

/**
 * Hook para usar el caché en componentes
 */
export const useCache = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache debe ser usado dentro de CacheProvider');
  }
  return context;
};

export default CacheContext;

