import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  Checkbox,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AutoFixHigh,
  SwapHoriz,
  Edit,
  Delete
} from '@mui/icons-material';
import api from '../../services/api';
import toast from 'react-hot-toast';

const FixtureGenerator = ({ open, onClose, torneos = [], torneoPreseleccionado = null }) => {
  
  // Función para formatear el estado del torneo
  const formatearEstado = (estado) => {
    const estados = {
      'en_curso': 'En Curso',
      'programado': 'Programado',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado',
      'pausado': 'Pausado'
    };
    return estados[estado] || estado;
  };
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    torneoId: '',
    tipoFixture: 'todos_contra_todos',
    fechaInicio: '',
    fechaFin: '',
    diasEntreJornadas: 7, // Se calculará automáticamente
    horarios: {
      inicio: '18:00',
      fin: '22:00',
      duracion: 80 // Rugby: 80 minutos (2 tiempos de 40)
    },
    canchas: [],
    arbitros: []
  });
  
  // Estados para datos del torneo seleccionado
  const [torneoData, setTorneoData] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [arbitros, setArbitros] = useState([]);
  
  // Estado para preview del fixture
  const [fixturePreview, setFixturePreview] = useState(null);

  const steps = [
    'Seleccionar Torneo',
    'Configurar Fixture',
    'Asignar Recursos',
    'Vista Previa',
    'Generar'
  ];

  useEffect(() => {
    if (open) {
      // Resetear estado cuando se abre el dialog
      setActiveStep(0);
      setFormData({
        torneoId: '',
        tipoFixture: 'todos_contra_todos',
        fechaInicio: '',
        fechaFin: '',
        diasEntreJornadas: 7, // Se calculará automáticamente
        horarios: {
          inicio: '18:00',
          fin: '22:00',
          duracion: 80 // Rugby: 80 minutos (2 tiempos de 40)
        },
        canchas: [],
        arbitros: []
      });
      setTorneoData(null);
      setEquipos([]);
      setFixturePreview(null);
    }
  }, [open]);

  // Preseleccionar torneo si se pasa como prop
  useEffect(() => {
    if (open && torneoPreseleccionado && torneoPreseleccionado.id) {
      setFormData(prev => ({
        ...prev,
        torneoId: torneoPreseleccionado.id
      }));
    }
  }, [open, torneoPreseleccionado]);

  useEffect(() => {
    if (formData.torneoId) {
      cargarDatosTorneo(formData.torneoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.torneoId]);

  useEffect(() => {

    if (formData.torneoId && formData.tipoFixture && equipos.length > 0) {
      
      generarPreview();
    } else {

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.torneoId, formData.tipoFixture, equipos, torneoData?.idaYvuelta]);

  // Función para calcular días entre jornadas automáticamente
  const calcularDiasEntreJornadasAutomatico = (fechaInicio, fechaFin, numEquipos, idaYvuelta = false) => {
    try {
      // Calcular días totales del torneo
      const diasTotales = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));
      
      // Calcular número de jornadas necesarias según el formato
      let jornadasNecesarias = 0;
      
      if (formData.tipoFixture === 'todos_contra_todos') {
        // Todos contra todos: n-1 jornadas (o 2*(n-1) si es ida y vuelta)
        jornadasNecesarias = idaYvuelta ? (numEquipos - 1) * 2 : (numEquipos - 1);
      } else if (formData.tipoFixture === 'eliminacion_directa') {
        // Eliminación directa: log2(n) rondas
        jornadasNecesarias = Math.ceil(Math.log2(numEquipos));
      } else if (formData.tipoFixture === 'grupos_y_playoff') {
        // Grupos + playoff: estimar basado en grupos de 4
        const equiposPorGrupo = 4;
        const numGrupos = Math.ceil(numEquipos / equiposPorGrupo);
        const jornadasGrupos = equiposPorGrupo - 1; // Todos contra todos en cada grupo
        const jornadasPlayoff = Math.ceil(Math.log2(numGrupos * 2)); // Playoff con 2 clasificados por grupo
        jornadasNecesarias = jornadasGrupos + jornadasPlayoff;
      } else if (formData.tipoFixture === 'manual') {
        // Manual: el usuario decide cuántos partidos crear
        jornadasNecesarias = 1; // Mínimo 1 jornada para el cálculo
      }

      // Calcular días entre jornadas
      const diasEntreJornadas = Math.floor(diasTotales / Math.max(jornadasNecesarias, 1));
      
      // Asegurar que sea al menos 1 día y máximo 14 días
      const resultado = Math.max(1, Math.min(diasEntreJornadas, 14));
      
      return resultado;
      
    } catch (error) {
      console.error('Error calculando días entre jornadas automáticamente:', error);
      return 7; // Valor por defecto
    }
  };

  const cargarDatosTorneo = async (torneoId) => {
    try {
      setLoading(true);

      const [torneoRes, equiposRes, canchasRes, arbitrosRes] = await Promise.all([
        api.get(`/torneos/${torneoId}`).catch(err => {
          console.error('❌ Error cargando torneo:', err);
          throw err;
        }),
        api.get(`/torneos/${torneoId}/equipos`).catch(err => {
          console.error('❌ Error cargando equipos:', err);
          return { data: [] };
        }),
        api.get('/canchas').catch(err => {
          console.error('❌ Error cargando canchas:', err);
          return { data: [] };
        }),
        api.get('/arbitros').catch(err => {
          console.error('❌ Error cargando árbitros:', err);
          return { data: [] };
        })
      ]);

      // La respuesta del endpoint /torneos/:id viene con estructura { message, torneo }
      const torneoData = torneoRes.data?.torneo || torneoRes.data;
      setTorneoData(torneoData);
      
      // Los equipos vienen en equiposRes.data.equipos
      const equiposExtraidos = equiposRes.data?.equipos || [];

      setEquipos(equiposExtraidos);
      setCanchas(canchasRes.data || []);
      setArbitros(arbitrosRes.data || []);
      
      // Configurar fechas desde el torneo (solo si ya tiene fechas definidas)
      if (torneoData?.fechaInicio && torneoData?.fechaFin && 
          torneoData.fechaInicio !== null && torneoData.fechaFin !== null) {
        try {
          const fechaInicioTorneo = new Date(torneoData.fechaInicio);
          const fechaFinTorneo = new Date(torneoData.fechaFin);
          
          // Validar que ambas fechas sean válidas
          if (!isNaN(fechaInicioTorneo.getTime()) && !isNaN(fechaFinTorneo.getTime())) {
            // Calcular días entre jornadas automáticamente
            const diasEntreJornadas = calcularDiasEntreJornadasAutomatico(
              fechaInicioTorneo, 
              fechaFinTorneo, 
              equiposExtraidos.length, 
              torneoData?.idaYvuelta || false
            );
            
            setFormData(prev => ({
              ...prev,
              fechaInicio: fechaInicioTorneo.toISOString().split('T')[0],
              fechaFin: fechaFinTorneo.toISOString().split('T')[0],
              diasEntreJornadas: diasEntreJornadas
            }));
          } else {
            // Fallback: usar fecha actual
            const fechaActual = new Date().toISOString().split('T')[0];
            setFormData(prev => ({
              ...prev,
              fechaInicio: fechaActual,
              diasEntreJornadas: 7
            }));
          }
        } catch (error) {
          console.error('Error procesando fechas del torneo:', error);
          // Fallback: usar fecha actual
          const fechaActual = new Date().toISOString().split('T')[0];
          setFormData(prev => ({
            ...prev,
            fechaInicio: fechaActual,
            diasEntreJornadas: 7
          }));
        }
      } else if (!formData.fechaInicio) {
        // Torneo sin fechas: usar fecha actual como default
        const fechaActual = new Date().toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          fechaInicio: fechaActual,
          diasEntreJornadas: 7
        }));
      }
      
    } catch (error) {
      console.error('❌ Error en cargarDatosTorneo:', error);
      toast.error('Error cargando datos del torneo');
    } finally {
      setLoading(false);
    }
  };

  const generarPreview = () => {

    if (equipos.length < 2) {
      
      setFixturePreview([]);
      return;
    }
    
    let fixture = [];
    const n = equipos.length;
    const idaYvuelta = torneoData?.idaYvuelta || false;
    
    // Obtener canchas seleccionadas para distribuirlas
    const canchasSeleccionadas = canchas.filter(c => formData.canchas.includes(c.id));
    const canchasParaAsignar = canchasSeleccionadas.length > 0 ? canchasSeleccionadas : canchas;
    let contadorCanchas = 0;
    
    // Función helper para obtener la siguiente cancha en rotación
    const obtenerSiguienteCancha = () => {
      if (canchasParaAsignar.length === 0) return null;
      const cancha = canchasParaAsignar[contadorCanchas % canchasParaAsignar.length];
      contadorCanchas++;
      return cancha;
    };
    
    
    if (formData.tipoFixture === 'todos_contra_todos') {
      // Algoritmo round-robin - Ida
      const equiposRotacion = [...equipos];
      
      
      for (let i = 0; i < n - 1; i++) {
        const jornada = [];
        
        
        for (let j = 0; j < Math.floor(n / 2); j++) {
          const local = equiposRotacion[j];
          const visitante = equiposRotacion[n - 1 - j];

          if (local && visitante && local.id !== visitante.id) {
            jornada.push({
              local,
              visitante,
              cancha: obtenerSiguienteCancha(),
              arbitro: arbitros[0] || null
            });
          }
        }
        
        if (jornada.length > 0) {
          fixture.push(jornada);
          
        }
        
        // Rotar equipos (mantener el primer equipo fijo)
        if (n > 2) {
          const ultimo = equiposRotacion.pop();
          equiposRotacion.splice(1, 0, ultimo);
        }
      }
      
      // Generar segunda vuelta si es ida y vuelta
      if (idaYvuelta) {
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
                cancha: obtenerSiguienteCancha(),
                arbitro: arbitros[0] || null
              });
            }
          }
          
          if (jornada.length > 0) {
            fixture.push(jornada);
          }
          
          // Rotar equipos (mantener el primer equipo fijo)
          if (n > 2) {
            const ultimo = equiposRotacion.pop();
            equiposRotacion.splice(1, 0, ultimo);
          }
        }
      }
    } else if (formData.tipoFixture === 'eliminacion_directa') {
      // Eliminación directa - Solo generar primera fase
      const equiposCompletos = [...equipos];
      
      // Calcular número de equipos por llave (potencia de 2)
      let equiposPorLlave = 2;
      while (equiposPorLlave < equiposCompletos.length) {
        equiposPorLlave *= 2;
      }
      
      // Agregar equipos ficticios (bye) si es necesario
      while (equiposCompletos.length < equiposPorLlave) {
        equiposCompletos.push({
          id: `bye_${equiposCompletos.length}`,
          nombre: 'Descanso',
          logo: '',
          esBye: true
        });
      }
      
      // Solo crear partidos de la primera fase
      const jornada = [];
      for (let i = 0; i < equiposPorLlave; i += 2) {
        const equipo1 = equiposCompletos[i];
        const equipo2 = equiposCompletos[i + 1];
        
        // Solo crear partido si no hay bye
        if (!equipo1?.esBye && !equipo2?.esBye) {
          jornada.push({
            local: equipo1,
            visitante: equipo2,
            cancha: obtenerSiguienteCancha(),
            arbitro: arbitros[0] || null
          });
        }
      }
      
      if (jornada.length > 0) {
        fixture.push(jornada);
      }
    } else if (formData.tipoFixture === 'grupos_y_playoff') {
      // Grupos + Playoff (implementación básica)
      
      
      // Dividir equipos en grupos de 4
      const grupos = [];
      const equiposGrupos = [...equipos];
      
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
                grupo: grupoIndex + 1,
                cancha: obtenerSiguienteCancha(),
                arbitro: arbitros[0] || null
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
                  grupo: grupoIndex + 1,
                  cancha: obtenerSiguienteCancha(),
                  arbitro: arbitros[0] || null
                }]);
              }
            }
          }
        });
      }
    } else if (formData.tipoFixture === 'manual') {
      // Modo Manual: crear un partido de ejemplo vacío para que el usuario lo edite
      // El usuario puede agregar más partidos según lo necesite
      fixture = [[{
        local: null,
        visitante: null,
        cancha: obtenerSiguienteCancha(),
        arbitro: arbitros[0] || null,
        fase: 'Partido 1'
      }]];
    }

    setFixturePreview(fixture);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const generarPartidosCompletos = () => {
    if (!equipos || equipos.length < 2) return [];
    
    const partidos = [];
    const idaYvuelta = torneoData?.idaYvuelta || false;
    let jornadaActual = 1;
    let contadorPartido = 1;
    
    // Generar partidos según el tipo de fixture
    if (formData.tipoFixture === 'todos_contra_todos') {
      const equiposRotacion = [...equipos];
      const n = equipos.length;
      
      // Generar primera vuelta
      for (let i = 0; i < n - 1; i++) {
        const jornada = [];
        
        for (let j = 0; j < Math.floor(n / 2); j++) {
          const local = equiposRotacion[j];
          const visitante = equiposRotacion[n - 1 - j];
          
          if (local && visitante) {
            const partido = crearPartidoCompleto(
              contadorPartido++,
              torneoData.id,
              jornadaActual,
              local,
              visitante,
              calcularFechaPartido(jornadaActual, i)
            );
            jornada.push(partido);
          }
        }
        
        partidos.push(...jornada);
        jornadaActual++;
        
        // Rotar equipos (excepto el primero)
        equiposRotacion.splice(1, 0, equiposRotacion.pop());
      }
      
      // Generar segunda vuelta si es ida y vuelta
      if (idaYvuelta) {
        for (let i = 0; i < n - 1; i++) {
          const jornada = [];
          
          for (let j = 0; j < Math.floor(n / 2); j++) {
            const local = equiposRotacion[j];
            const visitante = equiposRotacion[n - 1 - j];
            
            if (local && visitante) {
              const partido = crearPartidoCompleto(
                contadorPartido++,
                torneoData.id,
                jornadaActual,
                visitante, // Intercambiar local/visitante en la vuelta
                local,
                calcularFechaPartido(jornadaActual, i)
              );
              jornada.push(partido);
            }
          }
          
          partidos.push(...jornada);
          jornadaActual++;
          
          // Rotar equipos (excepto el primero)
          equiposRotacion.splice(1, 0, equiposRotacion.pop());
        }
      }
    } else if (formData.tipoFixture === 'eliminacion_directa') {
      // Para eliminación directa, solo generar partidos de la primera fase
      const equiposCompletos = [...equipos];
      
      // Calcular número de equipos por llave (potencia de 2)
      let equiposPorLlave = 2;
      while (equiposPorLlave < equiposCompletos.length) {
        equiposPorLlave *= 2;
      }
      
      // Agregar equipos ficticios (bye) si es necesario
      while (equiposCompletos.length < equiposPorLlave) {
        equiposCompletos.push({
          id: `bye_${equiposCompletos.length}`,
          nombre: 'Descanso',
          logo: '',
          esBye: true
        });
      }
      
      // Solo crear partidos de la primera fase
      const partidosPrimeraFase = equiposPorLlave / 2;
      
      for (let i = 0; i < equiposPorLlave; i += 2) {
        const equipo1 = equiposCompletos[i];
        const equipo2 = equiposCompletos[i + 1];
        
        // Solo crear partido si no hay bye
        if (!equipo1?.esBye && !equipo2?.esBye) {
          const partido = crearPartidoCompleto(
            contadorPartido++,
            torneoData.id,
            jornadaActual,
            equipo1,
            equipo2,
            calcularFechaPartido(jornadaActual, 0)
          );
          partidos.push(partido);
        }
      }
    } else if (formData.tipoFixture === 'manual') {
      // Modo Manual: generar partidos basados en el preview editado por el usuario
      // Si no hay preview, no generar nada (el usuario debe usar el preview para crear partidos)
      if (!fixturePreview || fixturePreview.length === 0) {
        return [];
      }
    }
    
    return partidos;
  };

  const crearPartidoCompleto = (id, torneoId, jornada, equipoLocal, equipoVisitante, fecha) => {
    // Verificar si hay referencias (equipos por definir)
    const localEsReferencia = typeof equipoLocal === 'string' && 
                              (equipoLocal.startsWith('ganador_') || equipoLocal.startsWith('perdedor_'));
    const visitanteEsReferencia = typeof equipoVisitante === 'string' && 
                                  (equipoVisitante.startsWith('ganador_') || equipoVisitante.startsWith('perdedor_'));
    
    // Asignar cancha de forma rotativa entre las canchas seleccionadas
    const canchasSeleccionadas = canchas.filter(c => formData.canchas.includes(c.id));
    const canchaAsignada = canchasSeleccionadas.length > 0 
      ? canchasSeleccionadas[(id - 1) % canchasSeleccionadas.length] 
      : (canchas.length > 0 ? canchas[0] : null);
    
    const partido = {
      id: `match_${id.toString().padStart(3, '0')}`,
      torneoId: torneoId,
      jornada: jornada,
      fecha: fecha,
      estado: "programado",
      resultado: { local: 0, visitante: 0 },
      arbitroId: null,
      cancha: canchaAsignada ? canchaAsignada.nombre : "Por asignar",
      canchaId: canchaAsignada ? canchaAsignada.id : null,
      incidencias: [],
      estadisticas: {
        triesLocal: 0,
        triesVisitante: 0,
        penalesLocal: 0,
        penalesVisitante: 0,
        conversionesLocal: 0,
        conversionesVisitante: 0,
        tarjetasAmarillasLocal: 0,
        tarjetasAmarillasVisitante: 0,
        tarjetasRojasLocal: 0,
        tarjetasRojasVisitante: 0
      }
    };
    
    // Procesar equipo local
    if (localEsReferencia) {
      // Guardar la referencia para procesarla después del partido referenciado
      partido.equipoLocalReferencia = equipoLocal;
      partido.equipoLocal = equipoLocal.startsWith('ganador_') 
        ? `🏆 Ganador Partido ${equipoLocal.replace('ganador_', '')}`
        : `❌ Perdedor Partido ${equipoLocal.replace('perdedor_', '')}`;
      partido.equipoLocalId = null; // No hay ID aún
    } else {
      // Equipo real
      partido.equipoLocal = equipoLocal?.nombre || 'Por definir';
      partido.equipoLocalId = equipoLocal?.id || null;
      partido.equipoLocalLogo = equipoLocal?.logo || null;
    }
    
    // Procesar equipo visitante
    if (visitanteEsReferencia) {
      // Guardar la referencia para procesarla después del partido referenciado
      partido.equipoVisitanteReferencia = equipoVisitante;
      partido.equipoVisitante = equipoVisitante.startsWith('ganador_') 
        ? `🏆 Ganador Partido ${equipoVisitante.replace('ganador_', '')}`
        : `❌ Perdedor Partido ${equipoVisitante.replace('perdedor_', '')}`;
      partido.equipoVisitanteId = null; // No hay ID aún
    } else {
      // Equipo real
      partido.equipoVisitante = equipoVisitante?.nombre || 'Por definir';
      partido.equipoVisitanteId = equipoVisitante?.id || null;
      partido.equipoVisitanteLogo = equipoVisitante?.logo || null;
    }
    
    return partido;
  };

  // Convertir fixturePreview (con equipos editados) a formato de partidos completos
  const convertirPreviewAPartidos = (preview) => {
    const partidos = [];
    let contadorPartido = 1;
    
    preview.forEach((jornada, jornadaIndex) => {
      jornada.forEach((partidoPreview) => {
        const partido = crearPartidoCompleto(
          contadorPartido++,
          torneoData.id,
          jornadaIndex + 1,
          partidoPreview.local,
          partidoPreview.visitante,
          calcularFechaPartido(jornadaIndex + 1, jornadaIndex)
        );
        
        // Agregar información adicional del preview (fase personalizada, cancha, árbitro)
        if (partidoPreview.fase) {
          partido.fase = partidoPreview.fase;
        }
        if (partidoPreview.cancha) {
          partido.cancha = partidoPreview.cancha;
          partido.canchaId = partidoPreview.cancha.id;
        }
        if (partidoPreview.arbitro) {
          partido.arbitroId = partidoPreview.arbitro.id;
          partido.arbitros = {
            principal: {
              id: partidoPreview.arbitro.id,
              nombre: partidoPreview.arbitro.nombre
            }
          };
        }
        
        partidos.push(partido);
      });
    });
    
    return partidos;
  };

  const calcularFechaPartido = (jornada, indiceJornada) => {
    try {
      // Usar la fecha de inicio del formulario (formato YYYY-MM-DD)
      if (!formData.fechaInicio) {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Parsear fecha de inicio sin problemas de zona horaria
      const [year, month, day] = formData.fechaInicio.split('-').map(Number);
      const fechaInicio = new Date(year, month - 1, day);
      
      // Validar que la fecha de inicio sea válida
      if (isNaN(fechaInicio.getTime())) {
        const hoy = new Date();
        const y = hoy.getFullYear();
        const m = String(hoy.getMonth() + 1).padStart(2, '0');
        const d = String(hoy.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      
      // Usar los días entre jornadas configurados por el usuario
      const diasEntreJornadas = formData.diasEntreJornadas || 7;
      const diasOffset = (jornada - 1) * diasEntreJornadas;
      
      // Crear nueva fecha sumando días
      const fechaPartido = new Date(year, month - 1, day + diasOffset);
      
      // Convertir a YYYY-MM-DD
      const y = fechaPartido.getFullYear();
      const m = String(fechaPartido.getMonth() + 1).padStart(2, '0');
      const d = String(fechaPartido.getDate()).padStart(2, '0');
      
      return `${y}-${m}-${d}`;
    } catch (error) {
      console.error('Error calculando fecha del partido:', error);
      // Fallback: usar fecha actual en formato YYYY-MM-DD
      const hoy = new Date();
      const y = hoy.getFullYear();
      const m = String(hoy.getMonth() + 1).padStart(2, '0');
      const d = String(hoy.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  };

  const calcularDiasEntreJornadas = () => {
    if (!torneoData?.fechaInicio || !torneoData?.fechaFin || !equipos || equipos.length < 2) {
      return 7; // Valor por defecto
    }

    try {
      const fechaInicio = new Date(torneoData.fechaInicio);
      const fechaFin = new Date(torneoData.fechaFin);
      
      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        return 7; // Valor por defecto si las fechas son inválidas
      }

      // Calcular días totales del torneo
      const diasTotales = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));
      
      // Calcular número de jornadas necesarias
      let jornadasNecesarias = 0;
      
      if (formData.tipoFixture === 'todos_contra_todos') {
        const n = equipos.length;
        jornadasNecesarias = torneoData?.idaYvuelta ? (n - 1) * 2 : (n - 1);
      } else if (formData.tipoFixture === 'eliminacion_directa') {
        jornadasNecesarias = Math.ceil(Math.log2(equipos.length));
      } else if (formData.tipoFixture === 'grupos_y_playoff') {
        // Para grupos + playoff, estimar basado en grupos de 4
        const equiposPorGrupo = 4;
        const numGrupos = Math.ceil(equipos.length / equiposPorGrupo);
        const jornadasGrupos = equiposPorGrupo - 1; // Todos contra todos en cada grupo
        const jornadasPlayoff = Math.ceil(Math.log2(numGrupos * 2)); // Playoff con 2 clasificados por grupo
        jornadasNecesarias = jornadasGrupos + jornadasPlayoff;
      }

      // Calcular días entre jornadas
      const diasEntreJornadas = Math.floor(diasTotales / Math.max(jornadasNecesarias, 1));
      
      // Asegurar que sea al menos 1 día y máximo 14 días
      return Math.max(1, Math.min(diasEntreJornadas, 14));
      
    } catch (error) {
      console.error('Error calculando días entre jornadas:', error);
      return 7; // Valor por defecto
    }
  };

  const generarTablaPosicionesInicial = () => {
    if (!equipos || equipos.length === 0) return [];
    
    return equipos.map(equipo => ({
      torneoId: torneoData.id,
      equipoId: equipo.id,
      equipoNombre: equipo.nombre,
      pj: 0, // Partidos jugados
      pg: 0, // Partidos ganados
      pe: 0, // Partidos empatados
      pp: 0, // Partidos perdidos
      puntosAFavor: 0,
      puntosEnContra: 0,
      diferenciaPuntos: 0,
      triesAFavor: 0,
      triesEnContra: 0,
      bonusOfensivo: 0,
      bonusDefensivo: 0,
      puntosTotales: 0,
      rankingFairPlay: 0
    }));
  };

  const generarFixture = async () => {
    try {
      setLoading(true);
      
      // Usar fixturePreview si está disponible (con los equipos editados), sino generar desde cero
      let partidosGenerados;
      if (fixturePreview && fixturePreview.length > 0) {
        // Convertir fixturePreview a formato de partidos completos
        partidosGenerados = convertirPreviewAPartidos(fixturePreview);
      } else {
        // Generar partidos con estructura completa para Firebase
        partidosGenerados = generarPartidosCompletos();
      }
      
      // Generar tabla de posiciones inicial
      const tablaPosicionesInicial = generarTablaPosicionesInicial();
      
      const response = await api.post(`/organizadores/torneos/${formData.torneoId}/fixture`, {
        tipoFixture: formData.tipoFixture,
        fechaInicio: formData.fechaInicio,
        diasEntreJornadas: formData.diasEntreJornadas,
        horarios: formData.horarios,
        canchas: formData.canchas,
        arbitros: formData.arbitros,
        partidos: partidosGenerados,
        tablaPosiciones: tablaPosicionesInicial,
        idaYvuelta: torneoData?.idaYvuelta || false
      });
      
      toast.success(`Fixture generado exitosamente: ${response.data.totalPartidos} partidos en ${response.data.totalJornadas} jornadas`);
      onClose();
      
    } catch (error) {
      toast.error('Error generando fixture: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Selecciona el torneo para generar el fixture
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Torneo</InputLabel>
              <Select
                value={formData.torneoId}
                onChange={(e) => setFormData(prev => ({ ...prev, torneoId: e.target.value }))}
                label="Torneo"
              >
                {Array.isArray(torneos) ? torneos.map((torneo) => (
                  <MenuItem key={torneo.id} value={torneo.id}>
                    {torneo.nombre} - {formatearEstado(torneo.estado)}
                  </MenuItem>
                )) : (
                  <MenuItem disabled>No hay torneos disponibles</MenuItem>
                )}
              </Select>
            </FormControl>
            
            {torneoData && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Torneo:</strong> {torneoData.nombre || 'N/A'}<br/>
                  <strong>Estado:</strong> {formatearEstado(torneoData.estado) || 'N/A'}<br/>
                  <strong>Equipos registrados:</strong> {equipos.length}
                  {equipos.length > 0 && (
                    <><br/><strong>Equipos:</strong> {equipos.map(e => e.nombre).join(', ')}</>
                  )}
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuración del fixture
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Fixture</InputLabel>
                  <Select
                    value={formData.tipoFixture}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipoFixture: e.target.value }))}
                    label="Tipo de Fixture"
                  >
                    <MenuItem value="todos_contra_todos">Todos contra todos (Round Robin)</MenuItem>
                    <MenuItem value="eliminacion_directa">Eliminación directa</MenuItem>
                    <MenuItem value="grupos_y_playoff">Grupos + Playoff</MenuItem>
                    <MenuItem value="manual">⚡ Manual / Personalizado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Mensaje informativo para modo manual */}
              {formData.tipoFixture === 'manual' && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <strong>Modo Manual/Personalizado seleccionado</strong><br/>
                    En este modo podrás crear partidos de forma totalmente flexible sin estructura predefinida.<br/>
                    <strong>✨ Referencias dinámicas:</strong> A medida que creas partidos, automáticamente podrás referenciar "Ganador Partido 1", "Perdedor Partido 2", etc. en partidos posteriores.<br/>
                    Ideal para torneos con formatos especiales como:
                    <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                      <li><strong>Doble eliminación</strong> - Perdedores pasan a bracket inferior</li>
                      <li><strong>Brackets híbridos</strong> - Combina ganadores y perdedores</li>
                      <li>Round robin modificado con fases de playoff</li>
                      <li>Formatos personalizados únicos</li>
                    </ul>
                  </Alert>
                </Grid>
              )}
              
               <Grid item xs={12} md={6}>
                 <TextField
                   fullWidth
                   label="Fecha de inicio"
                   type="date"
                   value={formData.fechaInicio}
                   onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                   InputLabelProps={{ shrink: true }}
                 />
               </Grid>
               
               <Grid item xs={12} md={6}>
                 <TextField
                   fullWidth
                   label="Fecha de fin del torneo"
                   type="date"
                   value={formData.fechaFin}
                   onChange={(e) => setFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
                   InputLabelProps={{ shrink: true }}
                   helperText="Puedes ajustar la fecha de fin si es necesario"
                 />
               </Grid>
               
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Días entre jornadas"
                  type="number"
                  value={formData.diasEntreJornadas}
                  onChange={(e) => setFormData(prev => ({ ...prev, diasEntreJornadas: parseInt(e.target.value) }))}
                  inputProps={{ min: 1, max: 14 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Duración del partido (minutos)"
                  type="number"
                  value={formData.horarios.duracion}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    horarios: { ...prev.horarios, duracion: parseInt(e.target.value) }
                  }))}
                  inputProps={{ min: 60, max: 120 }}
                  helperText="Rugby: 80 minutos (2 tiempos de 40)"
                />
              </Grid>
              </Grid>
            </Box>
          );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Asignar canchas y árbitros
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Canchas disponibles ({canchas.length}) - {formData.canchas.length} seleccionada(s)
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ccc', borderRadius: 1, p: 1 }}>
                  {canchas.length > 0 ? (
                    canchas.map((cancha, index) => (
                      <Box key={cancha.id || `cancha-${index}`} sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                        <Checkbox
                          checked={formData.canchas.includes(cancha.id)}
                          onChange={(e) => {
                            // Solo proceder si cancha.id existe y no es null
                            if (!cancha.id) {
                              return;
                            }
                            
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                canchas: [...prev.canchas, cancha.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                canchas: prev.canchas.filter(id => id !== cancha.id)
                              }));
                            }
                          }}
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {cancha.nombre} - {cancha.direccion || cancha.ubicacion || ''}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                      {loading ? 'Cargando canchas...' : 'No hay canchas disponibles'}
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Árbitros disponibles ({arbitros.length}) - {formData.arbitros.length} seleccionado(s)
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ccc', borderRadius: 1, p: 1 }}>
                  {arbitros.length > 0 ? (
                    arbitros.map((arbitro, index) => (
                      <Box key={arbitro.id || `arbitro-${index}`} sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                        <Checkbox
                          checked={formData.arbitros.includes(arbitro.id)}
                          onChange={(e) => {
                            // Solo proceder si arbitro.id existe y no es null
                            if (!arbitro.id) {

                              return;
                            }
                            
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                arbitros: [...prev.arbitros, arbitro.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                arbitros: prev.arbitros.filter(id => id !== arbitro.id)
                              }));
                            }
                          }}
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {arbitro.nombre} {arbitro.apellido}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                      {loading ? 'Cargando árbitros...' : 'No hay árbitros disponibles'}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
            
            {(canchas.length === 0 || arbitros.length === 0) && !loading && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {canchas.length === 0 && 'No hay canchas disponibles. '}
                  {arbitros.length === 0 && 'No hay árbitros disponibles. '}
                  Asegúrate de tener canchas y árbitros registrados en el sistema.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Vista previa del fixture
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Button 
                variant="outlined" 
                onClick={generarPreview}
                disabled={equipos.length < 2}
              >
                Regenerar Preview
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Equipos disponibles: {equipos.length} | Tipo: {formData.tipoFixture}
              </Typography>
            </Box>
            
            {fixturePreview ? (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  {formData.tipoFixture === 'eliminacion_directa' ? (
                    <>
                      Se generarán {fixturePreview.reduce((total, jornada) => total + jornada.length, 0)} partidos de la primera fase (cruces iniciales).<br/>
                      Las siguientes fases se crearán automáticamente cuando se finalicen los partidos anteriores.
                    </>
                  ) : formData.tipoFixture === 'manual' ? (
                    <>
                      ⚡ <strong>Modo Manual/Personalizado</strong><br/>
                      • Edita cada partido individualmente (equipos, fase/nombre, canchas y árbitros)<br/>
                      • <strong>Referencias dinámicas:</strong> A medida que creas partidos, podrás usar "🏆 Ganador Partido X" o "❌ Perdedor Partido X" en partidos posteriores<br/>
                      • Las opciones de referencia aparecen automáticamente basándose en los partidos que ya creaste<br/>
                      • Usa <strong>"+ Agregar Partido a Jornada"</strong> para añadir más partidos a la misma jornada/fecha<br/>
                      • Usa <strong>"+ Agregar Nueva Jornada/Fecha"</strong> para crear partidos en diferentes fechas<br/>
                      • Ideal para torneos con formatos especiales como doble eliminación, brackets híbridos, etc.
                    </>
                  ) : (
                    <>
                      Se generarán {fixturePreview.length} jornadas con {fixturePreview.reduce((total, jornada) => total + jornada.length, 0)} partidos en total.
                    </>
                  )}
                </Alert>
                
                {fixturePreview.map((jornada, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {formData.tipoFixture === 'eliminacion_directa' ? 'Cruces Iniciales' : `Jornada ${index + 1}`}
                      </Typography>
                      {jornada.map((partido, partidoIndex) => (
                        <Box key={partidoIndex} sx={{ p: 2, border: '1px solid #eee', borderRadius: 1, mb: 1 }}>
                          <Grid container spacing={2} alignItems="center">
                            {/* Equipo Local */}
                            <Grid item xs={4}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Local</InputLabel>
                                <Select
                                  value={(() => {
                                    if (!partido.local) return '';
                                    if (typeof partido.local === 'string') return partido.local;
                                    return partido.local.id || '';
                                  })()}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    console.log('🔵 Seleccionando Local:', value);
                                    
                                    // Crear copia profunda del fixture
                                    const nuevoFixture = fixturePreview.map((jornada, jIdx) => 
                                      jornada.map((partido, pIdx) => 
                                        (jIdx === index && pIdx === partidoIndex) 
                                          ? { ...partido } 
                                          : partido
                                      )
                                    );
                                    
                                    if (!value) {
                                      nuevoFixture[index][partidoIndex].local = null;
                                    } else if (value.startsWith('ganador_') || value.startsWith('perdedor_')) {
                                      // Es una referencia a otro partido
                                      nuevoFixture[index][partidoIndex].local = value;
                                      console.log('✅ Guardando referencia:', value);
                                    } else {
                                      // Es un equipo real
                                      const equipoSeleccionado = equipos.find(eq => eq.id === value);
                                    if (equipoSeleccionado) {
                                      nuevoFixture[index][partidoIndex].local = equipoSeleccionado;
                                        console.log('✅ Guardando equipo:', equipoSeleccionado.nombre);
                                    }
                                    }
                                    
                                    console.log('📋 Nuevo fixture:', nuevoFixture);
                                    setFixturePreview(nuevoFixture);
                                  }}
                                  label="Local"
                                >
                                  {/* Equipos reales */}
                                  <MenuItem value="" disabled>
                                    <em>-- Equipos --</em>
                                  </MenuItem>
                                  {equipos.map((equipo) => (
                                    <MenuItem key={equipo.id} value={equipo.id}>
                                      {equipo.nombre}
                                    </MenuItem>
                                  ))}
                                  
                                  {/* Referencias a resultados de partidos (solo en modo manual) */}
                                  {formData.tipoFixture === 'manual' && (() => {
                                    // Contar cuántos partidos reales hay en el fixture
                                    let contadorPartidos = 0;
                                    for (let i = 0; i < fixturePreview.length; i++) {
                                      for (let j = 0; j < fixturePreview[i].length; j++) {
                                        const numPartido = contadorPartidos + 1;
                                        // Solo mostrar referencias para partidos ANTERIORES al actual
                                        // o partidos de jornadas anteriores
                                        if (i < index || (i === index && j < partidoIndex)) {
                                          contadorPartidos++;
                                        }
                                      }
                                    }
                                    
                                    // Si hay partidos anteriores, mostrar opciones
                                    if (contadorPartidos > 0) {
                                      const opciones = [];
                                      opciones.push(
                                        <MenuItem key="separator_referencias" value="" disabled>
                                          <em>-- Referencias a Partidos --</em>
                                        </MenuItem>
                                      );
                                      
                                      for (let i = 1; i <= contadorPartidos; i++) {
                                        opciones.push(
                                          <MenuItem key={`local_ganador_${i}`} value={`ganador_${i}`}>
                                            🏆 Ganador Partido {i}
                                          </MenuItem>
                                        );
                                        opciones.push(
                                          <MenuItem key={`local_perdedor_${i}`} value={`perdedor_${i}`}>
                                            ❌ Perdedor Partido {i}
                                          </MenuItem>
                                        );
                                      }
                                      
                                      return opciones;
                                    }
                                    return null;
                                  })()}
                                </Select>
                              </FormControl>
                            </Grid>
                            
                            {/* Botón Intercambiar */}
                            <Grid item xs={1} sx={{ textAlign: 'center' }}>
                              <Tooltip title="Intercambiar equipos">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const nuevoFixture = [...fixturePreview];
                                    const partidoActual = nuevoFixture[index][partidoIndex];
                                    const tempLocal = partidoActual.local;
                                    nuevoFixture[index][partidoIndex].local = partidoActual.visitante;
                                    nuevoFixture[index][partidoIndex].visitante = tempLocal;
                                    setFixturePreview(nuevoFixture);
                                  }}
                                >
                                  <SwapHoriz />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                            
                            {/* Equipo Visitante */}
                            <Grid item xs={4}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Visitante</InputLabel>
                                <Select
                                  value={(() => {
                                    if (!partido.visitante) return '';
                                    if (typeof partido.visitante === 'string') return partido.visitante;
                                    return partido.visitante.id || '';
                                  })()}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    console.log('🔵 Seleccionando Visitante:', value);
                                    
                                    // Crear copia profunda del fixture
                                    const nuevoFixture = fixturePreview.map((jornada, jIdx) => 
                                      jornada.map((partido, pIdx) => 
                                        (jIdx === index && pIdx === partidoIndex) 
                                          ? { ...partido } 
                                          : partido
                                      )
                                    );
                                    
                                    if (!value) {
                                      nuevoFixture[index][partidoIndex].visitante = null;
                                    } else if (value.startsWith('ganador_') || value.startsWith('perdedor_')) {
                                      // Es una referencia a otro partido
                                      nuevoFixture[index][partidoIndex].visitante = value;
                                      console.log('✅ Guardando referencia:', value);
                                    } else {
                                      // Es un equipo real
                                      const equipoSeleccionado = equipos.find(eq => eq.id === value);
                                    if (equipoSeleccionado) {
                                      nuevoFixture[index][partidoIndex].visitante = equipoSeleccionado;
                                        console.log('✅ Guardando equipo:', equipoSeleccionado.nombre);
                                    }
                                    }
                                    
                                    console.log('📋 Nuevo fixture:', nuevoFixture);
                                    setFixturePreview(nuevoFixture);
                                  }}
                                  label="Visitante"
                                >
                                  {/* Equipos reales */}
                                  <MenuItem value="" disabled>
                                    <em>-- Equipos --</em>
                                  </MenuItem>
                                  {equipos.map((equipo) => (
                                    <MenuItem key={equipo.id} value={equipo.id}>
                                      {equipo.nombre}
                                    </MenuItem>
                                  ))}
                                  
                                  {/* Referencias a resultados de partidos (solo en modo manual) */}
                                  {formData.tipoFixture === 'manual' && (() => {
                                    // Contar cuántos partidos reales hay en el fixture
                                    let contadorPartidos = 0;
                                    for (let i = 0; i < fixturePreview.length; i++) {
                                      for (let j = 0; j < fixturePreview[i].length; j++) {
                                        const numPartido = contadorPartidos + 1;
                                        // Solo mostrar referencias para partidos ANTERIORES al actual
                                        // o partidos de jornadas anteriores
                                        if (i < index || (i === index && j < partidoIndex)) {
                                          contadorPartidos++;
                                        }
                                      }
                                    }
                                    
                                    // Si hay partidos anteriores, mostrar opciones
                                    if (contadorPartidos > 0) {
                                      const opciones = [];
                                      opciones.push(
                                        <MenuItem key="separator_referencias_visitante" value="" disabled>
                                          <em>-- Referencias a Partidos --</em>
                                        </MenuItem>
                                      );
                                      
                                      for (let i = 1; i <= contadorPartidos; i++) {
                                        opciones.push(
                                          <MenuItem key={`visitante_ganador_${i}`} value={`ganador_${i}`}>
                                            🏆 Ganador Partido {i}
                                          </MenuItem>
                                        );
                                        opciones.push(
                                          <MenuItem key={`visitante_perdedor_${i}`} value={`perdedor_${i}`}>
                                            ❌ Perdedor Partido {i}
                                          </MenuItem>
                                        );
                                      }
                                      
                                      return opciones;
                                    }
                                    return null;
                                  })()}
                                </Select>
                              </FormControl>
                            </Grid>
                            
                            {/* Botón Eliminar */}
                            <Grid item xs={2} sx={{ textAlign: 'center' }}>
                              <Tooltip title="Eliminar partido">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    const nuevoFixture = [...fixturePreview];
                                    nuevoFixture[index].splice(partidoIndex, 1);
                                    // Si la jornada queda vacía, eliminar la jornada
                                    if (nuevoFixture[index].length === 0) {
                                      nuevoFixture.splice(index, 1);
                                    }
                                    setFixturePreview(nuevoFixture);
                                  }}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </Grid>
                          
                          {/* Campos adicionales para editar */}
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            {/* Campo para editar fase/nombre del partido (solo en modo manual) */}
                            {formData.tipoFixture === 'manual' && (
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Fase / Nombre del Partido"
                                  placeholder="Ej: Viernes 19:00 - Partido 1"
                                  value={partido.fase || ''}
                                  onChange={(e) => {
                                    const nuevoFixture = [...fixturePreview];
                                    nuevoFixture[index][partidoIndex].fase = e.target.value;
                                    setFixturePreview(nuevoFixture);
                                  }}
                                  helperText="Personaliza el nombre de este partido"
                                />
                              </Grid>
                            )}
                            
                            {/* Selector de Cancha */}
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Cancha</InputLabel>
                                <Select
                                  value={partido.cancha?.id || ''}
                                  onChange={(e) => {
                                    const nuevoFixture = [...fixturePreview];
                                    const canchaSeleccionada = canchas.find(c => c.id === e.target.value);
                                    nuevoFixture[index][partidoIndex].cancha = canchaSeleccionada || null;
                                    setFixturePreview(nuevoFixture);
                                  }}
                                  label="Cancha"
                                >
                                  <MenuItem value="">
                                    <em>Sin cancha asignada</em>
                                  </MenuItem>
                                  {canchas.map((cancha) => (
                                    <MenuItem key={cancha.id} value={cancha.id}>
                                      {cancha.nombre || cancha.titulo}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            
                            {/* Selector de Árbitro */}
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Árbitro</InputLabel>
                                <Select
                                  value={partido.arbitro?.id || ''}
                                  onChange={(e) => {
                                    const nuevoFixture = [...fixturePreview];
                                    const arbitroSeleccionado = arbitros.find(a => a.id === e.target.value);
                                    nuevoFixture[index][partidoIndex].arbitro = arbitroSeleccionado || null;
                                    setFixturePreview(nuevoFixture);
                                  }}
                                  label="Árbitro"
                                >
                                  <MenuItem value="">
                                    <em>Sin árbitro asignado</em>
                                  </MenuItem>
                                  {arbitros.map((arbitro) => (
                                    <MenuItem key={arbitro.id} value={arbitro.id}>
                                      {arbitro.nombre} {arbitro.apellido}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            {/* Mostrar resumen del partido */}
                            {(() => {
                              const getNombreEquipo = (equipo) => {
                                if (typeof equipo === 'string') {
                                  if (equipo.startsWith('ganador_')) {
                                    const num = equipo.replace('ganador_', '');
                                    return `🏆 Ganador Partido ${num}`;
                                  } else if (equipo.startsWith('perdedor_')) {
                                    const num = equipo.replace('perdedor_', '');
                                    return `❌ Perdedor Partido ${num}`;
                                  }
                                  return equipo;
                                }
                                return equipo?.nombre || 'Sin seleccionar';
                              };
                              
                              return (
                                <>
                                  <strong>{getNombreEquipo(partido.local)}</strong> vs <strong>{getNombreEquipo(partido.visitante)}</strong>
                                </>
                              );
                            })()}
                          </Typography>
                        </Box>
                      ))}
                      
                      {/* Botón para agregar más partidos a la jornada (solo en modo manual) */}
                      {formData.tipoFixture === 'manual' && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => {
                              const nuevoFixture = [...fixturePreview];
                              // Agregar un partido nuevo a esta jornada
                              const canchasSeleccionadas = canchas.filter(c => formData.canchas.includes(c.id));
                              const canchasParaAsignar = canchasSeleccionadas.length > 0 ? canchasSeleccionadas : canchas;
                              // Contar partidos totales para rotación
                              const totalPartidos = nuevoFixture.reduce((sum, j) => sum + j.length, 0);
                              const canchaAsignada = canchasParaAsignar.length > 0 ? canchasParaAsignar[totalPartidos % canchasParaAsignar.length] : null;
                              
                              nuevoFixture[index].push({
                                local: null,
                                visitante: null,
                                cancha: canchaAsignada,
                                arbitro: arbitros[0] || null,
                                fase: `Partido ${jornada.length + 1}`
                              });
                              setFixturePreview(nuevoFixture);
                            }}
                          >
                            + Agregar Partido a Jornada {index + 1}
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {/* Botón para agregar una nueva jornada (solo en modo manual) */}
                {formData.tipoFixture === 'manual' && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        const nuevoFixture = [...fixturePreview];
                        const canchasSeleccionadas = canchas.filter(c => formData.canchas.includes(c.id));
                        const canchasParaAsignar = canchasSeleccionadas.length > 0 ? canchasSeleccionadas : canchas;
                        // Contar partidos totales para rotación
                        const totalPartidos = nuevoFixture.reduce((sum, j) => sum + j.length, 0);
                        const canchaAsignada = canchasParaAsignar.length > 0 ? canchasParaAsignar[totalPartidos % canchasParaAsignar.length] : null;
                        
                        // Agregar una nueva jornada con un partido inicial
                        nuevoFixture.push([{
                          local: null,
                          visitante: null,
                          cancha: canchaAsignada,
                          arbitro: arbitros[0] || null,
                          fase: 'Partido 1'
                        }]);
                        setFixturePreview(nuevoFixture);
                      }}
                    >
                      + Agregar Nueva Jornada/Fecha
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="warning">
                No se puede generar vista previa. Verifica que el torneo tenga equipos registrados.
              </Alert>
            )}
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirmación final
            </Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body1">
                ¿Estás seguro de que quieres generar el fixture con la configuración seleccionada?
              </Typography>
            </Alert>
            
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Resumen de configuración:
                </Typography>
                <Typography variant="body2">
                  • Torneo: {torneoData?.nombre}<br/>
                  • Tipo: {formData.tipoFixture}<br/>
                  • Fecha inicio: {formData.fechaInicio}<br/>
                  • Días entre jornadas: {formData.diasEntreJornadas}<br/>
                  • Canchas: {formData.canchas.length}<br/>
                  • Árbitros: {formData.arbitros.length}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return 'Paso desconocido';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHigh color="primary" />
          Generador de Fixture Automático
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? generarFixture : handleNext}
                    sx={{ mr: 1 }}
                    disabled={loading || (index === 0 && !formData.torneoId)}
                  >
                    {index === steps.length - 1 ? 'Generar Fixture' : 'Siguiente'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Atrás
                  </Button>
                  <Button onClick={onClose}>
                    Cancelar
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}
    </Dialog>
  );
};

export default FixtureGenerator;
