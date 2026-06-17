const { db, admin } = require('../config/firebase');
const cacheService = require('./CacheService');

class TorneoService {
  /**
   * Crear un nuevo torneo
   * @param {Object} torneoData - Datos del torneo
   * @param {string} userId - ID del usuario organizador
   * @returns {Promise<Object>} - Torneo creado
   */
  static async createTournament(torneoData, userId) {
    try {
      // Validar que el usuario existe y es organizador
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error('Usuario no encontrado');
      }

      const userData = userDoc.data();
      if (userData.tipoUsuario !== 'organizador') {
        throw new Error('Usuario no autorizado. Solo los organizadores pueden crear torneos');
      }

      // Validar campos requeridos
      const { nombre, categoria, fechaInicio, fechaFin } = torneoData;
      if (!nombre || !categoria) {
        throw new Error('Faltan campos requeridos: nombre, categoria');
      }

      // Validar fechas solo si se proporcionan
      let inicio = null;
      let fin = null;
      
      if (fechaInicio && fechaFin) {
        inicio = new Date(fechaInicio);
        fin = new Date(fechaFin);
        const ahora = new Date();

        if (inicio < ahora) {
          throw new Error('La fecha de inicio no puede ser anterior a la fecha actual');
        }

        if (fin <= inicio) {
          throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
        }
      }

      // Crear documento del torneo
      const torneoRef = db.collection('torneos').doc();
      const torneoId = torneoRef.id;

      const nuevoTorneo = {
        nombre: nombre.trim(),
        categoria: categoria.trim(),
        fechaInicio: inicio,
        fechaFin: fin,
        estado: 'pendiente',
        organizadorId: userId,
        equipos: torneoData.equipos || [], // Incluir equipos del formulario
        formato: torneoData.formato || 'liga', // Incluir formato
        idaYvuelta: torneoData.idaYvuelta || false, // Incluir configuración ida y vuelta
        // Campos específicos para eliminación directa
        estructuraEliminacion: torneoData.formato === 'eliminacion_directa' ? {
          fases: [],
          llaves: [],
          faseActual: 0,
          equiposPorLlave: this.calcularEquiposPorLlave(torneoData.equipos?.length || 0)
        } : null,
        // Formato personalizado: sin estructura predefinida
        esPersonalizado: torneoData.formato === 'personalizado',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await torneoRef.set(nuevoTorneo);

      // Si es formato grupos-playoff, crear estructura de grupos
      if (torneoData.formato === 'grupos-playoff' && torneoData.equipos && torneoData.equipos.length > 0) {
        await this.crearEstructuraGrupos(torneoId, torneoData.equipos);
      }

      // Para formato personalizado, NO se genera ninguna estructura automática
      // Los partidos se crearán manualmente

      // Actualizar contador de torneos del organizador
      await db.collection('organizadores').doc(userId).update({
        torneosCreados: admin.firestore.FieldValue.increment(1),
        updatedAt: new Date()
      });

      return {
        id: torneoId,
        ...nuevoTorneo
      };

    } catch (error) {
      console.error('Error creando torneo:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los torneos
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>} - Lista de torneos
   */
  static async getTournaments(filtros = {}) {
    try {
      let query = db.collection('torneos');

      // Aplicar filtros básicos (sin orderBy para evitar problemas de índice)
      if (filtros.estado) {
        query = query.where('estado', '==', filtros.estado);
      }

      if (filtros.organizadorId) {
        query = query.where('organizadorId', '==', filtros.organizadorId);
      }

      const snapshot = await query.get();
      const torneos = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Aplicar filtro de categoría en memoria si está presente
        if (filtros.categoria && data.categoria !== filtros.categoria) {
          return; // Saltar este torneo
        }
        
        torneos.push({
          id: doc.id,
          ...data,
          // Convertir timestamps a fechas legibles
          fechaInicioFormatted: data.fechaInicio?.toDate?.()?.toLocaleDateString('es-ES') || 'N/A',
          fechaFinFormatted: data.fechaFin?.toDate?.()?.toLocaleDateString('es-ES') || 'N/A',
          createdAtFormatted: data.createdAt?.toDate?.()?.toLocaleDateString('es-ES') || 'N/A'
        });
      });
      
      // Ordenar por fecha de creación en memoria
      torneos.sort((a, b) => {
        const fechaA = a.createdAt?.toDate?.() || new Date(0);
        const fechaB = b.createdAt?.toDate?.() || new Date(0);
        return fechaB - fechaA; // Más recientes primero
      });

      return torneos;

    } catch (error) {
      console.error('Error obteniendo torneos:', error);
      throw error;
    }
  }

  /**
   * Obtener un torneo por ID
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<Object>} - Datos del torneo
   */
  static async getTournamentById(torneoId) {
    try {
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const data = torneoDoc.data();
      return {
        id: torneoId,
        ...data,
        fechaInicioFormatted: data.fechaInicio ? 
          (data.fechaInicio.toDate ? data.fechaInicio.toDate().toLocaleDateString('es-ES') : new Date(data.fechaInicio).toLocaleDateString('es-ES')) 
          : 'Por definir',
        fechaFinFormatted: data.fechaFin ? 
          (data.fechaFin.toDate ? data.fechaFin.toDate().toLocaleDateString('es-ES') : new Date(data.fechaFin).toLocaleDateString('es-ES')) 
          : 'Por definir',
        createdAtFormatted: data.createdAt ? 
          (data.createdAt.toDate ? data.createdAt.toDate().toLocaleDateString('es-ES') : new Date(data.createdAt).toLocaleDateString('es-ES'))
          : 'Fecha no disponible'
      };

    } catch (error) {
      console.error('Error obteniendo torneo:', error);
      throw error;
    }
  }

