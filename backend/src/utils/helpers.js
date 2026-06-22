// Formatear fechas
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatDateForDisplay = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Generar fixture automático
const generarFixture = (equipos, tipo = 'todos_contra_todos', idaYvuelta = false) => {
  if (!equipos || equipos.length < 2) {
    return [];
  }

  const fixture = [];
  const n = equipos.length;

  switch (tipo) {
    case 'todos_contra_todos':
      return generarRoundRobin(equipos, n, idaYvuelta);
    
    case 'eliminacion_directa':
      return generarEliminacionDirecta(equipos);
    
    case 'grupos_y_playoff':
      return generarGruposYPlayoff(equipos, idaYvuelta);
    
    default:
      return generarRoundRobin(equipos, n, idaYvuelta);
  }
};

// Algoritmo round-robin optimizado
const generarRoundRobin = (equipos, n, idaYvuelta = false) => {
  const fixture = [];
  const equiposRotacion = [...equipos];
  let jornadaActual = 1;
  

  // Generar primera vuelta (ida)
  for (let i = 0; i < n - 1; i++) {
    const jornada = [];

    for (let j = 0; j < Math.floor(n / 2); j++) {
      const local = equiposRotacion[j];
      const visitante = equiposRotacion[n - 1 - j];

      if (local && visitante && local.id !== visitante.id) {
        jornada.push({
          local,
          visitante,
          jornada: jornadaActual
        });
      }
    }
    
    if (jornada.length > 0) {
      fixture.push(jornada);
      jornadaActual++;
    }
    
    // Rotar equipos (mantener el primer equipo fijo)
    if (n > 2) {
      const ultimo = equiposRotacion.pop();
      equiposRotacion.splice(1, 0, ultimo);
    }
  }
  

  // Generar segunda vuelta si es ida y vuelta
  if (idaYvuelta === true || idaYvuelta === 'true') {

    // Reiniciar rotación para la vuelta
    equiposRotacion.splice(0, equiposRotacion.length, ...equipos);
    
    for (let i = 0; i < n - 1; i++) {
      const jornada = [];

      for (let j = 0; j < Math.floor(n / 2); j++) {
        const local = equiposRotacion[j];
        const visitante = equiposRotacion[n - 1 - j];

        if (local && visitante && local.id !== visitante.id) {
          // En la vuelta, intercambiar local y visitante
          jornada.push({
            local: visitante,
            visitante: local,
            jornada: jornadaActual
          });
        }
      }
      
      if (jornada.length > 0) {
        fixture.push(jornada);
        jornadaActual++;
      }
      
      // Rotar equipos (mantener el primer equipo fijo)
      if (n > 2) {
        const ultimo = equiposRotacion.pop();
        equiposRotacion.splice(1, 0, ultimo);
      }
    }
    

  } else {

  }
  
  return fixture;
};

// Eliminación directa optimizada
const generarEliminacionDirecta = (equipos) => {
  const fixture = [];
  const equiposEliminacion = [...equipos];
  
  // Calcular número de equipos por llave (potencia de 2)
  let equiposPorLlave = 2;
  while (equiposPorLlave < equiposEliminacion.length) {
    equiposPorLlave *= 2;
  }
  
  // Agregar equipos ficticios (bye) si es necesario
  while (equiposEliminacion.length < equiposPorLlave) {
    equiposEliminacion.push({
      id: `bye_${equiposEliminacion.length}`,
      nombre: 'Bye',
      logo: '',
      esBye: true
    });
  }
  
  let equiposEnFase = equiposPorLlave;
  let numeroFase = 1;
  
  while (equiposEnFase > 1) {
    const jornada = [];
    const nombreFase = obtenerNombreFase(numeroFase, equiposEnFase);

    for (let i = 0; i < equiposEnFase; i += 2) {
      const equipo1 = equiposEliminacion[i];
      const equipo2 = equiposEliminacion[i + 1];
      
      // Solo crear partido si no hay bye
      if (!equipo1?.esBye && !equipo2?.esBye) {
        jornada.push({
          local: equipo1,
          visitante: equipo2,
          fase: nombreFase,
          nroLlave: (i / 2) + 1,
          jornada: numeroFase
        });
      }
    }
    
    if (jornada.length > 0) {
      fixture.push(jornada);
    }
    
    equiposEnFase = equiposEnFase / 2;
    numeroFase++;
  }
  
  return fixture;
};

// Función auxiliar para obtener nombre de fase
const obtenerNombreFase = (numeroFase, equiposEnFase) => {
  if (equiposEnFase === 2) return 'Final';
  if (equiposEnFase === 4) return 'Semifinales';
  if (equiposEnFase === 8) return 'Cuartos de Final';
  if (equiposEnFase === 16) return 'Octavos de Final';
  if (equiposEnFase === 32) return 'Dieciseisavos de Final';
  
  return `Fase ${numeroFase}`;
};

// Grupos y playoff optimizado
const generarGruposYPlayoff = (equipos, idaYvuelta = false) => {
  const fixture = [];
  const equiposGrupos = [...equipos];
  const grupos = [];
  
  // Dividir equipos en grupos de 4
  while (equiposGrupos.length > 0) {
    const grupo = equiposGrupos.splice(0, Math.min(4, equiposGrupos.length));
    if (grupo.length >= 2) {
      grupos.push(grupo);
    }
  }

  // Generar partidos de grupos (todos contra todos dentro de cada grupo) - Ida
  grupos.forEach((grupo, grupoIndex) => {
    if (grupo.length >= 2) {
      for (let i = 0; i < grupo.length - 1; i++) {
        for (let j = i + 1; j < grupo.length; j++) {
          fixture.push([{
            local: grupo[i],
            visitante: grupo[j],
            grupo: grupoIndex + 1
          }]);
        }
      }
    }
  });
  
  // Generar partidos de vuelta si es ida y vuelta
  if (idaYvuelta) {
    grupos.forEach((grupo, grupoIndex) => {
      if (grupo.length >= 2) {
        for (let i = 0; i < grupo.length - 1; i++) {
          for (let j = i + 1; j < grupo.length; j++) {
            // En la vuelta, intercambiar local y visitante
            fixture.push([{
              local: grupo[j],
              visitante: grupo[i],
              grupo: grupoIndex + 1
            }]);
          }
        }
      }
    });
  }
  
  return fixture;
};

// Generar fixture usando grupos existentes
const generarFixtureConGrupos = (gruposData) => {
  const fixture = [];
  
  // Para cada grupo, generar todos los partidos (todos contra todos)
  gruposData.forEach((grupoData, grupoIndex) => {
    const equiposGrupo = grupoData.equipos || [];
    
    if (equiposGrupo.length >= 2) {
      // Generar todos los enfrentamientos dentro del grupo
      for (let i = 0; i < equiposGrupo.length - 1; i++) {
        for (let j = i + 1; j < equiposGrupo.length; j++) {
          fixture.push([{
            local: equiposGrupo[i],
            visitante: equiposGrupo[j],
            grupo: grupoData.nombreGrupo || `Grupo ${String.fromCharCode(65 + grupoIndex)}`,
            grupoId: grupoData.id
          }]);
        }
      }
    }
  });
  
  return fixture;
};

// Validar email - función consolidada
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generar código único
const generarCodigo = (longitud = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < longitud; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  formatDate,
  formatDateForDisplay,
  generarFixture,
  isValidEmail,
  generarCodigo,
  // Exportar funciones auxiliares para testing
  generarRoundRobin,
  generarEliminacionDirecta,
  generarGruposYPlayoff,
  generarFixtureConGrupos
};
