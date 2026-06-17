import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  ListItemText
} from '@mui/material';
import {
  ArrowBack,
  SportsRugby,
  EmojiEvents,
  Schedule,
  People,
  TrendingUp,
  CalendarToday,
  ArrowBackIos,
  ArrowForwardIos,
  Edit,
  PlayArrow,
  ExpandMore,
  LocationOn,
  Save,
  Cancel
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import EliminacionDirectaBracket from '../components/Torneos/EliminacionDirectaBracket';
import LogoDisplay from '../components/common/LogoDisplay';

interface Torneo {
  id: string;
  nombre: string;
  categoria: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  formato: string;
  idaYvuelta: boolean;
  equipos: Array<{
    id: string;
    nombre: string;
    logo?: string;
  }>;
  estructuraEliminacion?: {
    fases: Array<{
      numero: number;
      nombre: string;
      equiposEnFase: number;
      partidosPorFase: number;
      llaves: Array<{
        numero: number;
        equipo1: any;
        equipo2: any;
        ganador: any;
        partidoId: string | null;
      }>;
    }>;
    llaves: any[];
    faseActual: number;
    equiposPorLlave: number;
    totalFases: number;
  };
  campeon?: any;
  subcampeon?: any;
}

interface Partido {
  id: string;
  torneoId: string;
  jornada: number;
  fase?: string; // Para eliminación directa
  nroLlave?: number; // Para eliminación directa
  equipoLocal: {
    id: string;
    nombre: string;
    logo?: string;
  };
  equipoVisitante: {
    id: string;
    nombre: string;
    logo?: string;
  };
  equipoLocalReferencia?: string; // Referencia a resultado de otro partido (ej: "ganador_1", "perdedor_3")
  equipoVisitanteReferencia?: string; // Referencia a resultado de otro partido
  fecha: string | { _seconds: number; _nanoseconds: number };
  horaInicio?: string; // Hora de inicio del partido
  estado: string;
  resultado: {
    puntosLocal: number;
    puntosVisitante: number;
    triesLocal: number;
    triesVisitante: number;
    conversionesLocal: number;
    conversionesVisitante: number;
    penalesLocal: number;
    penalesVisitante: number;
    dropsLocal: number;
    dropsVisitante: number;
  };
  arbitroId?: string;
  cancha: string | { id: string; nombre: string };
  estadisticas: {
    triesLocal: number;
    triesVisitante: number;
    penalesLocal: number;
    penalesVisitante: number;
    conversionesLocal: number;
    conversionesVisitante: number;
    tarjetasAmarillasLocal: number;
    tarjetasAmarillasVisitante: number;
    tarjetasRojasLocal: number;
    tarjetasRojasVisitante: number;
  };
}

interface TablaPosicion {
  torneoId: string;
  equipoId: string;
  nombreEquipo: string;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  puntosAFavor: number;
  puntosEnContra: number;
  diferencia: number;
  triesAFavor: number;
  triesEnContra: number;
  bonusOfensivo: number;
  bonusDefensivo: number;
  puntosTotales: number;
  rankingFairPlay: number;
}

const DetalleTorneo: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authContext = useAuth();
  const userProfile = authContext?.userProfile;
  const { darkMode } = useTheme();
  const rolePermissions = useRolePermissions();
  
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [tablaPosiciones, setTablaPosiciones] = useState<TablaPosicion[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [tablasGrupos, setTablasGrupos] = useState<any[]>([]);
  const [generandoGrupos, setGenerandoGrupos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fechaActual, setFechaActual] = useState(1);
  const [anchorElFecha, setAnchorElFecha] = useState<null | HTMLElement>(null);
  const openFechaMenu = Boolean(anchorElFecha);
  
  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(false);
  const [tabEstadisticas, setTabEstadisticas] = useState(0);
  
  // Estados para edición de partidos
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [partidoToEdit, setPartidoToEdit] = useState<Partido | null>(null);
  const [canchas, setCanchas] = useState<any[]>([]);
  const [arbitros, setArbitros] = useState<any[]>([]);
  const [editFormData, setEditFormData] = useState({
    fecha: '',
    hora: '',
    canchaId: '',
    arbitroId: '',
    estado: ''
  });

  // Estado para actualización manual de tabla de posiciones
  const [actualizandoTabla, setActualizandoTabla] = useState(false);
  
  // Estado para procesar campeón
  const [procesandoCampeon, setProcesandoCampeon] = useState(false);
  
  // Estado para edición inline de partidos en formato personalizado
  const [partidoEditandoId, setPartidoEditandoId] = useState<string | null>(null);
  const [partidoEditandoDatos, setPartidoEditandoDatos] = useState<any>({});

  // Función para convertir fecha a formato YYYY-MM-DD para inputs
  const formatFechaParaInput = (fecha: any) => {
    if (!fecha) return '';
    
    try {
      let fechaObj: Date;
      
      // Si ya está en formato YYYY-MM-DD, devolverlo directamente
      if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return fecha;
      }
      
      // Manejar objetos de Firebase con _seconds
      if (fecha._seconds) {
        fechaObj = new Date(fecha._seconds * 1000);
      } else if (typeof fecha === 'string') {
        // Si es formato YYYY-MM-DD, agregar tiempo para evitar problemas de zona horaria
        if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
          fechaObj = new Date(fecha + 'T12:00:00');
        } else {
          fechaObj = new Date(fecha);
        }
      } else if (fecha instanceof Date) {
        fechaObj = fecha;
      } else {
        return '';
      }
      
      // Verificar si la fecha es válida
      if (isNaN(fechaObj.getTime())) {
        return '';
      }
      
      // Convertir a YYYY-MM-DD usando la fecha local (sin ajuste de zona horaria)
      const year = fechaObj.getFullYear();
      const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const day = String(fechaObj.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formateando fecha para input:', error);
      return '';
    }
  };

  // Función para iniciar edición inline de un partido
  const handleIniciarEdicionInline = (partido: Partido) => {
    setPartidoEditandoId(partido.id);
    setPartidoEditandoDatos({
      fase: partido.fase || '',
      fecha: formatFechaParaInput(partido.fecha),
      horaInicio: partido.horaInicio || '',
      canchaId: typeof partido.cancha === 'string' ? '' : (partido.cancha?.id || ''),
      arbitroId: partido.arbitroId || ''
    });
  };

  // Función para guardar edición inline
  const handleGuardarEdicionInline = async (partidoId: string) => {
    try {
      await api.put(`/partidos/${partidoId}`, {
        fase: partidoEditandoDatos.fase,
        fecha: partidoEditandoDatos.fecha,
        horaInicio: partidoEditandoDatos.horaInicio,
        canchaId: partidoEditandoDatos.canchaId,
        arbitroId: partidoEditandoDatos.arbitroId
      });
      
      // Recargar partidos
      await loadTorneoData();
      
      // Cerrar modo edición
      setPartidoEditandoId(null);
      setPartidoEditandoDatos({});
    } catch (error) {
      console.error('Error guardando partido:', error);
    }
  };

  // Función para cancelar edición inline
  const handleCancelarEdicionInline = () => {
    setPartidoEditandoId(null);
    setPartidoEditandoDatos({});
  };

  // Función para procesar referencias de partidos finalizados
  const handleProcesarReferencias = async () => {
    try {
      // Buscar todos los partidos finalizados sin referencias procesadas
      const partidosFinalizados = partidos.filter(p => 
        p.estado === 'finalizado' || p.estado === 'finalizado_con_acta'
      );
      
      if (partidosFinalizados.length === 0) {
        alert('No hay partidos finalizados para procesar');
        return;
      }
      
      let procesados = 0;
      
      for (const partido of partidosFinalizados) {
        try {
          await api.post(`/partidos/${partido.id}/procesar-referencias`);
          procesados++;
        } catch (error) {
          console.warn(`No se pudo procesar partido ${partido.id}:`, error);
        }
      }
      
      if (procesados > 0) {
        alert(`✅ Se procesaron ${procesados} partido(s) finalizado(s).\n\nLas referencias se han actualizado.`);
        await loadTorneoData(); // Recargar datos
      } else {
        alert('No se pudo procesar ningún partido');
      }
      
    } catch (error: any) {
      console.error('Error procesando referencias:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  // Función para actualizar manualmente la tabla de posiciones
  const handleActualizarTablaPosiciones = async () => {
    if (!torneo?.id) return;
    
    try {
      setActualizandoTabla(true);
      await api.post(`/partidos/actualizar-tabla-posiciones/${torneo.id}`);
      
      // Recargar datos del torneo
      await loadTorneoData();
      
      alert('Tabla de posiciones actualizada correctamente');
    } catch (error) {
      console.error('Error actualizando tabla de posiciones:', error);
      alert('Error al actualizar la tabla de posiciones');
    } finally {
      setActualizandoTabla(false);
    }
  };
  
  // Función para procesar el campeón de liga
  const handleProcesarCampeonLiga = async () => {
    if (!torneo?.id) return;
    
    try {
      setProcesandoCampeon(true);
      const response = await api.post(`/organizadores/torneos/${torneo.id}/procesar-campeon-liga`);
      
      // Recargar datos del torneo
      await loadTorneoData();
      
      alert(`🏆 ¡Campeón procesado correctamente!\n\n🥇 Campeón: ${response.data.campeon.nombre}\n🥈 Subcampeón: ${response.data.subcampeon?.nombre || 'No asignado'}`);
    } catch (error: any) {
      console.error('❌ Error procesando campeón:', error);
      alert(error.response?.data?.error || 'Error al procesar el campeón');
    } finally {
      setProcesandoCampeon(false);
    }
  };
  
  // Verificar si todos los partidos están finalizados
  const todosPartidosFinalizados = partidos.length > 0 && partidos.every(p => p.estado === 'finalizado');

  // Funciones para edición de partidos
  const handleEditPartido = (partido: Partido) => {
    setPartidoToEdit(partido);
    
    // Formatear fecha para el formulario
    let fechaObj: Date;
    
    if (typeof partido.fecha === 'object' && partido.fecha._seconds) {
      // Es un objeto de Firebase
      fechaObj = new Date(partido.fecha._seconds * 1000);
    } else {
      // Es un string
      fechaObj = new Date(partido.fecha as string);
    }
    
    // Validar que la fecha sea válida
    let fechaFormatted = '';
    // Usar horaInicio si existe, sino extraer de fecha, sino usar por defecto
    let horaFormatted = (partido as any).horaInicio || '15:00';
    
    if (!isNaN(fechaObj.getTime())) {
      // La fecha es válida
      fechaFormatted = fechaObj.toISOString().split('T')[0];
      // Solo extraer hora de fecha si no hay horaInicio
      if (!(partido as any).horaInicio) {
        horaFormatted = fechaObj.toTimeString().split(' ')[0].substring(0, 5);
      }
    } else {
      // La fecha no es válida, usar fecha actual

      const fechaActual = new Date();
      fechaFormatted = fechaActual.toISOString().split('T')[0];
      horaFormatted = (partido as any).horaInicio || '15:00';
    }
    
    setEditFormData({
      fecha: fechaFormatted,
      hora: horaFormatted,
      canchaId: (typeof partido.cancha === 'object' && partido.cancha ? (partido.cancha.id || '') : '') || (partido as any).canchaId || '',
      arbitroId: partido.arbitroId || (partido as any)?.arbitros?.principal?.id || '',
      estado: partido.estado || 'programado'
    });
    
    setOpenEditDialog(true);
  };

  const handleSavePartido = async () => {
    if (!partidoToEdit) return;
    
    try {
      // Crear fecha en UTC para evitar problemas de zona horaria
      const [year, month, day] = editFormData.fecha.split('-').map(Number);
      const [hours, minutes] = editFormData.hora.split(':').map(Number);
      // Crear fecha directamente en UTC para que no cambie el día
      const fechaCompleta = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      
      const updateData = {
        fecha: fechaCompleta.toISOString(),
        horaInicio: editFormData.hora, // Guardar horaInicio separadamente
        canchaId: editFormData.canchaId || undefined,
        arbitroId: editFormData.arbitroId || undefined,
        estado: editFormData.estado
      };
      
      await api.put(`/partidos/${partidoToEdit.id}`, updateData);
      
      // Recargar datos
      await loadTorneoData();
      
      setOpenEditDialog(false);
      setPartidoToEdit(null);
      
    } catch (error) {
      console.error('Error actualizando partido:', error);
    }
  };

  const handleProcesarFinalizados = async () => {
    try {
      await api.post(`/arbitros/torneo/${id}/procesar-finalizados`);
      alert('Partidos finalizados procesados correctamente');
      // Recargar la página para ver los cambios
      window.location.reload();
    } catch (error: any) {
      console.error('Error procesando partidos finalizados:', error);
      alert('Error al procesar partidos finalizados');
    }
  };

  const handleCrearFinal = async () => {
    try {
      const response = await api.post(`/arbitros/torneo/${id}/crear-final`);
      alert(`Final creada correctamente: ${response.data.ganadores.equipo1} vs ${response.data.ganadores.equipo2}`);
      // Recargar la página para ver los cambios
      window.location.reload();
    } catch (error: any) {
      console.error('Error creando final:', error);
      alert('Error al crear la final: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleProcesarCampeon = async () => {
    try {
      const response = await api.post(`/arbitros/torneo/${id}/procesar-campeon`);
      alert(`🏆 ¡CAMPEÓN DETERMINADO! 🏆\n\n🥇 Campeón: ${response.data.campeon.nombre}\n🥈 Subcampeón: ${response.data.subcampeon.nombre}\n\nResultado: ${response.data.resultado.campeon} vs ${response.data.resultado.subcampeon}`);
      // Recargar la página para ver los cambios
      window.location.reload();
    } catch (error: any) {
      console.error('Error procesando campeón:', error);
      alert('Error al procesar campeón: ' + (error.response?.data?.error || error.message));
    }
  };

  const loadCanchasYArbitros = async () => {
    try {
      const [canchasResponse, arbitrosResponse] = await Promise.all([
        api.get('/canchas'),
        api.get('/arbitros/disponibles')
      ]);
      
      setCanchas(canchasResponse.data || canchasResponse?.data?.data || []);
      const aData = arbitrosResponse.data?.arbitros || arbitrosResponse.data || [];
      setArbitros(aData);
    } catch (error) {
      console.error('Error cargando canchas y árbitros:', error);
    }
  };
  const getTotalFechas = () => {
    if (partidos.length === 0) return 0;
    const jornadas = Array.from(new Set(partidos.map(p => p.jornada)));
    return Math.max(...jornadas);
  };

  const cambiarFecha = (direccion: 'anterior' | 'siguiente') => {
    const totalFechas = getTotalFechas();
    if (direccion === 'anterior' && fechaActual > 1) {
      setFechaActual(fechaActual - 1);
    } else if (direccion === 'siguiente' && fechaActual < totalFechas) {
      setFechaActual(fechaActual + 1);
    }
  };

  const loadTorneoData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Cargar datos del torneo
      const torneoResponse = await api.get(`/torneos/${id}`);
      const torneoData = torneoResponse.data?.torneo || torneoResponse.data;
      setTorneo(torneoData);

      // Cargar partidos del torneo
      try {
        const partidosResponse = await api.get(`/partidos/torneo/${id}`);
        setPartidos(partidosResponse.data || []);
      } catch (error) {

        setPartidos([]);
      }

      // Cargar tabla de posiciones o grupos según el formato
      try {
        if (torneoData?.formato === 'grupos-playoff') {
          // Cargar grupos y sus tablas de posiciones
          const gruposResponse = await api.get(`/grupos/torneo/${id}`);
          
          // Extraer el array de datos de la respuesta
          const gruposData = gruposResponse.data?.data || gruposResponse.data || [];
          setGrupos(gruposData);

          const tablasResponse = await api.get(`/grupos/torneo/${id}/tablas-posiciones`);
          
          // Extraer el array de datos de la respuesta
          const tablasData = tablasResponse.data?.data || tablasResponse.data || [];
          setTablasGrupos(tablasData);
        } else if (torneoData?.formato === 'personalizado') {
          // Para formato personalizado, no cargar tabla de posiciones
          setTablaPosiciones([]);
          
          // Cargar canchas y árbitros para edición rápida
          try {
            const [canchasRes, arbitrosRes] = await Promise.all([
              api.get('/canchas'),
              api.get('/arbitros')
            ]);
            setCanchas(canchasRes.data || []);
            setArbitros(arbitrosRes.data || []);
          } catch (err) {
            console.warn('No se pudieron cargar canchas/árbitros:', err);
          }
        } else {
          // Cargar tabla de posiciones general para formato liga
          const tablaResponse = await api.get(`/torneos/${id}/tabla-posiciones`);
          setTablaPosiciones(tablaResponse.data?.tablaPosiciones || tablaResponse.data || []);
        }
      } catch (error) {
        console.error('❌ ERROR cargando tabla de posiciones/grupos:', error);
        setTablaPosiciones([]);
        setGrupos([]);
        setTablasGrupos([]);
      }
      
    } catch (error) {
      console.error('Error cargando datos del torneo:', error);
      setError('Error cargando información del torneo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Función para cargar estadísticas del torneo
  const loadEstadisticas = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoadingEstadisticas(true);
      const response = await api.get(`/torneos/${id}/estadisticas`);
      
      if (response.data) {
        setEstadisticas(response.data);
        // Inicializar pestaña según qué datos hay disponibles
        if (response.data.goleadores && response.data.goleadores.length > 0) {
          setTabEstadisticas(0);
        } else if (response.data.tarjetasAmarillas && response.data.tarjetasAmarillas.length > 0) {
          setTabEstadisticas(1);
        } else if (response.data.tarjetasRojas && response.data.tarjetasRojas.length > 0) {
          setTabEstadisticas(2);
        }
      }
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
      setEstadisticas(null);
    } finally {
      setLoadingEstadisticas(false);
    }
  }, [id]);

  useEffect(() => {
    loadTorneoData();
    loadCanchasYArbitros();
    loadEstadisticas();
    
    // Refresh automático cada 30 segundos si hay partidos en curso
    const interval = setInterval(() => {
      loadTorneoData();
      loadEstadisticas();
    }, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTorneoData, loadEstadisticas]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'En Curso':
      case 'en_curso':
        return 'success';
      case 'pendiente':
        return 'info';
      case 'finalizado':
        return 'default';
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'En Curso':
      case 'en_curso':
        return 'En Curso';
      case 'pendiente':
        return 'Pendiente';
      case 'finalizado':
        return 'Finalizado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  };

  const formatFecha = (fecha: any) => {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      let fechaObj: Date;
      
      // Manejar objetos de Firebase con _seconds
      if (fecha._seconds) {
        fechaObj = new Date(fecha._seconds * 1000);
      } else if (typeof fecha === 'string') {
        // Si es formato YYYY-MM-DD, agregar tiempo para evitar problemas de zona horaria
        if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Formato YYYY-MM-DD, agregar hora del mediodía para evitar cambio de día
          fechaObj = new Date(fecha + 'T12:00:00');
        } else {
        fechaObj = new Date(fecha);
        }
      } else if (fecha instanceof Date) {
        fechaObj = fecha;
      } else {
        return 'Fecha inválida';
      }
      
      // Verificar si la fecha es válida
      if (isNaN(fechaObj.getTime())) {
        return 'Fecha inválida';
      }
      
      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  // Función helper para extraer valores de forma segura
  const getValue = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object' && value.nombre) return value.nombre;
    if (typeof value === 'object' && value.id) return value.id;
    return fallback;
  };

  // Función específica para obtener nombre de equipo
  const getEquipoNombre = (equipo: any): string => {
    if (!equipo) return 'Equipo';
    
    // Intentar diferentes propiedades posibles
    const posiblesNombres = [
      equipo.equipoNombre,
      equipo.nombre,
      equipo.equipo?.nombre,
      equipo.teamName,
      equipo.name
    ];
    
    for (const nombre of posiblesNombres) {
      if (nombre && typeof nombre === 'string' && nombre.trim() !== '') {
        return nombre;
      }
    }
    
    return 'Equipo';
  };

  // Función helper para extraer logo de equipo
  const getLogo = (equipo: any): string => {
    if (!equipo) return '';
    if (typeof equipo === 'object') {
      // Intentar diferentes propiedades posibles para el logo
      const posiblesLogos = [
        equipo.logo,
        equipo.imagen,
        equipo.equipo?.logo,
        equipo.equipo?.imagen,
        equipo.image,
        equipo.teamLogo
      ];
      
      for (const logo of posiblesLogos) {
        if (logo && typeof logo === 'string' && logo.trim() !== '') {
          return logo;
        }
      }
    }
    return '';
  };

  const generarGrupos = async () => {
    if (!id) return;
    
    try {
      setGenerandoGrupos(true);
      await api.post(`/grupos/torneo/${id}/generar`);
      
      // Recargar datos del torneo
      await loadTorneoData();
      
      alert('Grupos generados exitosamente');
    } catch (error) {
      console.error('Error generando grupos:', error);
      alert('Error generando grupos');
    } finally {
      setGenerandoGrupos(false);
    }
  };

  const renderTablasGrupos = () => {
    // Asegurar que tablasGrupos sea un array
    const tablasArray = Array.isArray(tablasGrupos) ? tablasGrupos : [];
    
    if (tablasArray.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            No hay datos de grupos disponibles
          </Alert>
          <Button
            variant="contained"
            onClick={generarGrupos}
            disabled={generandoGrupos}
            startIcon={generandoGrupos ? <CircularProgress size={20} /> : <EmojiEvents />}
            sx={{ mt: 2 }}
          >
            {generandoGrupos ? 'Generando grupos...' : 'Generar Grupos'}
          </Button>
        </Box>
      );
    }

    return (
      <Box>
        {tablasArray.map((tablaGrupo, index) => {
          return (
            <Box key={tablaGrupo.id} sx={{ mb: 3 }}>
              {/* Título del Grupo */}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                {tablaGrupo.grupoId}
              </Typography>
              
              {/* Tabla de Posiciones */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Pos</TableCell>
                      <TableCell>Equipo</TableCell>
                      <TableCell align="center">PJ</TableCell>
                      <TableCell align="center">PG</TableCell>
                      <TableCell align="center">PE</TableCell>
                      <TableCell align="center">PP</TableCell>
                      <TableCell align="center">PF</TableCell>
                      <TableCell align="center">PC</TableCell>
                      <TableCell align="center">DF</TableCell>
                      <TableCell align="center">Bonus</TableCell>
                      <TableCell align="center">Pts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(tablaGrupo.tabla || [])
                      .sort((a: any, b: any) => b.puntosTotales - a.puntosTotales)
                      .map((equipo: any, posIndex: number) => (
                      <TableRow key={equipo.equipoId}>
                        <TableCell>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {posIndex + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {(() => {
                              const equipoCompleto = torneo?.equipos?.find(e => e.id === equipo.equipoId);
                              const logoEquipo = equipoCompleto?.logo || '';
                              
                              return logoEquipo ? (
                                <img 
                                  src={logoEquipo} 
                                  alt="Logo" 
                                  style={{ width: 24, height: 24, borderRadius: '50%' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null;
                            })()}
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {equipo.nombreEquipo || 'Equipo'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{equipo.partidosJugados || 0}</TableCell>
                        <TableCell align="center">{equipo.ganados || 0}</TableCell>
                        <TableCell align="center">{equipo.empatados || 0}</TableCell>
                        <TableCell align="center">{equipo.perdidos || 0}</TableCell>
                        <TableCell align="center">{equipo.puntosAFavor || 0}</TableCell>
                        <TableCell align="center">{equipo.puntosEnContra || 0}</TableCell>
                        <TableCell align="center">{equipo.diferencia || 0}</TableCell>
                        <TableCell align="center">
                          {(equipo.bonusOfensivo || 0) + (equipo.bonusDefensivo || 0)}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {equipo.puntosTotales || 0}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderTablaPosiciones = () => {
    // Si es formato personalizado, no mostrar nada (usa navegación de fechas)
    if (torneo?.formato === 'personalizado') {
      return null;
    }

    if (torneo?.formato === 'grupos-playoff') {
      return renderTablasGrupos();
    }

    // Si es formato eliminacion_directa, mostrar bracket
    if (torneo?.formato === 'eliminacion_directa') {
      if (torneo.estructuraEliminacion) {
        return (
          <Box>
            {/* Botones para procesar partidos finalizados */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                onClick={handleProcesarFinalizados}
                variant="contained"
                color="primary"
                startIcon={<PlayArrow />}
                sx={{ 
                  backgroundColor: '#2E7D32',
                  '&:hover': { backgroundColor: '#1B5E20' }
                }}
              >
                Procesar Partidos Finalizados
              </Button>
              <Button 
                onClick={handleCrearFinal}
                variant="contained"
                color="secondary"
                startIcon={<EmojiEvents />}
                sx={{ 
                  backgroundColor: '#1976D2',
                  '&:hover': { backgroundColor: '#1565C0' }
                }}
              >
                Crear Final con Ganadores
              </Button>
              <Button 
                onClick={handleProcesarCampeon}
                variant="contained"
                color="warning"
                startIcon={<EmojiEvents />}
                sx={{ 
                  backgroundColor: '#FF9800',
                  '&:hover': { backgroundColor: '#F57C00' },
                  fontWeight: 'bold'
                }}
              >
                🏆 Procesar Campeón
              </Button>
            </Box>
            
            <EliminacionDirectaBracket
            estructuraEliminacion={torneo.estructuraEliminacion}
            torneoNombre={torneo.nombre}
            campeon={torneo.campeon}
            subcampeon={torneo.subcampeon}
            partidos={partidos.map(p => ({
              id: p.id,
              estado: p.estado,
              resultado: p.resultado ? {
                puntosLocal: p.resultado.puntosLocal,
                puntosVisitante: p.resultado.puntosVisitante
              } : undefined,
              fecha: typeof p.fecha === 'string' ? p.fecha : 
                     typeof p.fecha === 'object' && p.fecha._seconds ? 
                     new Date(p.fecha._seconds * 1000).toISOString() : undefined,
              horaInicio: undefined // No disponible en esta interfaz
            }))}
            onEditPartido={(partidoId) => {
              const partido = partidos.find(p => p.id === partidoId);
              if (partido) {
                handleEditPartido(partido);
              }
            }}
            canEdit={userProfile?.tipoUsuario === 'organizador'}
          />
          </Box>
        );
      } else {
        return (
          <Alert severity="info">
            <Typography variant="body2">
              El fixture de eliminación directa aún no ha sido generado. 
              Contacta al organizador para generar el fixture.
            </Typography>
          </Alert>
        );
      }
    }

    if (tablaPosiciones.length === 0) {
      return (
        <Alert severity="info">
          No hay datos de tabla de posiciones disponibles
        </Alert>
      );
    }

    // Ordenar por puntos totales (descendente)
    const tablaOrdenada = [...tablaPosiciones].sort((a, b) => b.puntosTotales - a.puntosTotales);

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Pos</TableCell>
              <TableCell>Equipo</TableCell>
              <TableCell align="center">PJ</TableCell>
              <TableCell align="center">PG</TableCell>
              <TableCell align="center">PE</TableCell>
              <TableCell align="center">PP</TableCell>
              <TableCell align="center">PF</TableCell>
              <TableCell align="center">PC</TableCell>
              <TableCell align="center">DF</TableCell>
              <TableCell align="center">Bonus</TableCell>
              <TableCell align="center">Pts</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tablaOrdenada.map((equipo, index) => (
              <TableRow key={equipo.equipoId}>
                <TableCell>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {index + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {(() => {
                      // Buscar el logo del equipo en la lista de equipos del torneo
                      const equipoCompleto = torneo?.equipos?.find(e => e.id === equipo.equipoId);
                      const logoEquipo = equipoCompleto?.logo || '';
                      
                      return logoEquipo ? (
                        <img 
                          src={logoEquipo} 
                          alt="Logo" 
                          style={{ width: 24, height: 24, borderRadius: '50%' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null;
                    })()}
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {equipo.nombreEquipo || 'Equipo'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">{equipo.partidosJugados || 0}</TableCell>
                <TableCell align="center">{equipo.ganados || 0}</TableCell>
                <TableCell align="center">{equipo.empatados || 0}</TableCell>
                <TableCell align="center">{equipo.perdidos || 0}</TableCell>
                <TableCell align="center">{equipo.puntosAFavor || 0}</TableCell>
                <TableCell align="center">{equipo.puntosEnContra || 0}</TableCell>
                <TableCell align="center">{equipo.diferencia || 0}</TableCell>
                <TableCell align="center">
                  {(equipo.bonusOfensivo || 0) + (equipo.bonusDefensivo || 0)}
                </TableCell>
                <TableCell align="center">
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {equipo.puntosTotales || 0}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderFixtureEliminacionDirecta = () => {
    // Agrupar partidos por fase
    const partidosPorFase = partidos.reduce((acc, partido) => {
      const fase = partido.fase || 'Sin fase';
      if (!acc[fase]) {
        acc[fase] = [];
      }
      acc[fase].push(partido);
      return acc;
    }, {} as Record<string, Partido[]>);

    return (
      <Box sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {Object.keys(partidosPorFase)
          .sort((a, b) => {
            // Ordenar fases según el orden lógico de eliminación directa
            const ordenFases = ['Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final', 'Tercer Puesto'];
            const indexA = ordenFases.indexOf(a);
            const indexB = ordenFases.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            return a.localeCompare(b);
          })
          .map((fase) => (
            <Box key={fase} sx={{ mb: 6, px: { xs: 1, sm: 2 } }}>
              <Typography variant="h6" gutterBottom sx={{ 
                color: 'primary.main', 
                borderBottom: '2px solid', 
                borderColor: 'primary.main',
                pb: 1,
                mb: 3
              }}>
                {fase}
              </Typography>
              
              <Grid container spacing={3} justifyContent="center">
                {partidosPorFase[fase].map((partido) => (
                  <Grid item xs={12} md={6} key={partido.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        borderRadius: 2,
                        border: '2px solid transparent',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => navigate(`/partidos/${partido.id}`)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Chip
                            label={partido.estado}
                            size="small"
                            color={partido.estado === 'finalizado' ? 'success' : partido.estado === 'En Curso' ? 'warning' : 'default'}
                            sx={{ fontSize: '0.75rem' }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {formatFecha(partido.fecha)}
                          </Typography>
                        </Box>
                        
                        {/* Equipos en formato compacto */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            {getLogo(partido.equipoLocal) ? (
                              <img 
                                src={getLogo(partido.equipoLocal)} 
                                alt={getEquipoNombre(partido.equipoLocal)} 
                                style={{ 
                                  width: 87, 
                                  height: 87, 
                                  objectFit: 'contain',
                                  borderRadius: '8px',
                                  backgroundColor: '#f5f5f5',
                                  marginBottom: '8px'
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Box sx={{ 
                                width: 87, 
                                height: 87, 
                                backgroundColor: '#f5f5f5', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                color: '#666',
                                fontWeight: 'bold',
                                marginBottom: '8px'
                              }}>
                                {getEquipoNombre(partido.equipoLocal).charAt(0) || 'L'}
                              </Box>
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                              {getEquipoNombre(partido.equipoLocal)}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              VS
                            </Typography>
                            {partido.estado === 'finalizado' && (
                              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                                {partido.resultado?.puntosLocal || 0} - {partido.resultado?.puntosVisitante || 0}
                              </Typography>
                            )}
                          </Box>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            {getLogo(partido.equipoVisitante) ? (
                              <img 
                                src={getLogo(partido.equipoVisitante)} 
                                alt={getEquipoNombre(partido.equipoVisitante)} 
                                style={{ 
                                  width: 87, 
                                  height: 87, 
                                  objectFit: 'contain',
                                  borderRadius: '8px',
                                  backgroundColor: '#f5f5f5',
                                  marginBottom: '8px'
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Box sx={{ 
                                width: 87, 
                                height: 87, 
                                backgroundColor: '#f5f5f5', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                color: '#666',
                                fontWeight: 'bold',
                                marginBottom: '8px'
                              }}>
                                {getEquipoNombre(partido.equipoVisitante).charAt(0) || 'V'}
                              </Box>
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                              {getEquipoNombre(partido.equipoVisitante)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Información adicional */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Cancha: {String(typeof partido.cancha === 'string' ? partido.cancha : partido.cancha?.nombre || 'Por asignar')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Llave: {partido.nroLlave || 'N/A'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
      </Box>
    );
  };

  const renderFixturePersonalizadoConNavegacion = () => {
    if (partidos.length === 0) {
      return (
        <Alert severity="info">
          No hay partidos programados aún. Los partidos deben crearse manualmente.
        </Alert>
      );
    }

    // Filtrar partidos por fecha actual
    const partidosFechaActual = partidos.filter(p => p.jornada === fechaActual);
    const totalFechas = getTotalFechas();
    
    // Obtener todas las fechas disponibles
    const fechasDisponibles = Array.from({ length: totalFechas }, (_, i) => i + 1);

    const handleOpenFechaMenu = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorElFecha(event.currentTarget);
    };

    const handleCloseFechaMenu = () => {
      setAnchorElFecha(null);
    };

    const handleSelectFecha = (fecha: number) => {
      setFechaActual(fecha);
      handleCloseFechaMenu();
    };

    return (
      <Box>
        {/* Header con navegación de fechas */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          mb: 3,
          bgcolor: 'primary.main',
          color: 'white',
          p: 2,
          borderRadius: 1
        }}>
          {/* Navegación de fechas */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={() => cambiarFecha('anterior')}
              disabled={fechaActual <= 1}
              sx={{ color: 'white' }}
            >
              <ArrowBackIos />
            </IconButton>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.9
                }
              }}
              onClick={handleOpenFechaMenu}
            >
              <CalendarToday />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Fecha {fechaActual}
              </Typography>
              <ExpandMore />
            </Box>
            <IconButton 
              onClick={() => cambiarFecha('siguiente')}
              disabled={fechaActual >= totalFechas}
              sx={{ color: 'white' }}
            >
              <ArrowForwardIos />
            </IconButton>
          </Box>
        </Box>

        {/* Menú de selección de fecha */}
        <Menu
          anchorEl={anchorElFecha}
          open={openFechaMenu}
          onClose={handleCloseFechaMenu}
        >
          {fechasDisponibles.map((fecha) => (
            <MenuItem 
              key={fecha} 
              onClick={() => handleSelectFecha(fecha)}
              selected={fecha === fechaActual}
            >
              Fecha {fecha}
            </MenuItem>
          ))}
        </Menu>

        {/* Partidos de la fecha actual */}
        {partidosFechaActual.length === 0 ? (
          <Alert severity="info">
            No hay partidos programados para esta fecha
          </Alert>
        ) : (
          <Box>
            {partidosFechaActual.map((partido) => {
              const estaEditando = partidoEditandoId === partido.id;
              
              return (
                <Card 
                  key={partido.id} 
                  sx={{ 
                    mb: 2, 
                    cursor: estaEditando ? 'default' : 'pointer',
                    '&:hover': estaEditando ? {} : { boxShadow: 4 }
                  }}
                  onClick={(e) => {
                    if (!estaEditando) {
                      navigate(`/partidos/${partido.id}`);
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', alignItems: 'center', mb: 1 }}>
                      {/* Columna izquierda - Chip de fase */}
                      <Box>
                        {estaEditando ? (
                          <TextField
                            size="small"
                            label="Fase / Nombre"
                            value={partidoEditandoDatos.fase || ''}
                            onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, fase: e.target.value})}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ width: '100%' }}
                          />
                        ) : (
                          <Chip 
                            label={partido.fase || 'Partido'} 
                            color="primary" 
                            size="small" 
                          />
                        )}
                      </Box>
                      
                      {/* Columna central - Fecha (centrada) */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {estaEditando ? (
                          <Box sx={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                            <TextField
                              size="small"
                              type="date"
                              label="Fecha"
                              value={partidoEditandoDatos.fecha || ''}
                              onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, fecha: e.target.value})}
                              InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                              size="small"
                              type="time"
                              label="Hora"
                              value={partidoEditandoDatos.horaInicio || ''}
                              onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, horaInicio: e.target.value})}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {formatFecha(partido.fecha)}{partido.horaInicio && ` - ${partido.horaInicio}`}
                          </Typography>
                        )}
                      </Box>
                      
                      {/* Columna derecha - Botón de editar */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {!estaEditando && (rolePermissions.isOrganizador || rolePermissions.isAdmin) && (
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIniciarEdicionInline(partido);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    
                    {/* Equipos */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        {/* Mostrar icono especial si es referencia */}
                        {partido.equipoLocalReferencia ? (
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            bgcolor: 'warning.light', 
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px'
                          }}>
                            ⏳
                          </Box>
                        ) : getLogo(partido.equipoLocal) ? (
                          <img 
                            src={getLogo(partido.equipoLocal)} 
                            alt={typeof partido.equipoLocal === 'string' ? partido.equipoLocal : partido.equipoLocal.nombre} 
                            style={{ width: 40, height: 40, objectFit: 'contain' }} 
                          />
                        ) : (
                          <Box sx={{ width: 40, height: 40, bgcolor: 'grey.300', borderRadius: 1 }} />
                        )}
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {typeof partido.equipoLocal === 'string' ? partido.equipoLocal : partido.equipoLocal.nombre}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mx: 2, textAlign: 'center' }}>
                        {partido.estado === 'finalizado' ? (
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {partido.resultado?.puntosLocal || 0} - {partido.resultado?.puntosVisitante || 0}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            vs
                          </Typography>
                        )}
                        <Chip 
                          label={
                            partido.equipoLocalReferencia || partido.equipoVisitanteReferencia ? 'Esperando Resultados' :
                            partido.estado === 'finalizado' ? 'Finalizado' : 
                            partido.estado === 'En Curso' ? 'En Curso' : 
                            'Programado'
                          } 
                          color={
                            partido.equipoLocalReferencia || partido.equipoVisitanteReferencia ? 'info' :
                            partido.estado === 'finalizado' ? 'success' : 
                            partido.estado === 'En Curso' ? 'warning' : 
                            'default'
                          } 
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'flex-end' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {typeof partido.equipoVisitante === 'string' ? partido.equipoVisitante : partido.equipoVisitante.nombre}
                        </Typography>
                        {/* Mostrar icono especial si es referencia */}
                        {partido.equipoVisitanteReferencia ? (
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            bgcolor: 'warning.light', 
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px'
                          }}>
                            ⏳
                          </Box>
                        ) : getLogo(partido.equipoVisitante) ? (
                          <img 
                            src={getLogo(partido.equipoVisitante)} 
                            alt={typeof partido.equipoVisitante === 'string' ? partido.equipoVisitante : partido.equipoVisitante.nombre} 
                            style={{ width: 40, height: 40, objectFit: 'contain' }} 
                          />
                        ) : (
                          <Box sx={{ width: 40, height: 40, bgcolor: 'grey.300', borderRadius: 1 }} />
                        )}
                      </Box>
                    </Box>
                    
                    {/* Cancha y Árbitro - Modo Edición */}
                    {estaEditando ? (
                      <Box sx={{ mt: 2 }} onClick={(e) => e.stopPropagation()}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Cancha</InputLabel>
                              <Select
                                value={partidoEditandoDatos.canchaId || ''}
                                onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, canchaId: e.target.value})}
                                label="Cancha"
                              >
                                {canchas.map((cancha) => (
                                  <MenuItem key={cancha.id} value={cancha.id}>
                                    {cancha.nombre || cancha.titulo}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Árbitro</InputLabel>
                              <Select
                                value={partidoEditandoDatos.arbitroId || ''}
                                onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, arbitroId: e.target.value})}
                                label="Árbitro"
                              >
                                {arbitros.map((arbitro) => (
                                  <MenuItem key={arbitro.id} value={arbitro.id}>
                                    {arbitro.nombre} {arbitro.apellido}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                        
                        {/* Botones de guardar/cancelar */}
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelarEdicionInline();
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<Save />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGuardarEdicionInline(partido.id);
                            }}
                          >
                            Guardar
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      /* Cancha - Modo Vista */
                      partido.cancha && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: 'center' }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {typeof partido.cancha === 'string' ? partido.cancha : partido.cancha.nombre}
                          </Typography>
                        </Box>
                      )
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
        
        {/* Menú de selección de fecha */}
        <Menu
          anchorEl={anchorElFecha}
          open={openFechaMenu}
          onClose={handleCloseFechaMenu}
        >
          {fechasDisponibles.map((fecha) => (
            <MenuItem 
              key={fecha} 
              onClick={() => handleSelectFecha(fecha)}
              selected={fecha === fechaActual}
            >
              Fecha {fecha}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  };

  const renderFixtureConNavegacion = () => {
    if (partidos.length === 0) {
      return (
        <Alert severity="info">
          No hay partidos programados para este torneo
        </Alert>
      );
    }

    // Para eliminación directa, mostrar todos los partidos agrupados por fase
    if (torneo?.formato === 'eliminacion_directa') {
      return renderFixtureEliminacionDirecta();
    }

    // Filtrar partidos por fecha actual (para otros formatos)
    const partidosFechaActual = partidos.filter(p => p.jornada === fechaActual);
    const totalFechas = getTotalFechas();
    
    // Obtener todas las fechas disponibles
    const fechasDisponibles = Array.from({ length: totalFechas }, (_, i) => i + 1);

    const handleOpenFechaMenu = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorElFecha(event.currentTarget);
    };

    const handleCloseFechaMenu = () => {
      setAnchorElFecha(null);
    };

    const handleSelectFecha = (fecha: number) => {
      setFechaActual(fecha);
      handleCloseFechaMenu();
    };

    return (
      <Box>
        {/* Header con navegación de fechas */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          mb: 3,
          bgcolor: 'primary.main',
          color: 'white',
          p: 2,
          borderRadius: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={() => cambiarFecha('anterior')}
              disabled={fechaActual <= 1}
              sx={{ color: 'white' }}
            >
              <ArrowBackIos />
            </IconButton>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.9
                }
              }}
              onClick={handleOpenFechaMenu}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'center' }}>
                FECHA {fechaActual}
              </Typography>
            </Box>
            <IconButton 
              onClick={() => cambiarFecha('siguiente')}
              disabled={fechaActual >= totalFechas}
              sx={{ color: 'white' }}
            >
              <ArrowForwardIos />
            </IconButton>
          </Box>
        </Box>

        {/* Dropdown de fechas */}
        <Menu
          anchorEl={anchorElFecha}
          open={openFechaMenu}
          onClose={handleCloseFechaMenu}
          PaperProps={{
            sx: {
              maxHeight: '400px',
              width: '200px',
              mt: 1
            }
          }}
        >
          {fechasDisponibles.map((fecha) => (
            <MenuItem
              key={fecha}
              onClick={() => handleSelectFecha(fecha)}
              selected={fecha === fechaActual}
              sx={{
                bgcolor: fecha === fechaActual ? '#e8f5e9' : 'transparent',
                color: fecha === fechaActual ? '#2e7d32' : 'inherit',
                fontWeight: fecha === fechaActual ? 'bold' : 'normal',
                '&:hover': {
                  bgcolor: fecha === fechaActual ? '#c8e6c9' : 'rgba(0,0,0,0.04)'
                }
              }}
            >
              <ListItemText primary={`FECHA ${fecha}`} />
            </MenuItem>
          ))}
        </Menu>

        {/* Partidos de la fecha actual */}
        {partidosFechaActual.length === 0 ? (
          <Alert severity="info">
            No hay partidos programados para esta fecha
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {partidosFechaActual.map((partido) => (
              <Grid item xs={12} key={partido.id}>
                <Card 
                  sx={{ 
                    mb: 2, 
                    cursor: 'pointer', 
                    bgcolor: darkMode ? '#2a2a2a' : 'white',
                    '&:hover': { boxShadow: 3 }
                  }} 
                  onClick={() => navigate(`/partidos/${partido.id}`)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Chip
                        label={partido.estado === 'finalizado' ? 'finalizado' : partido.estado}
                        size="small"
                        color={partido.estado === 'finalizado' ? 'success' : partido.estado === 'En Curso' ? 'warning' : 'default'}
                        sx={{ 
                          fontSize: '0.75rem',
                          textTransform: 'lowercase',
                          fontWeight: 'bold'
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {formatFecha(partido.fecha)}
                      </Typography>
                    </Box>
                    
                    {/* Equipos en formato compacto */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        {getLogo(partido.equipoLocal) ? (
                          <img 
                            src={getLogo(partido.equipoLocal)} 
                            alt={getEquipoNombre(partido.equipoLocal)} 
                            style={{ 
                              width: 40, 
                              height: 40, 
                              objectFit: 'contain',
                              borderRadius: '4px'
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {getEquipoNombre(partido.equipoLocal)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ textAlign: 'center', mx: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {getValue(partido.resultado?.puntosLocal, '0')} - {getValue(partido.resultado?.puntosVisitante, '0')}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'flex-end' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {getEquipoNombre(partido.equipoVisitante)}
                        </Typography>
                        {getLogo(partido.equipoVisitante) ? (
                          <img 
                            src={getLogo(partido.equipoVisitante)} 
                            alt={getEquipoNombre(partido.equipoVisitante)} 
                            style={{ 
                              width: 40, 
                              height: 40, 
                              objectFit: 'contain',
                              borderRadius: '4px'
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                      </Box>
                    </Box>
                    
                    {/* Información adicional: Cancha y Hora */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mt: 2, 
                      pt: 2, 
                      borderTop: '1px solid', 
                      borderColor: 'divider' 
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {(partido as any).horaInicio || (() => {
                            let fechaObj: Date;
                            if (typeof partido.fecha === 'object' && partido.fecha._seconds) {
                              fechaObj = new Date(partido.fecha._seconds * 1000);
                            } else {
                              fechaObj = new Date(partido.fecha as string);
                            }
                            return fechaObj.toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            });
                          })()}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {(() => {
                            // Manejar objeto cancha con id y nombre
                            if (partido.cancha && typeof partido.cancha === 'object') {
                              return partido.cancha.nombre || 'Por asignar';
                            }
                            // Fallback para string o undefined
                            return getValue(partido.cancha, 'Por asignar');
                          })()}
                        </Typography>
                      </Box>
                      
                      {userProfile?.tipoUsuario === 'organizador' && (
                        <Tooltip title="Editar partido">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPartido(partido);
                            }}
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };


  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !torneo) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Alert severity="error">
          {error || 'Torneo no encontrado'}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/torneos')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {getValue(torneo.nombre, 'Torneo')}
          </Typography>
          <Chip
            label={getEstadoText(torneo.estado)}
            color={getEstadoColor(torneo.estado)}
            size="medium"
          />
        </Box>

        {/* Información del torneo */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SportsRugby color="primary" />
                  <Typography variant="h6">Categoría</Typography>
                </Box>
                <Typography variant="body1">{getValue(torneo.categoria, 'Sin categoría')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalendarToday color="primary" />
                  <Typography variant="h6">Período</Typography>
                </Box>
                <Typography variant="body2">
                  {formatFecha(torneo.fechaInicio)} - {formatFecha(torneo.fechaFin)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <People color="primary" />
                  <Typography variant="h6">Equipos</Typography>
                </Box>
                <Typography variant="body1">{Array.isArray(torneo.equipos) ? torneo.equipos.length : 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <EmojiEvents color="primary" />
                  <Typography variant="h6">Formato</Typography>
                </Box>
                <Typography variant="body1">
                  {torneo.formato === 'liga' ? 'Liga' : 
                   torneo.formato === 'grupos-playoff' ? 'Grupos + Playoff' :
                   torneo.formato === 'eliminacion_directa' ? 'Eliminación Directa' :
                   torneo.formato === 'personalizado' ? 'Personalizado' :
                   getValue(torneo.formato, 'Sin formato')}
                  {torneo.idaYvuelta && ' (Ida y Vuelta)'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Mostrar campeón si está disponible */}
        {torneo.campeon && torneo.formato === 'liga' && (
          <Box sx={{ mb: 3 }}>
            <Paper sx={{ 
              p: 3, 
              bgcolor: darkMode ? '#2d2d2d' : '#fff', 
              background: darkMode 
                ? 'linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)' 
                : 'linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)',
              border: darkMode ? '2px solid #ffd700' : '2px solid #ffc107',
              borderRadius: 3
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                <EmojiEvents sx={{ fontSize: 48, color: '#ffc107' }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: darkMode ? '#ffd700' : '#f57c00' }}>
                  CAMPEÓN
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <LogoDisplay
                  src={torneo.campeon.logo}
                  alt={torneo.campeon.nombre}
                  size={80}
                  shape="rounded"
                  fallbackText={torneo.campeon.nombre?.substring(0, 2) || 'EQ'}
                  variant="avatar"
                />
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: darkMode ? '#e0e0e0' : '#424242' }}>
                  {torneo.campeon.nombre}
                </Typography>
              </Box>
              {torneo.subcampeon && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: darkMode ? '#a0a0a0' : '#757575', mb: 1 }}>
                    Subcampeón
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <LogoDisplay
                      src={torneo.subcampeon.logo}
                      alt={torneo.subcampeon.nombre}
                      size={40}
                      shape="rounded"
                      fallbackText={torneo.subcampeon.nombre?.substring(0, 2) || 'EQ'}
                      variant="avatar"
                    />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {torneo.subcampeon.nombre}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        )}
        
      </Box>

      {/* Diseño de dos paneles lado a lado */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        {/* Panel izquierdo - Tabla de Posiciones (oculto en formato personalizado) */}
        {torneo?.formato !== 'personalizado' && (
        <Grid item xs={12} lg={torneo?.formato === 'eliminacion_directa' ? 12 : 6}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2,
              bgcolor: 'primary.main',
              color: 'white',
              p: 2,
              borderRadius: 1
            }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {torneo?.formato === 'eliminacion_directa' ? 'BRACKET DE ELIMINACIÓN' : 'TABLA DE POSICIONES'}
              </Typography>
              
              {/* Botones para tabla de posiciones (solo para formato liga y organizadores/admins) */}
              {torneo?.formato === 'liga' && (rolePermissions.isOrganizador || rolePermissions.isAdmin) && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    onClick={handleActualizarTablaPosiciones}
                    disabled={actualizandoTabla}
                    startIcon={actualizandoTabla ? <CircularProgress size={16} /> : <TrendingUp />}
                  >
                    {actualizandoTabla ? 'Actualizando...' : 'Actualizar Tabla'}
                  </Button>
                  
                  {/* Botón para procesar campeón (solo si todos los partidos están finalizados y no hay campeón) */}
                  {(() => {
                    const formatoLiga = torneo?.formato === 'liga';
                    const todosFinalizados = todosPartidosFinalizados;
                    const sinCampeon = !torneo?.campeon;
                    const esOrganizadorOAdmin = rolePermissions.isOrganizador || rolePermissions.isAdmin;
                    
                    // Mostrar botón solo si es formato liga, todos los partidos están finalizados, no hay campeón y es organizador/admin
                    if (formatoLiga && todosFinalizados && sinCampeon && esOrganizadorOAdmin) {
                      return (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={handleProcesarCampeonLiga}
                          disabled={procesandoCampeon}
                          startIcon={procesandoCampeon ? <CircularProgress size={16} /> : <EmojiEvents />}
                        >
                          {procesandoCampeon ? 'Procesando...' : 'Procesar Campeón'}
                        </Button>
                      );
                    }
                    return null;
                  })()}
                </Box>
              )}
            </Box>
            {renderTablaPosiciones()}
          </Paper>
        </Grid>
        )}

        {/* Panel derecho - Fixture con navegación (para liga, grupos y personalizado) */}
        {torneo?.formato !== 'eliminacion_directa' && (
          <Grid item xs={12} lg={torneo?.formato === 'personalizado' ? 12 : 6}>
            <Paper sx={{ p: 2, height: 'fit-content' }}>
              {torneo?.formato === 'personalizado' ? renderFixturePersonalizadoConNavegacion() : renderFixtureConNavegacion()}
            </Paper>
          </Grid>
        )}

        {/* ELIMINADO - Ahora usa el sistema de navegación */}
        {false && torneo?.formato === 'personalizado' && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: 'success.main',
                color: 'white',
                p: 2,
                borderRadius: 1,
                mb: 2
              }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  FIXTURE COMPLETO
                </Typography>
                
                {/* Botón para procesar referencias de partidos finalizados */}
                {(rolePermissions.isOrganizador || rolePermissions.isAdmin) && (
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProcesarReferencias();
                    }}
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                    }}
                  >
                    🔄 Procesar Referencias
                  </Button>
                )}
              </Box>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : partidos.length === 0 ? (
                <Alert severity="info">
                  No hay partidos programados aún. Los partidos deben crearse manualmente.
                </Alert>
              ) : (
                <Box>
                  {/* Agrupar partidos por jornada */}
                  {(() => {
                    // Agrupar partidos por jornada
                    const partidosPorJornada: { [key: number]: Partido[] } = {};
                    partidos.forEach(partido => {
                      const jornada = partido.jornada || 1;
                      if (!partidosPorJornada[jornada]) {
                        partidosPorJornada[jornada] = [];
                      }
                      partidosPorJornada[jornada].push(partido);
                    });
                    
                    // Ordenar jornadas
                    const jornadasOrdenadas = Object.keys(partidosPorJornada)
                      .map(Number)
                      .sort((a, b) => a - b);
                    
                    return jornadasOrdenadas.map((numeroJornada) => (
                      <Box key={numeroJornada} sx={{ mb: 3 }}>
                        {/* Encabezado de Jornada */}
                        <Box sx={{ 
                          bgcolor: 'primary.main', 
                          color: 'white', 
                          p: 1.5, 
                          borderRadius: 1,
                          mb: 2,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Jornada {numeroJornada}
                          </Typography>
                          <Chip 
                            label={`${partidosPorJornada[numeroJornada].length} ${partidosPorJornada[numeroJornada].length === 1 ? 'partido' : 'partidos'}`}
                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            size="small"
                          />
                        </Box>
                        
                        {/* Partidos de esta jornada */}
                        {partidosPorJornada[numeroJornada].map((partido) => {
                    const estaEditando = partidoEditandoId === partido.id;
                    
                    return (
                    <Card 
                      key={partido.id} 
                      sx={{ 
                        mb: 2, 
                        cursor: estaEditando ? 'default' : 'pointer',
                        '&:hover': estaEditando ? {} : { boxShadow: 4 }
                      }}
                      onClick={(e) => {
                        if (!estaEditando) {
                          navigate(`/partidos/${partido.id}`);
                        }
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          {estaEditando ? (
                            <TextField
                              size="small"
                              label="Fase / Nombre"
                              value={partidoEditandoDatos.fase || ''}
                              onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, fase: e.target.value})}
                              onClick={(e) => e.stopPropagation()}
                              sx={{ flex: 1, mr: 2 }}
                            />
                          ) : (
                            <Chip 
                              label={partido.fase || 'Partido'} 
                              color="primary" 
                              size="small" 
                            />
                          )}
                          
                          {estaEditando ? (
                            <Box sx={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                              <TextField
                                size="small"
                                type="date"
                                label="Fecha"
                                value={partidoEditandoDatos.fecha || ''}
                                onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, fecha: e.target.value})}
                                InputLabelProps={{ shrink: true }}
                              />
                              <TextField
                                size="small"
                                type="time"
                                label="Hora"
                                value={partidoEditandoDatos.horaInicio || ''}
                                onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, horaInicio: e.target.value})}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                {formatFecha(partido.fecha)}{partido.horaInicio && ` - ${partido.horaInicio}`}
                              </Typography>
                              {/* Botón de editar (solo para organizadores y torneos personalizados) */}
                              {(rolePermissions.isOrganizador || rolePermissions.isAdmin) && (
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleIniciarEdicionInline(partido);
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          )}
                        </Box>
                        
                        {/* Equipos */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            {/* Mostrar icono especial si es referencia */}
                            {partido.equipoLocalReferencia ? (
                              <Box sx={{ 
                                width: 40, 
                                height: 40, 
                                bgcolor: 'warning.light', 
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                              }}>
                                ⏳
                              </Box>
                            ) : getLogo(partido.equipoLocal) ? (
                              <img 
                                src={getLogo(partido.equipoLocal)} 
                                alt={typeof partido.equipoLocal === 'string' ? partido.equipoLocal : partido.equipoLocal.nombre} 
                                style={{ width: 40, height: 40, objectFit: 'contain' }} 
                              />
                            ) : (
                              <Box sx={{ width: 40, height: 40, bgcolor: 'grey.300', borderRadius: 1 }} />
                            )}
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {typeof partido.equipoLocal === 'string' ? partido.equipoLocal : partido.equipoLocal.nombre}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ mx: 2, textAlign: 'center' }}>
                            {partido.estado === 'finalizado' ? (
                              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {partido.resultado?.puntosLocal || 0} - {partido.resultado?.puntosVisitante || 0}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                vs
                              </Typography>
                            )}
                            <Chip 
                              label={
                                partido.equipoLocalReferencia || partido.equipoVisitanteReferencia ? 'Esperando Resultados' :
                                partido.estado === 'finalizado' ? 'Finalizado' : 
                                partido.estado === 'En Curso' ? 'En Curso' : 
                                'Programado'
                              } 
                              color={
                                partido.equipoLocalReferencia || partido.equipoVisitanteReferencia ? 'info' :
                                partido.estado === 'finalizado' ? 'success' : 
                                partido.estado === 'En Curso' ? 'warning' : 
                                'default'
                              } 
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'flex-end' }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {typeof partido.equipoVisitante === 'string' ? partido.equipoVisitante : partido.equipoVisitante.nombre}
                            </Typography>
                            {/* Mostrar icono especial si es referencia */}
                            {partido.equipoVisitanteReferencia ? (
                              <Box sx={{ 
                                width: 40, 
                                height: 40, 
                                bgcolor: 'warning.light', 
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                              }}>
                                ⏳
                              </Box>
                            ) : getLogo(partido.equipoVisitante) ? (
                              <img 
                                src={getLogo(partido.equipoVisitante)} 
                                alt={typeof partido.equipoVisitante === 'string' ? partido.equipoVisitante : partido.equipoVisitante.nombre} 
                                style={{ width: 40, height: 40, objectFit: 'contain' }} 
                              />
                            ) : (
                              <Box sx={{ width: 40, height: 40, bgcolor: 'grey.300', borderRadius: 1 }} />
                            )}
                          </Box>
                        </Box>
                        
                        {/* Cancha y Árbitro - Modo Edición */}
                        {estaEditando ? (
                          <Box sx={{ mt: 2 }} onClick={(e) => e.stopPropagation()}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Cancha</InputLabel>
                                  <Select
                                    value={partidoEditandoDatos.canchaId || ''}
                                    onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, canchaId: e.target.value})}
                                    label="Cancha"
                                  >
                                    {canchas.map((cancha) => (
                                      <MenuItem key={cancha.id} value={cancha.id}>
                                        {cancha.nombre || cancha.titulo}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Árbitro</InputLabel>
                                  <Select
                                    value={partidoEditandoDatos.arbitroId || ''}
                                    onChange={(e) => setPartidoEditandoDatos({...partidoEditandoDatos, arbitroId: e.target.value})}
                                    label="Árbitro"
                                  >
                                    {arbitros.map((arbitro) => (
                                      <MenuItem key={arbitro.id} value={arbitro.id}>
                                        {arbitro.nombre} {arbitro.apellido}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                            </Grid>
                            
                            {/* Botones de guardar/cancelar */}
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Cancel />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelarEdicionInline();
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<Save />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGuardarEdicionInline(partido.id);
                                }}
                              >
                                Guardar
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          /* Cancha - Modo Vista */
                          partido.cancha && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: 'center' }}>
                              <LocationOn fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {typeof partido.cancha === 'string' ? partido.cancha : partido.cancha.nombre}
                              </Typography>
                            </Box>
                          )
                        )}
                      </CardContent>
                    </Card>
                    );
                        })}
                      </Box>
                    ));
                  })()}
                </Box>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Tablas de Estadísticas */}
      {(estadisticas || (torneo && !loadingEstadisticas)) && (
        <Box sx={{ mt: 4 }}>
          {/* Estadísticas Personales - Una sola tabla con pestañas */}
          {((estadisticas?.goleadores && estadisticas.goleadores.length > 0) ||
            (estadisticas?.tarjetasAmarillas && estadisticas.tarjetasAmarillas.length > 0) ||
            (estadisticas?.tarjetasRojas && estadisticas.tarjetasRojas.length > 0)) && (
            <Paper sx={{ p: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Estadísticas Personales
                </Typography>
                <Tabs 
                  value={tabEstadisticas} 
                  onChange={(e, newValue) => setTabEstadisticas(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {estadisticas?.goleadores && estadisticas.goleadores.length > 0 && (
                    <Tab label="Tries" value={0} />
                  )}
                  {estadisticas?.tarjetasAmarillas && estadisticas.tarjetasAmarillas.length > 0 && (
                    <Tab label="Tarjetas Amarillas" value={1} />
                  )}
                  {estadisticas?.tarjetasRojas && estadisticas.tarjetasRojas.length > 0 && (
                    <Tab label="Tarjetas Rojas" value={2} />
                  )}
                </Tabs>
              </Box>

              {/* Pestaña de Tries */}
              {tabEstadisticas === 0 && estadisticas?.goleadores && estadisticas.goleadores.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableBody>
                      {estadisticas.goleadores.slice(0, 6).map((jugador: any, index: number) => (
                        <TableRow key={jugador.jugadorId || index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {jugador.equipoLogo ? (
                                <img 
                                  src={jugador.equipoLogo} 
                                  alt={jugador.equipoNombre} 
                                  style={{ width: 24, height: 24, borderRadius: '50%' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                {jugador.jugadorNombre}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {jugador.tries || 0}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {estadisticas.goleadores.length > 6 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        endIcon={<ExpandMore />}
                      >
                        Ver Más ({estadisticas.goleadores.length - 6} más)
                      </Button>
                    </Box>
                  )}
                </TableContainer>
              )}

              {/* Pestaña de Tarjetas Amarillas */}
              {tabEstadisticas === 1 && estadisticas?.tarjetasAmarillas && estadisticas.tarjetasAmarillas.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableBody>
                      {estadisticas.tarjetasAmarillas.slice(0, 6).map((jugador: any, index: number) => (
                        <TableRow key={jugador.jugadorId || index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {jugador.equipoLogo ? (
                                <img 
                                  src={jugador.equipoLogo} 
                                  alt={jugador.equipoNombre} 
                                  style={{ width: 24, height: 24, borderRadius: '50%' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                {jugador.jugadorNombre}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {jugador.tarjetasAmarillas || 0}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {estadisticas.tarjetasAmarillas.length > 6 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        endIcon={<ExpandMore />}
                      >
                        Ver Más ({estadisticas.tarjetasAmarillas.length - 6} más)
                      </Button>
                    </Box>
                  )}
                </TableContainer>
              )}

              {/* Pestaña de Tarjetas Rojas */}
              {tabEstadisticas === 2 && estadisticas?.tarjetasRojas && estadisticas.tarjetasRojas.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableBody>
                      {estadisticas.tarjetasRojas.slice(0, 6).map((jugador: any, index: number) => (
                        <TableRow key={jugador.jugadorId || index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {jugador.equipoLogo ? (
                                <img 
                                  src={jugador.equipoLogo} 
                                  alt={jugador.equipoNombre} 
                                  style={{ width: 24, height: 24, borderRadius: '50%' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                {jugador.jugadorNombre}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {jugador.tarjetasRojas || 0}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {estadisticas.tarjetasRojas.length > 6 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        endIcon={<ExpandMore />}
                      >
                        Ver Más ({estadisticas.tarjetasRojas.length - 6} más)
                      </Button>
                    </Box>
                  )}
                </TableContainer>
              )}
            </Paper>
          )}
        </Box>
      )}
      
      {/* Modal de edición de partido */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Editar Partido - {partidoToEdit && `${getEquipoNombre(partidoToEdit.equipoLocal)} vs ${getEquipoNombre(partidoToEdit.equipoVisitante)}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Fecha"
                type="date"
                value={editFormData.fecha}
                onChange={(e) => setEditFormData({...editFormData, fecha: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Hora"
                type="time"
                value={editFormData.hora}
                onChange={(e) => setEditFormData({...editFormData, hora: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            
            <FormControl fullWidth>
              <InputLabel>Cancha</InputLabel>
              <Select
                value={editFormData.canchaId}
                onChange={(e) => setEditFormData({...editFormData, canchaId: String(e.target.value)})}
                label="Cancha"
              >
                {canchas.map((cancha) => (
                  <MenuItem key={cancha.id} value={cancha.id}>
                    {cancha.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Árbitro</InputLabel>
              <Select
                value={editFormData.arbitroId}
                onChange={(e) => setEditFormData({...editFormData, arbitroId: e.target.value})}
                label="Árbitro"
              >
                <MenuItem value="">Sin árbitro asignado</MenuItem>
                {arbitros.map((arbitro) => (
                  <MenuItem key={arbitro.id} value={arbitro.id}>
                    {arbitro.nombre} {arbitro.apellido}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={editFormData.estado}
                onChange={(e) => setEditFormData({...editFormData, estado: e.target.value})}
                label="Estado"
              >
                <MenuItem value="programado">Programado</MenuItem>
                <MenuItem value="En Curso">En Curso</MenuItem>
                <MenuItem value="finalizado">Finalizado</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
                <MenuItem value="aplazado">Aplazado</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSavePartido} variant="contained">
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DetalleTorneo;