  /**
   * Actualizar un torneo
   * @param {string} torneoId - ID del torneo
   * @param {Object} updateData - Datos a actualizar
   * @param {string} userId - ID del usuario que actualiza
   * @returns {Promise<Object>} - Torneo actualizado
   */
  static async updateTournament(torneoId, updateData, userId) {
    try {
      // Verificar que el torneo existe
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();

      // Verificar permisos (solo el organizador puede actualizar)
      if (torneoData.organizadorId !== userId) {
        throw new Error('No tienes permisos para actualizar este torneo');
      }

      // Validar que no se pueda cambiar el estado a finalizado si hay partidos pendientes
      if (updateData.estado === 'finalizado') {
        const partidosSnapshot = await db.collection('partidos')
          .where('torneoId', '==', torneoId)
          .where('estado', 'in', ['programado', 'en_curso'])
          .get();

        if (!partidosSnapshot.empty) {
          throw new Error('No se puede finalizar un torneo con partidos pendientes');
        }
      }

      // Actualizar el torneo
      const updateFields = {
        ...updateData,
        updatedAt: new Date()
      };

      await db.collection('torneos').doc(torneoId).update(updateFields);

      // Obtener el torneo actualizado
      return await this.getTournamentById(torneoId);

    } catch (error) {
      console.error('Error actualizando torneo:', error);
      throw error;
    }
  }

