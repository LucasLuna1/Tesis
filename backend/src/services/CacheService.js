const NodeCache = require('node-cache');

/**
 * Servicio de caché para optimizar consultas a Firestore
 * - Reduce lecturas innecesarias
 * - Mejora tiempos de respuesta
 * - Configurable por tipo de dato
 */
class CacheService {
  constructor() {
    // Configuración común para todos los caches
    const commonConfig = {
      useClones: false, // Mejor rendimiento, pero los objetos no se clonan
      deleteOnExpire: true,
      enableLegacyCallbacks: false
    };

    // 🚀 OPTIMIZACIÓN: Cache general más agresivo para mejor rendimiento
    this.generalCache = new NodeCache({ 
      ...commonConfig,
      stdTTL: 300, // 5 minutos para datos que cambian poco
      checkperiod: 600,
      maxKeys: 1000 // Limitar memoria
    });
    
    // Cache para tablas de posiciones: 2 minutos (balance entre actualización y rendimiento)
    this.tablaPosicionesCache = new NodeCache({ 
      ...commonConfig,
      stdTTL: 120, 
      checkperiod: 240,
      maxKeys: 500
    });
    
    // Cache para fixture: 120 segundos (cambia menos frecuentemente)
    this.fixtureCache = new NodeCache({ 
      ...commonConfig,
      stdTTL: 120, 
      checkperiod: 180 
    });
    
    // Cache para equipos y árbitros: 300 segundos (datos relativamente estáticos)
    this.staticDataCache = new NodeCache({ 
      ...commonConfig,
      stdTTL: 300, 
      checkperiod: 600 
    });
  }

  /**
   * Obtener dato de caché general
   */
  get(key) {
    return this.generalCache.get(key);
  }

  /**
   * Guardar dato en caché general
   */
  set(key, value, ttl = null) {
    if (ttl) {
      return this.generalCache.set(key, value, ttl);
    }
    return this.generalCache.set(key, value);
  }

  /**
   * Eliminar dato de caché general
   */
  del(key) {
    return this.generalCache.del(key);
  }

  /**
   * Obtener tabla de posiciones desde caché
   */
  getTablaPosiciones(torneoId) {
    return this.tablaPosicionesCache.get(`tabla_${torneoId}`);
  }

  /**
   * Guardar tabla de posiciones en caché
   */
  setTablaPosiciones(torneoId, data) {
    return this.tablaPosicionesCache.set(`tabla_${torneoId}`, data);
  }

  /**
   * Invalidar caché de tabla de posiciones de un torneo
   */
  invalidarTablaPosiciones(torneoId) {
    this.tablaPosicionesCache.del(`tabla_${torneoId}`);
  }

  /**
   * Obtener fixture desde caché
   */
  getFixture(torneoId) {
    return this.fixtureCache.get(`fixture_${torneoId}`);
  }

  /**
   * Guardar fixture en caché
   */
  setFixture(torneoId, data) {
    return this.fixtureCache.set(`fixture_${torneoId}`, data);
  }

  /**
   * Invalidar caché de fixture de un torneo
   */
  invalidarFixture(torneoId) {
    this.fixtureCache.del(`fixture_${torneoId}`);
  }

  /**
   * Obtener dato estático (equipos, árbitros, canchas)
   */
  getStaticData(key) {
    return this.staticDataCache.get(key);
  }

  /**
   * Guardar dato estático
   */
  setStaticData(key, value) {
    return this.staticDataCache.set(key, value);
  }

  /**
   * Invalidar dato estático
   */
  invalidarStaticData(key) {
    this.staticDataCache.del(key);
  }

  /**
   * 🚀 OPTIMIZACIÓN: Limpiar entradas expiradas de todos los cachés
   */
  clearExpired() {
    this.generalCache.flushExpired();
    this.tablaPosicionesCache.flushExpired();
    this.fixtureCache.flushExpired();
    this.staticDataCache.flushExpired();
  }

  /**
   * Limpiar todos los cachés
   */
  clearAll() {
    this.generalCache.flushAll();
    this.tablaPosicionesCache.flushAll();
    this.fixtureCache.flushAll();
    this.staticDataCache.flushAll();
  }
}

// Exportar instancia única (Singleton)
module.exports = new CacheService();

