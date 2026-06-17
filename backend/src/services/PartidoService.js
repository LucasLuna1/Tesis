/**
 * Servicio para gestión de Partidos
 * User Story 1.2: Como árbitro, quiero poder registrar un nuevo partido
 * User Story 1.3: Vincular partidos con árbitros principales y asistentes
 */

const Partido = require('../models/Partido');
const Arbitro = require('../models/Arbitro');
const Equipo = require('../models/Equipo');
const Cancha = require('../models/Cancha');
const NotificacionesService = require('./NotificacionesService');
const { admin, db } = require('../config/firebase');

class PartidoService {
  
  // Crear nuevo partido (User Story 1.1 y 1.2)
  static async crearPartido(partidoData, usuarioId, usuarioNombre) {
    try {
      // Validar datos del partido
      const validacion = Partido.validate(partidoData);
      if (!validacion.isValid) {
        throw new Error(`Datos inválidos: ${validacion.errors.join(', ')}`);
      }

      // Verificar que el árbitro existe y está disponible
      const arbitroDoc = await db.collection('arbitros').doc(usuarioId).get();
      if (!arbitroDoc.exists) {
        throw new Error('Árbitro no encontrado');
      }

      const arbitro = arbitroDoc.data();
      if (!arbitro.disponible || !arbitro.activo) {
        throw new Error('El árbitro no está disponible');
      }

      // 🚀 OPTIMIZACIÓN: Verificar equipos y cancha en paralelo
      const [equipoLocalDoc, equipoVisitanteDoc, canchaDoc] = await Promise.all([
        db.collection('equipos').doc(partidoData.equipoLocal.id).get(),
        db.collection('equipos').doc(partidoData.equipoVisitante.id).get(),
        db.collection('canchas').doc(partidoData.cancha.id).get()
      ]);

      if (!equipoLocalDoc.exists || !equipoVisitanteDoc.exists) {
        throw new Error('Uno o ambos equipos no existen');
      }

      if (!canchaDoc.exists) {
        throw new Error('Cancha no encontrada');
      }

      const cancha = canchaDoc.data();
      if (!cancha.activa || !cancha.disponible || cancha.mantenimiento) {
        throw new Error('La cancha no está disponible');
      }

      // Crear instancia del partido
      const partido = new Partido({
        ...partidoData,
        arbitros: {
          ...partidoData.arbitros,
          principal: {
            id: usuarioId,
            nombre: `${arbitro.nombre} ${arbitro.apellido}`
          }
        },
        auditoria: {
          creadoPor: usuarioId,
          creadoPorNombre: usuarioNombre,
          modificadoPor: usuarioId,
          modificadoPorNombre: usuarioNombre,
          historialCambios: []
        },
        equipoLocal: {
          ...partidoData.equipoLocal,
          nombre: equipoLocalDoc.data().nombre
        },
        equipoVisitante: {
          ...partidoData.equipoVisitante,
          nombre: equipoVisitanteDoc.data().nombre
        },
        cancha: {
          ...partidoData.cancha,
          nombre: cancha.nombre,
          direccion: cancha.direccion
        }
      });

      // Registrar creación en auditoría
      partido.registrarCreacion(usuarioId, usuarioNombre);
      
      // Guardar en la base de datos
      const partidoRef = await db.collection('partidos').add(partido.toJSON());
      
      // Actualizar estadísticas del árbitro
      await this.actualizarEstadisticasArbitro(usuarioId, 'asignado');
      
      // Actualizar fixture del torneo si el partido pertenece a un torneo
      if (partido.torneoId) {
        await this.actualizarFixtureTorneo(partido.torneoId, partidoRef.id, partido.toJSON());
      }

      // Enviar notificaciones a los jugadores de ambos equipos
      await this.enviarNotificacionesPartidoCreado(partidoRef.id, partido);

      return {
        id: partidoRef.id,
        ...partido.toJSON()
      };

    } catch (error) {
      throw new Error(`Error al crear partido: ${error.message}`);
    }
  }

  // Obtener partidos por árbitro
  static async getPartidosPorArbitro(arbitroId, filtros = {}) {
    try {
      let query = db.collection('partidos');
      
      // Filtrar por árbitro
      const arbitroFilters = [
        `arbitros.principal.id`,
        `arbitros.asistente1.id`,
        `arbitros.asistente2.id`,
        `arbitros.cuartoArbitro.id`
      ];

      // Aplicar filtros adicionales
      if (filtros.estado) {
        query = query.where('estado', '==', filtros.estado);
      }

      if (filtros.fechaDesde) {
        query = query.where('fecha', '>=', new Date(filtros.fechaDesde));
      }

      if (filtros.fechaHasta) {
        query = query.where('fecha', '<=', new Date(filtros.fechaHasta));
      }

      const snapshot = await query.orderBy('fecha', 'asc').get();
      const partidos = [];

      snapshot.forEach(doc => {
        const partido = doc.data();
        
        // Verificar si el árbitro está asignado a este partido
        const estaAsignado = arbitroFilters.some(field => {
          const fieldParts = field.split('.');
          let value = partido;
          for (const part of fieldParts) {
            value = value?.[part];
          }
          return value?.id === arbitroId;
        });

        if (estaAsignado) {
          partidos.push({ id: doc.id, ...partido });
        }
      });

      return partidos;

    } catch (error) {
      throw new Error(`Error al obtener partidos: ${error.message}`);
    }
  }

  // Enviar notificaciones cuando se crea un partido
  static async enviarNotificacionesPartidoCreado(partidoId, partido) {
    try {
      // Obtener jugadores de ambos equipos
      const jugadoresIds = [];
      
      // Obtener jugadores del equipo local
      if (partido.equipoLocal.jugadores && partido.equipoLocal.jugadores.length > 0) {
        jugadoresIds.push(...partido.equipoLocal.jugadores.map(j => j.id));
      }
      
      // Obtener jugadores del equipo visitante
      if (partido.equipoVisitante.jugadores && partido.equipoVisitante.jugadores.length > 0) {
        jugadoresIds.push(...partido.equipoVisitante.jugadores.map(j => j.id));
      }

      if (jugadoresIds.length === 0) {

        return;
      }

      // Crear notificación de partido programado
      const notificacionData = {
        tipo: 'partido',
        titulo: 'Nuevo Partido Programado',
        mensaje: `${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre} - ${new Date(partido.fecha).toLocaleDateString('es-ES')} a las ${partido.horaInicio}`,
        prioridad: 'alta',
        data: {
          partidoId: partidoId,
          torneoId: partido.torneoId,
          fechaPartido: partido.fecha,
          equipoLocal: partido.equipoLocal.nombre,
          equipoVisitante: partido.equipoVisitante.nombre
        }
      };

      // Crear notificaciones masivas
      await NotificacionesService.crearMasivas(jugadoresIds, notificacionData);

      // Programar notificación de recordatorio 24 horas antes
      const fechaPartido = new Date(partido.fecha);
      const fechaRecordatorio = new Date(fechaPartido.getTime() - (24 * 60 * 60 * 1000));
      
      if (fechaRecordatorio > new Date()) {
        const recordatorioData = {
          tipo: 'recordatorio',
          titulo: 'Recordatorio de Partido',
          mensaje: `Tu partido contra ${partido.equipoVisitante.nombre} es mañana a las ${partido.horaInicio}`,
          prioridad: 'alta',
          fecha: fechaRecordatorio,
          data: {
            partidoId: partidoId,
            torneoId: partido.torneoId,
            fechaPartido: partido.fecha
          }
        };

        await NotificacionesService.crearMasivas(jugadoresIds, recordatorioData);
      }

    } catch (error) {
      console.error('Error al enviar notificaciones de partido:', error);
    }
  }

  // Iniciar partido
  static async iniciarPartido(partidoId, arbitroId) {
    try {
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      if (!partidoDoc.exists) {
        throw new Error('Partido no encontrado');
      }

      const partido = new Partido(partidoDoc.data());
      
      // Verificar que el árbitro puede iniciar el partido
      if (partido.arbitros.principal?.id !== arbitroId) {
        throw new Error('Solo el árbitro principal puede iniciar el partido');
      }

      if (!partido.puedeIniciar()) {
        throw new Error('El partido no puede iniciarse (faltan datos requeridos)');
      }

      // Iniciar partido
      partido.iniciarPartido();

      // Actualizar en base de datos
      await db.collection('partidos').doc(partidoId).update(partido.toJSON());

      // Registrar evento de inicio para cálculo de duración (User Story 1.3)
      await db.collection('eventos_partido').add({
        partidoId,
        tipo: 'inicio',
        arbitroId,
        timestamp: Date.now(),
        datos: {
          estadoAnterior: 'programado',
          estadoNuevo: 'En Curso'
        }
      });

      // Actualizar estadísticas del árbitro
      await this.actualizarEstadisticasArbitro(arbitroId, 'iniciado');

      return partido.toJSON();

    } catch (error) {
      throw new Error(`Error al iniciar partido: ${error.message}`);
    }
  }

