/**
 * Utilidad de caché local optimizada para mejorar rendimiento
 * Usa LocalStorage con expiración automática
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class LocalCache {
  private prefix = 'kani_cache_';

  /**
   * Guarda datos en caché con tiempo de expiración
   * @param key - Clave única para el dato
   * @param data - Datos a guardar
   * @param expiresIn - Tiempo de expiración en milisegundos (default: 5 minutos)
   */
  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn,
      };
      localStorage.setItem(
        `${this.prefix}${key}`,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.warn('Error al guardar en caché:', error);
      // Si falla (ej: storage lleno), limpiar caché antiguo
      this.clearExpired();
    }
  }

  /**
   * Obtiene datos del caché si no han expirado
   * @param key - Clave del dato
   * @returns Datos o null si no existen o expiraron
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${this.prefix}${key}`);
      if (!item) return null;

      const cacheItem: CacheItem<T> = JSON.parse(item);
      const now = Date.now();

      // Verificar si expiró
      if (now - cacheItem.timestamp > cacheItem.expiresIn) {
        this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('Error al leer caché:', error);
      return null;
    }
  }

  /**
   * Elimina un item específico del caché
   * @param key - Clave del dato
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.warn('Error al eliminar del caché:', error);
    }
  }

  /**
   * Limpia todos los datos expirados del caché
   */
  clearExpired(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const cacheItem: CacheItem<any> = JSON.parse(item);
              if (now - cacheItem.timestamp > cacheItem.expiresIn) {
                localStorage.removeItem(key);
              }
            } catch {
              // Si no se puede parsear, eliminar
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Error al limpiar caché expirado:', error);
    }
  }

  /**
   * Limpia todo el caché de la aplicación
   */
  clearAll(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error al limpiar todo el caché:', error);
    }
  }

  /**
   * Obtiene o establece un valor (patrón cache-aside)
   * @param key - Clave del dato
   * @param fetcher - Función para obtener datos si no están en caché
   * @param expiresIn - Tiempo de expiración en milisegundos
   * @returns Promise con los datos
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    expiresIn: number = 5 * 60 * 1000
  ): Promise<T> {
    // Intentar obtener del caché
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Si no está en caché, obtener del servidor
    const data = await fetcher();
    this.set(key, data, expiresIn);
    return data;
  }
}

// Exportar instancia singleton
export const localCache = new LocalCache();

// Limpiar caché expirado al cargar la aplicación
localCache.clearExpired();

export default localCache;

