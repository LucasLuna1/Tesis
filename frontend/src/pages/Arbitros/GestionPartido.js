import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Avatar,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Add,
  Timer,
  Description,
  CheckCircle,
  ExpandMore,
  Assignment,
  Draw,
  Edit,
  CameraAlt,
  Upload,
  Close
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { construirUrlImagen } from '../../utils/imageUtils';
import LogoDisplay from '../../components/common/LogoDisplay';

const GestionPartido = () => {
  const { id: partidoId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useCustomTheme();
  const permissions = useRolePermissions();
  
  const [partido, setPartido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para gestión
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [cronometroActivo, setCronometroActivo] = useState(false);
  const [tiempoInicio, setTiempoInicio] = useState(null); // Timestamp del inicio del partido
  const [periodoActual, setPeriodoActual] = useState('primerTiempo'); // 'primerTiempo', 'entretiempo', 'segundoTiempo'
  // eslint-disable-next-line no-unused-vars
  const [tiempoPrimerTiempo, setTiempoPrimerTiempo] = useState(0); // Tiempo usado en primer tiempo
  // eslint-disable-next-line no-unused-vars
  const [tiempoSegundoTiempo, setTiempoSegundoTiempo] = useState(0); // Tiempo usado en segundo tiempo
  const [procesandoCronometro, setProcesandoCronometro] = useState(false); // Para evitar dobles clicks
  
  
  // Estados para incidencias
  const [openIncidencia, setOpenIncidencia] = useState(false);
  const [nuevaIncidencia, setNuevaIncidencia] = useState({
    tipo: '',
    jugadorId: '',
    jugadorNombre: '',
    jugadorSaleId: '', // Para CAMBIO
    jugadorEntraId: '', // Para CAMBIO
    jugadorSale: null, // Objeto completo del jugador que sale
    jugadorEntra: null, // Objeto completo del jugador que entra
    minuto: 0,
    descripcion: '',
    equipo: '' // Se enviará como equipoId al backend
  });

  // Estados para jugadores
  const [jugadoresLocal, setJugadoresLocal] = useState([]);
  const [jugadoresVisitante, setJugadoresVisitante] = useState([]);
  const [cargandoJugadores, setCargandoJugadores] = useState(false);
  
  // Estados para convocados
  const [convocadosLocal, setConvocadosLocal] = useState(null);
  const [convocadosVisitante, setConvocadosVisitante] = useState(null);
  const [cargandoConvocados, setCargandoConvocados] = useState(false);
  
  // Estados para edición de convocados
  const [openEditarConvocados, setOpenEditarConvocados] = useState(false);
  const [convocadosEditando, setConvocadosEditando] = useState(null);
  const [motivoModificacion, setMotivoModificacion] = useState('');
  
  // Estados para configuración de alineaciones (titulares y suplentes)
  const [openConfiguracionAlineaciones, setOpenConfiguracionAlineaciones] = useState(false);
  const [titularesLocal, setTitularesLocal] = useState([]);
  const [titularesVisitante, setTitularesVisitante] = useState([]);
  const [alineacionesConfirmadas, setAlineacionesConfirmadas] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [minutosJugados, setMinutosJugados] = useState([]);
  
  // Estados para agregar jugadores nuevos
  const [openAgregarJugadores, setOpenAgregarJugadores] = useState(false);
  const [jugadoresTemporalesLocal, setJugadoresTemporalesLocal] = useState([]);
  const [jugadoresTemporalesVisitante, setJugadoresTemporalesVisitante] = useState([]);
  const [equipoAgregando, setEquipoAgregando] = useState(null);
  const [nuevoJugador, setNuevoJugador] = useState({
    nombre: '',
    apellido: ''
  });
  
  // Estados para escaneo OCR
  const [imagenCapturada, setImagenCapturada] = useState(null);
  const [procesandoOCR, setProcesandoOCR] = useState(false);
  const [progresoOCR, setProgresoOCR] = useState(0);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  // Estados para finalización
  const [openFinalizar, setOpenFinalizar] = useState(false);
  const [resumenFinal, setResumenFinal] = useState({
    observaciones: '',
    resumen: ''
  });
  
  // Estados para el nuevo flujo de resumen automático
  const [pasoActual, setPasoActual] = useState(0);
  const [resumenAutomatico, setResumenAutomatico] = useState(null);
  const [resumenConfirmado, setResumenConfirmado] = useState(false);
  const [firmaDigital, setFirmaDigital] = useState('');
  const [actaGenerada, setActaGenerada] = useState(false);
  const [generandoResumen, setGenerandoResumen] = useState(false);
  
  // Estados para validaciones (User Story 1.2)
  const [validaciones] = useState(null);

  // Estados para modales modernos
  const [modalConfirmacion, setModalConfirmacion] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    severity: 'info' // 'success', 'error', 'warning', 'info'
  });

  const [modalNotificacion, setModalNotificacion] = useState({
    open: false,
    title: '',
    message: '',
    severity: 'success',
    icon: null
  });

  // Funciones auxiliares para modales
  const mostrarConfirmacion = (config) => {
    setModalConfirmacion({
      open: true,
      ...config,
      onCancel: () => {
        setModalConfirmacion(prev => ({ ...prev, open: false }));
        if (config.onCancel) config.onCancel();
      }
    });
  };

  const mostrarNotificacion = (config) => {
    setModalNotificacion({
      open: true,
      ...config
    });
    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
      setModalNotificacion(prev => ({ ...prev, open: false }));
    }, 3000);
  };

  const cargarPartido = useCallback(async (preservarTiempo = false) => {
    if (!partidoId) {
      console.error('❌ No se puede cargar partido: partidoId es undefined');
      setError('ID de partido no válido');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get(`/arbitros/partido/${partidoId}`);
      setPartido(response.data);
      
      // Obtener tiempo de inicio del partido
      const tiempoInicioPartido = response.data.tiempo?.inicio;
      const esActualizacionAutomatica = preservarTiempo;
      
      // Solo actualizar tiempo transcurrido si NO se debe preservar
      // Esto evita que se resetee el cronómetro cuando se agregan incidencias
      if (!preservarTiempo) {
        setTiempoTranscurrido(response.data.tiempoTranscurrido || 0);
      }
      
      // Log para debug solo en carga inicial
      if (!esActualizacionAutomatica) {
      }
      
      // Convertir tiempo de inicio a timestamp si existe
      let inicioTimestamp = null;
      if (tiempoInicioPartido) {
        inicioTimestamp = tiempoInicioPartido?.toMillis 
          ? tiempoInicioPartido.toMillis() 
          : (tiempoInicioPartido?.seconds 
            ? tiempoInicioPartido.seconds * 1000 
            : new Date(tiempoInicioPartido).getTime());
      }
      
      // Si el partido está pausado, usar el tiempo guardado del backend y NO actualizar tiempoInicio
      if (response.data.estado === 'pausado') {
        if (!preservarTiempo) {
        setTiempoTranscurrido(response.data.tiempoTranscurrido || 0);
        }
        setCronometroActivo(false);
        setTiempoInicio(null); // Asegurar que no haya tiempoInicio cuando está pausado
      } else if (response.data.estado === 'En Curso') {
        // Si está en curso, calcular tiempo transcurrido
        if (inicioTimestamp && !isNaN(inicioTimestamp) && inicioTimestamp > 0) {
          // Solo actualizar tiempoInicio si NO estamos preservando tiempo
          if (!preservarTiempo && !cronometroActivo) {
            setTiempoInicio(inicioTimestamp);
          }
          
          // Solo calcular tiempo si NO estamos preservando
          if (!preservarTiempo) {
          // Calcular tiempo desde el inicio real
          const ahora = Date.now();
          const tiempoCalculado = Math.floor((ahora - inicioTimestamp) / 1000);
          setTiempoTranscurrido(Math.max(0, tiempoCalculado));
          setCronometroActivo(true);
          }
        } else if (!esActualizacionAutomatica) {
          // Solo en carga inicial: Si no hay tiempo de inicio, usar el tiempo del backend y establecer un tiempo de inicio virtual
          const tiempoBackend = response.data.tiempoTranscurrido || 0;
          if (tiempoBackend > 0) {
            const ahora = Date.now();
            const tiempoInicioVirtual = ahora - (tiempoBackend * 1000);
            setTiempoInicio(tiempoInicioVirtual);
            setTiempoTranscurrido(tiempoBackend);
            setCronometroActivo(true);
          } else {
            setTiempoTranscurrido(0);
            setCronometroActivo(false);
          }
        }
        // En actualizaciones automáticas sin tiempo de inicio, mantener el estado actual del cronómetro
      } else {
        // Partido no iniciado o finalizado
        setTiempoTranscurrido(response.data.tiempoTranscurrido || 0);
        setCronometroActivo(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error cargando partido:', error);
        setError('Error al cargar el partido');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidoId]);

  // Función para cargar jugadores por categoría
  const cargarJugadores = useCallback(async () => {
    if (!partidoId) return;
    
    setCargandoJugadores(true);
    try {
      // Cargar jugadores del equipo local
      const responseLocal = await api.get(`/partido-live/${partidoId}/equipo/local/jugadores/categoria`);
      setJugadoresLocal(responseLocal.data);
      
      // Cargar jugadores del equipo visitante
      const responseVisitante = await api.get(`/partido-live/${partidoId}/equipo/visitante/jugadores/categoria`);
      setJugadoresVisitante(responseVisitante.data);
    } catch (error) {
      console.error('❌ Error cargando jugadores:', error);
      setError('Error al cargar los jugadores');
    } finally {
      setCargandoJugadores(false);
    }
  }, [partidoId]);

  // Función para cargar convocados
  const cargarConvocados = useCallback(async () => {
    if (!partidoId) return;
    
    setCargandoConvocados(true);
    try {
      const response = await api.get(`/partido-live/${partidoId}/convocados`);
      setConvocadosLocal(response.data.local);
      setConvocadosVisitante(response.data.visitante);
    } catch (error) {
      console.error('❌ Error cargando convocados:', error);
      // No mostrar error si no hay convocados, es normal
      setConvocadosLocal(null);
      setConvocadosVisitante(null);
    } finally {
      setCargandoConvocados(false);
    }
  }, [partidoId]);

  // Función para determinar el equipo correcto de una incidencia basándose en el jugador
  const obtenerEquipoCorrectoIncidencia = (incidencia) => {
    if (!partido || !incidencia) {
      return incidencia?.equipo || 'LOCAL';
    }
    
    // Si la incidencia tiene equipoId, usarlo directamente
    if (incidencia.equipoId && incidencia.equipoId !== 'LOCAL' && incidencia.equipoId !== 'VISITANTE') {
      if (partido.equipoLocalId && incidencia.equipoId === partido.equipoLocalId) {
        return 'LOCAL';
      }
      if (partido.equipoVisitanteId && incidencia.equipoId === partido.equipoVisitanteId) {
        return 'VISITANTE';
      }
    }
    
    // Si no, buscar el jugador en los arrays de jugadores cargados
    if (incidencia.jugadorId) {
      const jugadorEnLocal = jugadoresLocal?.find(j => j.id === incidencia.jugadorId);
      const jugadorEnVisitante = jugadoresVisitante?.find(j => j.id === incidencia.jugadorId);
      
      if (jugadorEnLocal) return 'LOCAL';
      if (jugadorEnVisitante) return 'VISITANTE';
    }
    
    // Fallback al valor original
    return incidencia.equipo || 'LOCAL';
  };

  // Función para abrir edición de convocados
  const abrirEdicionConvocados = (convocados, equipo) => {
    // Verificar que el partido no esté iniciado
    if (partido?.estado === 'En Curso' || partido?.estado === 'pausado' || partido?.estado === 'finalizado') {
      mostrarNotificacion({
        title: 'No Permitido',
        message: 'No se pueden editar las listas de convocados una vez iniciado el partido',
        severity: 'warning'
      });
      return;
    }
    
    setConvocadosEditando({
      ...convocados,
      equipo: equipo // 'local' o 'visitante'
    });
    setOpenEditarConvocados(true);
  };

  // Función para actualizar convocados
  const actualizarConvocados = async (convocadosId, jugadores, motivo) => {
    try {
      // Verificar que el partido no esté iniciado antes de intentar actualizar
      if (partido?.estado === 'En Curso' || partido?.estado === 'pausado' || partido?.estado === 'finalizado') {
        mostrarNotificacion({
          title: 'No Permitido',
          message: 'No se pueden editar las listas de convocados una vez iniciado el partido',
          severity: 'warning'
        });
        setOpenEditarConvocados(false);
        return;
      }
      
      await api.put(`/partido-live/${partidoId}/convocados/${convocadosId}`, {
        jugadores,
        motivo
      });
      
      // Recargar convocados
      await cargarConvocados();
      setOpenEditarConvocados(false);
      setConvocadosEditando(null);
      
      mostrarNotificacion({
        title: '¡Éxito!',
        message: 'Lista de convocados actualizada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error actualizando convocados:', error);
      const errorMessage = error.response?.data?.error || 'Error al actualizar la lista de convocados';
      mostrarNotificacion({
        title: 'Error',
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    cargarPartido();
  }, [partidoId, cargarPartido]);

  useEffect(() => {
    if (partido) {
      cargarJugadores();
      cargarConvocados();
    }
  }, [partido, cargarJugadores, cargarConvocados]);

  // Memoizar cálculo de jugadores activos para evitar re-cálculos innecesarios
  const jugadoresActivosLocal = useMemo(() => {
    return convocadosLocal?.jugadores.filter(j => j.activo && !j.enSinBin && !j.expulsado) || [];
  }, [convocadosLocal]);

  const jugadoresActivosVisitante = useMemo(() => {
    return convocadosVisitante?.jugadores.filter(j => j.activo && !j.enSinBin && !j.expulsado) || [];
  }, [convocadosVisitante]);

  // Cronómetro - calcular tiempo transcurrido en tiempo real basado en tiempo de inicio
  useEffect(() => {
    let intervalo = null;
    
    // Solo calcular tiempo en tiempo real si el partido está en curso
    if (cronometroActivo && partido?.estado === 'En Curso' && tiempoInicio) {
      intervalo = setInterval(() => {
        const ahora = Date.now();
        let tiempoCalculado = Math.floor((ahora - tiempoInicio) / 1000);
        
        // Límites para cada período de rugby (sin acumular entretiempo)
        // 🏉 PRODUCCIÓN: Tiempos reales de rugby
        const FIN_PRIMER_TIEMPO = 40 * 60; // 40 minutos = 2400 segundos (00:00 a 40:00)
        const FIN_SEGUNDO_TIEMPO = 80 * 60; // 80 minutos = 4800 segundos (40:00 a 80:00)
        
        // 🧪 MODO PRUEBA: Descomentar para testing con tiempos reducidos
        // const FIN_PRIMER_TIEMPO = 30; // 30 segundos (00:00 a 00:30)
        // const FIN_SEGUNDO_TIEMPO = 60; // 60 segundos (00:30 a 01:00)
        
        // Controlar límites según el período actual
        if (periodoActual === 'primerTiempo' && tiempoCalculado >= FIN_PRIMER_TIEMPO) {
          tiempoCalculado = FIN_PRIMER_TIEMPO; // Detener en 40:00
          setCronometroActivo(false); // Pausar automáticamente
        } else if (periodoActual === 'segundoTiempo' && tiempoCalculado >= FIN_SEGUNDO_TIEMPO) {
          tiempoCalculado = FIN_SEGUNDO_TIEMPO; // Detener en 80:00
          setCronometroActivo(false); // Pausar automáticamente
        }
        
        setTiempoTranscurrido(tiempoCalculado);
      }, 1000);
    }
    
    return () => {
      if (intervalo) {
        clearInterval(intervalo);
      }
    };
  }, [cronometroActivo, partido?.estado, tiempoInicio, periodoActual]);

  // Sincronizar tiempo con backend cada 3 segundos cuando está en curso (para organizador)
  useEffect(() => {
    if (!partido || partido.estado !== 'En Curso' || !cronometroActivo) {
      return;
    }

    const intervalo = setInterval(async () => {
      try {
        // Enviar tiempo actual al backend para que organizador lo vea actualizado
        const tiempoActual = tiempoTranscurrido;
        console.log('📤 Árbitro sincronizando tiempo al backend:', tiempoActual, 'segundos');
        await api.post(`/partidos/${partidoId}/actualizar-tiempo`, {
          tiempoTranscurrido: tiempoActual,
          estado: 'En Curso'
        });
      } catch (error) {
        console.error('❌ Error sincronizando tiempo:', error);
      }
    }, 3000); // Sincronizar cada 3 segundos (más frecuente)

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partido?.estado, partidoId, cronometroActivo, tiempoTranscurrido]);

  // Sincronización completa con backend cada 60 segundos para otros datos
  useEffect(() => {
    if (!partido || partido.estado !== 'En Curso') {
      return;
    }

    const intervalo = setInterval(() => {
      cargarPartido(true); // Recargar datos del servidor cada 60 segundos
    }, 60000);

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partido?.estado, partidoId]);

  // Verificar minutos jugados y alertar cuando un jugador llegue a 80 minutos
  useEffect(() => {
    if (!partido || partido.estado !== 'En Curso' || !cronometroActivo) {
      return;
    }

    const intervalo = setInterval(() => {
      // Verificar minutos cada 60 segundos
      const minutoActual = Math.floor(tiempoTranscurrido / 60);
      
      // Usar jugadores memoizados
      const jugadoresActivos = [
        ...jugadoresActivosLocal,
        ...jugadoresActivosVisitante
      ];

      jugadoresActivos.forEach(jugador => {
        // Calcular minutos correctamente (excluyendo entretiempo)
        const minutoInicio = jugador.minutoInicio || 0;
        let minutosEnEstePartido = 0;
        
        if (jugador.activo && minutoInicio !== null) {
          // Calcular minutos reales sin contar el entretiempo
          const minutoActualReal = calcularMinutosReales(minutoActual);
          const minutoInicioReal = calcularMinutosReales(minutoInicio);
          minutosEnEstePartido = Math.max(0, minutoActualReal - minutoInicioReal);
        }
        
        const minutosHistoricos = jugador.minutosJugados || 0;
        const totalMinutos = minutosHistoricos + minutosEnEstePartido;

        // Alertar cuando llegue a 80 minutos
        if (totalMinutos >= 80 && !jugador.alertado80Minutos) {
          // Marcar como alertado para no repetir la alerta
          jugador.alertado80Minutos = true;
          
          // Mostrar alerta visual y sonora
          const mensaje = `⚠️ ALERTA: ${jugador.nombre} ${jugador.apellido} ha completado 80 minutos de juego!`;
          
          // Crear notificación del navegador si está permitido
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⚠️ Jugador con 80 minutos', {
              body: mensaje,
              icon: '/logo192.png'
            });
          }
          
          // Alerta visual moderna
          mostrarNotificacion({
            title: '⚠️ Alerta de Minutos',
            message: `${jugador.nombre} ${jugador.apellido} ha completado 80 minutos de juego!`,
            severity: 'warning'
          });
          
          // Audio de alerta (opcional)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77JiGAg+mdv0xXMnBSuBzvLZiTYIGGi77eafTRALUKXj8LdjHAU4kdfy0HssBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUxh9Hz04IzBh5uwO/jmUgND1as5++yYhgIPpnb9M');
            audio.play();
          } catch (e) {
            console.log('No se pudo reproducir audio de alerta');
          }
        }
      });
    }, 60000); // Verificar cada minuto

    return () => clearInterval(intervalo);
  }, [partido, cronometroActivo, tiempoTranscurrido, jugadoresActivosLocal, jugadoresActivosVisitante]);

  const iniciarPartido = async () => {
    try {
      const horarioRealInicio = new Date();
      await api.post(`/arbitros/partido/iniciar/${partidoId}`, {
        horarioRealInicio
      });
      // Establecer tiempo de inicio localmente para inmediata sincronización
      setTiempoInicio(horarioRealInicio.getTime());
      setTiempoTranscurrido(0);
      setCronometroActivo(true);
      setPeriodoActual('primerTiempo'); // Iniciar en primer tiempo
      setTiempoPrimerTiempo(0);
      setTiempoSegundoTiempo(0);
      await cargarPartido();
    } catch (error) {
        setError('Error al iniciar el partido');
    }
  };

  // User Story 1.1: Pausar cronómetro
  const pausarCronometro = async () => {
    if (procesandoCronometro) return; // Evitar dobles clicks
    
    try {
      setProcesandoCronometro(true);
      
      // Calcular tiempo transcurrido exacto en el momento de pausar
      let tiempoExacto = tiempoTranscurrido;
      if (tiempoInicio && cronometroActivo) {
        const ahora = Date.now();
        tiempoExacto = Math.floor((ahora - tiempoInicio) / 1000);
      }
      
      console.log('⏸️ Pausando cronómetro:', {
        tiempoExacto,
        tiempoInicio: tiempoInicio ? new Date(tiempoInicio).toISOString() : 'null',
        ahora: new Date().toISOString()
      });

      // IMPORTANTE: Primero actualizar estado local
      setTiempoTranscurrido(tiempoExacto);
      setCronometroActivo(false);
      setTiempoInicio(null); // Limpiar tiempo de inicio para detener el cronómetro
      
      // Enviar al backend
      await api.post(`/partidos/${partidoId}/pausar`, {
        tiempoTranscurrido: tiempoExacto,
        motivo: 'Pausa del árbitro'
      });
      
      // Actualizar estado del partido localmente
      setPartido(prev => ({ ...prev, estado: 'pausado', tiempoTranscurrido: tiempoExacto }));
    } catch (error) {
      console.error('❌ Error al pausar cronómetro:', error);
      setError('Error al pausar cronómetro: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcesandoCronometro(false);
    }
  };

  // User Story 1.2: Reanudar cronómetro
  const reanudarCronometro = async () => {
    if (procesandoCronometro) return; // Evitar dobles clicks
    
    try {
      setProcesandoCronometro(true);
      
      // Usar el tiempo ACTUAL del estado (el que se ve pausado en pantalla)
      const tiempoActual = tiempoTranscurrido;
      
      // Enviar al backend
      const response = await api.post(`/partidos/${partidoId}/reanudar`, {
        tiempoTranscurrido: tiempoActual
      });
      
      // Calcular nuevo tiempo de inicio virtual para que continúe desde el tiempo pausado
      const ahora = Date.now();
      const nuevoTiempoInicio = ahora - (tiempoActual * 1000);
      
      console.log('🔄 Reanudando cronómetro:', {
        tiempoActual,
        nuevoTiempoInicio: new Date(nuevoTiempoInicio).toISOString(),
        ahora: new Date(ahora).toISOString()
      });
      
      // Configurar estado
      setTiempoInicio(nuevoTiempoInicio);
      setCronometroActivo(true);
      
      // Actualizar estado del partido localmente
      setPartido(prev => ({ ...prev, estado: 'En Curso', tiempoTranscurrido: tiempoActual }));
    } catch (error) {
      console.error('❌ Error al reanudar cronómetro:', error);
      setError('Error al reanudar cronómetro: ' + (error.response?.data?.error || error.message));
      mostrarNotificacion({
        title: 'Error',
        message: 'Error al reanudar: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    } finally {
      setProcesandoCronometro(false);
    }
  };

  const agregarIncidencia = async () => {
    try {
      // Formato limpio para Rugby
      const incidenciaRugby = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tipo: nuevaIncidencia.tipo,
        minuto: parseInt(nuevaIncidencia.minuto) || 0,
        tiempo: periodoActual === 'primerTiempo' ? '1T' : periodoActual === 'segundoTiempo' ? '2T' : 'ET', // Usar período actual
        equipoId: nuevaIncidencia.equipo === 'LOCAL' ? partido.equipoLocalId : partido.equipoVisitanteId, // ID real del equipo
        equipo: nuevaIncidencia.equipo, // Mantener LOCAL/VISITANTE para compatibilidad
        jugadorId: nuevaIncidencia.jugadorId || '',
        jugadorNombre: nuevaIncidencia.jugadorNombre || '',
        arbitroId: partido.arbitros?.principal?.id || partido.arbitroPrincipalId,
        descripcion: nuevaIncidencia.descripcion || '',
        timestamp: new Date().toISOString()
      };

      // Si es un CAMBIO, agregar jugadores
      if (nuevaIncidencia.tipo === 'CAMBIO') {
        incidenciaRugby.jugadorSaleId = nuevaIncidencia.jugadorSaleId || '';
        incidenciaRugby.jugadorEntraId = nuevaIncidencia.jugadorEntraId || '';
        incidenciaRugby.jugadorSale = nuevaIncidencia.jugadorSale || null;
        incidenciaRugby.jugadorEntra = nuevaIncidencia.jugadorEntra || null;
      }

      await api.post(`/arbitros/partido/${partidoId}/incidencia`, incidenciaRugby);
      
      // Si es un TRY y la conversión fue exitosa, registrar automáticamente la conversión
      if (nuevaIncidencia.tipo === 'TRY' && nuevaIncidencia.conversionExitosa) {
        const conversionIncidencia = {
          id: `${Date.now()}_conv_${Math.random().toString(36).substr(2, 9)}`,
          tipo: 'CONVERSION',
          minuto: parseInt(nuevaIncidencia.minuto) || 0,
          tiempo: periodoActual === 'primerTiempo' ? '1T' : periodoActual === 'segundoTiempo' ? '2T' : 'ET',
          equipoId: nuevaIncidencia.equipo === 'LOCAL' ? partido.equipoLocalId : partido.equipoVisitanteId,
          equipo: nuevaIncidencia.equipo,
          jugadorId: nuevaIncidencia.jugadorId || '',
          jugadorNombre: nuevaIncidencia.jugadorNombre || '',
          arbitroId: partido.arbitros?.principal?.id || partido.arbitroPrincipalId,
          descripcion: `Conversión exitosa de ${nuevaIncidencia.jugadorNombre}`,
          timestamp: new Date().toISOString()
        };
        
        await api.post(`/arbitros/partido/${partidoId}/incidencia`, conversionIncidencia);
      }
      
      setOpenIncidencia(false);
      setNuevaIncidencia({
        tipo: '',
        jugadorId: '',
        jugadorNombre: '',
        jugadorSaleId: '',
        jugadorEntraId: '',
        jugadorSale: null,
        jugadorEntra: null,
        minuto: Math.floor(tiempoTranscurrido / 60),
        descripcion: '',
        equipo: '',
        conversionExitosa: false
      });
      
      // Recargar partido y convocados preservando el tiempo transcurrido
      await cargarPartido(true);
      
      // Si fue un cambio, tarjeta amarilla o tarjeta roja, recargar convocados y minutos para actualizar estados inmediatamente
      if (nuevaIncidencia.tipo === 'CAMBIO' || nuevaIncidencia.tipo === 'TARJETA_AMARILLA' || nuevaIncidencia.tipo === 'TARJETA_ROJA') {
        await cargarConvocados();
        await cargarMinutosJugados();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al agregar incidencia';
      setError(errorMessage);
      mostrarNotificacion({
        title: 'Error',
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  // ========== FUNCIONES PARA GESTIÓN DE TITULARES Y SUPLENTES ==========
  
  // Cargar jugadores de un equipo desde el backend
  const cargarJugadoresEquipo = async (equipoId, esLocal) => {
    try {
      setCargandoJugadores(true);
      
      // Buscar directamente en la colección jugadores por equipoId
      const response = await api.get(`/jugadores`, {
        params: { equipoId: equipoId }
      });
      
      const jugadores = response.data.jugadores || response.data || [];
      
      if (esLocal) {
        setJugadoresLocal(jugadores);
      } else {
        setJugadoresVisitante(jugadores);
      }
    } catch (error) {
      console.error('Error al cargar jugadores:', error);
      // Intentar con el endpoint alternativo
      try {
        const response = await api.get(`/equipos/${equipoId}/jugadores`);
        const jugadores = response.data.jugadores || [];
        
        if (esLocal) {
          setJugadoresLocal(jugadores);
        } else {
          setJugadoresVisitante(jugadores);
        }
      } catch (error2) {
        console.error('Error al cargar jugadores (alternativo):', error2);
        setError('Error al cargar jugadores del equipo');
      }
    } finally {
      setCargandoJugadores(false);
    }
  };

  // Abrir diálogo de configuración de alineaciones
  const abrirConfiguracionAlineaciones = async () => {
    // Si no hay convocados, cargar jugadores directamente
    if (!convocadosLocal && !convocadosVisitante) {
      await cargarJugadoresEquipo(partido.equipoLocalId, true);
      await cargarJugadoresEquipo(partido.equipoVisitanteId, false);
    }
    setOpenConfiguracionAlineaciones(true);
  };

  // Toggle titular para un jugador
  const toggleTitular = (jugador, esLocal) => {
    if (esLocal) {
      const yaEsTitular = titularesLocal.some(j => j.id === jugador.id);
      if (yaEsTitular) {
        setTitularesLocal(titularesLocal.filter(j => j.id !== jugador.id));
      } else {
        setTitularesLocal([...titularesLocal, jugador]);
      }
    } else {
      const yaEsTitular = titularesVisitante.some(j => j.id === jugador.id);
      if (yaEsTitular) {
        setTitularesVisitante(titularesVisitante.filter(j => j.id !== jugador.id));
      } else {
        setTitularesVisitante([...titularesVisitante, jugador]);
      }
    }
  };

  // Confirmar alineaciones y enviar al backend
  const confirmarAlineaciones = async () => {
    try {
      if (titularesLocal.length === 0 && titularesVisitante.length === 0) {
        mostrarNotificacion({
          title: 'Atención',
          message: 'Debes seleccionar al menos un titular para alguno de los equipos',
          severity: 'warning'
        });
        return;
      }

      // Enviar al backend para inicializar las alineaciones
      await api.post(`/partido-live/${partidoId}/iniciar-con-titulares`, {
        titularesLocal: titularesLocal.map(j => j.id),
        titularesVisitante: titularesVisitante.map(j => j.id)
      });

      setAlineacionesConfirmadas(true);
      setOpenConfiguracionAlineaciones(false);
      
      // Recargar convocados
      await cargarConvocados();
      await cargarMinutosJugados();
      
      mostrarNotificacion({
        title: '¡Alineaciones Confirmadas!',
        message: `🏠 Local: ${titularesLocal.length} titulares\n✈️ Visitante: ${titularesVisitante.length} titulares`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al confirmar alineaciones:', error);
      
      // Mostrar mensaje detallado si hay jugadores con límite de minutos alcanzado
      if (error.response?.data?.jugadoresInvalidos) {
        const jugadoresInvalidos = error.response.data.jugadoresInvalidos;
        const listaJugadores = jugadoresInvalidos
          .map(j => `• ${j.nombre} (${j.minutosJugados} minutos)`)
          .join('\n');
        
        mostrarNotificacion({
          title: '❌ No Se Puede Confirmar',
          message: `Los siguientes jugadores han alcanzado el límite de 80 minutos y NO pueden jugar:\n\n${listaJugadores}\n\nDeben descansar este partido.`,
          severity: 'error'
        });
      } else {
        mostrarNotificacion({
          title: 'Error',
          message: 'Error al confirmar alineaciones: ' + (error.response?.data?.error || error.message),
          severity: 'error'
        });
      }
    }
  };

  // Abrir diálogo para agregar jugadores
  const abrirAgregarJugadores = (esLocal) => {
    setEquipoAgregando(esLocal ? 'local' : 'visitante');
    setOpenAgregarJugadores(true);
    setNuevoJugador({ nombre: '', apellido: '' });
  };

  // Agregar jugador a la lista temporal
  const agregarJugadorALista = () => {
    if (!nuevoJugador.nombre.trim() || !nuevoJugador.apellido.trim()) {
      mostrarNotificacion({
        title: 'Campos Incompletos',
        message: 'Por favor ingresa nombre y apellido del jugador',
        severity: 'warning'
      });
      return;
    }

    const jugadorTemp = {
      id: `temp_${Date.now()}`, // ID temporal
      nombre: nuevoJugador.nombre.trim(),
      apellido: nuevoJugador.apellido.trim(),
      esNuevo: true
    };

    if (equipoAgregando === 'local') {
      setJugadoresTemporalesLocal([...jugadoresTemporalesLocal, jugadorTemp]);
    } else {
      setJugadoresTemporalesVisitante([...jugadoresTemporalesVisitante, jugadorTemp]);
    }

    // Limpiar formulario
    setNuevoJugador({ nombre: '', apellido: '' });
  };

  // Quitar jugador de la lista temporal
  const quitarJugadorTemporal = (jugadorId) => {
    if (equipoAgregando === 'local') {
      setJugadoresTemporalesLocal(jugadoresTemporalesLocal.filter(j => j.id !== jugadorId));
    } else {
      setJugadoresTemporalesVisitante(jugadoresTemporalesVisitante.filter(j => j.id !== jugadorId));
    }
  };

  // Guardar todos los jugadores temporales en el backend
  const guardarTodosLosJugadores = async () => {
    try {
      const jugadoresTemp = equipoAgregando === 'local' ? jugadoresTemporalesLocal : jugadoresTemporalesVisitante;
      
      if (jugadoresTemp.length === 0) {
        mostrarNotificacion({
          title: 'Lista Vacía',
          message: 'No hay jugadores para guardar',
          severity: 'warning'
        });
        return;
      }

      const equipoId = equipoAgregando === 'local' ? partido.equipoLocalId : partido.equipoVisitanteId;
      const equipoNombre = equipoAgregando === 'local' ? partido.equipoLocal : partido.equipoVisitante;

      // Crear cada jugador en el backend
      const jugadoresCreados = [];
      for (const jugador of jugadoresTemp) {
        const response = await api.post('/partido-live/crear-jugador', {
          nombre: jugador.nombre,
          apellido: jugador.apellido,
          equipoId: equipoId,
          equipoNombre: equipoNombre,
          categoria: partido.categoria || 'M16'
        });
        jugadoresCreados.push(response.data.jugador);
      }

      // Limpiar lista temporal
      if (equipoAgregando === 'local') {
        setJugadoresTemporalesLocal([]);
      } else {
        setJugadoresTemporalesVisitante([]);
      }
      
      // Recargar jugadores desde el servidor para evitar duplicados
      await cargarJugadoresEquipo(equipoId, equipoAgregando === 'local');
      
      setOpenAgregarJugadores(false);
      
      mostrarNotificacion({
        title: '¡Éxito!',
        message: `Se guardaron ${jugadoresTemp.length} jugador(es) exitosamente!\n\nLos jugadores ahora están disponibles para seleccionar.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al guardar jugadores:', error);
      mostrarNotificacion({
        title: 'Error',
        message: 'Error al guardar jugadores: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    }
  };

  // Cargar minutos jugados de los jugadores
  const cargarMinutosJugados = useCallback(async () => {
    try {
      const response = await api.get(`/partido-live/${partidoId}/minutos-jugados`);
      setMinutosJugados(response.data.minutosJugados || []);
    } catch (error) {
      console.error('Error al cargar minutos jugados:', error);
    }
  }, [partidoId]);

  // ========== FUNCIONES PARA ESCANEO OCR ==========

  // Preprocesar imagen para mejorar precisión del OCR
  const preprocesarImagen = (imagenBase64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Crear canvas para procesar la imagen
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Escalar la imagen si es necesario (OCR funciona mejor con imágenes grandes)
        const escala = Math.max(1, 1500 / Math.max(img.width, img.height));
        canvas.width = img.width * escala;
        canvas.height = img.height * escala;
        
        // Dibujar imagen escalada
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Obtener datos de la imagen
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convertir a escala de grises y aumentar contraste
        for (let i = 0; i < data.length; i += 4) {
          // Calcular escala de grises
          const gris = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // Aumentar contraste (umbral simple)
          const umbral = 128;
          const valorFinal = gris > umbral ? 255 : 0;
          
          data[i] = valorFinal;     // R
          data[i + 1] = valorFinal; // G
          data[i + 2] = valorFinal; // B
        }
        
        // Aplicar imagen procesada
        ctx.putImageData(imageData, 0, 0);
        
        // Devolver imagen procesada
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imagenBase64;
    });
  };

  // Procesar imagen con OCR (mejorado)
  const procesarImagenOCR = async (imagen) => {
    try {
      setProcesandoOCR(true);
      setProgresoOCR(0);

      // Preprocesar imagen para mejor precisión
      const imagenProcesada = await preprocesarImagen(imagen);

      const tesseract = await import('tesseract.js');
      const worker = await tesseract.createWorker('spa', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgresoOCR(Math.round(m.progress * 100));
          }
        }
      });

      // Configurar para mejor precisión en texto español
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúÁÉÍÓÚñÑ ',
        tessedit_pageseg_mode: '6' // Asume un bloque uniforme de texto
      });

      const { data: { text } } = await worker.recognize(imagenProcesada);
      await worker.terminate();

      // Parsear el texto para extraer nombres
      const jugadoresDetectados = parsearNombresDeTexto(text);
      
      if (jugadoresDetectados.length === 0) {
        mostrarNotificacion({
          title: 'Sin Resultados',
          message: 'No se detectaron nombres en la imagen. Asegúrate de que la lista esté clara y legible.',
          severity: 'warning'
        });
        return;
      }

      // Agregar jugadores detectados a la lista temporal
      const nuevosJugadores = jugadoresDetectados.map((jugador, index) => ({
        id: `temp_${Date.now()}_${index}`,
        nombre: jugador.nombre,
        apellido: jugador.apellido,
        esNuevo: true
      }));

      if (equipoAgregando === 'local') {
        setJugadoresTemporalesLocal(prev => [...prev, ...nuevosJugadores]);
      } else {
        setJugadoresTemporalesVisitante(prev => [...prev, ...nuevosJugadores]);
      }

      mostrarNotificacion({
        title: '¡Éxito!',
        message: `Se detectaron ${jugadoresDetectados.length} jugador(es) en la imagen!`,
        severity: 'success'
      });
      setImagenCapturada(null);
    } catch (error) {
      console.error('Error al procesar imagen con OCR:', error);
      mostrarNotificacion({
        title: 'Error OCR',
        message: 'Error al procesar la imagen. Intenta con otra foto más clara.',
        severity: 'error'
      });
    } finally {
      setProcesandoOCR(false);
      setProgresoOCR(0);
    }
  };

  // Parsear texto para extraer nombres de jugadores (mejorado)
  const parsearNombresDeTexto = (texto) => {
    const jugadores = [];
    const lineas = texto.split('\n').filter(linea => linea.trim().length > 0);

    lineas.forEach(linea => {
      // Limpiar la línea de caracteres especiales y números al inicio
      let lineaLimpia = linea.trim()
        // eslint-disable-next-line no-useless-escape
        .replace(/^[\d\.\-\*\•\)\]]+\s*/, '') // Quitar números, viñetas, paréntesis al inicio
        .replace(/\s+/g, ' ') // Normalizar espacios
        .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, ' ') // Quitar caracteres especiales excepto letras y acentos
        .trim();

      // Ignorar líneas muy cortas o que no parecen nombres
      if (lineaLimpia.length < 3) return;
      
      // Ignorar líneas que son títulos comunes o palabras clave
      const titulosIgnorar = [
        'JUGADORES', 'TITULARES', 'SUPLENTES', 'NOMBRE', 'APELLIDO', 'LISTA', 'EQUIPO',
        'PLANILLA', 'BUENA', 'FE', 'CATEGORIA', 'TORNEO', 'FECHA', 'ARBITRO'
      ];
      if (titulosIgnorar.some(titulo => lineaLimpia.toUpperCase().includes(titulo))) return;

      // Ignorar líneas con solo números o muy cortas después de limpiar
      if (/^\d+$/.test(lineaLimpia) || lineaLimpia.length < 3) return;

      // Intentar dividir en nombre y apellido
      const palabras = lineaLimpia.split(/\s+/).filter(p => p.length > 1); // Filtrar palabras de 1 letra
      
      if (palabras.length >= 2) {
        // Si hay 2 o más palabras, tomar la primera como nombre y el resto como apellido
        // Capitalizar correctamente
        const nombre = palabras[0].charAt(0).toUpperCase() + palabras[0].slice(1).toLowerCase();
        const apellido = palabras.slice(1).map(p => 
          p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
        ).join(' ');
        
        jugadores.push({ nombre, apellido });
      } else if (palabras.length === 1 && palabras[0].length >= 3) {
        // Si solo hay una palabra de al menos 3 letras, usarla como apellido
        const apellido = palabras[0].charAt(0).toUpperCase() + palabras[0].slice(1).toLowerCase();
        jugadores.push({ nombre: apellido, apellido: '' });
      }
    });

    return jugadores;
  };

  // Manejar captura/subida de imagen
  const manejarImagenSeleccionada = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagenCapturada(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Abrir selector de archivo
  const abrirSelectorArchivo = () => {
    fileInputRef.current?.click();
  };

  // Abrir cámara
  const abrirCamara = () => {
    cameraInputRef.current?.click();
  };

  // Cancelar imagen capturada
  const cancelarImagen = () => {
    setImagenCapturada(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // ========== FIN DE FUNCIONES PARA ESCANEO OCR ==========

  // ========== FIN DE FUNCIONES PARA GESTIÓN DE TITULARES Y SUPLENTES ==========

  // Función simplificada para finalizar partido
  const finalizarPartidoSimple = async () => {
    try {
      // Mostrar confirmación moderna
      mostrarConfirmacion({
        title: '¿Finalizar Partido?',
        message: `Resultado: ${partido.resultado?.puntosLocal || 0}  -  ${partido.resultado?.puntosVisitante || 0}`,
        severity: 'warning',
        confirmText: 'Finalizar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          setModalConfirmacion(prev => ({ ...prev, open: false }));
          await ejecutarFinalizacionPartido();
        }
      });
    } catch (error) {
      console.error('❌ Error al finalizar partido:', error);
      const errorMessage = error.response?.data?.error || 'Error al finalizar el partido';
      setError(errorMessage);
      mostrarNotificacion({
        title: 'Error',
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  // Función que ejecuta la finalización del partido
  const ejecutarFinalizacionPartido = async () => {
    try {
      
      const duracionTotal = Math.floor(tiempoTranscurrido / 60);
      const duracionSegundos = tiempoTranscurrido % 60;
      
      // Preparar datos a enviar
      const datosFinalizacion = {
        partidoId: partidoId,
        estado: 'finalizado',
        duracion: tiempoTranscurrido,
        duracionFormateada: `${duracionTotal}:${duracionSegundos.toString().padStart(2, '0')}`,
        resultado: partido.resultado || {
          puntosLocal: 0,
          puntosVisitante: 0
        },
        estadisticas: partido.estadisticas || {},
        incidencias: partido.incidencias || [],
        observacionesArbitro: '',
        fechaFinalizacion: new Date().toISOString(),
        arbitroId: partido.arbitroPrincipalId || partido.arbitros?.principal?.id
      };
      
      // Enviar al backend
      await api.post(`/arbitros/partido/${partidoId}/finalizar`, datosFinalizacion);
      
      // Actualizar estadísticas de los jugadores
      try {
        await api.post(`/partido-live/${partidoId}/actualizar-estadisticas-jugadores`);
      } catch (error) {
        console.error('⚠️ Error al actualizar estadísticas de jugadores:', error);
      }
      
      mostrarNotificacion({
        title: '¡Éxito!',
        message: 'Partido finalizado correctamente',
        severity: 'success'
      });
      
      setTimeout(() => {
        navigate('/arbitros/mis-partidos');
      }, 1500);
    } catch (error) {
      console.error('❌ Error al finalizar partido:', error);
      const errorMessage = error.response?.data?.error || 'Error al finalizar el partido';
      setError(errorMessage);
      mostrarNotificacion({
        title: 'Error',
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  // Función para generar resumen automático (User Story 1.1)
  const generarResumenAutomatico = async () => {
    setGenerandoResumen(true);
    try {
      const duracionTotal = Math.floor(tiempoTranscurrido / 60);
      const duracionSegundos = tiempoTranscurrido % 60;
      
      // Generar resumen automático con todas las incidencias y datos del partido
      const resumen = {
        partidoId: partido.id,
        fecha: new Date().toLocaleDateString('es-ES'),
        equipos: {
          local: typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Equipo Local' : partido.equipoLocal || 'Equipo Local',
          visitante: typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Equipo Visitante' : partido.equipoVisitante || 'Equipo Visitante'
        },
        resultado: partido.resultado || {
          puntosLocal: 0,
          puntosVisitante: 0,
          marcador: `0 - 0`
        },
        duracion: {
          total: `${duracionTotal}:${duracionSegundos.toString().padStart(2, '0')}`,
          minutos: duracionTotal,
          segundos: duracionSegundos
        },
        incidencias: partido.incidencias || [],
        resumenIncidencias: generarResumenIncidencias(partido.incidencias || []),
        arbitros: {
          principal: partido.arbitros.principal?.nombre || 'No asignado',
          asistentes: partido.arbitros.asistentes?.map(a => a.nombre).join(', ') || 'No asignados'
        },
        cancha: partido.cancha?.nombre || 'No especificada',
        observaciones: resumenFinal.observaciones || '',
        resumenPartido: resumenFinal.resumen || ''
      };
      
      setResumenAutomatico(resumen);
      setPasoActual(1); // Ir al paso de revisión
      setGenerandoResumen(false);
    } catch (error) {
      setError('Error al generar el resumen automático');
      setGenerandoResumen(false);
    }
  };

  // Función auxiliar para generar resumen de incidencias
  const generarResumenIncidencias = (incidencias) => {
    if (!incidencias || incidencias.length === 0) {
      return 'No se registraron incidencias durante el partido.';
    }
    
    const resumen = incidencias.map(inc => {
      const equipoLocal = typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Equipo Local' : partido.equipoLocal || 'Equipo Local';
      const equipoVisitante = typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Equipo Visitante' : partido.equipoVisitante || 'Equipo Visitante';
      const equipo = inc.equipo === 'LOCAL' ? equipoLocal : equipoVisitante;
      return `Min ${inc.minuto}: ${inc.tipo} - ${inc.jugadorNombre} (${equipo})`;
    }).join('\n');
    
    return `Incidencias registradas:\n${resumen}`;
  };

  // Función para confirmar resumen (User Story 1.2)
  const confirmarResumen = () => {
    setResumenConfirmado(true);
    setPasoActual(2); // Ir al paso de firma
  };

  // Función para firmar digitalmente (User Story 1.3)
  const firmarActa = async () => {
    if (!firmaDigital.trim()) {
      setError('Debe proporcionar su nombre para la firma digital');
      return;
    }
    
    try {
      const actaFirmada = {
        ...resumenAutomatico,
        firmaDigital: {
          nombre: firmaDigital,
          fecha: new Date().toISOString(),
          arbitroId: partido.arbitros.principal.id
        },
        estado: 'FINALIZADO_CON_ACTA'
      };
      
      // Enviar acta firmada al backend
      await api.post(`/arbitros/partido/${partidoId}/finalizar-con-acta`, {
        acta: actaFirmada,
        arbitroId: partido.arbitros.principal.id
      });
      
      setActaGenerada(true);
      setPasoActual(3); // Ir al paso final
      setCronometroActivo(false);
      
      // Mostrar mensaje de éxito
      setTimeout(() => {
        navigate('/arbitros');
      }, 3000);
      
    } catch (error) {
      setError('Error al firmar el acta del partido');
    }
  };


  const formatearTiempo = (segundos) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Calcular minutos REALES excluyendo el entretiempo
  // El cronómetro muestra: 0-40 (1er tiempo) → pausa → 40-80 (2do tiempo)
  const calcularMinutosReales = (minutos) => {
    // Los minutos siempre están en el rango 0-80 (40 por cada tiempo)
    // No hay necesidad de restar nada porque el entretiempo no se cuenta en el cronómetro
    return minutos;
  };

  // Verificar permisos de acceso
  if (!permissions.canManagePartidos()) {
    return (
      <Container>
        <Alert severity="error">
          No tienes permisos para acceder a la gestión de partidos. 
          Solo árbitros y staff autorizado pueden gestionar partidos.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Typography>Cargando partido...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 0, mb: 10, p: 0, bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5', minHeight: '100vh' }}>
      {/* Header del partido - Diseño moderno */}
      <Paper 
        elevation={darkMode ? 3 : 2} 
        sx={{ 
          borderRadius: 3, 
          bgcolor: darkMode ? '#2d2d2d' : 'white', 
          pt: { xs: 2, sm: 3 }, 
          pb: { xs: 2, sm: 4 },
          mx: { xs: 1, sm: 2 },
          mt: 2,
          background: darkMode 
            ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
        }}
      >
        {/* Título del torneo */}
        <Box sx={{ px: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ 
            width: { xs: 32, sm: 40 }, 
            height: { xs: 32, sm: 40 }, 
            bgcolor: darkMode ? '#1976d2' : '#2196f3',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 3,
            flexShrink: 0
          }}>
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '1.2rem' } }}>
              {partido.torneoNombre?.substring(0, 3) || 'M16'}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              color: darkMode ? '#e0e0e0' : '#424242', 
              lineHeight: 1.2,
              fontSize: { xs: '0.95rem', sm: '1.25rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: { xs: 'normal', sm: 'nowrap' }
            }}>
            {partido.torneoNombre || 'M16 - TORNEO APERTURA 2025'}
          </Typography>
            <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Gestión de Partido
          </Typography>
          </Box>
        </Box>

        {/* Equipos y marcador */}
        <Box sx={{ px: { xs: 1.5, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
          <Grid container spacing={{ xs: 1, sm: 3 }} alignItems="center" justifyContent="center">
            {/* Equipo Local */}
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <LogoDisplay
                  src={construirUrlImagen(partido.equipoLocalLogo)}
                  alt={typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre : partido.equipoLocal}
                  size="medium"
                  shape="square"
                  fallbackText={typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre : partido.equipoLocal}
                  sx={{ 
                    mx: 'auto',
                    mb: { xs: 1, sm: 2 },
                    boxShadow: { xs: 2, sm: 4 },
                    border: { xs: `2px solid ${darkMode ? '#1976d2' : '#2196f3'}`, sm: `3px solid ${darkMode ? '#1976d2' : '#2196f3'}` },
                    borderRadius: { xs: 2, sm: 3 },
                    width: { xs: 50, sm: 80 },
                    height: { xs: 50, sm: 80 }
                  }}
                />
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#e0e0e0' : '#424242', 
                  fontSize: { xs: '0.7rem', sm: '0.9rem' },
                  lineHeight: 1.2,
                  px: 0.5
                }}>
                  {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre : partido.equipoLocal}
                </Typography>
              </Box>
            </Grid>

            {/* Marcador */}
            <Grid item xs={4}>
              <Box sx={{ 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 1.5, sm: 3 }
              }}>
                <Typography variant="h1" sx={{ 
                  fontWeight: 900, 
                  color: darkMode ? '#e0e0e0' : '#212121',
                  fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
                  lineHeight: 1,
                  textShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {partido.resultado?.puntosLocal || 0}
                </Typography>
                <Typography variant="h1" sx={{ 
                  fontWeight: 900, 
                  color: darkMode ? '#a0a0a0' : '#757575',
                  fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
                  lineHeight: 1
                }}>
                  -
                </Typography>
                <Typography variant="h1" sx={{ 
                  fontWeight: 900, 
                  color: darkMode ? '#e0e0e0' : '#212121',
                  fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
                  lineHeight: 1,
                  textShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {partido.resultado?.puntosVisitante || 0}
                </Typography>
              </Box>
            </Grid>

            {/* Equipo Visitante */}
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <LogoDisplay
                  src={construirUrlImagen(partido.equipoVisitanteLogo)}
                  alt={typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre : partido.equipoVisitante}
                  size="medium"
                  shape="square"
                  fallbackText={typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre : partido.equipoVisitante}
                  sx={{ 
                    mx: 'auto',
                    mb: { xs: 1, sm: 2 },
                    boxShadow: { xs: 2, sm: 4 },
                    border: { xs: `2px solid ${darkMode ? '#ff9800' : '#ffb74d'}`, sm: `3px solid ${darkMode ? '#ff9800' : '#ffb74d'}` },
                    borderRadius: { xs: 2, sm: 3 },
                    width: { xs: 50, sm: 80 },
                    height: { xs: 50, sm: 80 }
                  }}
                />
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#e0e0e0' : '#424242', 
                  fontSize: { xs: '0.7rem', sm: '0.9rem' },
                  lineHeight: 1.2,
                  px: 0.5
                }}>
                  {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre : partido.equipoVisitante}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Estado y tiempo */}
        <Box sx={{ textAlign: 'center', px: { xs: 2, sm: 3 } }}>
          <Chip 
            label={(() => {
              if (partido.estado !== 'En Curso' && partido.estado !== 'pausado') {
                return partido.estado.toUpperCase();
              }
              
              let periodo = '';
              if (periodoActual === 'primerTiempo') {
                periodo = 'PRIMER TIEMPO';
              } else if (periodoActual === 'entretiempo') {
                periodo = 'ENTRETIEMPO';
              } else if (periodoActual === 'segundoTiempo') {
                periodo = 'SEGUNDO TIEMPO';
              }
              
              return `${periodo} - ${formatearTiempo(tiempoTranscurrido)}`;
            })()}
            color={
              partido.estado === 'pausado' ? 'warning' :
              periodoActual === 'entretiempo' ? 'info' :
              partido.estado === 'En Curso' ? 'success' : 
              'default'
            }
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '0.75rem', sm: '0.9rem' },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              height: 'auto',
              '& .MuiChip-label': {
                px: { xs: 1, sm: 2 }
              }
            }}
          />
          
          {/* Botones para cambiar de período */}
          {partido.estado === 'En Curso' && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
              {/* Botón para pasar a Entretiempo */}
              {periodoActual === 'primerTiempo' && tiempoTranscurrido >= 2400 && (
                <Button
                  variant="contained"
                  color="info"
                  size="small"
                  onClick={() => {
                    setTiempoPrimerTiempo(tiempoTranscurrido);
                    setPeriodoActual('entretiempo');
                    // Pausar el cronómetro durante entretiempo
                    setCronometroActivo(false);
                  }}
                >
                  ☕ Iniciar Entretiempo
                </Button>
              )}
              
              {/* Botón para pasar a Segundo Tiempo */}
              {periodoActual === 'entretiempo' && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => {
                    setPeriodoActual('segundoTiempo');
                    // Continuar desde 40:00 (no reiniciar)
                    // El tiempoInicio ya está configurado correctamente
                    setCronometroActivo(true);
                  }}
                >
                  🏉 Iniciar Segundo Tiempo
                </Button>
              )}
              
              {/* Indicador del período */}
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1 }}>
                {periodoActual === 'primerTiempo' && '⏱️ Primer tiempo en curso'}
                {periodoActual === 'entretiempo' && '☕ Descanso'}
                {periodoActual === 'segundoTiempo' && '⏱️ Segundo tiempo en curso'}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Incidencias del partido - Estilo moderno */}
      {partido.incidencias && partido.incidencias.length > 0 && (
        <Paper 
          elevation={darkMode ? 3 : 2} 
          sx={{ 
            borderRadius: 3, 
            bgcolor: darkMode ? '#2d2d2d' : 'white', 
            mx: 2, 
            mt: 2,
            mb: 2,
            background: darkMode 
              ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
          }}
        >
          <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}` }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: darkMode ? '#e0e0e0' : '#424242' }}>
              Incidencias del Partido
            </Typography>
          </Box>
          
          <Box>
            {partido.incidencias
              .sort((a, b) => (a.minuto || 0) - (b.minuto || 0)) // Ordenar por minuto ascendente
              .map((incidencia, index) => {
          const getTipoIcon = (tipo) => {
            if (!tipo) {
              return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#757575' : '#9e9e9e', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🏈</Typography></Avatar>;
            }
            switch(tipo.toUpperCase()) {
                  case 'TRY': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#1976d2' : '#2196f3', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🏈</Typography></Avatar>;
                  case 'CONVERSION': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#4caf50' : '#66bb6a', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>⚡</Typography></Avatar>;
                  case 'PENAL': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#ff9800' : '#ffb74d', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🎯</Typography></Avatar>;
                  case 'DROP': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#9c27b0' : '#ba68c8', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>💧</Typography></Avatar>;
                  case 'TARJETA_AMARILLA': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#fdd835' : '#ffeb3b', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🟨</Typography></Avatar>;
                  case 'TARJETA_ROJA': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#e53935' : '#f44336', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🟥</Typography></Avatar>;
                  case 'TARJETA_AZUL': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#2196f3' : '#42a5f5', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🟦</Typography></Avatar>;
                  case 'tarjeta_azul': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#2196f3' : '#42a5f5', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🟦</Typography></Avatar>;
                  case 'CAMBIO': return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#607d8b' : '#78909c', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🔄</Typography></Avatar>;
                  default: return <Avatar sx={{ width: 32, height: 32, bgcolor: darkMode ? '#757575' : '#9e9e9e', boxShadow: 2 }}><Typography sx={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🏈</Typography></Avatar>;
            }
          };

          const getTipoBgColor = (tipo) => {
                // Fondo neutro igual al de las tarjetas
                return darkMode ? '#2d2d2d' : 'white';
          };

          // Renderizado especial y moderno para CAMBIO
          if (incidencia.tipo === 'CAMBIO') {
            return (
              <Card 
                key={incidencia.id || index}
                elevation={3}
                sx={{ 
                  mb: 2,
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: `2px solid ${darkMode ? '#1976d2' : '#2196f3'}`,
                  background: darkMode 
                    ? 'linear-gradient(135deg, #1e3a5f 0%, #2d2d2d 100%)'
                    : 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)'
                }}
              >
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  p: { xs: 2, sm: 3 },
                  gap: 2
                }}>
                  {/* Icono y Título */}
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    minWidth: { xs: 'auto', sm: 180 }
                  }}>
                    <Box sx={{ 
                      bgcolor: 'primary.main',
                      borderRadius: '50%',
                      width: 48,
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 3,
                      flexShrink: 0
                    }}>
                      <Typography sx={{ fontSize: '1.5rem' }}>🔄</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700,
                        color: darkMode ? '#90caf9' : '#1976d2',
                        fontSize: { xs: '1.1rem', sm: '1.25rem' }
                      }}>
                        CAMBIO
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: darkMode ? '#a0a0a0' : '#757575',
                        fontSize: '0.85rem'
                      }}>
                        #{incidencia.minuto || 0}' • {partido && obtenerEquipoCorrectoIncidencia(incidencia) === 'LOCAL' 
                          ? (typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre : partido.equipoLocal || 'Equipo Local')
                          : (typeof partido?.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre : partido?.equipoVisitante || 'Equipo Visitante')
                        }
                      </Typography>
                    </Box>
                  </Box>

                  {/* Jugadores - SALE y ENTRA */}
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    flex: 1
                  }}>
                    {/* Jugador que SALE */}
                    <Paper elevation={2} sx={{ 
                      flex: 1,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: darkMode ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.08)',
                      border: `1px solid ${darkMode ? '#d32f2f' : '#ef5350'}`
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ 
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: 'error.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography sx={{ fontSize: '0.9rem', color: 'white' }}>↓</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 600,
                          color: 'error.main',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}>
                          Sale
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600,
                        color: darkMode ? '#e0e0e0' : '#212121',
                        fontSize: '0.95rem'
                      }}>
                        {incidencia.jugadorSale?.nombre || incidencia.jugadorNombre || 'Jugador'}
                      </Typography>
                    </Paper>

                    {/* Jugador que ENTRA */}
                    <Paper elevation={2} sx={{ 
                      flex: 1,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.08)',
                      border: `1px solid ${darkMode ? '#388e3c' : '#66bb6a'}`
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ 
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography sx={{ fontSize: '0.9rem', color: 'white' }}>↑</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 600,
                          color: 'success.main',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}>
                          Entra
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600,
                        color: darkMode ? '#e0e0e0' : '#212121',
                        fontSize: '0.95rem'
                      }}>
                        {incidencia.jugadorEntra?.nombre || 'Jugador'}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Minuto */}
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: { xs: 'auto', sm: 60 }
                  }}>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700,
                      color: darkMode ? '#90caf9' : '#1976d2',
                      fontSize: { xs: '1.5rem', sm: '1.75rem' }
                    }}>
                      {incidencia.minuto || 0}'
                    </Typography>
                  </Box>
                </Box>
              </Card>
            );
          }

          // Renderizado normal para otras incidencias
          return (
            <Box 
              key={incidencia.id || index}
              sx={{ 
                    px: 3,
                    py: 2,
                    borderBottom: index < partido.incidencias.length - 1 ? `1px solid ${darkMode ? '#404040' : '#e0e0e0'}` : 'none',
                bgcolor: getTipoBgColor(incidencia.tipo),
                display: 'flex',
                alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: darkMode ? '#404040' : '#f8f9fa'
                    }
              }}
            >
              {getTipoIcon(incidencia.tipo || '')}
              <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: darkMode ? '#e0e0e0' : '#212121' }}>
                  {incidencia.tipo === 'TRY' ? 'TRY' :
                   incidencia.tipo === 'CONVERSION' ? 'CONVERSIÓN' :
                   incidencia.tipo === 'PENAL' ? 'PENAL' :
                   incidencia.tipo === 'DROP' ? 'DROP GOAL' :
                   incidencia.tipo === 'TARJETA_AMARILLA' ? 'TARJETA AMARILLA' :
                   incidencia.tipo === 'TARJETA_ROJA' ? 'TARJETA ROJA' :
                   incidencia.tipo === 'TARJETA_AZUL' ? 'TARJETA AZUL (LESIÓN)' :
                   incidencia.tipo === 'tarjeta_azul' ? 'TARJETA AZUL (LESIÓN)' :
                   incidencia.tipo ? incidencia.tipo.replace('_', ' ') : 'Incidencia'
                  }
                  {` - ${incidencia.jugadorNombre || 'Jugador'}`}
                </Typography>
                    <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                      #{incidencia.minuto || 0}' • {partido && obtenerEquipoCorrectoIncidencia(incidencia) === 'LOCAL' 
                    ? (typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre : partido.equipoLocal || 'Equipo Local')
                    : (typeof partido?.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre : partido?.equipoVisitante || 'Equipo Visitante')
                  }
                  {incidencia.descripcion && ` • ${incidencia.descripcion}`}
                </Typography>
              </Box>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: darkMode ? '#a0a0a0' : '#757575',
                    minWidth: 40,
                    textAlign: 'right'
                  }}>
                    {incidencia.minuto || 0}'
                  </Typography>
            </Box>
          );
        })}
          </Box>
        </Paper>
      )}
        {(!partido.incidencias || partido.incidencias.length === 0) && (
        <Paper 
          elevation={darkMode ? 3 : 2} 
          sx={{ 
            borderRadius: 3, 
            bgcolor: darkMode ? '#2d2d2d' : 'white', 
            mx: 2, 
            mt: 2,
            mb: 2,
            background: darkMode 
              ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
          }}
        >
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
              No hay incidencias registradas
            </Typography>
          </Box>
         </Paper>
       )}


      {/* Listas de Buena Fe */}
      {(convocadosLocal || convocadosVisitante) && (
        <Paper 
          elevation={darkMode ? 3 : 2} 
          sx={{ 
            borderRadius: 3, 
            bgcolor: darkMode ? '#2d2d2d' : 'white', 
            mx: 2, 
            mt: 2,
            mb: 2,
            background: darkMode 
              ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
          }}
        >
          <Box sx={{ 
            p: 3, 
            borderBottom: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: darkMode ? '#e0e0e0' : '#424242' }}>
                📋 Listas de Buena Fe
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Edit />}
              onClick={() => {
                if (partido?.estado === 'En Curso' || partido?.estado === 'pausado' || partido?.estado === 'finalizado') {
                  mostrarNotificacion({
                    title: 'No Permitido',
                    message: 'No se pueden editar las listas de convocados una vez iniciado el partido',
                    severity: 'warning'
                  });
                  return;
                }
                setOpenEditarConvocados(true);
              }}
              disabled={partido?.estado === 'En Curso' || partido?.estado === 'pausado' || partido?.estado === 'finalizado'}
              sx={{
                borderColor: darkMode ? '#555' : '#c0c0c0',
                color: darkMode ? '#e0e0e0' : '#212121',
                '&:hover': {
                  borderColor: darkMode ? '#777' : '#a0a0a0',
                  bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                },
                '&:disabled': {
                  borderColor: darkMode ? '#333' : '#e0e0e0',
                  color: darkMode ? '#666' : '#999',
                  opacity: 0.5
                }
              }}
            >
              {partido?.estado === 'En Curso' || partido?.estado === 'pausado' ? 'No se puede editar (Partido iniciado)' : 'Editar Listas'}
            </Button>
      </Box>
          
          {cargandoConvocados ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575', mt: 2 }}>
                Cargando convocados...
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ p: 3 }}>
              {/* Convocados Local */}
              {convocadosLocal && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: darkMode ? '#404040' : '#f5f5f5', 
                    borderRadius: 2,
                    border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LogoDisplay
                          src={construirUrlImagen(partido.equipoLocalLogo)}
                          alt={convocadosLocal.equipoNombre}
                          size="small"
                          shape="rounded"
                          fallbackText={convocadosLocal.equipoNombre}
                          sx={{ width: 40, height: 40, borderRadius: '50%' }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: darkMode ? '#ffffff' : '#000000' }}>
                        {convocadosLocal.equipoNombre} ({convocadosLocal.estadisticas.totalJugadores})
                      </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {partido.estado === 'En Curso' && (() => {
                          const cambiosLocal = (partido.incidencias || []).filter(
                            inc => (inc.tipo === 'CAMBIO' || inc.tipo === 'cambio') && inc.equipo === 'LOCAL'
                          ).length;
                          const cambiosRestantes = 8 - cambiosLocal;
                          return (
                            <Chip 
                              label={`Cambios: ${cambiosLocal}/8`}
                              color={cambiosRestantes === 0 ? 'error' : cambiosRestantes <= 2 ? 'warning' : 'primary'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          );
                        })()}
                        <Chip 
                          label={convocadosLocal.estado} 
                          color={convocadosLocal.estado === 'confirmado' ? 'success' : 'default'}
                          size="small"
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => abrirEdicionConvocados(convocadosLocal, 'local')}
                          disabled={partido?.estado === 'En Curso' || partido?.estado === 'pausado' || partido?.estado === 'finalizado'}
                          sx={{
                            minWidth: 'auto',
                            px: 1,
                            py: 0.5,
                            fontSize: '0.75rem',
                            borderColor: darkMode ? '#555' : '#c0c0c0',
                            color: darkMode ? '#e0e0e0' : '#212121',
                            '&:hover': {
                              borderColor: darkMode ? '#777' : '#a0a0a0',
                              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                            }
                          }}
                        >
                          Editar
                        </Button>
                      </Box>
                    </Box>
                    
                    {/* Titulares - Mejorado responsive */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ 
                        fontWeight: 600, 
                        color: '#4caf50', 
                        mb: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        fontSize: { xs: '0.95rem', sm: '0.875rem' }
                      }}>
                        TITULARES
                    </Typography>
                      <Box sx={{ 
                        maxHeight: 200, 
                        overflowY: 'auto', 
                        p: { xs: 1.5, sm: 1 }, 
                        bgcolor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)', 
                        borderRadius: 2,
                        // Scrollbar oscuro
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                          borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: darkMode ? '#555' : '#888',
                          borderRadius: '10px',
                          '&:hover': {
                            backgroundColor: darkMode ? '#777' : '#555',
                          },
                        },
                      }}>
                        {convocadosLocal.jugadores.filter(j => j.esTitular).length > 0 ? (
                          convocadosLocal.jugadores.filter(j => j.esTitular).map((jugador) => (
                            <Box 
                              key={jugador.id}
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                gap: 2, 
                                p: 1, 
                                mb: 0.5,
                                bgcolor: darkMode ? '#2d2d2d' : 'white',
                                borderRadius: 1,
                                border: `2px solid ${darkMode ? '#4caf50' : '#81c784'}`
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: darkMode ? '#e0e0e0' : '#212121' }}>
                                  {jugador.nombre} {jugador.apellido}
                                </Typography>
                                <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                  {jugador.posicion || 'Sin posición'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {jugador.expulsado && (
                                  <Chip 
                                    label={`🟥 EXPULSADO ${jugador.minutoExpulsion}'`}
                                    size="small" 
                                    color="error" 
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#d32f2f' }}
                                  />
                                )}
                                {jugador.enSinBin && !jugador.expulsado && (
                                  <Chip 
                                    label={`🟨 SIN BIN ${jugador.minutoSinBin}' (Vuelve min ${jugador.minutoPuedeVolver}')`}
                                    size="small" 
                                    color="warning" 
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                  />
                                )}
                                {jugador.activo && !jugador.enSinBin && !jugador.expulsado && (
                                  <Chip 
                                    label="EN CANCHA" 
                                    size="small" 
                                    color="success" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                                {!jugador.activo && jugador.minutoSalida && !jugador.enSinBin && !jugador.expulsado && (
                                  <Chip 
                                    label={`SALIÓ ${jugador.minutoSalida}'`}
                                    size="small" 
                                    color="error" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                            No hay titulares seleccionados
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Suplentes - Mejorado responsive */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ 
                        fontWeight: 600, 
                        color: darkMode ? '#90caf9' : '#2196f3', 
                        mb: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        fontSize: { xs: '0.95rem', sm: '0.875rem' }
                      }}>
                        🔄 SUPLENTES
                      </Typography>
                      <Box sx={{ 
                        maxHeight: 200, 
                        overflowY: 'auto', 
                        p: { xs: 1.5, sm: 1 },
                        // Scrollbar oscuro
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                          borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: darkMode ? '#555' : '#888',
                          borderRadius: '10px',
                          '&:hover': {
                            backgroundColor: darkMode ? '#777' : '#555',
                          },
                        },
                      }}>
                        {convocadosLocal.jugadores.filter(j => !j.esTitular).length > 0 ? (
                          convocadosLocal.jugadores.filter(j => !j.esTitular).map((jugador) => (
                        <Box 
                          key={jugador.id}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                                justifyContent: 'space-between',
                            gap: 2, 
                            p: 1, 
                            mb: 0.5,
                            bgcolor: darkMode ? '#2d2d2d' : 'white',
                            borderRadius: 1,
                            border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                          }}
                        >
                              <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: darkMode ? '#e0e0e0' : '#212121' }}>
                            {jugador.nombre} {jugador.apellido}
                          </Typography>
                          <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                  {jugador.posicion || 'Sin posición'}
                          </Typography>
                        </Box>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {jugador.activo && jugador.minutoInicio && (
                                  <Chip 
                                    label={`ENTRÓ ${jugador.minutoInicio}'`}
                                    size="small" 
                                    color="primary" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                                {!jugador.activo && jugador.minutoSalida && (
                                  <Chip 
                                    label={`SALIÓ ${jugador.minutoSalida}'`}
                                    size="small" 
                                    color="default" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                            No hay suplentes
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              )}

              {/* Convocados Visitante */}
              {convocadosVisitante && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: darkMode ? '#404040' : '#f5f5f5', 
                    borderRadius: 2,
                    border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LogoDisplay
                          src={construirUrlImagen(partido.equipoVisitanteLogo)}
                          alt={convocadosVisitante.equipoNombre}
                          size="small"
                          shape="rounded"
                          fallbackText={convocadosVisitante.equipoNombre}
                          sx={{ width: 40, height: 40, borderRadius: '50%' }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: darkMode ? '#ffffff' : '#000000' }}>
                        {convocadosVisitante.equipoNombre} ({convocadosVisitante.estadisticas.totalJugadores})
                      </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {partido.estado === 'En Curso' && (() => {
                          const cambiosVisitante = (partido.incidencias || []).filter(
                            inc => (inc.tipo === 'CAMBIO' || inc.tipo === 'cambio') && inc.equipo === 'VISITANTE'
                          ).length;
                          const cambiosRestantes = 8 - cambiosVisitante;
                          return (
                            <Chip 
                              label={`Cambios: ${cambiosVisitante}/8`}
                              color={cambiosRestantes === 0 ? 'error' : cambiosRestantes <= 2 ? 'warning' : 'primary'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          );
                        })()}
                        <Chip 
                          label={convocadosVisitante.estado} 
                          color={convocadosVisitante.estado === 'confirmado' ? 'success' : 'default'}
                          size="small"
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => abrirEdicionConvocados(convocadosVisitante, 'visitante')}
                          disabled={partido?.estado === 'En Curso' || partido?.estado === 'pausado' || partido?.estado === 'finalizado'}
                          sx={{
                            minWidth: 'auto',
                            px: 1,
                            py: 0.5,
                            fontSize: '0.75rem',
                            borderColor: darkMode ? '#555' : '#c0c0c0',
                            color: darkMode ? '#e0e0e0' : '#212121',
                            '&:hover': {
                              borderColor: darkMode ? '#777' : '#a0a0a0',
                              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                            }
                          }}
                        >
                          Editar
                        </Button>
                      </Box>
                    </Box>
                    
                    {/* Titulares - Mejorado responsive */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ 
                        fontWeight: 600, 
                        color: '#4caf50', 
                        mb: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        fontSize: { xs: '0.95rem', sm: '0.875rem' }
                      }}>
                        TITULARES
                    </Typography>
                      <Box sx={{ 
                        maxHeight: 200, 
                        overflowY: 'auto', 
                        p: { xs: 1.5, sm: 1 }, 
                        bgcolor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)', 
                        borderRadius: 2,
                        // Scrollbar oscuro
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                          borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: darkMode ? '#555' : '#888',
                          borderRadius: '10px',
                          '&:hover': {
                            backgroundColor: darkMode ? '#777' : '#555',
                          },
                        },
                      }}>
                        {convocadosVisitante.jugadores.filter(j => j.esTitular).length > 0 ? (
                          convocadosVisitante.jugadores.filter(j => j.esTitular).map((jugador) => (
                            <Box 
                              key={jugador.id}
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                gap: 2, 
                                p: 1, 
                                mb: 0.5,
                                bgcolor: darkMode ? '#2d2d2d' : 'white',
                                borderRadius: 1,
                                border: `2px solid ${darkMode ? '#4caf50' : '#81c784'}`
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: darkMode ? '#e0e0e0' : '#212121' }}>
                                  {jugador.nombre} {jugador.apellido}
                                </Typography>
                                <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                  {jugador.posicion || 'Sin posición'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {jugador.expulsado && (
                                  <Chip 
                                    label={`🟥 EXPULSADO ${jugador.minutoExpulsion}'`}
                                    size="small" 
                                    color="error" 
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#d32f2f' }}
                                  />
                                )}
                                {jugador.enSinBin && !jugador.expulsado && (
                                  <Chip 
                                    label={`🟨 SIN BIN ${jugador.minutoSinBin}' (Vuelve min ${jugador.minutoPuedeVolver}')`}
                                    size="small" 
                                    color="warning" 
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                  />
                                )}
                                {jugador.activo && !jugador.enSinBin && !jugador.expulsado && (
                                  <Chip 
                                    label="EN CANCHA" 
                                    size="small" 
                                    color="success" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                                {!jugador.activo && jugador.minutoSalida && !jugador.enSinBin && !jugador.expulsado && (
                                  <Chip 
                                    label={`SALIÓ ${jugador.minutoSalida}'`}
                                    size="small" 
                                    color="error" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                            No hay titulares seleccionados
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Suplentes - Mejorado responsive */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ 
                        fontWeight: 600, 
                        color: darkMode ? '#90caf9' : '#2196f3', 
                        mb: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        fontSize: { xs: '0.95rem', sm: '0.875rem' }
                      }}>
                        🔄 SUPLENTES
                      </Typography>
                      <Box sx={{ 
                        maxHeight: 200, 
                        overflowY: 'auto', 
                        p: { xs: 1.5, sm: 1 },
                        // Scrollbar oscuro
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                          borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: darkMode ? '#555' : '#888',
                          borderRadius: '10px',
                          '&:hover': {
                            backgroundColor: darkMode ? '#777' : '#555',
                          },
                        },
                      }}>
                        {convocadosVisitante.jugadores.filter(j => !j.esTitular).length > 0 ? (
                          convocadosVisitante.jugadores.filter(j => !j.esTitular).map((jugador) => (
                        <Box 
                          key={jugador.id}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                                justifyContent: 'space-between',
                            gap: 2, 
                            p: 1, 
                            mb: 0.5,
                            bgcolor: darkMode ? '#2d2d2d' : 'white',
                            borderRadius: 1,
                            border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                          }}
                        >
                              <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: darkMode ? '#e0e0e0' : '#212121' }}>
                            {jugador.nombre} {jugador.apellido}
                          </Typography>
                          <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                                  {jugador.posicion || 'Sin posición'}
                          </Typography>
                        </Box>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {jugador.activo && jugador.minutoInicio && (
                                  <Chip 
                                    label={`ENTRÓ ${jugador.minutoInicio}'`}
                                    size="small" 
                                    color="primary" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                                {!jugador.activo && jugador.minutoSalida && (
                                  <Chip 
                                    label={`SALIÓ ${jugador.minutoSalida}'`}
                                    size="small" 
                                    color="default" 
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                            No hay suplentes
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </Paper>
      )}

      {/* Jugadores Expulsados (Tarjeta Roja) */}
      {partido.estado === 'En Curso' && (convocadosLocal || convocadosVisitante) && (() => {
        const jugadoresExpulsados = [
          ...(convocadosLocal?.jugadores || []).filter(j => j.expulsado).map(j => ({ ...j, equipo: 'LOCAL', equipoNombre: convocadosLocal.equipoNombre })),
          ...(convocadosVisitante?.jugadores || []).filter(j => j.expulsado).map(j => ({ ...j, equipo: 'VISITANTE', equipoNombre: convocadosVisitante.equipoNombre }))
        ];

        if (jugadoresExpulsados.length === 0) return null;

        return (
          <Paper 
            elevation={darkMode ? 3 : 2} 
            sx={{ 
              borderRadius: 3, 
              bgcolor: darkMode ? '#2d2d2d' : 'white', 
              mx: 2, 
              mt: 2,
              mb: 2,
              background: darkMode 
                ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
            }}
          >
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}` }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: darkMode ? '#e0e0e0' : '#424242' }}>
                🟥 Jugadores Expulsados (Tarjeta Roja)
              </Typography>
              <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                Expulsión definitiva • Sin reemplazo permitido • Fuera del partido
              </Typography>
            </Box>
            
            <Box sx={{ p: 3 }}>
              {jugadoresExpulsados.map((jugador) => (
                <Alert 
                  key={jugador.id}
                  severity="error"
                  sx={{ mb: 2 }}
                  icon={<span style={{ fontSize: '1.5rem' }}>🟥</span>}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {jugador.nombre} {jugador.apellido} ({jugador.equipoNombre})
                  </Typography>
                  <Typography variant="caption">
                    ❌ Expulsado en el minuto {jugador.minutoExpulsion}' • {jugador.motivoExpulsion}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                    El equipo juega con un jugador menos por el resto del partido
                  </Typography>
                </Alert>
                      ))}
                    </Box>
          </Paper>
        );
      })()}

      {/* Jugadores en Sin Bin (Tarjeta Amarilla - 10 minutos) */}
      {partido.estado === 'En Curso' && (convocadosLocal || convocadosVisitante) && (() => {
        const minutoActual = Math.floor(tiempoTranscurrido / 60);
        const jugadoresEnSinBin = [
          ...(convocadosLocal?.jugadores || []).filter(j => j.enSinBin).map(j => ({ ...j, equipo: 'LOCAL', equipoNombre: convocadosLocal.equipoNombre })),
          ...(convocadosVisitante?.jugadores || []).filter(j => j.enSinBin).map(j => ({ ...j, equipo: 'VISITANTE', equipoNombre: convocadosVisitante.equipoNombre }))
        ];

        if (jugadoresEnSinBin.length === 0) return null;

        return (
          <Paper 
            elevation={darkMode ? 3 : 2} 
            sx={{ 
              borderRadius: 3, 
              bgcolor: darkMode ? '#2d2d2d' : 'white', 
              mx: 2, 
              mt: 2,
              mb: 2,
              background: darkMode 
                ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
            }}
          >
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}` }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: darkMode ? '#e0e0e0' : '#424242' }}>
                🟨 Jugadores en Sin Bin (Tarjeta Amarilla)
              </Typography>
              <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                Expulsión temporal por 10 minutos • Sin reemplazo permitido
              </Typography>
                  </Box>
            
            <Box sx={{ p: 3 }}>
              {jugadoresEnSinBin.map((jugador) => {
                const minutosPasados = minutoActual - (jugador.minutoSinBin || 0);
                const puedeVolver = minutoActual >= (jugador.minutoPuedeVolver || 999);
                
                return (
                  <Alert 
                    key={jugador.id}
                    severity={puedeVolver ? "success" : "warning"}
                    sx={{ mb: 2 }}
                    action={
                      puedeVolver && (
                        <Button
                          color="inherit"
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            try {
                              await api.post(`/partido-live/${partidoId}/autorizar-regreso`, {
                                jugadorId: jugador.id,
                                equipo: jugador.equipo,
                                minutoRegreso: minutoActual
                              });
                              await cargarConvocados();
                              mostrarNotificacion({
                                title: '✅ Regreso Autorizado',
                                message: `${jugador.nombre} ${jugador.apellido} ha regresado al campo`,
                                severity: 'success'
                              });
                            } catch (error) {
                              mostrarNotificacion({
                                title: 'Error',
                                message: 'Error al autorizar regreso: ' + error.message,
                                severity: 'error'
                              });
                            }
                          }}
                        >
                          Autorizar Regreso
                        </Button>
                      )
                    }
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {jugador.nombre} {jugador.apellido} ({jugador.equipoNombre})
                    </Typography>
                    <Typography variant="caption">
                      {puedeVolver 
                        ? `✅ Puede regresar (10 minutos cumplidos)`
                        : `⏳ Faltan ${10 - minutosPasados} minuto(s) • Salió en el min ${jugador.minutoSinBin}'`
                      }
                    </Typography>
                  </Alert>
                );
              })}
            </Box>
          </Paper>
        );
      })()}

      {/* Minutos Jugados en Tiempo Real */}
      {partido.estado === 'En Curso' && (convocadosLocal || convocadosVisitante) && (
        <Paper 
          elevation={darkMode ? 3 : 2} 
          sx={{ 
            borderRadius: 3, 
            bgcolor: darkMode ? '#2d2d2d' : 'white', 
            mx: 2, 
            mt: 2,
            mb: 2,
            background: darkMode 
              ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0'
          }}
        >
          <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}` }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: darkMode ? '#e0e0e0' : '#424242' }}>
              ⏱️ Minutos Jugados en Tiempo Real
            </Typography>
            <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
              Seguimiento de minutos para cada jugador activo
            </Typography>
          </Box>
          
          <Grid container spacing={2} sx={{ p: 3 }}>
            {/* Equipo Local */}
            {convocadosLocal && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: darkMode ? '#ffffff' : '#000000' }}>
                  {convocadosLocal.equipoNombre}
                </Typography>
                <List dense>
                  {convocadosLocal.jugadores
                    .filter(j => j.activo && !j.enSinBin && !j.expulsado)
                    .map((jugador) => {
                      const minutoActual = Math.floor(tiempoTranscurrido / 60);
                      const minutoInicio = jugador.minutoInicio || 0;
                      
                      // Calcular minutos en ESTE PARTIDO (excluyendo entretiempo)
                      let minutosEnEstePartido = 0;
                      if (jugador.activo && minutoInicio !== null) {
                        // Jugador ACTIVO: desde que entró hasta ahora (sin contar entretiempo)
                        const minutoActualReal = calcularMinutosReales(minutoActual);
                        const minutoInicioReal = calcularMinutosReales(minutoInicio);
                        minutosEnEstePartido = Math.max(0, minutoActualReal - minutoInicioReal);
                      } else if (jugador.minutoSalida !== null && minutoInicio !== null) {
                        // Jugador que ya SALIÓ: desde que entró hasta que salió (sin entretiempo)
                        const minutoSalidaReal = calcularMinutosReales(jugador.minutoSalida);
                        const minutoInicioReal = calcularMinutosReales(minutoInicio);
                        minutosEnEstePartido = Math.max(0, minutoSalidaReal - minutoInicioReal);
                      }
                      
                      // minutosJugados = minutos HISTÓRICOS del torneo (partidos anteriores)
                      const minutosHistoricos = jugador.minutosJugados || 0;
                      const totalMinutos = minutosHistoricos + minutosEnEstePartido;
                      
                      // Determinar color según minutos
                      let colorMinutos = darkMode ? '#4caf50' : '#66bb6a'; // Verde por defecto
                      if (totalMinutos >= 80) {
                        colorMinutos = darkMode ? '#f44336' : '#ef5350'; // Rojo >= 80
                      } else if (totalMinutos >= 70) {
                        colorMinutos = darkMode ? '#ff9800' : '#ffb74d'; // Naranja >= 70
                      }
                      
                      return (
                        <ListItem 
                          key={jugador.id}
                          sx={{ 
                            bgcolor: totalMinutos >= 80 
                              ? (darkMode ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)')
                              : totalMinutos >= 70
                              ? (darkMode ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)')
                              : 'transparent',
                            borderRadius: 1,
                            mb: 0.5,
                            border: totalMinutos >= 80 ? '2px solid #f44336' : 'none'
                          }}
                        >
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {jugador.activo && (
                                  <Chip 
                                    label={periodoActual === 'entretiempo' ? "DESCANSANDO" : "JUGANDO"}
                                    size="small" 
                                    color={periodoActual === 'entretiempo' ? "info" : "success"}
                                    sx={ periodoActual !== 'entretiempo' ? { 
                                      animation: 'pulse 2s infinite',
                                      '@keyframes pulse': {
                                        '0%, 100%': { opacity: 1 },
                                        '50%': { opacity: 0.5 }
                                      }
                                    } : {}}
                                  />
                                )}
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {jugador.nombre} {jugador.apellido}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: colorMinutos,
                                  fontWeight: 700,
                                  fontSize: '0.9rem'
                                }}
                              >
                                {totalMinutos} minutos
                                {totalMinutos >= 80 && ' ⚠️ LÍMITE ALCANZADO'}
                                {totalMinutos >= 70 && totalMinutos < 80 && ' ⚠️ Cerca del límite'}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                </List>
                </Grid>
              )}

            {/* Equipo Visitante */}
            {convocadosVisitante && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: darkMode ? '#ffffff' : '#000000' }}>
                  {convocadosVisitante.equipoNombre}
                </Typography>
                <List dense>
                  {convocadosVisitante.jugadores
                    .filter(j => j.activo && !j.enSinBin && !j.expulsado)
                    .map((jugador) => {
                      const minutoActual = Math.floor(tiempoTranscurrido / 60);
                      const minutoInicio = jugador.minutoInicio || 0;
                      
                      // Calcular minutos en ESTE PARTIDO (excluyendo entretiempo)
                      let minutosEnEstePartido = 0;
                      if (jugador.activo && minutoInicio !== null) {
                        // Jugador ACTIVO: desde que entró hasta ahora (sin contar entretiempo)
                        const minutoActualReal = calcularMinutosReales(minutoActual);
                        const minutoInicioReal = calcularMinutosReales(minutoInicio);
                        minutosEnEstePartido = Math.max(0, minutoActualReal - minutoInicioReal);
                      } else if (jugador.minutoSalida !== null && minutoInicio !== null) {
                        // Jugador que ya SALIÓ: desde que entró hasta que salió (sin entretiempo)
                        const minutoSalidaReal = calcularMinutosReales(jugador.minutoSalida);
                        const minutoInicioReal = calcularMinutosReales(minutoInicio);
                        minutosEnEstePartido = Math.max(0, minutoSalidaReal - minutoInicioReal);
                      }
                      
                      // minutosJugados = minutos HISTÓRICOS del torneo (partidos anteriores)
                      const minutosHistoricos = jugador.minutosJugados || 0;
                      const totalMinutos = minutosHistoricos + minutosEnEstePartido;
                      
                      // Determinar color según minutos
                      let colorMinutos = darkMode ? '#4caf50' : '#66bb6a'; // Verde por defecto
                      if (totalMinutos >= 80) {
                        colorMinutos = darkMode ? '#f44336' : '#ef5350'; // Rojo >= 80
                      } else if (totalMinutos >= 70) {
                        colorMinutos = darkMode ? '#ff9800' : '#ffb74d'; // Naranja >= 70
                      }
                      
                      return (
                        <ListItem 
                          key={jugador.id}
                          sx={{ 
                            bgcolor: totalMinutos >= 80 
                              ? (darkMode ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)')
                              : totalMinutos >= 70
                              ? (darkMode ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)')
                              : 'transparent',
                            borderRadius: 1,
                            mb: 0.5,
                            border: totalMinutos >= 80 ? '2px solid #f44336' : 'none'
                          }}
                        >
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {jugador.activo && (
                                  <Chip 
                                    label={periodoActual === 'entretiempo' ? "DESCANSANDO" : "JUGANDO"}
                                    size="small" 
                                    color={periodoActual === 'entretiempo' ? "info" : "success"}
                                    sx={ periodoActual !== 'entretiempo' ? { 
                                      animation: 'pulse 2s infinite',
                                      '@keyframes pulse': {
                                        '0%, 100%': { opacity: 1 },
                                        '50%': { opacity: 0.5 }
                                      }
                                    } : {}}
                                  />
                                )}
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {jugador.nombre} {jugador.apellido}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: colorMinutos,
                                  fontWeight: 700,
                                  fontSize: '0.9rem'
                                }}
                              >
                                {totalMinutos} minutos
                                {totalMinutos >= 80 && ' ⚠️ LÍMITE ALCANZADO'}
                                {totalMinutos >= 70 && totalMinutos < 80 && ' ⚠️ Cerca del límite'}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                </List>
            </Grid>
          )}
          </Grid>
        </Paper>
      )}

      {/* Panel de control del árbitro */}
      <Grid container spacing={2} sx={{ mt: 2, px: 2 }}>
        {/* Cronómetro y controles */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Timer sx={{ mr: 1 }} />
                  <Typography variant="h6">Control del Partido</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {partido.estado === 'programado' && permissions.canStartPartido(partido) && (
                      <>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="large"
                          fullWidth
                          startIcon={<Assignment />}
                          onClick={abrirConfiguracionAlineaciones}
                          sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', mb: 1 }}
                        >
                          Configurar Alineaciones (Titulares y Suplentes)
                        </Button>
                        
                        {alineacionesConfirmadas && (
                          <Alert severity="success" sx={{ mb: 1 }}>
                            ✅ Alineaciones confirmadas. Listo para iniciar el partido.
                          </Alert>
                        )}
                        
                        <Button
                          variant="contained"
                          color="success"
                          size="large"
                          fullWidth
                          startIcon={<PlayArrow />}
                          onClick={iniciarPartido}
                          sx={{ py: 1.5, borderRadius: 2, textTransform: 'none' }}
                        >
                          Iniciar Partido
                        </Button>
                  </>
                )}
                
                {(partido.estado === 'En Curso' || partido.estado === 'pausado') && permissions.canModifyPartido(partido) && (
                  <>
                    {partido.estado === 'En Curso' && (
                      <Button
                        variant="contained"
                        color="warning"
                        size="large"
                        fullWidth
                        startIcon={<Pause />}
                        onClick={pausarCronometro}
                        disabled={procesandoCronometro}
                        sx={{ py: 1.5, borderRadius: 2, textTransform: 'none' }}
                      >
                        {procesandoCronometro ? 'Pausando...' : 'Pausar Cronómetro'}
                      </Button>
                    )}
                    
                    {partido.estado === 'pausado' && (
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        fullWidth
                        startIcon={<PlayArrow />}
                        onClick={reanudarCronometro}
                        disabled={procesandoCronometro}
                        sx={{ py: 1.5, borderRadius: 2, textTransform: 'none' }}
                      >
                        {procesandoCronometro ? 'Reanudando...' : 'Reanudar Cronómetro'}
                      </Button>
                    )}
                    
                    <Button
                      variant="contained"
                      color="error"
                      size="large"
                      fullWidth
                      startIcon={<Assignment />}
                      onClick={finalizarPartidoSimple}
                      sx={{ py: 1.5, borderRadius: 2, textTransform: 'none' }}
                    >
                      Finalizar Partido
                    </Button>
                  </>
                )}
                
                {!permissions.canStartPartido(partido) && partido.estado === 'programado' && (
                  <Alert severity="warning">
                    Solo el árbitro principal asignado puede iniciar este partido
                  </Alert>
                )}
                
                {!permissions.canModifyPartido(partido) && (partido.estado === 'En Curso' || partido.estado === 'pausado') && (
                  <Alert severity="warning">
                    Solo el árbitro principal asignado puede gestionar este partido
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Botón para agregar incidencias */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<Add />}
            onClick={() => setOpenIncidencia(true)}
            disabled={partido.estado !== 'En Curso' || !permissions.canModifyPartido(partido)}
            sx={{ 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            Agregar Incidencia
          </Button>
        </Grid>

        {/* Sección de estadísticas eliminada por contener datos de ejemplo */}

        {/* Información de trazabilidad (User Story 1.2) - Oculta en modo móvil */}
        {partido.auditoria && permissions.canViewAuditTrail() && (
          <Grid item xs={12} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Trazabilidad del Partido
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" color="primary">
                      Creado por:
                    </Typography>
                    <Typography variant="body2">
                      {partido.auditoria.creadoPorNombre || 'No disponible'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {partido.fechaCreacion ? new Date(partido.fechaCreacion).toLocaleString() : ''}
                    </Typography>
                  </Grid>
                  
                  {partido.auditoria.iniciadoPor && (
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2" color="primary">
                        Iniciado por:
                      </Typography>
                      <Typography variant="body2">
                        {partido.auditoria.iniciadoPorNombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {partido.tiempo?.inicio ? new Date(partido.tiempo.inicio).toLocaleString() : ''}
                      </Typography>
                    </Grid>
                  )}
                  
                  {partido.auditoria.cerradoPor && (
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2" color="primary">
                        Cerrado por:
                      </Typography>
                      <Typography variant="body2">
                        {partido.auditoria.cerradoPorNombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {partido.fechaFinalizacion ? new Date(partido.fechaFinalizacion).toLocaleString() : ''}
                      </Typography>
                    </Grid>
                  )}
                  
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" color="primary">
                      Última modificación:
                    </Typography>
                    <Typography variant="body2">
                      {partido.auditoria.modificadoPorNombre || 'No disponible'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {partido.fechaActualizacion ? new Date(partido.fechaActualizacion).toLocaleString() : ''}
                    </Typography>
                  </Grid>
                </Grid>
                
                {/* Historial de cambios */}
                {partido.auditoria.historialCambios && partido.auditoria.historialCambios.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Historial de Cambios:
                    </Typography>
                    <List dense>
                      {partido.auditoria.historialCambios.slice(-5).map((cambio, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={`${cambio.accion} - ${cambio.usuarioNombre}`}
                            secondary={new Date(cambio.timestamp).toLocaleString()}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Validaciones de consistencia (User Story 1.2) - Oculta en modo móvil */}
        {validaciones && (
          <Grid item xs={12} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Validaciones de Consistencia
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={validaciones.valido ? 'Válido' : 'Con Errores'} 
                    color={validaciones.valido ? 'success' : 'error'}
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Validado el {new Date(validaciones.fechaValidacion).toLocaleString()}
                  </Typography>
                </Box>

                {validaciones.errores.length > 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Errores encontrados:
                    </Typography>
                    <List dense>
                      {validaciones.errores.map((error, index) => (
                        <ListItem key={index} sx={{ py: 0 }}>
                          <ListItemText primary={`• ${error}`} />
                        </ListItem>
                      ))}
                    </List>
                  </Alert>
                )}

                {validaciones.advertencias.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Advertencias:
                    </Typography>
                    <List dense>
                      {validaciones.advertencias.map((advertencia, index) => (
                        <ListItem key={index} sx={{ py: 0 }}>
                          <ListItemText primary={`• ${advertencia}`} />
                        </ListItem>
                      ))}
                    </List>
                  </Alert>
                )}

                {/* Detalles de validación */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Equipos
                    </Typography>
                    <Typography variant="body2">
                      <strong>Local:</strong> {validaciones.detalles.equipos?.equipos?.local?.nombre || 'No disponible'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Visitante:</strong> {validaciones.detalles.equipos?.equipos?.visitante?.nombre || 'No disponible'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Árbitros
                    </Typography>
                    <Typography variant="body2">
                      <strong>Principal:</strong> {validaciones.detalles.arbitros?.arbitros?.principal?.nombre || 'No disponible'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Asistentes:</strong> {Object.keys(validaciones.detalles.arbitros?.arbitros || {}).filter(k => k !== 'principal').length}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Cancha
                    </Typography>
                    <Typography variant="body2">
                      <strong>Nombre:</strong> {validaciones.detalles.cancha?.cancha?.nombre || 'No disponible'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Estado:</strong> {validaciones.detalles.cancha?.cancha?.activa ? 'Activa' : 'Inactiva'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Jugadores
                    </Typography>
                    <Typography variant="body2">
                      <strong>Local:</strong> {validaciones.detalles.jugadores?.jugadores?.local?.total || 0} jugadores
                    </Typography>
                    <Typography variant="body2">
                      <strong>Visitante:</strong> {validaciones.detalles.jugadores?.jugadores?.visitante?.total || 0} jugadores
                    </Typography>
                  </Grid>
                </Grid>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
      </Grid>

      {/* Dialog para agregar incidencia */}
      <Dialog 
        open={openIncidencia} 
        onClose={() => setOpenIncidencia(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            m: { xs: 2, sm: 3 }
          }
        }}
      >
        <DialogTitle sx={{ 
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 700,
          pb: 2
        }}>
          Agregar Incidencia
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: 0.5 }}>
            {/* Tipo de Incidencia */}
            <Grid item xs={12}>
              <FormControl fullWidth size="medium">
                <InputLabel>Tipo de Incidencia</InputLabel>
                <Select
                  value={nuevaIncidencia.tipo}
                  onChange={(e) => setNuevaIncidencia({...nuevaIncidencia, tipo: e.target.value})}
                  sx={{ 
                    '& .MuiSelect-select': { 
                      py: { xs: 2, sm: 1.5 },
                      fontSize: { xs: '1rem', sm: '0.875rem' }
                    }
                  }}
                >
                  <MenuItem value="TRY">Try (Ensayo - 5 pts + Conversión opcional)</MenuItem>
                  <MenuItem value="PENAL">Penal (3 pts)</MenuItem>
                  <MenuItem value="DROP">Drop Goal (3 pts)</MenuItem>
                  <MenuItem value="TARJETA_AMARILLA">Tarjeta Amarilla (10 min)</MenuItem>
                  <MenuItem value="TARJETA_ROJA">Tarjeta Roja (Expulsión)</MenuItem>
                  <MenuItem value="TARJETA_AZUL">Tarjeta Azul (Lesión)</MenuItem>
                  <MenuItem value="CAMBIO">Cambio</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Alerta de límite de cambios */}
            {nuevaIncidencia.tipo === 'CAMBIO' && nuevaIncidencia.equipo && (() => {
              const cambiosRealizados = (partido.incidencias || []).filter(
                inc => (inc.tipo === 'CAMBIO' || inc.tipo === 'cambio') && inc.equipo === nuevaIncidencia.equipo
              ).length;
              const cambiosRestantes = 8 - cambiosRealizados;
              
              if (cambiosRestantes === 0) {
                return (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ fontWeight: 600 }}>
                      🚫 Límite alcanzado: Ya se realizaron 8 cambios para este equipo. No se pueden realizar más cambios.
                    </Alert>
                  </Grid>
                );
              } else if (cambiosRestantes <= 2) {
                return (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      ⚠️ Quedan {cambiosRestantes} cambio(s) disponible(s) para este equipo
                    </Alert>
                  </Grid>
                );
              }
              return null;
            })()}
            
            {/* Selector de Minuto - Modernizado con botones grandes */}
            <Grid item xs={12}>
              <Box sx={{ 
                bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5',
                borderRadius: 3,
                p: { xs: 3, sm: 2 },
                border: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`
              }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, fontSize: { xs: '1rem', sm: '0.875rem' } }}>
                  Minuto del Partido
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: { xs: 2, sm: 3 },
                  justifyContent: 'center'
                }}>
                  {/* Botón Decrementar */}
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => setNuevaIncidencia({
                      ...nuevaIncidencia, 
                      minuto: Math.max(0, (nuevaIncidencia.minuto || 0) - 1)
                    })}
                    disabled={!nuevaIncidencia.minuto || nuevaIncidencia.minuto <= 0}
                    sx={{ 
                      minWidth: { xs: 70, sm: 60 },
                      minHeight: { xs: 70, sm: 60 },
                      fontSize: { xs: '2rem', sm: '1.75rem' },
                      fontWeight: 700,
                      borderRadius: 2,
                      boxShadow: 3
                    }}
                  >
                    −
                  </Button>
                  
                  {/* Display del minuto */}
                  <Box sx={{ 
                    textAlign: 'center',
                    minWidth: { xs: 120, sm: 100 }
                  }}>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 900,
                      fontSize: { xs: '3rem', sm: '2.5rem' },
                      lineHeight: 1,
                      color: 'primary.main'
                    }}>
                      {nuevaIncidencia.minuto || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: 'text.secondary',
                      fontSize: { xs: '0.9rem', sm: '0.8rem' }
                    }}>
                      minutos
                    </Typography>
                  </Box>
                  
                  {/* Botón Incrementar */}
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => setNuevaIncidencia({
                      ...nuevaIncidencia, 
                      minuto: Math.min(120, (nuevaIncidencia.minuto || 0) + 1)
                    })}
                    disabled={nuevaIncidencia.minuto >= 120}
                    sx={{ 
                      minWidth: { xs: 70, sm: 60 },
                      minHeight: { xs: 70, sm: 60 },
                      fontSize: { xs: '2rem', sm: '1.75rem' },
                      fontWeight: 700,
                      borderRadius: 2,
                      boxShadow: 3
                    }}
                  >
                    +
                  </Button>
                </Box>
                
                {/* Botones rápidos para minutos comunes */}
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 2,
                  justifyContent: 'center'
                }}>
                  {[10, 20, 30, 40, 50, 60, 70, 80].map(minuto => (
                    <Button
                      key={minuto}
                      variant="outlined"
                      size="small"
                      onClick={() => setNuevaIncidencia({...nuevaIncidencia, minuto})}
                      sx={{ 
                        minWidth: { xs: 50, sm: 45 },
                        fontSize: { xs: '0.9rem', sm: '0.8rem' },
                        py: { xs: 1, sm: 0.5 }
                      }}
                    >
                      {minuto}'
                    </Button>
                  ))}
                </Box>
              </Box>
            </Grid>

            {/* Equipo */}
            <Grid item xs={12}>
              <FormControl fullWidth size="medium">
                <InputLabel>Equipo</InputLabel>
                <Select
                  value={nuevaIncidencia.equipo}
                  onChange={(e) => setNuevaIncidencia({...nuevaIncidencia, equipo: e.target.value})}
                  sx={{ 
                    '& .MuiSelect-select': { 
                      py: { xs: 2, sm: 1.5 },
                      fontSize: { xs: '1rem', sm: '0.875rem' }
                    }
                  }}
                >
                  <MenuItem value="LOCAL">
                    {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Equipo Local' : partido.equipoLocal || 'Equipo Local'}
                  </MenuItem>
                  <MenuItem value="VISITANTE">
                    {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Equipo Visitante' : partido.equipoVisitante || 'Equipo Visitante'}
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Campo de Jugador - Solo para incidencias que NO sean CAMBIO */}
            {nuevaIncidencia.tipo !== 'CAMBIO' && (
            <Grid item xs={12}>
               <FormControl fullWidth size="medium">
                 <InputLabel>Jugador</InputLabel>
                 <Select
                   sx={{ 
                     '& .MuiSelect-select': { 
                       py: { xs: 2, sm: 1.5 },
                       fontSize: { xs: '1rem', sm: '0.875rem' }
                     }
                   }}
                   value={nuevaIncidencia.jugadorId}
                   onChange={(e) => {
                     const jugadorId = e.target.value;
                      // Buscar en convocados o jugadores según lo que esté disponible
                      const jugadores = nuevaIncidencia.equipo === 'LOCAL' 
                        ? (convocadosLocal?.jugadores || jugadoresLocal)
                        : (convocadosVisitante?.jugadores || jugadoresVisitante);
                     const jugadorSeleccionado = jugadores.find(j => j.id === jugadorId);
                     setNuevaIncidencia({
                       ...nuevaIncidencia, 
                       jugadorId: jugadorId,
                       jugadorNombre: jugadorSeleccionado ? `${jugadorSeleccionado.nombre} ${jugadorSeleccionado.apellido}` : ''
                     });
                   }}
                   disabled={!nuevaIncidencia.equipo || cargandoJugadores}
                 >
                    {nuevaIncidencia.equipo === 'LOCAL' ? (
                      // Mostrar solo jugadores ACTIVOS/EN CANCHA del equipo local
                      (convocadosLocal?.jugadores || jugadoresLocal)
                        .filter(j => j.activo)
                        .map((jugador) => (
                     <MenuItem key={jugador.id} value={jugador.id}>
                            {jugador.nombre} {jugador.apellido} ({jugador.posicion || 'Sin posición'})
                     </MenuItem>
                        ))
                    ) : nuevaIncidencia.equipo === 'VISITANTE' ? (
                      // Mostrar solo jugadores ACTIVOS/EN CANCHA del equipo visitante
                      (convocadosVisitante?.jugadores || jugadoresVisitante)
                        .filter(j => j.activo)
                        .map((jugador) => (
                     <MenuItem key={jugador.id} value={jugador.id}>
                            {jugador.nombre} {jugador.apellido} ({jugador.posicion || 'Sin posición'})
                     </MenuItem>
                        ))
                    ) : (
                     <MenuItem disabled>Seleccione un equipo primero</MenuItem>
                   )}
                 </Select>
                 {cargandoJugadores && (
                   <Typography variant="caption" color="text.secondary">
                     Cargando jugadores...
                   </Typography>
                 )}
               </FormControl>
            </Grid>
            )}
            
            {/* Campos específicos para CAMBIO */}
            {nuevaIncidencia.tipo === 'CAMBIO' && (
              <>
                <Grid item xs={12}>
                  <FormControl fullWidth size="medium">
                    <InputLabel>Jugador que Sale (Titulares)</InputLabel>
                    <Select
                    sx={{ 
                      '& .MuiSelect-select': { 
                        py: { xs: 2, sm: 1.5 },
                        fontSize: { xs: '1rem', sm: '0.875rem' }
                      }
                    }}
                    value={nuevaIncidencia.jugadorSaleId}
                    onChange={(e) => {
                      const jugadorId = e.target.value;
                      const jugadores = nuevaIncidencia.equipo === 'LOCAL' 
                        ? (convocadosLocal?.jugadores || jugadoresLocal)
                        : (convocadosVisitante?.jugadores || jugadoresVisitante);
                      const jugador = jugadores.find(j => j.id === jugadorId);
                      setNuevaIncidencia({
                        ...nuevaIncidencia, 
                        jugadorSaleId: jugadorId,
                        jugadorSale: jugador ? {
                          id: jugador.id,
                          nombre: `${jugador.nombre} ${jugador.apellido}`,
                          posicion: jugador.posicion
                        } : null
                      });
                    }}
                      disabled={!nuevaIncidencia.equipo || cargandoJugadores}
                    >
                      {nuevaIncidencia.equipo === 'LOCAL' ? (
                        // Mostrar solo jugadores ACTIVOS/EN CANCHA del equipo local
                        (convocadosLocal?.jugadores || jugadoresLocal)
                          .filter(j => j.activo)
                          .map((jugador) => (
                        <MenuItem key={`sale-${jugador.id}`} value={jugador.id}>
                              {jugador.nombre} {jugador.apellido} ({jugador.posicion || 'Sin posición'})
                        </MenuItem>
                          ))
                      ) : nuevaIncidencia.equipo === 'VISITANTE' ? (
                        // Mostrar solo jugadores ACTIVOS/EN CANCHA del equipo visitante
                        (convocadosVisitante?.jugadores || jugadoresVisitante)
                          .filter(j => j.activo)
                          .map((jugador) => (
                        <MenuItem key={`sale-${jugador.id}`} value={jugador.id}>
                              {jugador.nombre} {jugador.apellido} ({jugador.posicion || 'Sin posición'})
                        </MenuItem>
                          ))
                      ) : (
                        <MenuItem disabled>Seleccione un equipo primero</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth size="medium">
                    <InputLabel>Jugador que Entra (Suplentes)</InputLabel>
                    <Select
                    sx={{ 
                      '& .MuiSelect-select': { 
                        py: { xs: 2, sm: 1.5 },
                        fontSize: { xs: '1rem', sm: '0.875rem' }
                      }
                    }}
                    value={nuevaIncidencia.jugadorEntraId}
                    onChange={(e) => {
                      const jugadorId = e.target.value;
                      const jugadores = nuevaIncidencia.equipo === 'LOCAL' 
                        ? (convocadosLocal?.jugadores || jugadoresLocal)
                        : (convocadosVisitante?.jugadores || jugadoresVisitante);
                      const jugador = jugadores.find(j => j.id === jugadorId);
                      setNuevaIncidencia({
                        ...nuevaIncidencia, 
                        jugadorEntraId: jugadorId,
                        jugadorEntra: jugador ? {
                          id: jugador.id,
                          nombre: `${jugador.nombre} ${jugador.apellido}`,
                          posicion: jugador.posicion
                        } : null
                      });
                    }}
                      disabled={!nuevaIncidencia.equipo || cargandoJugadores}
                    >
                      {nuevaIncidencia.equipo === 'LOCAL' ? (
                        // Mostrar solo suplentes (no activos, no titulares) del equipo local
                        (convocadosLocal?.jugadores || jugadoresLocal)
                          .filter(j => !j.activo && !j.esTitular)
                          .map((jugador) => (
                        <MenuItem key={`entra-${jugador.id}`} value={jugador.id}>
                              🔄 {jugador.nombre} {jugador.apellido} ({jugador.posicion || 'Sin posición'})
                        </MenuItem>
                          ))
                      ) : nuevaIncidencia.equipo === 'VISITANTE' ? (
                        // Mostrar solo suplentes (no activos, no titulares) del equipo visitante
                        (convocadosVisitante?.jugadores || jugadoresVisitante)
                          .filter(j => !j.activo && !j.esTitular)
                          .map((jugador) => (
                        <MenuItem key={`entra-${jugador.id}`} value={jugador.id}>
                              🔄 {jugador.nombre} {jugador.apellido} ({jugador.posicion || 'Sin posición'})
                        </MenuItem>
                          ))
                      ) : (
                        <MenuItem disabled>Seleccione un equipo primero</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            
            {/* Descripción opcional */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción (Opcional)"
                multiline
                rows={3}
                value={nuevaIncidencia.descripcion}
                onChange={(e) => setNuevaIncidencia({...nuevaIncidencia, descripcion: e.target.value})}
                InputProps={{
                  sx: {
                    fontSize: { xs: '1rem', sm: '0.875rem' },
                    py: { xs: 1.5, sm: 1 }
                  }
                }}
                sx={{
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '1rem', sm: '0.875rem' }
                  }
                }}
              />
            </Grid>

            {/* Checkbox para conversión si es Try - Más grande y visible */}
            {nuevaIncidencia.tipo === 'TRY' && (
              <Grid item xs={12}>
                <Paper 
                  elevation={2}
                  sx={{ 
                    p: { xs: 2.5, sm: 2 },
                    bgcolor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                    border: `2px solid ${darkMode ? '#388e3c' : '#66bb6a'}`,
                    borderRadius: 2
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={nuevaIncidencia.conversionExitosa || false}
                        onChange={(e) => setNuevaIncidencia({...nuevaIncidencia, conversionExitosa: e.target.checked})}
                        color="success"
                        sx={{ 
                          '& .MuiSvgIcon-root': { 
                            fontSize: { xs: 32, sm: 28 }
                          }
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: '1.1rem', sm: '1rem' }
                      }}>
                        ✅ Conversión exitosa (+2 puntos)
                      </Typography>
                    }
                  />
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 2 } }}>
          <Button 
            onClick={() => setOpenIncidencia(false)}
            variant="outlined"
            fullWidth
            sx={{ 
              py: { xs: 1.5, sm: 1 },
              fontSize: { xs: '1rem', sm: '0.875rem' },
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={agregarIncidencia} 
            variant="contained"
            fullWidth
            sx={{ 
              py: { xs: 1.5, sm: 1 },
              fontSize: { xs: '1rem', sm: '0.875rem' },
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600
            }}
            disabled={(() => {
              // Validar límite de cambios si es un CAMBIO
              if (nuevaIncidencia.tipo === 'CAMBIO' && nuevaIncidencia.equipo) {
                const cambiosRealizados = (partido.incidencias || []).filter(
                  inc => (inc.tipo === 'CAMBIO' || inc.tipo === 'cambio') && inc.equipo === nuevaIncidencia.equipo
                ).length;
                return cambiosRealizados >= 8;
              }
              return false;
            })()}
          >
            Agregar Incidencia
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para finalizar partido con acta */}
      <Dialog open={openFinalizar} onClose={() => setOpenFinalizar(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Assignment sx={{ mr: 1 }} />
            Finalizar Partido - Generar Acta Oficial
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={pasoActual} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Generar Resumen</StepLabel>
            </Step>
            <Step>
              <StepLabel>Revisar y Confirmar</StepLabel>
            </Step>
            <Step>
              <StepLabel>Firmar Digitalmente</StepLabel>
            </Step>
            <Step>
              <StepLabel>Acta Completada</StepLabel>
            </Step>
          </Stepper>

          {pasoActual === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Paso 1: Generación Automática del Resumen
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                El sistema generará automáticamente un resumen completo del partido incluyendo:
                todas las incidencias, resultado final, duración total y datos de los equipos.
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Resumen del Partido (Opcional)"
                    multiline
                    rows={3}
                    value={resumenFinal.resumen}
                    onChange={(e) => setResumenFinal({...resumenFinal, resumen: e.target.value})}
                    helperText="Agregue observaciones adicionales sobre el desarrollo del partido"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observaciones (Opcional)"
                    multiline
                    rows={2}
                    value={resumenFinal.observaciones}
                    onChange={(e) => setResumenFinal({...resumenFinal, observaciones: e.target.value})}
                    helperText="Notas adicionales sobre el partido"
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                color="primary"
                onClick={generarResumenAutomatico}
                disabled={generandoResumen}
                startIcon={generandoResumen ? <CircularProgress size={20} /> : <Description />}
                fullWidth
              >
                {generandoResumen ? 'Generando Resumen...' : 'Generar Resumen Automático'}
              </Button>
            </Box>
          )}

          {pasoActual === 1 && resumenAutomatico && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Paso 2: Revisión del Resumen Generado
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Revise cuidadosamente el resumen generado automáticamente. Una vez confirmado, 
                procederá a la firma digital del acta oficial.
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1">Información General del Partido</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography><strong>Fecha:</strong> {resumenAutomatico.fecha}</Typography>
                      <Typography><strong>Cancha:</strong> {resumenAutomatico.cancha}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography><strong>Duración:</strong> {resumenAutomatico.duracion.total}</Typography>
                      <Typography><strong>Árbitro Principal:</strong> {resumenAutomatico.arbitros.principal}</Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1">Resultado Final</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" color="primary">
                      {resumenAutomatico.resultado.marcador}
                    </Typography>
                    <Typography variant="h6">
                      {resumenAutomatico.equipos.local} vs {resumenAutomatico.equipos.visitante}
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1">Incidencias del Partido</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {resumenAutomatico.resumenIncidencias}
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1">Observaciones Adicionales</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    {resumenAutomatico.observaciones || 'No se registraron observaciones adicionales.'}
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={resumenConfirmado}
                      onChange={(e) => setResumenConfirmado(e.target.checked)}
                    />
                  }
                  label="Confirmo que he revisado y validado toda la información del resumen"
                />
              </Box>
            </Box>
          )}

          {pasoActual === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Paso 3: Firma Digital del Acta
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Para finalizar oficialmente el partido, debe firmar digitalmente el acta. 
                Su firma confirma la validez de toda la información registrada.
              </Typography>

              <TextField
                fullWidth
                label="Nombre del Árbitro Principal"
                value={firmaDigital}
                onChange={(e) => setFirmaDigital(e.target.value)}
                sx={{ mb: 3 }}
                helperText="Ingrese su nombre completo tal como aparece en su certificación"
              />

              <Alert severity="info" sx={{ mb: 2 }}>
                Al firmar digitalmente, usted confirma que toda la información del acta es correcta 
                y que el partido se desarrolló conforme a las reglas establecidas.
              </Alert>
            </Box>
          )}

          {pasoActual === 3 && actaGenerada && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                ¡Acta Oficial Generada Exitosamente!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                El partido ha sido finalizado oficialmente y el acta firmada digitalmente ha sido 
                guardada en el sistema. Será redirigido al dashboard en unos segundos.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFinalizar(false)}>
            {pasoActual === 0 ? 'Cancelar' : 'Cerrar'}
          </Button>
          
          {pasoActual === 1 && (
            <Button
              variant="contained"
              color="primary"
              onClick={confirmarResumen}
              disabled={!resumenConfirmado}
              startIcon={<CheckCircle />}
            >
              Confirmar y Continuar
            </Button>
          )}
          
          {pasoActual === 2 && (
            <Button
              variant="contained"
              color="success"
              onClick={firmarActa}
              disabled={!firmaDigital.trim()}
              startIcon={<Draw />}
            >
              Firmar y Finalizar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog para editar convocados */}
      <Dialog 
        open={openEditarConvocados} 
        onClose={() => setOpenEditarConvocados(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: darkMode ? '#1e1e1e' : 'white',
            borderRadius: 4,
            border: darkMode ? '1px solid #333' : '1px solid #e0e0e0',
            boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: darkMode ? '#1976d2' : '#2196f3',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Edit />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Editar Lista de Convocados
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {convocadosEditando?.equipoNombre} - {convocadosEditando?.equipo === 'local' ? 'Equipo Local' : 'Equipo Visitante'}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {partido?.estado === 'En Curso' || partido?.estado === 'pausado' || partido?.estado === 'finalizado' ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>No se puede editar:</strong> Las listas de convocados no se pueden modificar una vez que el partido ha sido iniciado.
                {partido?.estado === 'En Curso' && ' El partido está en curso.'}
                {partido?.estado === 'pausado' && ' El partido está pausado.'}
                {partido?.estado === 'finalizado' && ' El partido ha finalizado.'}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Atención:</strong> Solo modifique la lista en caso de imprevistos (lesiones, jugadores que no se presentan, etc.). 
                Los cambios quedarán registrados con su nombre como árbitro.
              </Typography>
            </Alert>
          )}

          {convocadosEditando && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Jugadores Actuales ({convocadosEditando.jugadores?.length || 0})
              </Typography>
              
              <TextField
                fullWidth
                label="Motivo de la modificación"
                multiline
                rows={2}
                placeholder="Ej: Jugador lesionado, jugador no se presentó, etc."
                sx={{ mb: 3 }}
                onChange={(e) => setMotivoModificacion(e.target.value)}
              />

              <Box sx={{ 
                maxHeight: 400, 
                overflow: 'auto',
                border: darkMode ? '1px solid #333' : '1px solid #e0e0e0',
                borderRadius: 2,
                p: 2,
                bgcolor: darkMode ? '#2d2d2d' : '#fafafa'
              }}>
                {convocadosEditando.jugadores?.map((jugador, index) => (
                  <Box 
                    key={jugador.id || index}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2, 
                      p: 1.5, 
                      mb: 1,
                      bgcolor: darkMode ? '#404040' : 'white',
                      borderRadius: 2,
                      border: darkMode ? '1px solid #555' : '1px solid #e0e0e0'
                    }}
                  >
                    <Avatar sx={{ width: 40, height: 40, bgcolor: darkMode ? '#1976d2' : '#2196f3' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {jugador.numero || '?'}
                      </Typography>
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: darkMode ? '#e0e0e0' : '#212121' }}>
                        {jugador.nombre} {jugador.apellido}
                      </Typography>
                      <Typography variant="caption" sx={{ color: darkMode ? '#a0a0a0' : '#757575' }}>
                        {jugador.posicion}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      disabled={partido?.estado === 'En Curso' || partido?.estado === 'pausado' || partido?.estado === 'finalizado'}
                      onClick={() => {
                        const nuevosJugadores = convocadosEditando.jugadores.filter((_, i) => i !== index);
                        setConvocadosEditando({
                          ...convocadosEditando,
                          jugadores: nuevosJugadores
                        });
                      }}
                    >
                      Quitar
                    </Button>
                  </Box>
                ))}
                
                {(!convocadosEditando.jugadores || convocadosEditando.jugadores.length === 0) && (
                  <Typography variant="body2" sx={{ textAlign: 'center', color: darkMode ? '#a0a0a0' : '#757575', py: 2 }}>
                    No hay jugadores en la lista
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setOpenEditarConvocados(false)}
            variant="outlined"
            sx={{
              borderColor: darkMode ? '#555' : '#c0c0c0',
              color: darkMode ? '#e0e0e0' : '#212121'
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              if (convocadosEditando) {
                actualizarConvocados(
                  convocadosEditando.id,
                  convocadosEditando.jugadores,
                  motivoModificacion
                );
              }
            }}
            variant="contained"
            color="primary"
            disabled={
              partido?.estado === 'En Curso' || 
              partido?.estado === 'pausado' || 
              partido?.estado === 'finalizado' ||
              !convocadosEditando?.jugadores || 
              convocadosEditando.jugadores.length === 0
            }
            startIcon={<Edit />}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para configurar alineaciones (titulares y suplentes) */}
      <Dialog 
        open={openConfiguracionAlineaciones} 
        onClose={() => setOpenConfiguracionAlineaciones(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Configurar Alineaciones - Titulares y Suplentes</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Equipo Local */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🏠 {partido?.equipoLocal}
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => abrirAgregarJugadores(true)}
                    sx={{ ml: 'auto' }}
                  >
                    + Agregar Jugadores
                  </Button>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Selecciona los jugadores titulares (máximo 15)
                </Typography>
                <List sx={{ 
                  maxHeight: 400, 
                  overflow: 'auto',
                  // Estilos del scrollbar para tema dark
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: darkMode ? '#555' : '#888',
                    borderRadius: '10px',
                    '&:hover': {
                      backgroundColor: darkMode ? '#777' : '#555',
                    },
                  },
                }}>
                  {(convocadosLocal?.jugadores || jugadoresLocal).map((jugador) => {
                    const minutosJugados = jugador.estadisticas?.minutosJugados || jugador.minutosJugados || 0;
                    const noPuedeJugar = minutosJugados >= 80;
                    
                    return (
                      <ListItem 
                        key={jugador.id} 
                        dense
                        sx={{
                          bgcolor: noPuedeJugar ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                          borderRadius: 1,
                          mb: 0.5,
                          border: noPuedeJugar ? '2px solid #f44336' : 'none'
                        }}
                      >
                        <Checkbox
                          checked={titularesLocal.some(j => j.id === jugador.id)}
                          onChange={() => toggleTitular(jugador, true)}
                          disabled={
                            noPuedeJugar || 
                            (titularesLocal.length >= 15 && !titularesLocal.some(j => j.id === jugador.id))
                          }
                        />
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                {jugador.nombre} {jugador.apellido}
                              </Typography>
                              {noPuedeJugar && (
                                <Chip 
                                  label="⚠️ 80 MIN - NO PUEDE JUGAR" 
                                  size="small" 
                                  color="error"
                                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption">
                                {jugador.posicion || 'Sin posición'}
                              </Typography>
                              {minutosJugados > 0 && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    display: 'block',
                                    color: minutosJugados >= 80 ? 'error.main' : minutosJugados >= 70 ? 'warning.main' : 'success.main',
                                    fontWeight: 600
                                  }}
                                >
                                  ⏱️ {minutosJugados} minutos jugados
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Titulares seleccionados: {titularesLocal.length}/15
                </Typography>
              </Paper>
            </Grid>

            {/* Equipo Visitante */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  ✈️ {partido?.equipoVisitante}
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => abrirAgregarJugadores(false)}
                    sx={{ ml: 'auto' }}
                  >
                    + Agregar Jugadores
                  </Button>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Selecciona los jugadores titulares (máximo 15)
                </Typography>
                <List sx={{ 
                  maxHeight: 400, 
                  overflow: 'auto',
                  // Estilos del scrollbar para tema dark
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: darkMode ? '#555' : '#888',
                    borderRadius: '10px',
                    '&:hover': {
                      backgroundColor: darkMode ? '#777' : '#555',
                    },
                  },
                }}>
                  {(convocadosVisitante?.jugadores || jugadoresVisitante).map((jugador) => {
                    const minutosJugados = jugador.estadisticas?.minutosJugados || jugador.minutosJugados || 0;
                    const noPuedeJugar = minutosJugados >= 80;
                    
                    return (
                      <ListItem 
                        key={jugador.id} 
                        dense
                        sx={{
                          bgcolor: noPuedeJugar ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                          borderRadius: 1,
                          mb: 0.5,
                          border: noPuedeJugar ? '2px solid #f44336' : 'none'
                        }}
                      >
                        <Checkbox
                          checked={titularesVisitante.some(j => j.id === jugador.id)}
                          onChange={() => toggleTitular(jugador, false)}
                          disabled={
                            noPuedeJugar || 
                            (titularesVisitante.length >= 15 && !titularesVisitante.some(j => j.id === jugador.id))
                          }
                        />
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                {jugador.nombre} {jugador.apellido}
                              </Typography>
                              {noPuedeJugar && (
                                <Chip 
                                  label="⚠️ 80 MIN - NO PUEDE JUGAR" 
                                  size="small" 
                                  color="error"
                                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption">
                                {jugador.posicion || 'Sin posición'}
                              </Typography>
                              {minutosJugados > 0 && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    display: 'block',
                                    color: minutosJugados >= 80 ? 'error.main' : minutosJugados >= 70 ? 'warning.main' : 'success.main',
                                    fontWeight: 600
                                  }}
                                >
                                  ⏱️ {minutosJugados} minutos jugados
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Titulares seleccionados: {titularesVisitante.length}/15
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfiguracionAlineaciones(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={confirmarAlineaciones}
            disabled={titularesLocal.length === 0 && titularesVisitante.length === 0}
          >
            Confirmar Alineaciones
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para agregar jugadores - Modernizado */}
      <Dialog 
        open={openAgregarJugadores} 
        onClose={() => setOpenAgregarJugadores(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            m: { xs: 2, sm: 3 }
          }
        }}
      >
        <DialogTitle sx={{ 
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 700,
          pb: 2
        }}>
          ➕ Agregar Jugadores - {equipoAgregando === 'local' ? partido?.equipoLocal : partido?.equipoVisitante}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', sm: '0.875rem' } }}>
              Agrega múltiples jugadores manualmente o escanea una lista con la cámara
            </Typography>
          </Box>

          {/* Botones para escanear - Más grandes para móvil */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                startIcon={<CameraAlt />}
                onClick={abrirCamara}
                disabled={procesandoOCR}
                fullWidth
                sx={{ 
                  py: { xs: 2, sm: 1.5 },
                  fontSize: { xs: '1rem', sm: '0.875rem' },
                  textTransform: 'none',
                  borderRadius: 2,
                  borderWidth: 2
                }}
              >
                📸 Escanear con Cámara
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={abrirSelectorArchivo}
                disabled={procesandoOCR}
                fullWidth
                sx={{ 
                  py: { xs: 2, sm: 1.5 },
                  fontSize: { xs: '1rem', sm: '0.875rem' },
                  textTransform: 'none',
                  borderRadius: 2,
                  borderWidth: 2
                }}
              >
                📁 Subir Imagen
              </Button>
            </Grid>
          </Grid>

          {/* Inputs ocultos para captura */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={manejarImagenSeleccionada}
            style={{ display: 'none' }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={manejarImagenSeleccionada}
            style={{ display: 'none' }}
          />

          {/* Preview de imagen capturada */}
          {imagenCapturada && !procesandoOCR && (
            <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Imagen Capturada</Typography>
                <IconButton size="small" onClick={cancelarImagen}>
                  <Close />
                </IconButton>
              </Box>
              <Box sx={{ 
                maxHeight: 200, 
                overflow: 'auto', 
                display: 'flex', 
                justifyContent: 'center',
                mb: 2
              }}>
                <img 
                  src={imagenCapturada} 
                  alt="Lista capturada" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: 200,
                    objectFit: 'contain'
                  }} 
                />
              </Box>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={() => procesarImagenOCR(imagenCapturada)}
              >
                🔍 Procesar Imagen con OCR
              </Button>
            </Paper>
          )}

          {/* Indicador de progreso OCR */}
          {procesandoOCR && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ textAlign: 'center' }}>
                Procesando imagen...
              </Typography>
              <LinearProgress variant="determinate" value={progresoOCR} sx={{ mb: 1 }} />
              <Typography variant="caption" sx={{ textAlign: 'center', display: 'block' }}>
                {progresoOCR}%
              </Typography>
            </Paper>
          )}

          {/* Formulario manual - Modernizado */}
          {!imagenCapturada && !procesandoOCR && (
            <>
              <Typography variant="subtitle2" sx={{ 
                mt: 3, 
                mb: 2,
                fontWeight: 600,
                fontSize: { xs: '1.05rem', sm: '0.95rem' }
              }}>
                O agregar manualmente:
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={nuevoJugador.nombre}
                    onChange={(e) => setNuevoJugador({ ...nuevoJugador, nombre: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        agregarJugadorALista();
                      }
                    }}
                    InputProps={{
                      sx: {
                        fontSize: { xs: '1.1rem', sm: '1rem' },
                        py: { xs: 1.5, sm: 0.5 }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        fontSize: { xs: '1.05rem', sm: '1rem' }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Apellido"
                    value={nuevoJugador.apellido}
                    onChange={(e) => setNuevoJugador({ ...nuevoJugador, apellido: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        agregarJugadorALista();
                      }
                    }}
                    InputProps={{
                      sx: {
                        fontSize: { xs: '1.1rem', sm: '1rem' },
                        py: { xs: 1.5, sm: 0.5 }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        fontSize: { xs: '1.05rem', sm: '1rem' }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={agregarJugadorALista}
                    sx={{ 
                      py: { xs: 2, sm: 1.5 },
                      fontSize: { xs: '1.1rem', sm: '1rem' },
                      textTransform: 'none',
                      borderRadius: 2,
                      fontWeight: 600
                    }}
                  >
                    ➕ Agregar a la Lista
                  </Button>
                </Grid>
              </Grid>
            </>
          )}

          {/* Lista temporal de jugadores - Modernizada */}
          <Paper elevation={3} sx={{ 
            p: { xs: 2.5, sm: 2 }, 
            bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5',
            borderRadius: 2,
            border: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`
          }}>
            <Typography variant="subtitle1" sx={{ 
              mb: 2,
              fontWeight: 600,
              fontSize: { xs: '1.1rem', sm: '1rem' },
              color: 'primary.main'
            }}>
              📋 Jugadores por guardar: {equipoAgregando === 'local' ? jugadoresTemporalesLocal.length : jugadoresTemporalesVisitante.length}
            </Typography>
            <List sx={{ 
              maxHeight: 300, 
              overflow: 'auto',
              // Scrollbar oscuro
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: darkMode ? '#2c2c2c' : '#f1f1f1',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: darkMode ? '#555' : '#888',
                borderRadius: '10px',
                '&:hover': {
                  backgroundColor: darkMode ? '#777' : '#555',
                },
              },
            }}>
              {(equipoAgregando === 'local' ? jugadoresTemporalesLocal : jugadoresTemporalesVisitante).map((jugador) => (
                <ListItem 
                  key={jugador.id}
                  sx={{
                    bgcolor: darkMode ? '#2d2d2d' : 'white',
                    mb: 1,
                    borderRadius: 2,
                    border: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`,
                    py: { xs: 2, sm: 1.5 }
                  }}
                  secondaryAction={
                    <Button 
                      size="medium"
                      variant="outlined"
                      color="error" 
                      onClick={() => quitarJugadorTemporal(jugador.id)}
                      sx={{ 
                        minWidth: { xs: 80, sm: 60 },
                        fontSize: { xs: '0.95rem', sm: '0.8rem' }
                      }}
                    >
                      Quitar
                    </Button>
                  }
                >
                  <ListItemText 
                    primary={`${jugador.nombre} ${jugador.apellido}`}
                    primaryTypographyProps={{
                      sx: {
                        fontSize: { xs: '1.05rem', sm: '0.95rem' },
                        fontWeight: 500
                      }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 2 } }}>
          <Button 
            onClick={() => setOpenAgregarJugadores(false)}
            variant="outlined"
            fullWidth
            sx={{ 
              py: { xs: 1.5, sm: 1 },
              fontSize: { xs: '1rem', sm: '0.875rem' },
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={guardarTodosLosJugadores}
            disabled={(equipoAgregando === 'local' ? jugadoresTemporalesLocal.length : jugadoresTemporalesVisitante.length) === 0}
            fullWidth
            sx={{ 
              py: { xs: 1.5, sm: 1 },
              fontSize: { xs: '1rem', sm: '0.875rem' },
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600
            }}
          >
            💾 Guardar Todos ({equipoAgregando === 'local' ? jugadoresTemporalesLocal.length : jugadoresTemporalesVisitante.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmación Moderno */}
      <Dialog
        open={modalConfirmacion.open}
        onClose={modalConfirmacion.onCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          fontSize: '1.5rem',
          fontWeight: 600,
          color: modalConfirmacion.severity === 'error' ? 'error.main' : 
                 modalConfirmacion.severity === 'warning' ? 'warning.main' : 
                 modalConfirmacion.severity === 'success' ? 'success.main' : 'primary.main'
        }}>
          {modalConfirmacion.severity === 'error' && '⚠️'}
          {modalConfirmacion.severity === 'warning' && '⚠️'}
          {modalConfirmacion.severity === 'success' && '✅'}
          {modalConfirmacion.severity === 'info' && 'ℹ️'}
          {modalConfirmacion.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line', fontSize: '1.1rem', py: 2 }}>
            {modalConfirmacion.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={modalConfirmacion.onCancel}
            variant="outlined"
            sx={{ 
              minWidth: 120,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            {modalConfirmacion.cancelText}
          </Button>
          <Button 
            onClick={() => {
              if (modalConfirmacion.onConfirm) {
                modalConfirmacion.onConfirm();
              }
            }}
            variant="contained"
            color={modalConfirmacion.severity === 'error' ? 'error' : 
                   modalConfirmacion.severity === 'warning' ? 'warning' : 'primary'}
            sx={{ 
              minWidth: 120,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            {modalConfirmacion.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Notificación Moderno (Toast) */}
      <Dialog
        open={modalNotificacion.open}
        onClose={() => setModalNotificacion(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            bgcolor: modalNotificacion.severity === 'success' ? 'success.main' :
                     modalNotificacion.severity === 'error' ? 'error.main' :
                     modalNotificacion.severity === 'warning' ? 'warning.main' : 'info.main',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'white',
          pb: 1
        }}>
          {modalNotificacion.severity === 'success' && '✅'}
          {modalNotificacion.severity === 'error' && '❌'}
          {modalNotificacion.severity === 'warning' && '⚠️'}
          {modalNotificacion.severity === 'info' && 'ℹ️'}
          {modalNotificacion.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line', color: 'white', fontSize: '1.1rem' }}>
            {modalNotificacion.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setModalNotificacion(prev => ({ ...prev, open: false }))}
            variant="contained"
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)'
              },
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GestionPartido;