  // Finalizar partido
  static async finalizarPartido(partidoId, arbitroId, resumen = {}) {
    try {
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      if (!partidoDoc.exists) {
        throw new Error('Partido no encontrado');
      }

      const partidoData = partidoDoc.data();
      const partido = new Partido(partidoData);
      
      // Verificar que el árbitro puede finalizar el partido (múltiples formatos)
      const puedeFinalizar = 
        partido.arbitros?.principal?.id === arbitroId ||
        partido.arbitros?.asistente1?.id === arbitroId ||
        partido.arbitros?.asistente2?.id === arbitroId ||
        partido.arbitros?.cuartoArbitro?.id === arbitroId ||
        partidoData.arbitroPrincipalId === arbitroId ||
        partidoData.arbitros?.principal?.id === arbitroId ||
        partidoData.arbitroId === arbitroId;

      if (!puedeFinalizar) {
        throw new Error('No tienes permisos para finalizar este partido');
      }

      // Calcular duración total del partido (User Story 1.3)
      let duracionTotal = null;
      try {
        duracionTotal = await this.calcularDuracionTotalPartido(partidoId);
      } catch (error) {

        // Usar duración estimada del resumen si está disponible
        duracionTotal = {
          duracionTotalMs: (resumen.duracion || 0) * 60 * 1000,
          tiempoJugadoEfectivo: resumen.duracion || 0,
          tiempoPausado: 0,
          numeroPausas: 0
        };
      }
      
      // Finalizar partido
      partido.finalizarPartido();
      
      // Agregar duración total calculada
      if (duracionTotal) {
        partido.duracionTotal = duracionTotal;
        partido.duracionTotalMinutos = Math.round(duracionTotal.duracionTotalMs / (1000 * 60));
        partido.duracionTotalSegundos = Math.round(duracionTotal.duracionTotalMs / 1000);
        partido.tiempoJugadoEfectivo = duracionTotal.tiempoJugadoEfectivo;
        partido.tiempoPausado = duracionTotal.tiempoPausado;
        partido.numeroPausas = duracionTotal.numeroPausas;
      }
      
      // Guardar duración enviada desde el frontend (en segundos)
      if (resumen.duracion !== undefined) {
        partido.duracion = resumen.duracion; // Duración en segundos
        partido.tiempoTranscurrido = resumen.duracion; // Duración en segundos
      }

      // Agregar resumen si se proporciona
      if (resumen.observaciones) {
        partido.observaciones = resumen.observaciones;
      }

      if (resumen.condicionesClimaticas) {
        partido.condicionesClimaticas = resumen.condicionesClimaticas;
      }

      if (resumen.asistencia) {
        partido.asistencia = resumen.asistencia;
      }

      // Actualizar en base de datos
      await db.collection('partidos').doc(partidoId).update(partido.toJSON());

      // Registrar evento de finalización con duración
      await db.collection('eventos_partido').add({
        partidoId,
        tipo: 'finalizacion',
        arbitroId,
        timestamp: Date.now(),
        duracionTotal: duracionTotal,
        datos: {
          estadoAnterior: partido.estado,
          estadoNuevo: 'finalizado',
          resumen: resumen
        }
      });

      // Actualizar estadísticas del árbitro
      await this.actualizarEstadisticasArbitro(arbitroId, 'finalizado');

      // Actualizar estadísticas de los equipos
      await this.actualizarEstadisticasEquipos(partido);

      // Actualizar estadísticas de los jugadores
      await this.actualizarEstadisticasJugadores(partidoId, partido);

      // Actualizar tabla de posiciones según el formato del torneo
      if (partido.torneoId) {
        await this.actualizarTablaPosiciones(partido);
        
        // Verificar si es un torneo de eliminación directa y progresar fase si es necesario
        await this.verificarProgresionEliminacionDirecta(partido.torneoId, partidoId);
        
        // 🆕 NUEVO: Actualizar partidos con referencias (formato personalizado)
        // Pasar el partido actualizado, no el original
        const partidoActualizado = partido.toJSON();
        await this.actualizarPartidosConReferencias(partidoId, partidoActualizado);
      }

      return partido.toJSON();

    } catch (error) {
      throw new Error(`Error al finalizar partido: ${error.message}`);
    }
  }

  // Calcular duración total del partido (User Story 1.3)
  static async calcularDuracionTotalPartido(partidoId) {
    try {
      // Obtener todos los eventos del cronómetro
      const eventosSnapshot = await db.collection('eventos_partido')
        .where('partidoId', '==', partidoId)
        .where('tipo', 'in', ['inicio', 'pausa', 'reanudacion', 'finalizacion'])
        .orderBy('timestamp', 'asc')
        .get();

      const eventos = [];
      eventosSnapshot.forEach(doc => {
        eventos.push({ id: doc.id, ...doc.data() });
      });

      if (eventos.length === 0) {
        throw new Error('No se encontraron eventos del cronómetro');
      }

      // Encontrar evento de inicio
      const eventoInicio = eventos.find(e => e.tipo === 'inicio');
      if (!eventoInicio) {
        throw new Error('No se encontró evento de inicio del partido');
      }

      const timestampInicio = eventoInicio.timestamp;
      const timestampFinal = Date.now();

      // Calcular tiempo total y pausas
      let tiempoJugadoEfectivo = 0;
      let tiempoPausado = 0;
      let numeroPausas = 0;
      let ultimoEvento = 'inicio';
      let timestampUltimoEvento = timestampInicio;

      for (const evento of eventos) {
        if (evento.tipo === 'pausa') {
          // Tiempo jugado desde el último evento hasta la pausa
          tiempoJugadoEfectivo += (evento.timestamp - timestampUltimoEvento);
          ultimoEvento = 'pausa';
          timestampUltimoEvento = evento.timestamp;
          numeroPausas++;
        } else if (evento.tipo === 'reanudacion') {
          // Tiempo pausado desde la pausa hasta la reanudación
          tiempoPausado += (evento.timestamp - timestampUltimoEvento);
          ultimoEvento = 'reanudacion';
          timestampUltimoEvento = evento.timestamp;
        }
      }

      // Si el partido terminó en pausa, agregar el tiempo pausado final
      if (ultimoEvento === 'pausa') {
        tiempoPausado += (timestampFinal - timestampUltimoEvento);
      } else {
        // Si terminó jugando, agregar el tiempo jugado final
        tiempoJugadoEfectivo += (timestampFinal - timestampUltimoEvento);
      }

      const duracionTotalMs = timestampFinal - timestampInicio;

      return {
        duracionTotalMs,
        tiempoJugadoEfectivo,
        tiempoPausado,
        numeroPausas,
        timestampInicio,
        timestampFinal,
        eventos: eventos.length
      };

    } catch (error) {
      throw new Error(`Error calculando duración del partido: ${error.message}`);
    }
  }

