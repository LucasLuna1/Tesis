/**
 * Servicio para validaciones de consistencia de datos
 * User Story 1.2: Validar que los datos de equipos, jugadores y árbitros sean consistentes antes de iniciar un partido
 */

const { db } = require('../config/firebase');

class ValidacionesService {
  
  // Validar consistencia completa antes de iniciar un partido
  static async validarConsistenciaPartido(partidoId) {
    try {
      const partidoDoc = await db.collection('partidos').doc(partidoId).get();
      
      if (!partidoDoc.exists) {
        throw new Error('Partido no encontrado');
      }
      
      const partido = partidoDoc.data();
      const validaciones = {
        partidoId,
        fechaValidacion: new Date(),
        valido: true,
        errores: [],
        advertencias: [],
        detalles: {}
      };
      
      // Validar equipos
      const validacionEquipos = await this.validarEquipos(partido);
      validaciones.detalles.equipos = validacionEquipos;
      if (!validacionEquipos.valido) {
        validaciones.valido = false;
        validaciones.errores.push(...validacionEquipos.errores);
      }
      validaciones.advertencias.push(...validacionEquipos.advertencias);
      
      // Validar árbitros
      const validacionArbitros = await this.validarArbitros(partido);
      validaciones.detalles.arbitros = validacionArbitros;
      if (!validacionArbitros.valido) {
        validaciones.valido = false;
        validaciones.errores.push(...validacionArbitros.errores);
      }
      validaciones.advertencias.push(...validacionArbitros.advertencias);
      
      // Validar cancha
      const validacionCancha = await this.validarCancha(partido);
      validaciones.detalles.cancha = validacionCancha;
      if (!validacionCancha.valido) {
        validaciones.valido = false;
        validaciones.errores.push(...validacionCancha.errores);
      }
      validaciones.advertencias.push(...validacionCancha.advertencias);
      
      // Validar jugadores
      const validacionJugadores = await this.validarJugadores(partido);
      validaciones.detalles.jugadores = validacionJugadores;
      if (!validacionJugadores.valido) {
        validaciones.valido = false;
        validaciones.errores.push(...validacionJugadores.errores);
      }
      validaciones.advertencias.push(...validacionJugadores.advertencias);
      
      // Validar horarios y fechas
      const validacionHorarios = this.validarHorarios(partido);
      validaciones.detalles.horarios = validacionHorarios;
      if (!validacionHorarios.valido) {
        validaciones.valido = false;
        validaciones.errores.push(...validacionHorarios.errores);
      }
      validaciones.advertencias.push(...validacionHorarios.advertencias);
      
      return validaciones;
      
    } catch (error) {
      throw new Error(`Error validando consistencia del partido: ${error.message}`);
    }
  }
  
  // Validar equipos del partido
  static async validarEquipos(partido) {
    const validacion = {
      valido: true,
      errores: [],
      advertencias: [],
      equipos: {}
    };
    
    try {
      // Validar equipo local
      if (partido.equipoLocal?.id) {
        const equipoLocalDoc = await db.collection('equipos').doc(partido.equipoLocal.id).get();
        
        if (!equipoLocalDoc.exists) {
          validacion.valido = false;
          validacion.errores.push('Equipo local no existe en la base de datos');
        } else {
          const equipoLocal = equipoLocalDoc.data();
          validacion.equipos.local = {
            existe: true,
            activo: equipoLocal.activo,
            nombre: equipoLocal.nombre,
            jugadoresRegistrados: equipoLocal.jugadores?.length || 0
          };
          
          if (!equipoLocal.activo) {
            validacion.valido = false;
            validacion.errores.push('El equipo local está inactivo');
          }
          
          if ((equipoLocal.jugadores?.length || 0) < 11) {
            validacion.advertencias.push('El equipo local tiene menos de 11 jugadores registrados');
          }
        }
      } else {
        validacion.valido = false;
        validacion.errores.push('Equipo local no especificado');
      }
      
      // Validar equipo visitante
      if (partido.equipoVisitante?.id) {
        const equipoVisitanteDoc = await db.collection('equipos').doc(partido.equipoVisitante.id).get();
        
        if (!equipoVisitanteDoc.exists) {
          validacion.valido = false;
          validacion.errores.push('Equipo visitante no existe en la base de datos');
        } else {
          const equipoVisitante = equipoVisitanteDoc.data();
          validacion.equipos.visitante = {
            existe: true,
            activo: equipoVisitante.activo,
            nombre: equipoVisitante.nombre,
            jugadoresRegistrados: equipoVisitante.jugadores?.length || 0
          };
          
          if (!equipoVisitante.activo) {
            validacion.valido = false;
            validacion.errores.push('El equipo visitante está inactivo');
          }
          
          if ((equipoVisitante.jugadores?.length || 0) < 11) {
            validacion.advertencias.push('El equipo visitante tiene menos de 11 jugadores registrados');
          }
        }
      } else {
        validacion.valido = false;
        validacion.errores.push('Equipo visitante no especificado');
      }
      
      // Validar que no sean el mismo equipo
      if (partido.equipoLocal?.id === partido.equipoVisitante?.id) {
        validacion.valido = false;
        validacion.errores.push('El equipo local y visitante no pueden ser el mismo');
      }
      
    } catch (error) {
      validacion.valido = false;
      validacion.errores.push(`Error validando equipos: ${error.message}`);
    }
    
    return validacion;
  }
  