  /**
   * Eliminar un torneo
   * @param {string} torneoId - ID del torneo
   * @param {string} userId - ID del usuario que elimina
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  static async deleteTournament(torneoId, userId) {
    try {
      // Verificar que el torneo existe
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();

      // Verificar permisos
      if (torneoData.organizadorId !== userId) {
        throw new Error('No tienes permisos para eliminar este torneo');
      }

      // Verificar que no tenga partidos asociados
      const partidosSnapshot = await db.collection('partidos')
        .where('torneoId', '==', torneoId)
        .get();

      if (!partidosSnapshot.empty) {
        throw new Error('No se puede eliminar un torneo que tiene partidos asociados');
      }

      // Eliminar el torneo
      await db.collection('torneos').doc(torneoId).delete();

      // Actualizar contador del organizador
      await db.collection('organizadores').doc(userId).update({
        torneosCreados: admin.firestore.FieldValue.increment(-1),
        updatedAt: new Date()
      });

      return {
        message: 'Torneo eliminado correctamente',
        torneoId
      };

    } catch (error) {
      console.error('Error eliminando torneo:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de un torneo
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<Object>} - Estadísticas del torneo
   */
  static async getTournamentStats(torneoId) {
    try {
      const torneo = await this.getTournamentById(torneoId);
      
      // Contar equipos inscritos
      const equiposSnapshot = await db.collection('equipos')
        .where('torneoId', '==', torneoId)
        .get();

      // Contar partidos por estado
      const partidosSnapshot = await db.collection('partidos')
        .where('torneoId', '==', torneoId)
        .get();

      const partidosPorEstado = {
        programado: 0,
        en_curso: 0,
        finalizado: 0,
        cancelado: 0
      };

      partidosSnapshot.forEach(doc => {
        const estado = doc.data().estado;
        if (partidosPorEstado.hasOwnProperty(estado)) {
          partidosPorEstado[estado]++;
        }
      });

      return {
        torneo,
        estadisticas: {
          equiposInscritos: equiposSnapshot.size,
          totalPartidos: partidosSnapshot.size,
          partidosPorEstado,
          progreso: partidosSnapshot.size > 0 
            ? Math.round((partidosPorEstado.finalizado / partidosSnapshot.size) * 100)
            : 0
        }
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas del torneo:', error);
      throw error;
    }
  }

  /**
   * Agregar equipos a un torneo
   * @param {string} torneoId - ID del torneo
   * @param {Array<string|Object>} equiposData - IDs de los equipos o objetos con equipoId y bloques
   * @param {string} userId - ID del usuario organizador
   * @returns {Promise<Object>} - Resultado de la operación
   */
  static async addTeamsToTournament(torneoId, equiposData, userId) {
    try {
      // Verificar que el torneo existe y el usuario tiene permisos
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();
      if (torneoData.organizadorId !== userId) {
        throw new Error('No tienes permisos para modificar este torneo');
      }

      // Normalizar datos de entrada (puede ser array de strings o array de objetos)
      const equiposInfo = Array.isArray(equiposData) ? equiposData.map(item => {
        if (typeof item === 'string') {
          return { equipoId: item, bloques: {} };
        }
        return { equipoId: item.equipoId, bloques: item.bloques || {} };
      }) : [];

      // Verificar que los equipos existen y tienen la categoría correcta
      const equiposValidos = [];
      const equiposInvalidos = [];

      for (const equipoInfo of equiposInfo) {
        const { equipoId, bloques } = equipoInfo;
        const equipoDoc = await db.collection('equipos').doc(equipoId).get();
        if (!equipoDoc.exists) {
          equiposInvalidos.push({ equipoId, motivo: 'Equipo no encontrado' });
          continue;
        }

        const equipoData = equipoDoc.data();
        
        // Verificar que el equipo tiene la categoría del torneo
        if (!equipoData.categorias || !equipoData.categorias.includes(torneoData.categoria)) {
          equiposInvalidos.push({ 
            equipoId, 
            motivo: `El equipo no tiene la categoría ${torneoData.categoria}` 
          });
          continue;
        }

        equiposValidos.push({
          id: equipoId,
          nombre: equipoData.nombre,
          logo: equipoData.logo,
          bloques: bloques // Guardar configuración de bloques
        });
      }

      // Agregar equipos válidos al torneo
      const equiposActuales = torneoData.equipos || [];
      const nuevosEquipos = equiposValidos.filter(equipo => 
        !equiposActuales.some(e => e.id === equipo.id)
      );

      if (nuevosEquipos.length === 0) {
        return {
          message: 'No se agregaron equipos nuevos',
          equiposAgregados: 0,
          equiposInvalidos: equiposInvalidos.length,
          equiposInvalidos
        };
      }

      const equiposActualizados = [...equiposActuales, ...nuevosEquipos];
      
      await db.collection('torneos').doc(torneoId).update({
        equipos: equiposActualizados,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        message: 'Equipos agregados correctamente',
        equiposAgregados: nuevosEquipos.length,
        equiposInvalidos: equiposInvalidos.length,
        equiposInvalidos,
        equiposTotales: equiposActualizados.length
      };

    } catch (error) {
      console.error('Error agregando equipos al torneo:', error);
      throw error;
    }
  }

  /**
   * Obtener equipos de un torneo
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<Array>} - Lista de equipos del torneo
   */
  static async getTournamentTeams(torneoId) {
    try {
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();

      // Los equipos ya están almacenados completos en el torneo
      return torneoData.equipos || [];

    } catch (error) {
      console.error('Error obteniendo equipos del torneo:', error);
      throw error;
    }
  }

  /**
   * Remover equipos de un torneo
   * @param {string} torneoId - ID del torneo
   * @param {Array<string>} equipoIds - IDs de los equipos a remover
   * @param {string} userId - ID del usuario organizador
   * @returns {Promise<Object>} - Resultado de la operación
   */
  static async removeTeamsFromTournament(torneoId, equipoIds, userId) {
    try {
      // Verificar que el torneo existe y el usuario tiene permisos
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();
      if (torneoData.organizadorId !== userId) {
        throw new Error('No tienes permisos para modificar este torneo');
      }

      const equiposActuales = torneoData.equipos || [];
      const equiposRestantes = equiposActuales.filter(equipo => 
        !equipoIds.includes(equipo.id)
      );

      const equiposRemovidos = equiposActuales.length - equiposRestantes.length;

      if (equiposRemovidos === 0) {
        return {
          message: 'No se encontraron equipos para remover',
          equiposRemovidos: 0
        };
      }

      await db.collection('torneos').doc(torneoId).update({
        equipos: equiposRestantes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        message: 'Equipos removidos correctamente',
        equiposRemovidos,
        equiposRestantes: equiposRestantes.length
      };

    } catch (error) {
      console.error('Error removiendo equipos del torneo:', error);
      throw error;
    }
  }

  /**
   * Comenzar un torneo y crear tabla de posiciones
   * @param {string} torneoId - ID del torneo
   * @param {string} userId - ID del usuario organizador
   * @returns {Promise<Object>} - Resultado de la operación
   */
  static async startTournament(torneoId, userId) {
    try {
      // Verificar que el usuario es organizador
      const userDoc = await db.collection('usuarios').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error('Usuario no encontrado');
      }
      
      const userData = userDoc.data();
      if (userData.tipoUsuario !== 'organizador') {
        throw new Error('Solo los organizadores pueden comenzar torneos');
      }

      // Verificar que el torneo existe y el usuario tiene permisos
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();
      if (torneoData.organizadorId !== userId) {
        throw new Error('No tienes permisos para modificar este torneo');
      }

      // Verificar que el torneo no esté ya iniciado
      if (torneoData.estado !== 'pendiente') {
        throw new Error('El torneo ya ha sido iniciado o finalizado');
      }

      // Verificar que hay equipos inscritos
      const equipos = torneoData.equipos || [];
      if (equipos.length < 2) {
        throw new Error('Se necesitan al menos 2 equipos para comenzar el torneo');
      }

      // Para formato personalizado, permitir iniciar sin validaciones adicionales
      const esFormatoPersonalizado = torneoData.formato === 'personalizado';

      // Crear tabla de posiciones inicial (para formatos que la requieren)
      let tablaPosiciones = null;
      if (!esFormatoPersonalizado) {
        tablaPosiciones = equipos.map(equipo => ({
          equipoId: equipo.id,
          nombre: equipo.nombre,
          logo: equipo.logo,
          partidosJugados: 0,
          partidosGanados: 0,
          partidosEmpatados: 0,
          partidosPerdidos: 0,
          puntosAFavor: 0,
          puntosEnContra: 0,
          diferenciaPuntos: 0,
          puntosTabla: 0, // 4 por ganar, 2 por empatar, 0 por perder
          bonusOfensivo: 0, // 1 punto por anotar 4 o más tries
          bonusDefensivo: 0, // 1 punto por perder por 7 puntos o menos
          puntosBonus: 0
        }));
      }

      // Actualizar el torneo
      const updateData = {
        estado: 'en_curso',
        fechaInicioReal: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Solo agregar tabla de posiciones si no es formato personalizado
      if (tablaPosiciones) {
        updateData.tablaPosiciones = tablaPosiciones;
      }

      await db.collection('torneos').doc(torneoId).update(updateData);

      return {
        message: 'Torneo iniciado correctamente',
        equiposParticipantes: equipos.length,
        tablaPosiciones: tablaPosiciones
      };

    } catch (error) {
      console.error('Error iniciando torneo:', error);
      throw error;
    }
  }

  /**
   * Obtener fixture de un torneo
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<Object>} - Fixture del torneo
   */
  static async getTournamentFixture(torneoId) {
    try {

      // 🚀 OPTIMIZACIÓN: Verificar caché primero
      const cachedFixture = cacheService.getFixture(torneoId);
      if (cachedFixture) {

        return cachedFixture;
      }
      
      // Verificar que el torneo existe
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {
        console.error(`❌ Torneo ${torneoId} no encontrado`);
        throw new Error('Torneo no encontrado');
      }
      
      const torneoData = torneoDoc.data();

      // 🚀 OPTIMIZACIÓN: Consulta sin orderBy para evitar necesidad de índice compuesto
      // Ordenaremos los resultados en memoria después

      const partidosSnapshot = await db.collection('partidos')
        .where('torneoId', '==', torneoId)
        .get();

      const partidos = [];
      partidosSnapshot.forEach(doc => {
        const partidoData = doc.data();

        partidos.push({
          id: doc.id,
          ...partidoData
        });
      });
      
      // 🚀 OPTIMIZACIÓN: Ordenar en memoria después de obtener los datos
      partidos.sort((a, b) => (a.jornada || 0) - (b.jornada || 0));

      // Si no hay partidos, retornar fixture vacío
      if (partidos.length === 0) {

        return {
          torneoId: torneoId,
          torneoNombre: torneoData.nombre,
          fixture: [],
          totalJornadas: 0,
          totalPartidos: 0
        };
      }
      
      // Agrupar partidos por jornada
      const jornadasMap = new Map();
      
      partidos.forEach(partido => {
        const jornadaNum = partido.jornada || 1;
        
        if (!jornadasMap.has(jornadaNum)) {
          jornadasMap.set(jornadaNum, []);
        }
        
        jornadasMap.get(jornadaNum).push({
          id: partido.id,
          jornada: partido.jornada || 1,
          fase: partido.fase || 'Regular',
          fecha: partido.fecha ? (
            partido.fecha.toDate ? 
              partido.fecha.toDate().toISOString().split('T')[0] : 
              partido.fecha
          ) : null,
          hora: partido.horaInicio,
          equipoLocal: partido.equipoLocal,
          equipoLocalLogo: partido.equipoLocalLogo || '',
          equipoVisitante: partido.equipoVisitante,
          equipoVisitanteLogo: partido.equipoVisitanteLogo || '',
          canchaId: partido.canchaId,
          arbitroId: partido.arbitroId,
          estado: partido.estado,
          puntosLocal: partido.resultado?.puntosLocal || 0,
          puntosVisitante: partido.resultado?.puntosVisitante || 0,
          resultado: partido.resultado
        });
      });
      
      // Convertir Map a Array ordenado por jornada
      const fixtureArray = Array.from(jornadasMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([jornadaNum, partidosJornada]) => ({
          jornada: jornadaNum,
          partidos: partidosJornada
        }));

      const fixtureResult = {
        torneoId: torneoId,
        torneoNombre: torneoData.nombre,
        fixture: fixtureArray,
        totalJornadas: fixtureArray.length,
        totalPartidos: partidos.length
      };
      
      // 🚀 OPTIMIZACIÓN: Guardar en caché por 2 minutos
      cacheService.setFixture(torneoId, fixtureResult);

      return fixtureResult;
    } catch (error) {
      console.error(`❌ Error obteniendo fixture del torneo ${torneoId}:`, error);
      console.error(`❌ Error stack:`, error.stack);
      throw new Error(`Error obteniendo fixture: ${error.message}`);
    }
  }

  /**
   * Obtener tabla de posiciones de un torneo
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<Array>} - Tabla de posiciones ordenada
   */
  static async getTournamentTable(torneoId) {
    try {
      // 🚀 OPTIMIZACIÓN: Verificar caché primero
      const cachedTabla = cacheService.getTablaPosiciones(torneoId);
      if (cachedTabla) {

        return cachedTabla;
      }
      
      // Leer tabla de posiciones del documento del torneo
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();
      let tablaPosiciones = torneoData.tablaPosiciones || [];
      

      // Si está vacía, inicializar con todos los equipos del torneo
      if (tablaPosiciones.length === 0) {
        const equiposTorneo = torneoData.equipos || [];
        tablaPosiciones = equiposTorneo.map(equipo => ({
          equipoId: equipo.id,
          nombreEquipo: equipo.nombre,
          partidosJugados: 0,
          ganados: 0,
          empatados: 0,
          perdidos: 0,
          puntosAFavor: 0,
          puntosEnContra: 0,
          diferencia: 0,
          bonusOfensivo: 0,
          bonusDefensivo: 0,
          puntosTotales: 0
        }));

      }

      // Ordenar por puntos (descendente) y diferencia de puntos (descendente)
      const tablaOrdenada = tablaPosiciones.sort((a, b) => {
        // Primero por puntos totales
        const puntosA = a.puntosTotales || 0;
        const puntosB = b.puntosTotales || 0;
        
        if (puntosB !== puntosA) {
          return puntosB - puntosA;
        }
        // Luego por diferencia de puntos
        const diffA = a.diferencia || a.diferenciaPuntos || 0;
        const diffB = b.diferencia || b.diferenciaPuntos || 0;
        
        if (diffB !== diffA) {
          return diffB - diffA;
        }
        // Finalmente por puntos a favor
        const puntosFavorA = a.puntosAFavor || a.puntosFavor || 0;
        const puntosFavorB = b.puntosAFavor || b.puntosFavor || 0;
        return puntosFavorB - puntosFavorA;
      });

      // Agregar posición
      const tablaFinal = tablaOrdenada.map((equipo, index) => ({
        ...equipo,
        posicion: index + 1
      }));
      
      // 🚀 OPTIMIZACIÓN: Guardar en caché por 30 segundos
      cacheService.setTablaPosiciones(torneoId, tablaFinal);

      return tablaFinal;

    } catch (error) {
      console.error('Error obteniendo tabla de posiciones:', error);
      throw error;
    }
  }
  
  /**
   * 🚀 OPTIMIZACIÓN: Actualizar estadísticas precalculadas de un equipo
   * Se llama cuando se finaliza un partido
   * @param {string} torneoId - ID del torneo
   * @param {string} equipoId - ID del equipo
   * @param {Object} estadisticas - Estadísticas del partido
   */
  static async actualizarEstadisticasEquipo(torneoId, equipoId, estadisticas) {
    try {
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();
      const tablaPosiciones = torneoData.tablaPosiciones || [];
      
      // Buscar equipo en la tabla
      const equipoIndex = tablaPosiciones.findIndex(e => e.equipoId === equipoId);
      
      if (equipoIndex === -1) {

        return;
      }
      
      // Actualizar estadísticas del equipo
      tablaPosiciones[equipoIndex] = {
        ...tablaPosiciones[equipoIndex],
        partidosJugados: (tablaPosiciones[equipoIndex].partidosJugados || 0) + 1,
        partidosGanados: (tablaPosiciones[equipoIndex].partidosGanados || 0) + (estadisticas.gano ? 1 : 0),
        partidosEmpatados: (tablaPosiciones[equipoIndex].partidosEmpatados || 0) + (estadisticas.empate ? 1 : 0),
        partidosPerdidos: (tablaPosiciones[equipoIndex].partidosPerdidos || 0) + (estadisticas.perdio ? 1 : 0),
        puntosAFavor: (tablaPosiciones[equipoIndex].puntosAFavor || 0) + (estadisticas.puntosAFavor || 0),
        puntosEnContra: (tablaPosiciones[equipoIndex].puntosEnContra || 0) + (estadisticas.puntosEnContra || 0),
        diferenciaPuntos: ((tablaPosiciones[equipoIndex].puntosAFavor || 0) + (estadisticas.puntosAFavor || 0)) - 
                          ((tablaPosiciones[equipoIndex].puntosEnContra || 0) + (estadisticas.puntosEnContra || 0)),
        puntosTabla: (tablaPosiciones[equipoIndex].puntosTabla || 0) + (estadisticas.puntosTabla || 0),
        bonusOfensivo: (tablaPosiciones[equipoIndex].bonusOfensivo || 0) + (estadisticas.bonusOfensivo || 0),
        bonusDefensivo: (tablaPosiciones[equipoIndex].bonusDefensivo || 0) + (estadisticas.bonusDefensivo || 0)
      };
      
      // 🚀 OPTIMIZACIÓN: Usar update() en lugar de set() completo
      await db.collection('torneos').doc(torneoId).update({
        tablaPosiciones: tablaPosiciones,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Invalidar caché de tabla de posiciones
      cacheService.invalidarTablaPosiciones(torneoId);

    } catch (error) {
      console.error('Error actualizando estadísticas del equipo:', error);
      throw error;
    }
  }

  /**
   * Crear estructura de grupos para formato grupos-playoff
   * @param {string} torneoId - ID del torneo
   * @param {Array} equipos - Lista de equipos
   */
  static async crearEstructuraGrupos(torneoId, equipos) {
    try {
      // Calcular número óptimo de grupos (4 equipos por grupo idealmente)
      const equiposPorGrupo = 4;
      const numGrupos = Math.ceil(equipos.length / equiposPorGrupo);
      
      // Dividir equipos en grupos de manera equilibrada
      const grupos = [];
      for (let i = 0; i < numGrupos; i++) {
        grupos.push([]);
      }
      
      // Distribuir equipos en grupos (round-robin)
      equipos.forEach((equipo, index) => {
        const grupoIndex = index % numGrupos;
        grupos[grupoIndex].push(equipo);
      });
      
      // Crear documentos de grupos en Firestore
      const gruposData = grupos.map((equiposGrupo, index) => ({
        torneoId: torneoId,
        nombreGrupo: `Grupo ${String.fromCharCode(65 + index)}`, // A, B, C, D...
        equipos: equiposGrupo,
        equiposIds: equiposGrupo.map(e => e.id),
        estado: 'pendiente',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // Guardar grupos en la colección 'grupos'
      const batch = db.batch();
      gruposData.forEach(grupoData => {
        const grupoRef = db.collection('grupos').doc();
        batch.set(grupoRef, grupoData);
      });
      
      await batch.commit();
      
      // Crear tabla de posiciones inicial para cada grupo
      await this.crearTablaPosicionesGrupos(torneoId, gruposData);
      

    } catch (error) {
      console.error('Error creando estructura de grupos:', error);
      throw error;
    }
  }

  /**
   * Crear tabla de posiciones inicial para cada grupo
   * @param {string} torneoId - ID del torneo
   * @param {Array} gruposData - Datos de los grupos
   */
  static async crearTablaPosicionesGrupos(torneoId, gruposData) {
    try {
      const batch = db.batch();
      
      gruposData.forEach(grupo => {
        // Crear tabla de posiciones para cada grupo
        const tablaGrupo = grupo.equipos.map(equipo => ({
          torneoId: torneoId,
          grupoId: grupo.nombreGrupo,
          equipoId: equipo.id,
          nombreEquipo: equipo.nombre,
          partidosJugados: 0,
          ganados: 0,
          empatados: 0,
          perdidos: 0,
          puntosAFavor: 0,
          puntosEnContra: 0,
          diferencia: 0,
          triesAFavor: 0,
          triesEnContra: 0,
          bonusOfensivo: 0,
          bonusDefensivo: 0,
          puntosTotales: 0,
          rankingFairPlay: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        // Guardar tabla de posiciones del grupo
        const tablaRef = db.collection('tablaPosicionesGrupos').doc();
        batch.set(tablaRef, {
          torneoId: torneoId,
          grupoId: grupo.nombreGrupo,
          tabla: tablaGrupo,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      
    } catch (error) {
      console.error('Error creando tablas de posiciones de grupos:', error);
      throw error;
    }
  }

  /**
   * Obtener grupos de un torneo
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<Array>} - Lista de grupos
   */
  static async getGruposByTorneo(torneoId) {
    try {
      const snapshot = await db.collection('grupos')
        .where('torneoId', '==', torneoId)
        .get();
      
      const grupos = [];
      snapshot.forEach(doc => {
        grupos.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Ordenar en memoria por nombreGrupo
      grupos.sort((a, b) => a.nombreGrupo.localeCompare(b.nombreGrupo));
      
      return grupos;
    } catch (error) {
      console.error('Error obteniendo grupos del torneo:', error);
      return [];
    }
  }

  /**
   * Obtener tabla de posiciones de un grupo específico
   * @param {string} grupoId - ID del grupo
   * @returns {Promise<Object>} - Tabla de posiciones del grupo
   */
  static async getTablaPosicionesGrupo(grupoId) {
    try {
      const snapshot = await db.collection('tablaPosicionesGrupos')
        .where('grupoId', '==', grupoId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error obteniendo tabla de posiciones del grupo:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las tablas de posiciones de los grupos de un torneo
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<Array>} - Lista de tablas de posiciones de grupos
   */
  static async getTablasPosicionesGrupos(torneoId) {
    try {
      const snapshot = await db.collection('tablaPosicionesGrupos')
        .where('torneoId', '==', torneoId)
        .get();
      
      const tablasPosiciones = [];
      snapshot.forEach(doc => {
        tablasPosiciones.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Ordenar en memoria por grupoId
      tablasPosiciones.sort((a, b) => a.grupoId.localeCompare(b.grupoId));
      
      return tablasPosiciones;
    } catch (error) {
      console.error('Error obteniendo tablas de posiciones de grupos:', error);
      return [];
    }
  }

  /**
   * Calcular el número óptimo de equipos por llave para eliminación directa
   * @param {number} totalEquipos - Total de equipos
   * @returns {number} - Número de equipos por llave (8, 16, 32, etc.)
   */
  static calcularEquiposPorLlave(totalEquipos) {
    if (totalEquipos <= 0) return 0;
    
    // Encontrar la potencia de 2 más cercana mayor o igual al número de equipos
    let equiposPorLlave = 2;
    while (equiposPorLlave < totalEquipos) {
      equiposPorLlave *= 2;
    }
    
    return equiposPorLlave;
  }

  /**
   * Generar fixture para torneo de eliminación directa
   * @param {string} torneoId - ID del torneo
   * @param {string} userId - ID del usuario organizador
   * @returns {Promise<Object>} - Resultado de la generación del fixture
   */
  static async generarFixtureEliminacionDirecta(torneoId, userId, canchas = [], arbitros = []) {
    try {
      // Verificar que el torneo existe y el usuario tiene permisos
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();
      if (torneoData.organizadorId !== userId) {
        throw new Error('No tienes permisos para modificar este torneo');
      }

      if (torneoData.formato !== 'eliminacion_directa') {
        throw new Error('Este método solo es válido para torneos de eliminación directa');
      }

      const equipos = torneoData.equipos || [];
      if (equipos.length < 2) {
        throw new Error('Se necesitan al menos 2 equipos para generar el fixture');
      }

      // Calcular estructura de eliminación directa
      const equiposPorLlave = this.calcularEquiposPorLlave(equipos.length);
      const estructuraEliminacion = this.generarEstructuraEliminacion(equipos, equiposPorLlave);

      // Crear partidos de la primera fase
      const partidosIds = await this.crearPartidosEliminacionDirecta(torneoId, estructuraEliminacion.fases[0], canchas, arbitros);

      // Actualizar torneo con la estructura de eliminación
      await db.collection('torneos').doc(torneoId).update({
        estructuraEliminacion: estructuraEliminacion,
        estado: 'en_curso',
        fixtureGenerado: true,
        updatedAt: new Date()
      });

      return {
        message: 'Fixture de eliminación directa generado correctamente',
        estructuraEliminacion,
        partidosGenerados: partidosIds.length,
        faseActual: 'Primera Fase'
      };

    } catch (error) {
      console.error('Error generando fixture de eliminación directa:', error);
      throw error;
    }
  }

  /**
   * Generar estructura completa de eliminación directa
   * @param {Array} equipos - Lista de equipos
   * @param {number} equiposPorLlave - Número de equipos por llave
   * @returns {Object} - Estructura de eliminación directa
   */
  static generarEstructuraEliminacion(equipos, equiposPorLlave) {
    const fases = [];
    const llaves = [];
    
    // Crear equipos ficticios si es necesario para completar la llave
    const equiposCompletos = [...equipos];
    while (equiposCompletos.length < equiposPorLlave) {
      equiposCompletos.push({
        id: `bye_${equiposCompletos.length}`,
        nombre: 'Bye',
        logo: '',
        esBye: true
      });
    }

    // Calcular número de fases necesarias
    let equiposEnFase = equiposPorLlave;
    let numeroFase = 1;

    while (equiposEnFase > 1) {
      const fase = {
        numero: numeroFase,
        nombre: this.obtenerNombreFase(numeroFase, equiposEnFase),
        equiposEnFase: equiposEnFase,
        partidosPorFase: equiposEnFase / 2,
        llaves: []
      };

      // Solo crear llaves para la primera fase con equipos reales
      // Las siguientes fases se crearán cuando se progrese
      if (numeroFase === 1) {
        // Crear llaves para la primera fase
        for (let i = 0; i < equiposEnFase; i += 2) {
          const llave = {
            numero: (i / 2) + 1,
            equipo1: equiposCompletos[i] || null,
            equipo2: equiposCompletos[i + 1] || null,
            ganador: null,
            partidoId: null
          };
          fase.llaves.push(llave);
          llaves.push(llave);
        }
      } else {
        // Para las siguientes fases, crear llaves vacías que se llenarán cuando se progrese
        for (let i = 0; i < equiposEnFase; i += 2) {
          const llave = {
            numero: (i / 2) + 1,
            equipo1: null, // Se llenará cuando se progrese
            equipo2: null, // Se llenará cuando se progrese
            ganador: null,
            partidoId: null
          };
          fase.llaves.push(llave);
          llaves.push(llave);
        }
      }

      fases.push(fase);
      equiposEnFase = equiposEnFase / 2;
      numeroFase++;
    }

    return {
      fases,
      llaves,
      faseActual: 0,
      equiposPorLlave,
      totalFases: fases.length
    };
  }

  /**
   * Obtener nombre descriptivo de la fase
   * @param {number} numeroFase - Número de la fase
   * @param {number} equiposEnFase - Equipos en la fase
   * @returns {string} - Nombre de la fase
   */
  static obtenerNombreFase(numeroFase, equiposEnFase) {
    if (equiposEnFase === 2) return 'Final';
    if (equiposEnFase === 4) return 'Semifinales';
    if (equiposEnFase === 8) return 'Cuartos de Final';
    if (equiposEnFase === 16) return 'Octavos de Final';
    if (equiposEnFase === 32) return 'Dieciseisavos de Final';
    
    return `Fase ${numeroFase}`;
  }

  /**
   * Crear partidos para una fase de eliminación directa
   * @param {string} torneoId - ID del torneo
   * @param {Object} fase - Datos de la fase
   * @returns {Promise<Array>} - IDs de los partidos creados
   */
  static async crearPartidosEliminacionDirecta(torneoId, fase, canchas = [], arbitros = []) {
    const partidosIds = [];
    const batch = db.batch();

    // Obtener datos del torneo para categoría y nombre
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    const torneoData = torneoDoc.exists ? torneoDoc.data() : {};
    const torneoNombre = torneoData.nombre || '';
    const categoria = torneoData.categoria || '';

    for (const llave of fase.llaves) {
      // Saltar llaves con bye
      if (llave.equipo1?.esBye || llave.equipo2?.esBye) {
        // El equipo que no es bye avanza automáticamente
        llave.ganador = llave.equipo1?.esBye ? llave.equipo2 : llave.equipo1;
        continue;
      }

      // Saltar llaves que no tienen equipos asignados (fases futuras)
      if (!llave.equipo1 || !llave.equipo2) {
        continue;
      }

      const partidoRef = db.collection('partidos').doc();
      const partidoId = partidoRef.id;

      // Asignar cancha y árbitro rotando entre los disponibles
      const canchaAsignada = canchas.length > 0 ? canchas[partidosIds.length % canchas.length] : null;
      const arbitroAsignado = arbitros.length > 0 ? arbitros[partidosIds.length % arbitros.length] : null;

      const partidoData = {
        id: partidoId,
        torneoId,
        torneoNombre: torneoNombre,
        categoria: categoria,
        jornada: 1, // Para eliminación directa
        fase: fase.nombre,
        nroLlave: llave.numero,
        fecha: new Date(), // Fecha por defecto
        horaInicio: '15:00', // Hora por defecto
        duracion: 80, // Rugby: 80 minutos (2 tiempos de 40)
        
        // Equipos con IDs y logos
        equipoLocal: llave.equipo1.nombre,
        equipoLocalId: llave.equipo1.id,
        equipoLocalLogo: llave.equipo1.logo || '',
        equipoVisitante: llave.equipo2.nombre,
        equipoVisitanteId: llave.equipo2.id,
        equipoVisitanteLogo: llave.equipo2.logo || '',
        
        // Cancha y árbitro asignados
        canchaId: canchaAsignada,
        cancha: canchaAsignada ? {
          id: canchaAsignada,
          nombre: 'Por asignar' // Se actualizará con datos reales
        } : null,
        
        arbitroId: arbitroAsignado,
        arbitros: arbitroAsignado ? {
          principal: {
            id: arbitroAsignado,
            nombre: 'Por asignar' // Se actualizará con datos reales
          }
        } : null,
        
        estado: 'programado',
        
        // Resultado (RUGBY - no fútbol)
        resultado: {
          puntosLocal: 0,
          puntosVisitante: 0,
          triesLocal: 0,
          triesVisitante: 0,
          conversionesLocal: 0,
          conversionesVisitante: 0,
          penalesLocal: 0,
          penalesVisitante: 0,
          dropsLocal: 0,
          dropsVisitante: 0
        },
        
        // Estadísticas de Rugby completas
        estadisticas: {
          scrumsLocal: 0,
          scrumsVisitante: 0,
          lineoutsLocal: 0,
          lineoutsVisitante: 0,
          penalesCometidosLocal: 0,
          penalesCometidosVisitante: 0,
          tarjetasAmarillasLocal: 0,
          tarjetasAmarillasVisitante: 0,
          tarjetasRojasLocal: 0,
          tarjetasRojasVisitante: 0,
          maulesLocal: 0,
          maulesVisitante: 0,
          rucksLocal: 0,
          rucksVisitante: 0
        },
        
        // Campos para gestión en vivo
        tiempo: {
          tiempoTranscurrido: 0,
          tiempoInicioPartido: null,
          tiempoPausa: null,
          tiempoFinPartido: null,
          tiempoJugadoEfectivo: 0,
          tiempoPausado: 0,
          numeroPausas: 0,
          duracionTotal: 0,
          duracionTotalMinutos: 0,
          duracionTotalSegundos: 0
        },
        
        incidencias: [],
        observaciones: '',
        condicionesClimaticas: '',
        asistencia: 0,
        
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
        
        auditoria: {
          creadoPor: 'sistema',
          creadoPorNombre: 'Sistema de Eliminación Directa',
          fechaCreacion: new Date(),
          modificadoPor: 'sistema',
          modificadoPorNombre: 'Sistema de Eliminación Directa',
          fechaModificacion: new Date()
        }
      };

      batch.set(partidoRef, partidoData);
      partidosIds.push(partidoId);
      llave.partidoId = partidoId;
    }

    await batch.commit();
    return partidosIds;
  }

  /**
   * Progresar a la siguiente fase cuando todos los partidos de la fase actual están finalizados
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<Object>} - Resultado de la progresión
   */
  static async progresarFaseEliminacionDirecta(torneoId) {
    try {

      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {
        throw new Error('Torneo no encontrado');
      }

      const torneoData = torneoDoc.data();
      if (torneoData.formato !== 'eliminacion_directa') {
        throw new Error('Este método solo es válido para torneos de eliminación directa');
      }

      const estructuraEliminacion = torneoData.estructuraEliminacion;
      const faseActual = estructuraEliminacion.fases[estructuraEliminacion.faseActual];

      if (!faseActual) {
        throw new Error('No hay fase actual para progresar');
      }

      // Verificar que todos los partidos de la fase actual están finalizados
      const partidosFaseActual = await db.collection('partidos')
        .where('torneoId', '==', torneoId)
        .where('fase', '==', faseActual.nombre)
        .get();

      const partidosFinalizados = partidosFaseActual.docs.filter(doc => 
        doc.data().estado === 'finalizado'
      );

      if (partidosFinalizados.length !== faseActual.partidosPorFase) {
        throw new Error('No todos los partidos de la fase actual están finalizados');
      }

      // Determinar ganadores y crear siguiente fase
      const ganadores = [];
      for (const doc of partidosFinalizados) {
        const partidoData = doc.data();
        
        const ganador = this.determinarGanador(partidoData);

        ganadores.push(ganador);
      }

      // Actualizar llaves con ganadores
      faseActual.llaves.forEach((llave, index) => {
        if (ganadores[index]) {
          llave.ganador = ganadores[index];
        }
      });

      // Si no es la última fase, crear la siguiente
      if (estructuraEliminacion.faseActual < estructuraEliminacion.fases.length - 1) {
        estructuraEliminacion.faseActual++;
        const siguienteFase = estructuraEliminacion.fases[estructuraEliminacion.faseActual];
        

        // Llenar las llaves de la siguiente fase con los ganadores
        let ganadorIndex = 0;
        siguienteFase.llaves.forEach((llave, llaveIndex) => {

          if (ganadorIndex < ganadores.length) {
            llave.equipo1 = ganadores[ganadorIndex];

            ganadorIndex++;
          }
          if (ganadorIndex < ganadores.length) {
            llave.equipo2 = ganadores[ganadorIndex];

            ganadorIndex++;
          }
        });
        

        // Crear partidos de la siguiente fase (sin canchas/árbitros específicos para fases posteriores)
        const partidosIds = await this.crearPartidosEliminacionDirecta(torneoId, siguienteFase, [], []);

        // Actualizar torneo
        await db.collection('torneos').doc(torneoId).update({
          estructuraEliminacion: estructuraEliminacion,
          updatedAt: new Date()
        });

        return {
          message: 'Fase progresada correctamente',
          faseActual: siguienteFase.nombre,
          partidosGenerados: partidosIds.length,
          ganadores: ganadores.length
        };
      } else {
        // Es la final - determinar campeón y subcampeón
        const campeon = ganadores[0];
        const subcampeon = faseActual.llaves[0].equipo1.id === campeon.id ? 
          faseActual.llaves[0].equipo2 : faseActual.llaves[0].equipo1;

        // Crear clasificación final
        const clasificacionFinal = [
          { posicion: 1, equipo: campeon, premio: 'Campeón' },
          { posicion: 2, equipo: subcampeon, premio: 'Subcampeón' }
        ];

        // Actualizar torneo como finalizado
        await db.collection('torneos').doc(torneoId).update({
          estado: 'finalizado',
          campeon: campeon,
          subcampeon: subcampeon,
          clasificacionFinal: clasificacionFinal,
          estructuraEliminacion: estructuraEliminacion,
          fechaFinReal: new Date(),
          updatedAt: new Date()
        });

        // Guardar clasificación final en colección separada
        await db.collection('clasificacionFinal').add({
          torneoId: torneoId,
          torneoNombre: torneoData.nombre,
          clasificacion: clasificacionFinal,
          fechaCreacion: new Date()
        });

        return {
          message: 'Torneo finalizado correctamente',
          campeon: campeon,
          subcampeon: subcampeon,
          clasificacionFinal: clasificacionFinal
        };
      }

    } catch (error) {
      console.error('Error progresando fase de eliminación directa:', error);
      throw error;
    }
  }

  /**
   * Determinar ganador de un partido
   * @param {Object} partidoData - Datos del partido
   * @returns {Object} - Equipo ganador
   */
  static determinarGanador(partidoData) {
    const resultado = partidoData.resultado;
    
    if (resultado.puntosLocal > resultado.puntosVisitante) {
      return {
        id: partidoData.equipoLocalId,
        nombre: partidoData.equipoLocal,
        logo: partidoData.equipoLocalLogo
      };
    } else if (resultado.puntosVisitante > resultado.puntosLocal) {
      return {
        id: partidoData.equipoVisitanteId,
        nombre: partidoData.equipoVisitante,
        logo: partidoData.equipoVisitanteLogo
      };
    } else {
      // En caso de empate, se podría implementar criterios de desempate
      // Por ahora, retornamos null para manejar empates
      return null;
    }
  }
}

module.exports = TorneoService;