  // Agregar incidencia
  static async agregarIncidencia(partidoId, arbitroId, incidenciaData) {
    try {
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      if (!partidoDoc.exists) {
        throw new Error('Partido no encontrado');
      }

      const partidoData = partidoDoc.data();
      
      // Verificar que el árbitro puede agregar incidencias (múltiples formatos)
      const puedeAgregar = 
        (partidoData.arbitros?.principal?.id === arbitroId) ||
        (partidoData.arbitros?.asistente1?.id === arbitroId) ||
        (partidoData.arbitros?.asistente2?.id === arbitroId) ||
        (partidoData.arbitros?.cuartoArbitro?.id === arbitroId) ||
        (partidoData.arbitroPrincipalId === arbitroId) ||
        (partidoData.arbitroId === arbitroId); // Fallback para partidos automáticos

      if (!puedeAgregar) {
        throw new Error('No tienes permisos para agregar incidencias a este partido');
      }

      if (partidoData.estado !== 'En Curso') {
        throw new Error('Solo se pueden agregar incidencias a partidos en curso');
      }

      // Crear la incidencia directamente
      const nuevaIncidencia = {
        id: Date.now().toString(),
        ...incidenciaData,
        arbitroId,
        timestamp: new Date(),
        fechaCreacion: new Date()
      };

      // Agregar a las incidencias existentes
      const incidencias = partidoData.incidencias || [];
      incidencias.push(nuevaIncidencia);

      // Actualizar resultado si la incidencia afecta el marcador
      let resultadoActualizado = { ...partidoData.resultado };
      let estadisticasActualizadas = { ...partidoData.estadisticas };

      if (nuevaIncidencia.tipo === 'TRY') {
        if (nuevaIncidencia.equipo === 'LOCAL' || nuevaIncidencia.equipo === 'local') {
          resultadoActualizado.puntosLocal = (resultadoActualizado.puntosLocal || 0) + 5;
          resultadoActualizado.triesLocal = (resultadoActualizado.triesLocal || 0) + 1;
        } else {
          resultadoActualizado.puntosVisitante = (resultadoActualizado.puntosVisitante || 0) + 5;
          resultadoActualizado.triesVisitante = (resultadoActualizado.triesVisitante || 0) + 1;
        }
      } else if (nuevaIncidencia.tipo === 'CONVERSION') {
        if (nuevaIncidencia.equipo === 'LOCAL' || nuevaIncidencia.equipo === 'local') {
          resultadoActualizado.puntosLocal = (resultadoActualizado.puntosLocal || 0) + 2;
          resultadoActualizado.conversionesLocal = (resultadoActualizado.conversionesLocal || 0) + 1;
        } else {
          resultadoActualizado.puntosVisitante = (resultadoActualizado.puntosVisitante || 0) + 2;
          resultadoActualizado.conversionesVisitante = (resultadoActualizado.conversionesVisitante || 0) + 1;
        }
      } else if (nuevaIncidencia.tipo === 'PENAL') {
        if (nuevaIncidencia.equipo === 'LOCAL' || nuevaIncidencia.equipo === 'local') {
          resultadoActualizado.puntosLocal = (resultadoActualizado.puntosLocal || 0) + 3;
          resultadoActualizado.penalesLocal = (resultadoActualizado.penalesLocal || 0) + 1;
        } else {
          resultadoActualizado.puntosVisitante = (resultadoActualizado.puntosVisitante || 0) + 3;
          resultadoActualizado.penalesVisitante = (resultadoActualizado.penalesVisitante || 0) + 1;
        }
      } else if (nuevaIncidencia.tipo === 'DROP') {
        if (nuevaIncidencia.equipo === 'LOCAL' || nuevaIncidencia.equipo === 'local') {
          resultadoActualizado.puntosLocal = (resultadoActualizado.puntosLocal || 0) + 3;
          resultadoActualizado.dropsLocal = (resultadoActualizado.dropsLocal || 0) + 1;
        } else {
          resultadoActualizado.puntosVisitante = (resultadoActualizado.puntosVisitante || 0) + 3;
          resultadoActualizado.dropsVisitante = (resultadoActualizado.dropsVisitante || 0) + 1;
        }
      } else if (nuevaIncidencia.tipo === 'TARJETA_AMARILLA') {
        if (nuevaIncidencia.equipo === 'LOCAL' || nuevaIncidencia.equipo === 'local') {
          estadisticasActualizadas.tarjetasAmarillasLocal = (estadisticasActualizadas.tarjetasAmarillasLocal || 0) + 1;
        } else {
          estadisticasActualizadas.tarjetasAmarillasVisitante = (estadisticasActualizadas.tarjetasAmarillasVisitante || 0) + 1;
        }
      } else if (nuevaIncidencia.tipo === 'TARJETA_ROJA') {
        if (nuevaIncidencia.equipo === 'LOCAL' || nuevaIncidencia.equipo === 'local') {
          estadisticasActualizadas.tarjetasRojasLocal = (estadisticasActualizadas.tarjetasRojasLocal || 0) + 1;
        } else {
          estadisticasActualizadas.tarjetasRojasVisitante = (estadisticasActualizadas.tarjetasRojasVisitante || 0) + 1;
        }
      } else if (nuevaIncidencia.tipo === 'TARJETA_AZUL' || nuevaIncidencia.tipo === 'tarjeta_azul') {
        if (nuevaIncidencia.equipo === 'LOCAL' || nuevaIncidencia.equipo === 'local') {
          estadisticasActualizadas.tarjetasAzulesLocal = (estadisticasActualizadas.tarjetasAzulesLocal || 0) + 1;
        } else {
          estadisticasActualizadas.tarjetasAzulesVisitante = (estadisticasActualizadas.tarjetasAzulesVisitante || 0) + 1;
        }
      }

      // Actualizar en base de datos
      await db.collection('partidos').doc(partidoId).update({
        incidencias: incidencias,
        resultado: resultadoActualizado,
        estadisticas: estadisticasActualizadas,
        fechaActualizacion: new Date()
      });

      // Si es un CAMBIO, actualizar estados de jugadores en convocados
      if (nuevaIncidencia.tipo === 'CAMBIO' && incidenciaData.jugadorSaleId && incidenciaData.jugadorEntraId) {
        const equipoId = incidenciaData.equipo === 'LOCAL' 
          ? partidoData.equipoLocalId 
          : partidoData.equipoVisitanteId;
        
        const convocadosQuery = await db.collection('convocados')
          .where('partidoId', '==', partidoId)
          .where('equipoId', '==', equipoId)
          .limit(1)
          .get();
        
        if (!convocadosQuery.empty) {
          const convocadoDoc = convocadosQuery.docs[0];
          const convocadosData = convocadoDoc.data();
          
          // Actualizar jugadores
          const jugadoresActualizados = convocadosData.jugadores.map(j => {
            if (j.id === incidenciaData.jugadorSaleId) {
              // Jugador que SALE - calcular minutos jugados hasta ahora
              const minutosEnEstePartido = (incidenciaData.minuto || 0) - (j.minutoInicio || 0);
              return {
                ...j,
                activo: false,
                minutoSalida: incidenciaData.minuto || 0,
                minutosJugadosEnPartido: minutosEnEstePartido
              };
            } else if (j.id === incidenciaData.jugadorEntraId) {
              // Jugador que ENTRA - mantener sus minutos históricos
              return {
                ...j,
                activo: true,
                minutoInicio: incidenciaData.minuto || 0
              };
            }
            return j;
          });
          
          await convocadoDoc.ref.update({
            jugadores: jugadoresActualizados,
            fechaActualizacion: new Date()
          });
        }
      }

      // Si es TARJETA AMARILLA, marcar jugador en SIN BIN (10 minutos)
      if (nuevaIncidencia.tipo === 'TARJETA_AMARILLA' && incidenciaData.jugadorId) {
        const equipoId = incidenciaData.equipo === 'LOCAL' 
          ? partidoData.equipoLocalId 
          : partidoData.equipoVisitanteId;
        
        const convocadosQuery = await db.collection('convocados')
          .where('partidoId', '==', partidoId)
          .where('equipoId', '==', equipoId)
          .limit(1)
          .get();
        
        if (!convocadosQuery.empty) {
          const convocadoDoc = convocadosQuery.docs[0];
          const convocadosData = convocadoDoc.data();
          
          const jugadoresActualizados = convocadosData.jugadores.map(j => {
            if (j.id === incidenciaData.jugadorId) {
              return {
                ...j,
                activo: false, // Sale temporalmente
                enSinBin: true, // Marcado como expulsión temporal
                minutoSinBin: incidenciaData.minuto || 0, // Minuto en que recibió la amarilla
                minutoPuedeVolver: (incidenciaData.minuto || 0) + 10 // Puede volver en 10 minutos
              };
            }
            return j;
          });
          
          await convocadoDoc.ref.update({
            jugadores: jugadoresActualizados,
            fechaActualizacion: new Date()
          });
        }
      }

      // Si es TARJETA ROJA, expulsión definitiva del partido
      if (nuevaIncidencia.tipo === 'TARJETA_ROJA' && incidenciaData.jugadorId) {
        const equipoId = incidenciaData.equipo === 'LOCAL' 
          ? partidoData.equipoLocalId 
          : partidoData.equipoVisitanteId;
        
        const convocadosQuery = await db.collection('convocados')
          .where('partidoId', '==', partidoId)
          .where('equipoId', '==', equipoId)
          .limit(1)
          .get();
        
        if (!convocadosQuery.empty) {
          const convocadoDoc = convocadosQuery.docs[0];
          const convocadosData = convocadoDoc.data();
          
          const jugadoresActualizados = convocadosData.jugadores.map(j => {
            if (j.id === incidenciaData.jugadorId) {
              return {
                ...j,
                activo: false, // Sale definitivamente
                expulsado: true, // Marcado como expulsión definitiva
                minutoExpulsion: incidenciaData.minuto || 0, // Minuto de la expulsión
                motivoExpulsion: incidenciaData.motivo || incidenciaData.descripcion || 'Tarjeta roja'
              };
            }
            return j;
          });
          
          await convocadoDoc.ref.update({
            jugadores: jugadoresActualizados,
            fechaActualizacion: new Date()
          });
        }
      }

      return nuevaIncidencia;

    } catch (error) {
      throw new Error(`Error al agregar incidencia: ${error.message}`);
    }
  }