  // Validar árbitros del partido
  static async validarArbitros(partido) {
    const validacion = {
      valido: true,
      errores: [],
      advertencias: [],
      arbitros: {}
    };
    
    try {
      // Validar árbitro principal
      if (partido.arbitros?.principal?.id) {
        const arbitroPrincipalDoc = await db.collection('arbitros').doc(partido.arbitros.principal.id).get();
        
        if (!arbitroPrincipalDoc.exists) {
          validacion.valido = false;
          validacion.errores.push('Árbitro principal no existe en la base de datos');
        } else {
          const arbitroPrincipal = arbitroPrincipalDoc.data();
          validacion.arbitros.principal = {
            existe: true,
            activo: arbitroPrincipal.activo,
            disponible: arbitroPrincipal.disponible,
            certificacion: arbitroPrincipal.certificacion,
            nombre: arbitroPrincipal.nombre + ' ' + arbitroPrincipal.apellido
          };
          
          if (!arbitroPrincipal.activo) {
            validacion.valido = false;
            validacion.errores.push('El árbitro principal está inactivo');
          }
          
          if (!arbitroPrincipal.disponible) {
            validacion.advertencias.push('El árbitro principal no está disponible');
          }
          
          if (!arbitroPrincipal.certificacion) {
            validacion.advertencias.push('El árbitro principal no tiene certificación registrada');
          }
        }
      } else {
        validacion.valido = false;
        validacion.errores.push('Árbitro principal no especificado');
      }
      
      // Validar árbitros asistentes (opcional pero recomendado)
      const asistentes = ['asistente1', 'asistente2', 'cuartoArbitro'];
      let asistentesValidos = 0;
      
      for (const tipo of asistentes) {
        if (partido.arbitros?.[tipo]?.id) {
          const arbitroDoc = await db.collection('arbitros').doc(partido.arbitros[tipo].id).get();
          
          if (!arbitroDoc.exists) {
            validacion.advertencias.push(`Árbitro ${tipo} no existe en la base de datos`);
          } else {
            const arbitro = arbitroDoc.data();
            validacion.arbitros[tipo] = {
              existe: true,
              activo: arbitro.activo,
              disponible: arbitro.disponible,
              nombre: arbitro.nombre + ' ' + arbitro.apellido
            };
            
            if (arbitro.activo && arbitro.disponible) {
              asistentesValidos++;
            } else {
              validacion.advertencias.push(`Árbitro ${tipo} no está activo o disponible`);
            }
          }
        }
      }
      
      if (asistentesValidos < 2) {
        validacion.advertencias.push('Se recomienda tener al menos 2 árbitros asistentes');
      }
      
    } catch (error) {
      validacion.valido = false;
      validacion.errores.push(`Error validando árbitros: ${error.message}`);
    }
    
    return validacion;
  }
  
  // Validar cancha del partido
  static async validarCancha(partido) {
    const validacion = {
      valido: true,
      errores: [],
      advertencias: [],
      cancha: {}
    };
    
    try {
      if (partido.cancha?.id) {
        const canchaDoc = await db.collection('canchas').doc(partido.cancha.id).get();
        
        if (!canchaDoc.exists) {
          validacion.valido = false;
          validacion.errores.push('Cancha no existe en la base de datos');
        } else {
          const cancha = canchaDoc.data();
          validacion.cancha = {
            existe: true,
            activa: cancha.activa,
            disponible: cancha.disponible,
            enMantenimiento: cancha.mantenimiento,
            nombre: cancha.nombre,
            capacidad: cancha.capacidad
          };
          
          if (!cancha.activa) {
            validacion.valido = false;
            validacion.errores.push('La cancha está inactiva');
          }
          
          if (!cancha.disponible) {
            validacion.valido = false;
            validacion.errores.push('La cancha no está disponible');
          }
          
          if (cancha.mantenimiento) {
            validacion.valido = false;
            validacion.errores.push('La cancha está en mantenimiento');
          }
        }
      } else {
        validacion.valido = false;
        validacion.errores.push('Cancha no especificada');
      }
      
    } catch (error) {
      validacion.valido = false;
      validacion.errores.push(`Error validando cancha: ${error.message}`);
    }
    
    return validacion;
  }
  