  // Asignar árbitro asistente
  static async asignarArbitroAsistente(partidoId, arbitroPrincipalId, tipoAsistente, arbitroAsistenteId) {
    try {
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      if (!partidoDoc.exists) {
        throw new Error('Partido no encontrado');
      }

      const partido = new Partido(partidoDoc.data());
      
      // Verificar que el árbitro principal puede asignar asistentes
      if (partido.arbitros.principal?.id !== arbitroPrincipalId) {
        throw new Error('Solo el árbitro principal puede asignar asistentes');
      }

      // Verificar que el árbitro asistente existe y está disponible
      const arbitroAsistenteDoc = await db.collection('arbitros').doc(arbitroAsistenteId).get();
      if (!arbitroAsistenteDoc.exists) {
        throw new Error('Árbitro asistente no encontrado');
      }

      const arbitroAsistente = arbitroAsistenteDoc.data();
      if (!arbitroAsistente.disponible || !arbitroAsistente.activo) {
        throw new Error('El árbitro asistente no está disponible');
      }

      // Asignar árbitro asistente
      partido.asignarArbitro(tipoAsistente, arbitroAsistenteId, `${arbitroAsistente.nombre} ${arbitroAsistente.apellido}`);

      // Actualizar en base de datos
      await db.collection('partidos').doc(partidoId).update(partido.toJSON());

      // Actualizar estadísticas del árbitro asistente
      await this.actualizarEstadisticasArbitro(arbitroAsistenteId, 'asignado');

      return partido.toJSON();

    } catch (error) {
      throw new Error(`Error al asignar árbitro asistente: ${error.message}`);
    }
  }

  // Métodos auxiliares
  static async actualizarEstadisticasArbitro(arbitroId, accion) {
    try {
      const arbitroDoc = await db.collection('arbitros').doc(arbitroId).get();
      if (!arbitroDoc.exists) return;

      const arbitro = new Arbitro(arbitroDoc.data());
      
      switch (accion) {
        case 'asignado':
          // No incrementar contadores, solo marcar como asignado
          break;
        case 'iniciado':
          // El partido se inició
          break;
        case 'finalizado':
          arbitro.incrementarPartidos('principal');
          break;
      }

      await db.collection('arbitros').doc(arbitroId).update(arbitro.toJSON());

    } catch (error) {
      console.error('Error al actualizar estadísticas del árbitro:', error);
    }
  }

  static async actualizarEstadisticasEquipos(partido) {
    try {
      // Actualizar estadísticas del equipo local
      const equipoLocalDoc = await db.collection('equipos').doc(partido.equipoLocal.id).get();
      if (equipoLocalDoc.exists) {
        const equipoLocal = new Equipo(equipoLocalDoc.data());
        equipoLocal.actualizarEstadisticas({
          resultado: partido.getGanador() === 'local' ? 'victoria' : 
                     partido.getGanador() === 'visitante' ? 'derrota' : 'empate',
          puntosFavor: partido.resultado.puntosLocal,
          puntosContra: partido.resultado.puntosVisitante
        });
        await db.collection('equipos').doc(partido.equipoLocal.id).update(equipoLocal.toJSON());
      }

      // Actualizar estadísticas del equipo visitante
      const equipoVisitanteDoc = await db.collection('equipos').doc(partido.equipoVisitante.id).get();
      if (equipoVisitanteDoc.exists) {
        const equipoVisitante = new Equipo(equipoVisitanteDoc.data());
        equipoVisitante.actualizarEstadisticas({
          resultado: partido.getGanador() === 'visitante' ? 'victoria' : 
                     partido.getGanador() === 'local' ? 'derrota' : 'empate',
          puntosFavor: partido.resultado.puntosVisitante,
          puntosContra: partido.resultado.puntosLocal
        });
        await db.collection('equipos').doc(partido.equipoVisitante.id).update(equipoVisitante.toJSON());
      }

    } catch (error) {
      console.error('Error al actualizar estadísticas de equipos:', error);
    }
  }

  /**
   * Actualizar tabla de posiciones según el formato del torneo
   * @param {Partido} partido - Partido finalizado
   */
  static async actualizarTablaPosiciones(partido) {
    try {
      // Obtener datos del torneo
      const torneoDoc = await db.collection('torneos').doc(partido.torneoId).get();
      if (!torneoDoc.exists) {

        return;
      }

      const torneoData = torneoDoc.data();
      const formato = torneoData.formato;

      if (formato === 'liga') {
        await this.actualizarTablaPosicionesLiga(partido, torneoData);
      } else if (formato === 'grupos-playoff') {
        await this.actualizarTablaPosicionesGrupos(partido, torneoData);
      } else if (formato === 'eliminacion_directa') {
        // Para eliminación directa, la progresión se maneja en verificarProgresionEliminacionDirecta
      } else {

      }

    } catch (error) {
      console.error('❌ Error al actualizar tabla de posiciones:', error);
      console.error('❌ Stack trace:', error.stack);
    }
  }

  /**
   * Actualizar tabla de posiciones para formato liga
   * @param {Partido} partido - Partido finalizado
   * @param {Object} torneoData - Datos del torneo
   */
  static async actualizarTablaPosicionesLiga(partido, torneoData) {
    try {
      const batch = db.batch();
      
      // Obtener tabla de posiciones del documento del torneo
      const torneoRef = db.collection('torneos').doc(partido.torneoId);
      
      // Inicializar tabla de posiciones desde el torneo
      let tablaPosiciones = torneoData.tablaPosiciones || [];
      
      // Si la tabla está vacía, inicializar con todos los equipos del torneo
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
      
      // Obtener IDs de los equipos (pueden venir como objeto o como ID directo)
      let equipoLocalId = partido.equipoLocalId || partido.equipoLocal?.id || null;
      let equipoVisitanteId = partido.equipoVisitanteId || partido.equipoVisitante?.id || null;
      
      // Obtener nombres de los equipos
      let equipoLocalNombre = 'Equipo Local';
      let equipoVisitanteNombre = 'Equipo Visitante';
      
      if (typeof partido.equipoLocal === 'string') {
        equipoLocalNombre = partido.equipoLocal;
      } else if (partido.equipoLocal?.nombre) {
        equipoLocalNombre = partido.equipoLocal.nombre;
      }
      
      if (typeof partido.equipoVisitante === 'string') {
        equipoVisitanteNombre = partido.equipoVisitante;
      } else if (partido.equipoVisitante?.nombre) {
        equipoVisitanteNombre = partido.equipoVisitante.nombre;
      }
      
      // Si no hay IDs, buscar en el torneo por nombre
      if (!equipoLocalId || !equipoVisitanteId) {
        const equiposTorneo = torneoData.equipos || [];
        if (!equipoLocalId && equipoLocalNombre) {
          const equipoLocalEncontrado = equiposTorneo.find(e => e.nombre === equipoLocalNombre);
          if (equipoLocalEncontrado) equipoLocalId = equipoLocalEncontrado.id;
        }
        if (!equipoVisitanteId && equipoVisitanteNombre) {
          const equipoVisitanteEncontrado = equiposTorneo.find(e => e.nombre === equipoVisitanteNombre);
          if (equipoVisitanteEncontrado) equipoVisitanteId = equipoVisitanteEncontrado.id;
        }
      }
      
      // Validar que tenemos los IDs
      if (!equipoLocalId || !equipoVisitanteId) {
        throw new Error(`No se pudieron obtener los IDs de los equipos. Local: ${equipoLocalId}, Visitante: ${equipoVisitanteId}`);
      }
      
      // Asegurarse de que todos los equipos del torneo estén en la tabla
      const equiposTorneo = torneoData.equipos || [];
      equiposTorneo.forEach(equipoTorneo => {
        const existeEnTabla = tablaPosiciones.some(e => e.equipoId === equipoTorneo.id);
        if (!existeEnTabla) {
          tablaPosiciones.push({
            equipoId: equipoTorneo.id,
            nombreEquipo: equipoTorneo.nombre,
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
          });
        }
      });
      
      // Buscar o crear entradas para los equipos del partido
      let equipoLocalIndex = tablaPosiciones.findIndex(e => e.equipoId === equipoLocalId);
      let equipoVisitanteIndex = tablaPosiciones.findIndex(e => e.equipoId === equipoVisitanteId);
      
      // Crear entrada para equipo local si no existe
      if (equipoLocalIndex === -1) {
        tablaPosiciones.push({
          equipoId: equipoLocalId,
          nombreEquipo: equipoLocalNombre,
          partidosJugados: 0,
          ganados: 0,
          empatados: 0,
          perdidos: 0,
          puntosFavor: 0,
          puntosContra: 0,
          puntosAFavor: 0, // Alias para compatibilidad
          puntosEnContra: 0, // Alias para compatibilidad
          triesAFavor: 0,
          triesEnContra: 0,
          diferenciaPuntos: 0,
          diferencia: 0, // Alias para compatibilidad
          bonusOfensivo: 0,
          bonusDefensivo: 0,
          puntosTotales: 0
        });
        equipoLocalIndex = tablaPosiciones.length - 1;
      }
      
      // Crear entrada para equipo visitante si no existe
      if (equipoVisitanteIndex === -1) {
        tablaPosiciones.push({
          equipoId: equipoVisitanteId,
          nombreEquipo: equipoVisitanteNombre,
          partidosJugados: 0,
          ganados: 0,
          empatados: 0,
          perdidos: 0,
          puntosFavor: 0,
          puntosContra: 0,
          puntosAFavor: 0, // Alias para compatibilidad
          puntosEnContra: 0, // Alias para compatibilidad
          triesAFavor: 0,
          triesEnContra: 0,
          diferenciaPuntos: 0,
          diferencia: 0, // Alias para compatibilidad
          bonusOfensivo: 0,
          bonusDefensivo: 0,
          puntosTotales: 0
        });
        equipoVisitanteIndex = tablaPosiciones.length - 1;
      }
      
      // Obtener datos del partido
      const puntosLocal = partido.resultado?.puntosLocal || 0;
      const puntosVisitante = partido.resultado?.puntosVisitante || 0;
      const triesLocal = partido.resultado?.triesLocal || 0;
      const triesVisitante = partido.resultado?.triesVisitante || 0;
      
      // Actualizar estadísticas del equipo local
      const equipoLocal = tablaPosiciones[equipoLocalIndex];
      equipoLocal.partidosJugados += 1;
      equipoLocal.puntosAFavor = (equipoLocal.puntosAFavor || 0) + puntosLocal;
      equipoLocal.puntosEnContra = (equipoLocal.puntosEnContra || 0) + puntosVisitante;
      equipoLocal.triesAFavor = (equipoLocal.triesAFavor || 0) + triesLocal;
      equipoLocal.triesEnContra = (equipoLocal.triesEnContra || 0) + triesVisitante;
      
      // Actualizar estadísticas del equipo visitante
      const equipoVisitante = tablaPosiciones[equipoVisitanteIndex];
      equipoVisitante.partidosJugados += 1;
      equipoVisitante.puntosAFavor = (equipoVisitante.puntosAFavor || 0) + puntosVisitante;
      equipoVisitante.puntosEnContra = (equipoVisitante.puntosEnContra || 0) + puntosLocal;
      equipoVisitante.triesAFavor = (equipoVisitante.triesAFavor || 0) + triesVisitante;
      equipoVisitante.triesEnContra = (equipoVisitante.triesEnContra || 0) + triesLocal;
      
      // Determinar resultado y asignar puntos según reglas de rugby
      let puntosLocalTabla = 0;
      let puntosVisitanteTabla = 0;
      
      if (puntosLocal > puntosVisitante) {
        // Equipo local ganó
        equipoLocal.ganados += 1;
        puntosLocalTabla = 4; // Victoria = 4 puntos
        equipoVisitante.perdidos += 1;
        puntosVisitanteTabla = 0; // Derrota = 0 puntos
        
        // Bonus defensivo para visitante si pierde por 7 puntos o menos
        if (puntosLocal - puntosVisitante <= 7) {
          puntosVisitanteTabla += 1; // Bonus defensivo
          equipoVisitante.bonusDefensivo = (equipoVisitante.bonusDefensivo || 0) + 1;
        }
        
      } else if (puntosVisitante > puntosLocal) {
        // Equipo visitante ganó
        equipoVisitante.ganados += 1;
        puntosVisitanteTabla = 4; // Victoria = 4 puntos
        equipoLocal.perdidos += 1;
        puntosLocalTabla = 0; // Derrota = 0 puntos
        
        // Bonus defensivo para local si pierde por 7 puntos o menos
        if (puntosVisitante - puntosLocal <= 7) {
          puntosLocalTabla += 1; // Bonus defensivo
          equipoLocal.bonusDefensivo = (equipoLocal.bonusDefensivo || 0) + 1;
        }
      } else {
        // Empate
        equipoLocal.empatados += 1;
        equipoVisitante.empatados += 1;
        puntosLocalTabla = 2; // Empate = 2 puntos
        puntosVisitanteTabla = 2; // Empate = 2 puntos
      }
      
      // Bonus ofensivo: +1 punto si anota 4 tries o más
      if (triesLocal >= 4) {
        puntosLocalTabla += 1;
        equipoLocal.bonusOfensivo = (equipoLocal.bonusOfensivo || 0) + 1;
      }
      
      if (triesVisitante >= 4) {
        puntosVisitanteTabla += 1;
        equipoVisitante.bonusOfensivo = (equipoVisitante.bonusOfensivo || 0) + 1;
      }
      
      // Actualizar puntos totales y diferencia
      equipoLocal.puntosTotales = (equipoLocal.puntosTotales || 0) + puntosLocalTabla;
      equipoLocal.diferencia = equipoLocal.puntosAFavor - equipoLocal.puntosEnContra;
      
      equipoVisitante.puntosTotales = (equipoVisitante.puntosTotales || 0) + puntosVisitanteTabla;
      equipoVisitante.diferencia = equipoVisitante.puntosAFavor - equipoVisitante.puntosEnContra;
      
      // Actualizar tabla de posiciones en el documento del torneo
      const fechaActualizacion = new Date();
      
      // Actualizar el documento del torneo con la tabla de posiciones actualizada
      batch.update(torneoRef, {
        tablaPosiciones: tablaPosiciones,
        fechaActualizacion: fechaActualizacion,
        updatedAt: fechaActualizacion
      });
      
      await batch.commit();
      
    } catch (error) {
      console.error('❌ Error al actualizar tabla de posiciones liga:', error);
      console.error('❌ Stack trace:', error.stack);
    }
  }

  /**
   * Actualizar tabla de posiciones para formato grupos-playoff
   * @param {Partido} partido - Partido finalizado
   * @param {Object} torneoData - Datos del torneo
   */
  static async actualizarTablaPosicionesGrupos(partido, torneoData) {
    try {
      // Para grupos-playoff, necesitamos determinar en qué grupo está el partido
      // Por ahora, asumimos que todos los equipos están en el mismo grupo general
      // En una implementación más completa, se debería determinar el grupo específico
      

      // Usar la misma lógica que la liga por ahora
      await this.actualizarTablaPosicionesLiga(partido, torneoData);
      

    } catch (error) {
      console.error('Error al actualizar tabla de posiciones grupos-playoff:', error);
    }
  }