  // Validar jugadores de los equipos
  static async validarJugadores(partido) {
    const validacion = {
      valido: true,
      errores: [],
      advertencias: [],
      jugadores: {}
    };
    
    try {
      // Validar jugadores del equipo local
      if (partido.equipoLocal?.id) {
        const equipoLocalDoc = await db.collection('equipos').doc(partido.equipoLocal.id).get();
        if (equipoLocalDoc.exists) {
          const equipoLocal = equipoLocalDoc.data();
          const jugadoresLocal = equipoLocal.jugadores || [];
          
          validacion.jugadores.local = {
            total: jugadoresLocal.length,
            activos: jugadoresLocal.filter(j => j.activo).length,
            titulares: jugadoresLocal.filter(j => j.titular).length
          };
          
          if (jugadoresLocal.length < 11) {
            validacion.advertencias.push('El equipo local tiene menos de 11 jugadores');
          }
          
          if (jugadoresLocal.filter(j => j.activo).length < 11) {
            validacion.advertencias.push('El equipo local tiene menos de 11 jugadores activos');
          }
        }
      }
      
      // Validar jugadores del equipo visitante
      if (partido.equipoVisitante?.id) {
        const equipoVisitanteDoc = await db.collection('equipos').doc(partido.equipoVisitante.id).get();
        if (equipoVisitanteDoc.exists) {
          const equipoVisitante = equipoVisitanteDoc.data();
          const jugadoresVisitante = equipoVisitante.jugadores || [];
          
          validacion.jugadores.visitante = {
            total: jugadoresVisitante.length,
            activos: jugadoresVisitante.filter(j => j.activo).length,
            titulares: jugadoresVisitante.filter(j => j.titular).length
          };
          
          if (jugadoresVisitante.length < 11) {
            validacion.advertencias.push('El equipo visitante tiene menos de 11 jugadores');
          }
          
          if (jugadoresVisitante.filter(j => j.activo).length < 11) {
            validacion.advertencias.push('El equipo visitante tiene menos de 11 jugadores activos');
          }
        }
      }
      
    } catch (error) {
      validacion.valido = false;
      validacion.errores.push(`Error validando jugadores: ${error.message}`);
    }
    
    return validacion;
  }
  
  // Validar horarios y fechas
  static validarHorarios(partido) {
    const validacion = {
      valido: true,
      errores: [],
      advertencias: [],
      horarios: {}
    };
    
    try {
      const ahora = new Date();
      const fechaPartido = new Date(partido.fecha);
      
      validacion.horarios = {
        fechaPartido: fechaPartido,
        horaInicio: partido.horaInicio,
        esFuturo: fechaPartido > ahora,
        esHoy: fechaPartido.toDateString() === ahora.toDateString()
      };
      
      // Validar que la fecha no sea en el pasado
      if (fechaPartido < ahora && partido.estado === 'programado') {
        validacion.valido = false;
        validacion.errores.push('La fecha del partido no puede ser en el pasado');
      }
      
      // Validar formato de hora
      if (partido.horaInicio && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(partido.horaInicio)) {
        validacion.valido = false;
        validacion.errores.push('Formato de hora inválido');
      }
      
      // Advertencias sobre horarios
      if (partido.horaInicio) {
        const [hora, minuto] = partido.horaInicio.split(':').map(Number);
        if (hora < 8 || hora > 22) {
          validacion.advertencias.push('El horario del partido está fuera del rango recomendado (8:00 - 22:00)');
        }
      }
      
    } catch (error) {
      validacion.valido = false;
      validacion.errores.push(`Error validando horarios: ${error.message}`);
    }
    
    return validacion;
  }
  
  // Validar disponibilidad de recursos (cancha, árbitros) en una fecha/hora específica
  static async validarDisponibilidad(fecha, hora, canchaId, arbitroId) {
    try {
      const fechaInicio = new Date(`${fecha}T${hora}:00`);
      const fechaFin = new Date(fechaInicio.getTime() + (2 * 60 * 60 * 1000)); // 2 horas después
      
      const validacion = {
        valido: true,
        errores: [],
        advertencias: [],
        conflictos: []
      };
      
      // Verificar conflictos de cancha
      const conflictosCancha = await db.collection('partidos')
        .where('cancha.id', '==', canchaId)
        .where('fecha', '>=', fechaInicio)
        .where('fecha', '<=', fechaFin)
        .get();
      
      if (!conflictosCancha.empty) {
        validacion.valido = false;
        validacion.errores.push('La cancha ya está ocupada en ese horario');
        conflictosCancha.forEach(doc => {
          validacion.conflictos.push({
            tipo: 'cancha',
            partidoId: doc.id,
            fecha: doc.data().fecha,
            hora: doc.data().horaInicio
          });
        });
      }
      
      // Verificar conflictos de árbitro
      const conflictosArbitro = await db.collection('partidos')
        .where('arbitros.principal.id', '==', arbitroId)
        .where('fecha', '>=', fechaInicio)
        .where('fecha', '<=', fechaFin)
        .get();
      
      if (!conflictosArbitro.empty) {
        validacion.valido = false;
        validacion.errores.push('El árbitro ya tiene un partido asignado en ese horario');
        conflictosArbitro.forEach(doc => {
          validacion.conflictos.push({
            tipo: 'arbitro',
            partidoId: doc.id,
            fecha: doc.data().fecha,
            hora: doc.data().horaInicio
          });
        });
      }
      
      return validacion;
      
    } catch (error) {
      throw new Error(`Error validando disponibilidad: ${error.message}`);
    }
  }
}

module.exports = ValidacionesService;