  /**
   * Función de prueba para actualizar manualmente la tabla de posiciones
   * @param {string} torneoId - ID del torneo
   */
  static async actualizarTablaPosicionesManual(torneoId) {
    try {

      // Obtener todos los partidos finalizados del torneo
      const partidosSnapshot = await db.collection('partidos')
        .where('torneoId', '==', torneoId)
        .where('estado', '==', 'finalizado')
        .get();
      

      if (partidosSnapshot.empty) {

        return;
      }
      
      // Obtener datos del torneo
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {

        return;
      }
      
      const torneoData = torneoDoc.data();

      // Inicializar tabla de posiciones desde el documento del torneo
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
      
      // Procesar cada partido y acumular estadísticas
      for (const partidoDoc of partidosSnapshot.docs) {
        const partidoData = partidoDoc.data();
        const partido = new Partido(partidoData);
        
        // Obtener IDs y nombres de equipos
        let equipoLocalId = partido.equipoLocalId || partido.equipoLocal?.id || null;
        let equipoVisitanteId = partido.equipoVisitanteId || partido.equipoVisitante?.id || null;
        
        let equipoLocalNombre = 'Equipo Local';
        let equipoVisitanteNombre = 'Equipo Visitante';
        
        if (typeof partido.equipoLocal === 'string') {
          equipoLocalNombre = partido.equipoLocal;
        } else if (partido.equipoLocal?.nombre) {
          equipoLocalNombre = partido.equipoLocal.nombre;
        }
        
        if (typeof partido.equipoVisitante === 'string') {
          equipoVisitanteNombre = partido.equipoVisitante;
        } else if (partido.equipoVisitante?.nombre) {
          equipoVisitanteNombre = partido.equipoVisitante.nombre;
        }
        
        // Buscar IDs en el torneo si no están
        if (!equipoLocalId || !equipoVisitanteId) {
          const equiposTorneo = torneoData.equipos || [];
          if (!equipoLocalId && equipoLocalNombre) {
            const equipoLocalEncontrado = equiposTorneo.find(e => e.nombre === equipoLocalNombre);
            if (equipoLocalEncontrado) equipoLocalId = equipoLocalEncontrado.id;
          }
          if (!equipoVisitanteId && equipoVisitanteNombre) {
            const equipoVisitanteEncontrado = equiposTorneo.find(e => e.nombre === equipoVisitanteNombre);
            if (equipoVisitanteEncontrado) equipoVisitanteId = equipoVisitanteEncontrado.id;
          }
        }
        
        // Buscar o crear entradas para los equipos
        let equipoLocalIndex = tablaPosiciones.findIndex(e => e.equipoId === equipoLocalId);
        let equipoVisitanteIndex = tablaPosiciones.findIndex(e => e.equipoId === equipoVisitanteId);
        
        // Validar que tenemos los IDs
        if (!equipoLocalId || !equipoVisitanteId) {

          continue;
        }
        
        // Crear entrada para equipo local si no existe
        if (equipoLocalIndex === -1) {
          tablaPosiciones.push({
            equipoId: equipoLocalId,
            nombreEquipo: equipoLocalNombre,
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
          });
          equipoLocalIndex = tablaPosiciones.length - 1;
        }
        
        // Crear entrada para equipo visitante si no existe
        if (equipoVisitanteIndex === -1) {
          tablaPosiciones.push({
            equipoId: equipoVisitanteId,
            nombreEquipo: equipoVisitanteNombre,
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
          });
          equipoVisitanteIndex = tablaPosiciones.length - 1;
        }
        
        // Obtener datos del partido
        const puntosLocal = partido.resultado?.puntosLocal || 0;
        const puntosVisitante = partido.resultado?.puntosVisitante || 0;
        const triesLocal = partido.resultado?.triesLocal || 0;
        const triesVisitante = partido.resultado?.triesVisitante || 0;
        
        // Actualizar estadísticas del equipo local
        const equipoLocal = tablaPosiciones[equipoLocalIndex];
        equipoLocal.partidosJugados += 1;
        equipoLocal.puntosAFavor = (equipoLocal.puntosAFavor || 0) + puntosLocal;
        equipoLocal.puntosEnContra = (equipoLocal.puntosEnContra || 0) + puntosVisitante;
        equipoLocal.triesAFavor = (equipoLocal.triesAFavor || 0) + triesLocal;
        equipoLocal.triesEnContra = (equipoLocal.triesEnContra || 0) + triesVisitante;
        
        // Actualizar estadísticas del equipo visitante
        const equipoVisitante = tablaPosiciones[equipoVisitanteIndex];
        equipoVisitante.partidosJugados += 1;
        equipoVisitante.puntosAFavor = (equipoVisitante.puntosAFavor || 0) + puntosVisitante;
        equipoVisitante.puntosEnContra = (equipoVisitante.puntosEnContra || 0) + puntosLocal;
        equipoVisitante.triesAFavor = (equipoVisitante.triesAFavor || 0) + triesVisitante;
        equipoVisitante.triesEnContra = (equipoVisitante.triesEnContra || 0) + triesLocal;
        
        // Determinar resultado y asignar puntos según reglas de rugby
        let puntosLocalTabla = 0;
        let puntosVisitanteTabla = 0;
        
        if (puntosLocal > puntosVisitante) {
          equipoLocal.ganados += 1;
          puntosLocalTabla = 4; // Victoria = 4 puntos
          equipoVisitante.perdidos += 1;
          puntosVisitanteTabla = 0;
          
          // Bonus defensivo para visitante
          if (puntosLocal - puntosVisitante <= 7) {
            puntosVisitanteTabla += 1;
            equipoVisitante.bonusDefensivo = (equipoVisitante.bonusDefensivo || 0) + 1;
          }
        } else if (puntosVisitante > puntosLocal) {
          equipoVisitante.ganados += 1;
          puntosVisitanteTabla = 4;
          equipoLocal.perdidos += 1;
          puntosLocalTabla = 0;
          
          // Bonus defensivo para local
          if (puntosVisitante - puntosLocal <= 7) {
            puntosLocalTabla += 1;
            equipoLocal.bonusDefensivo = (equipoLocal.bonusDefensivo || 0) + 1;
          }
        } else {
          // Empate
          equipoLocal.empatados += 1;
          equipoVisitante.empatados += 1;
          puntosLocalTabla = 2;
          puntosVisitanteTabla = 2;
        }
        
        // Bonus ofensivo
        if (triesLocal >= 4) {
          puntosLocalTabla += 1;
          equipoLocal.bonusOfensivo = (equipoLocal.bonusOfensivo || 0) + 1;
        }
        if (triesVisitante >= 4) {
          puntosVisitanteTabla += 1;
          equipoVisitante.bonusOfensivo = (equipoVisitante.bonusOfensivo || 0) + 1;
        }
        
        // Actualizar puntos totales y diferencia
        equipoLocal.puntosTotales = (equipoLocal.puntosTotales || 0) + puntosLocalTabla;
        equipoLocal.diferencia = equipoLocal.puntosAFavor - equipoLocal.puntosEnContra;
        
        equipoVisitante.puntosTotales = (equipoVisitante.puntosTotales || 0) + puntosVisitanteTabla;
        equipoVisitante.diferencia = equipoVisitante.puntosAFavor - equipoVisitante.puntosEnContra;
      }
      
      // Guardar tabla de posiciones actualizada en el documento del torneo
      const fechaActualizacion = new Date();
      await torneoDoc.ref.update({
        tablaPosiciones: tablaPosiciones,
        fechaActualizacion: fechaActualizacion,
        updatedAt: fechaActualizacion
      });
      

    } catch (error) {
      console.error('❌ Error en actualización manual:', error);
      console.error('❌ Stack trace:', error.stack);
    }
  }

  // Obtener partido por ID
  static async getPartidoById(partidoId) {
    try {
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      if (!partidoDoc.exists) {
        throw new Error('Partido no encontrado');
      }

      return { id: partidoId, ...partidoDoc.data() };

    } catch (error) {
      throw new Error(`Error al obtener partido: ${error.message}`);
    }
  }

  // Obtener todos los partidos con filtros
  static async getPartidos(filtros = {}) {
    try {
      let query = db.collection('partidos');

      // Aplicar filtros
      if (filtros.estado) {
        query = query.where('estado', '==', filtros.estado);
      }

      if (filtros.torneoId) {
        query = query.where('torneoId', '==', filtros.torneoId);
      }

      if (filtros.fecha) {
        const fechaInicio = new Date(filtros.fecha);
        const fechaFin = new Date(filtros.fecha);
        fechaFin.setDate(fechaFin.getDate() + 1);
        
        query = query.where('fecha', '>=', fechaInicio)
                    .where('fecha', '<', fechaFin);
      }

      const snapshot = await query.orderBy('fecha', 'asc').get();
      const partidos = [];

      snapshot.forEach(doc => {
        partidos.push({ id: doc.id, ...doc.data() });
      });

      return partidos;

    } catch (error) {
      throw new Error(`Error al obtener partidos: ${error.message}`);
    }
  }

  /**
   * Actualizar fixture del torneo cuando se crea un partido
   * @param {string} torneoId - ID del torneo
   * @param {string} partidoId - ID del partido creado
   * @param {Object} partidoData - Datos del partido
   */
  static async actualizarFixtureTorneo(torneoId, partidoId, partidoData) {
    try {

      // Obtener el torneo
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {

        return;
      }

      const torneoData = torneoDoc.data();
      const fixture = torneoData.fixture || [];
      
      // Determinar la jornada del partido
      const jornada = partidoData.jornada || 1;
      
      // Buscar si ya existe la jornada en el fixture
      let jornadaExistente = fixture.find(j => j.numero === jornada);
      
      if (!jornadaExistente) {
        // Crear nueva jornada
        jornadaExistente = {
          numero: jornada,
          fecha: partidoData.fecha,
          partidos: []
        };
        fixture.push(jornadaExistente);
      }
      
      // Obtener datos completos de los equipos para incluir logos
      const equipoLocalDoc = await db.collection('equipos').doc(partidoData.equipoLocal.id).get();
      const equipoVisitanteDoc = await db.collection('equipos').doc(partidoData.equipoVisitante.id).get();
      
      const equipoLocalData = equipoLocalDoc.exists ? equipoLocalDoc.data() : {};
      const equipoVisitanteData = equipoVisitanteDoc.exists ? equipoVisitanteDoc.data() : {};
      
      // Agregar el partido a la jornada
      const partidoFixture = {
        id: partidoId,
        equipoLocal: {
          id: partidoData.equipoLocal.id,
          nombre: partidoData.equipoLocal.nombre,
          logo: equipoLocalData.logo || null
        },
        equipoVisitante: {
          id: partidoData.equipoVisitante.id,
          nombre: partidoData.equipoVisitante.nombre,
          logo: equipoVisitanteData.logo || null
        },
        fecha: partidoData.fecha,
        hora: partidoData.horaInicio,
        cancha: {
          id: partidoData.cancha.id,
          nombre: partidoData.cancha.nombre
        },
        arbitro: {
          id: partidoData.arbitros.principal.id,
          nombre: partidoData.arbitros.principal.nombre
        },
        estado: partidoData.estado,
        resultado: partidoData.resultado
      };
      
      jornadaExistente.partidos.push(partidoFixture);
      
      // Ordenar fixture por número de jornada
      fixture.sort((a, b) => a.numero - b.numero);
      
      // Actualizar el torneo
      await db.collection('torneos').doc(torneoId).update({
        fixture: fixture,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error(`❌ Error actualizando fixture del torneo ${torneoId}:`, error);
      // No lanzar error para no interrumpir la creación del partido
    }
  }

  /**
   * Verificar si se puede progresar a la siguiente fase en un torneo de eliminación directa
   * @param {string} torneoId - ID del torneo
   * @param {string} partidoId - ID del partido que se acaba de finalizar
   */
  /**
   * Actualizar partidos que tienen referencias a un partido finalizado
   * @param {string} partidoFinalizadoId - ID del partido que se finalizó
   * @param {Object} partidoData - Datos del partido finalizado
   */
  static async actualizarPartidosConReferencias(partidoFinalizadoId, partidoData) {
    try {
      // Determinar ganador y perdedor
      const puntosLocal = partidoData.resultado?.puntosLocal || 0;
      const puntosVisitante = partidoData.resultado?.puntosVisitante || 0;
      
      let equipoGanador, equipoPerdedor;
      
      if (puntosLocal > puntosVisitante) {
        // Local ganó
        equipoGanador = {
          id: partidoData.equipoLocalId,
          nombre: partidoData.equipoLocal,
          logo: partidoData.equipoLocalLogo
        };
        equipoPerdedor = {
          id: partidoData.equipoVisitanteId,
          nombre: partidoData.equipoVisitante,
          logo: partidoData.equipoVisitanteLogo
        };
      } else if (puntosVisitante > puntosLocal) {
        // Visitante ganó
        equipoGanador = {
          id: partidoData.equipoVisitanteId,
          nombre: partidoData.equipoVisitante,
          logo: partidoData.equipoVisitanteLogo
        };
        equipoPerdedor = {
          id: partidoData.equipoLocalId,
          nombre: partidoData.equipoLocal,
          logo: partidoData.equipoLocalLogo
        };
      } else {
        // Empate - no actualizar referencias por ahora
        return;
      }
      
      // Obtener todos los partidos del torneo
      const partidosSnapshot = await db.collection('partidos')
        .where('torneoId', '==', partidoData.torneoId)
        .get();
      
      // Determinar el número del partido finalizado
      const todosPartidos = [];
      partidosSnapshot.forEach(doc => {
        todosPartidos.push({ id: doc.id, ...doc.data() });
      });
      
      // Ordenar por jornada y luego por el número en la fase
      todosPartidos.sort((a, b) => {
        if (a.jornada !== b.jornada) return a.jornada - b.jornada;
        
        // Intentar extraer número de la fase (ej: "Partido 1" -> 1)
        const extraerNumeroFase = (fase) => {
          if (!fase) return 999; // Sin fase va al final
          const match = fase.match(/(\d+)/); // Buscar primer número en la fase
          return match ? parseInt(match[1]) : 999;
        };
        
        const numeroA = extraerNumeroFase(a.fase);
        const numeroB = extraerNumeroFase(b.fase);
        
        if (numeroA !== numeroB) {
          return numeroA - numeroB; // Ordenar por número de fase
        }
        
        // Si tienen el mismo número o ninguno, ordenar por fecha de creación
        const fechaA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion || 0);
        const fechaB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion || 0);
        return fechaA - fechaB;
      });
      
      // Encontrar el número del partido
      const numeroPartido = todosPartidos.findIndex(p => p.id === partidoFinalizadoId) + 1;
      
      if (numeroPartido === 0) {
        return;
      }
      
      // Buscar partidos con referencias a este partido
      const referenciaGanador = `ganador_${numeroPartido}`;
      const referenciaPerdedor = `perdedor_${numeroPartido}`;
      
      let partidosActualizados = 0;
      
      for (const partidoRef of todosPartidos) {
        let debeActualizar = false;
        const updateData = {};
        
        // Verificar si el equipo local es una referencia
        if (partidoRef.equipoLocalReferencia === referenciaGanador) {
          updateData.equipoLocalId = equipoGanador.id;
          updateData.equipoLocal = equipoGanador.nombre;
          updateData.equipoLocalLogo = equipoGanador.logo || '';
          updateData.equipoLocalReferencia = admin.firestore.FieldValue.delete();
          debeActualizar = true;
        } else if (partidoRef.equipoLocalReferencia === referenciaPerdedor) {
          updateData.equipoLocalId = equipoPerdedor.id;
          updateData.equipoLocal = equipoPerdedor.nombre;
          updateData.equipoLocalLogo = equipoPerdedor.logo || '';
          updateData.equipoLocalReferencia = admin.firestore.FieldValue.delete();
          debeActualizar = true;
        }
        
        // Verificar si el equipo visitante es una referencia
        if (partidoRef.equipoVisitanteReferencia === referenciaGanador) {
          updateData.equipoVisitanteId = equipoGanador.id;
          updateData.equipoVisitante = equipoGanador.nombre;
          updateData.equipoVisitanteLogo = equipoGanador.logo || '';
          updateData.equipoVisitanteReferencia = admin.firestore.FieldValue.delete();
          debeActualizar = true;
        } else if (partidoRef.equipoVisitanteReferencia === referenciaPerdedor) {
          updateData.equipoVisitanteId = equipoPerdedor.id;
          updateData.equipoVisitante = equipoPerdedor.nombre;
          updateData.equipoVisitanteLogo = equipoPerdedor.logo || '';
          updateData.equipoVisitanteReferencia = admin.firestore.FieldValue.delete();
          debeActualizar = true;
        }
        
        // Si hay que actualizar, hacerlo
        if (debeActualizar) {
          await db.collection('partidos').doc(partidoRef.id).update(updateData);
          partidosActualizados++;
        }
      }
      
    } catch (error) {
      console.error('❌ Error actualizando partidos con referencias:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  static async verificarProgresionEliminacionDirecta(torneoId, partidoId = null) {
    try {

      // Obtener datos del torneo
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (!torneoDoc.exists) {

        return; // No es un torneo válido
      }

      const torneoData = torneoDoc.data();
      
      // Solo procesar torneos de eliminación directa
      if (torneoData.formato !== 'eliminacion_directa') {

        return;
      }

      const estructuraEliminacion = torneoData.estructuraEliminacion;
      if (!estructuraEliminacion || !estructuraEliminacion.fases) {

        return;
      }

      const faseActual = estructuraEliminacion.fases[estructuraEliminacion.faseActual];
      if (!faseActual) {

        return;
      }


      // Si se proporciona un partidoId específico, procesar solo ese partido
      if (partidoId) {
        await this.procesarPartidoIndividual(torneoId, partidoId, estructuraEliminacion, faseActual);
      } else {
        // Lógica original: verificar todos los partidos de la fase
        await this.verificarTodosLosPartidos(torneoId, estructuraEliminacion, faseActual);
      }

    } catch (error) {
      console.error('❌ Error verificando progresión de eliminación directa:', error);
      // No lanzar error para evitar interrumpir la finalización del partido
    }
  }

  /**
   * Procesar un partido individual que se acaba de finalizar
   */
  static async procesarPartidoIndividual(torneoId, partidoId, estructuraEliminacion, faseActual) {
    try {

      // Obtener datos del partido
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      if (!partidoDoc.exists) {

        return;
      }

      const partidoData = partidoDoc.data();
      
      // Verificar que el partido está finalizado
      if (partidoData.estado !== 'finalizado') {

        return;
      }

      // Determinar el ganador
      const TorneoService = require('./TorneoService');
      const ganador = TorneoService.determinarGanador(partidoData);
      
      if (!ganador) {

        return;
      }


      // Encontrar la llave correspondiente en la fase actual
      const llaveIndex = faseActual.llaves.findIndex(llave => llave.partidoId === partidoId);
      if (llaveIndex === -1) {

        return;
      }

      const llave = faseActual.llaves[llaveIndex];

      // Actualizar la llave con el ganador
      llave.ganador = ganador;

      // Verificar si ya existe la siguiente fase
      const siguienteFaseIndex = estructuraEliminacion.faseActual + 1;
      if (siguienteFaseIndex < estructuraEliminacion.fases.length) {
        const siguienteFase = estructuraEliminacion.fases[siguienteFaseIndex];

        // Determinar en qué llave de la siguiente fase debe ir este ganador
        const llaveSiguienteIndex = Math.floor(llaveIndex / 2);
        const posicionEnLlave = llaveIndex % 2; // 0 = equipo1, 1 = equipo2

        if (llaveSiguienteIndex < siguienteFase.llaves.length) {
          const llaveSiguiente = siguienteFase.llaves[llaveSiguienteIndex];
          
          if (posicionEnLlave === 0) {
            llaveSiguiente.equipo1 = ganador;

          } else {
            llaveSiguiente.equipo2 = ganador;

          }

          // Si ambos equipos de la llave están asignados, crear el partido
          if (llaveSiguiente.equipo1 && llaveSiguiente.equipo2 && !llaveSiguiente.partidoId) {

            // Crear solo el partido de esta llave específica
            const partidoId = await this.crearPartidoIndividual(torneoId, siguienteFase, llaveSiguiente, [], []);
            llaveSiguiente.partidoId = partidoId;

          }
        }
      }

      // Si es la final, actualizar el campeón del torneo
      if (faseActual.nombre === 'Final') {

        // Actualizar el torneo con el campeón
        await db.collection('torneos').doc(torneoId).update({
          estructuraEliminacion: estructuraEliminacion,
          campeon: ganador,
          subcampeon: llave.equipo1.id === ganador.id ? llave.equipo2 : llave.equipo1,
          estado: 'finalizado',
          fechaFinalizacion: new Date(),
          updatedAt: new Date()
        });


      } else {
        // Actualizar solo la estructura para otras fases
        await db.collection('torneos').doc(torneoId).update({
          estructuraEliminacion: estructuraEliminacion,
          updatedAt: new Date()
        });
      }


    } catch (error) {
      console.error('❌ Error procesando partido individual:', error);
    }
  }

  /**
   * Crear un partido individual para una llave específica
   */
  static async crearPartidoIndividual(torneoId, fase, llave, canchas = [], arbitros = []) {
    try {

      // Obtener datos del torneo para categoría y nombre
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      const torneoData = torneoDoc.exists ? torneoDoc.data() : {};
      const torneoNombre = torneoData.nombre || '';
      const categoria = torneoData.categoria || '';

      // Asignar cancha y árbitro rotando entre los disponibles
      const canchaAsignada = canchas.length > 0 ? canchas[0] : null;
      const arbitroAsignado = arbitros.length > 0 ? arbitros[0] : null;

      const partidoRef = db.collection('partidos').doc();
      const partidoId = partidoRef.id;

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

      // Guardar en la base de datos
      await partidoRef.set(partidoData);
      

      return partidoId;

    } catch (error) {
      console.error('❌ Error creando partido individual:', error);
      throw error;
    }
  }

  /**
   * Verificar todos los partidos de la fase (lógica original)
   */
  static async verificarTodosLosPartidos(torneoId, estructuraEliminacion, faseActual) {
    try {
      // Verificar que todos los partidos de la fase actual están finalizados
      const partidosFaseActual = await db.collection('partidos')
        .where('torneoId', '==', torneoId)
        .where('fase', '==', faseActual.nombre)
        .get();

      const partidosFinalizados = partidosFaseActual.docs.filter(doc => {
        const estado = doc.data().estado;
        return estado === 'finalizado';
      });

      // Si todos los partidos de la fase están finalizados, progresar automáticamente
      if (partidosFinalizados.length === faseActual.partidosPorFase) {
        const TorneoService = require('./TorneoService');
        await TorneoService.progresarFaseEliminacionDirecta(torneoId);
      }

    } catch (error) {
      console.error('❌ Error verificando todos los partidos:', error);
    }
  }

  /**
   * Actualizar estadísticas de jugadores al finalizar un partido
   * @param {string} partidoId - ID del partido
   * @param {Object} partido - Datos del partido
   */
  static async actualizarEstadisticasJugadores(partidoId, partido) {
    try {

      // Obtener listas de convocados de ambos equipos
      const [convocadosLocalSnapshot, convocadosVisitanteSnapshot] = await Promise.all([
        db.collection('convocados')
          .where('partidoId', '==', partidoId)
          .where('equipoId', '==', partido.equipoLocalId)
          .get(),
        db.collection('convocados')
          .where('partidoId', '==', partidoId)
          .where('equipoId', '==', partido.equipoVisitanteId)
          .get()
      ]);

      const todosConvocados = [];
      
      // Procesar convocados del equipo local
      convocadosLocalSnapshot.forEach(doc => {
        const convocadosData = doc.data();
        if (convocadosData.jugadores && Array.isArray(convocadosData.jugadores)) {
          convocadosData.jugadores.forEach(jugador => {
            todosConvocados.push({
              ...jugador,
              equipoId: partido.equipoLocalId,
              esLocal: true
            });
          });
        }
      });

      // Procesar convocados del equipo visitante
      convocadosVisitanteSnapshot.forEach(doc => {
        const convocadosData = doc.data();
        if (convocadosData.jugadores && Array.isArray(convocadosData.jugadores)) {
          convocadosData.jugadores.forEach(jugador => {
            todosConvocados.push({
              ...jugador,
              equipoId: partido.equipoVisitanteId,
              esLocal: false
            });
          });
        }
      });

      // Procesar cada jugador convocado
      for (const jugadorConvocado of todosConvocados) {
        try {
          await this.actualizarEstadisticasJugadorIndividual(partidoId, partido, jugadorConvocado);
        } catch (error) {
          console.error(`❌ Error actualizando estadísticas del jugador ${jugadorConvocado.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error actualizando estadísticas de jugadores:', error);
      throw error;
    }
  }

  /**
   * Actualizar estadísticas de un jugador individual
   * @param {string} partidoId - ID del partido
   * @param {Object} partido - Datos del partido
   * @param {Object} jugadorConvocado - Datos del jugador convocado
   */
  static async actualizarEstadisticasJugadorIndividual(partidoId, partido, jugadorConvocado) {
    try {
      const jugadorId = jugadorConvocado.id;
      
      // Obtener datos actuales del jugador
      const jugadorDoc = await db.collection('jugadores').doc(jugadorId).get();
      if (!jugadorDoc.exists) {
        return;
      }

      const jugadorData = jugadorDoc.data();
      const estadisticasActuales = jugadorData.estadisticas || {};

      // Contar incidencias del partido para este jugador
      const triesEnPartido = this.contarTriesJugador(partido, jugadorId);
      const tarjetasAmarillasEnPartido = this.contarTarjetasAmarillasJugador(partido, jugadorId);
      const tarjetasRojasEnPartido = this.contarTarjetasRojasJugador(partido, jugadorId);

      // Valores actuales (respetando nombres de campos existentes en la colección)
      const partidosJugadosActual = Number(estadisticasActuales.partidosjugados || 0);
      const triesActual = Number(estadisticasActuales.tries || 0);
      const amarillasActual = Number(estadisticasActuales.tarjetasAmarillas || 0);
      const rojasActual = Number(estadisticasActuales.tarjetasRojas || 0);

      // Nuevos valores
      const partidosJugadosNuevo = partidosJugadosActual + 1;
      const triesNuevo = triesActual + triesEnPartido;
      const amarillasNueva = amarillasActual + tarjetasAmarillasEnPartido;
      const rojasNueva = rojasActual + tarjetasRojasEnPartido;

      // Actualizar solo los campos requeridos
      await db.collection('jugadores').doc(jugadorId).update({
        'estadisticas.partidosjugados': partidosJugadosNuevo,
        'estadisticas.tries': triesNuevo,
        'estadisticas.tarjetasAmarillas': amarillasNueva,
        'estadisticas.tarjetasRojas': rojasNueva,
        fechaActualizacion: new Date()
      });

    } catch (error) {
      console.error(`❌ Error actualizando estadísticas del jugador ${jugadorConvocado.id}:`, error);
      throw error;
    }
  }

  /**
   * Contar tries de un jugador en un partido
   * @param {Object} partido - Datos del partido
   * @param {string} jugadorId - ID del jugador
   * @returns {number} - Número de tries
   */
  static contarTriesJugador(partido, jugadorId) {
    let tries = 0;
    
    if (partido.incidencias && Array.isArray(partido.incidencias)) {
      partido.incidencias.forEach(incidencia => {
        const tipo = (incidencia.tipo || '').toString();
        // Soportar ambos formatos: 'TRY' y 'try'
        if (incidencia.jugadorId === jugadorId && (tipo === 'TRY' || tipo === 'try')) {
          tries += 1;
        }
      });
    }

    return tries;
  }

  /**
   * Contar tarjetas amarillas de un jugador en un partido
   * @param {Object} partido - Datos del partido
   * @param {string} jugadorId - ID del jugador
   * @returns {number} - Número de tarjetas amarillas
   */
  static contarTarjetasAmarillasJugador(partido, jugadorId) {
    let tarjetasAmarillas = 0;
    
    if (partido.incidencias && Array.isArray(partido.incidencias)) {
      partido.incidencias.forEach(incidencia => {
        const tipo = (incidencia.tipo || '').toString();
        if (incidencia.jugadorId === jugadorId && (tipo === 'tarjeta_amarilla' || tipo === 'TARJETA_AMARILLA')) {
          tarjetasAmarillas += 1;
        }
      });
    }

    return tarjetasAmarillas;
  }

  /**
   * Contar tarjetas rojas de un jugador en un partido
   * @param {Object} partido - Datos del partido
   * @param {string} jugadorId - ID del jugador
   * @returns {number} - Número de tarjetas rojas
   */
  static contarTarjetasRojasJugador(partido, jugadorId) {
    let tarjetasRojas = 0;
    
    if (partido.incidencias && Array.isArray(partido.incidencias)) {
      partido.incidencias.forEach(incidencia => {
        const tipo = (incidencia.tipo || '').toString();
        if (incidencia.jugadorId === jugadorId && (tipo === 'tarjeta_roja' || tipo === 'TARJETA_ROJA')) {
          tarjetasRojas += 1;
        }
      });
    }

    return tarjetasRojas;
  }

}

module.exports = PartidoService;


