
import React, { useState, useEffect, useCallback } from 'react';

import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import {
  SportsRugby,
  EmojiEvents,
  CalendarToday,
  Star,
  Gavel,
  Schedule,
  Timer,
  Visibility,
  People,
  LocationOn,
  TrendingUp
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { construirUrlImagen } from '../utils/imageUtils';
import toast from 'react-hot-toast';
import { asText } from '../utils/text';
import BaseCard from '../components/ui/BaseCard';
import BaseButton from '../components/ui/BaseButton';
import { useTheme } from '../contexts/ThemeContext';

const DashboardJugadorArbitro = () => {
  const { userProfile } = useAuth();
  const rolePermissions = useRolePermissions();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  

  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState(null);
  const [proximosPartidos, setProximosPartidos] = useState([]);
  const [torneosDisponibles, setTorneosDisponibles] = useState([]);
  const [tiemposTranscurridos, setTiemposTranscurridos] = useState({});
  const [tiemposInicio, setTiemposInicio] = useState({}); // Timestamps de inicio por partido
  const [cronometrosActivos, setCronometrosActivos] = useState({}); // Estado de cronómetro por partido

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const userId = userProfile?.uid || userProfile?.id;
      
      if (rolePermissions.isJugador) {
        // Cargar datos específicos de jugador
        const [statsRes, proximosRes, torneosRes] = await Promise.all([
          api.get(`/jugadores/perfil/${userId}`).catch((err) => {
            return { data: null };
          }),
          api.get('/partidos/proximos').catch((err) => {
            return { data: [] };
          }),
          api.get('/torneos').catch((err) => {
            return { data: { torneos: [] } };
          })
        ]);

        setEstadisticas(statsRes.data?.estadisticas || {
          partidosJugados: 0,
          tries: 0,
          minutosJugados: 0,
          rating: 0
        });
        
        // Cargar datos completos de los partidos próximos
        
        const partidosConEquipos = await Promise.all((proximosRes.data || []).map(async (partido) => {
          try {
            // Si el partido está en curso o pausado, cargar datos completos desde el endpoint live
            if (partido.estado === 'En Curso' || partido.estado === 'pausado') {
              try {
                const liveRes = await api.get(`/partidos/${partido.id}/live`).catch(() => null);
                if (liveRes?.data) {
                  partido = { ...partido, ...liveRes.data };
                }
                
                // Cargar datos completos del partido para obtener tiempo.inicio (igual que GestionPartido)
                try {
                  const partidoCompletoRes = await api.get(`/partidos/${partido.id}`).catch(() => null);
                  if (partidoCompletoRes?.data) {
                    // Obtener tiempo de inicio del partido
                    const tiempoInicioPartido = partidoCompletoRes.data.tiempo?.inicio;
                    if (tiempoInicioPartido) {
                      // Convertir tiempo de inicio a timestamp (igual que GestionPartido)
                      let inicioTimestamp = null;
                      if (tiempoInicioPartido?.toMillis) {
                        inicioTimestamp = tiempoInicioPartido.toMillis();
                      } else if (tiempoInicioPartido?.seconds) {
                        inicioTimestamp = tiempoInicioPartido.seconds * 1000;
                      } else {
                        inicioTimestamp = new Date(tiempoInicioPartido).getTime();
                      }
                      
                      if (!isNaN(inicioTimestamp) && inicioTimestamp > 0) {
                        partido.tiempoInicioTimestamp = inicioTimestamp;
                      }
                    }
                    // También actualizar con datos del partido completo
                    partido = { ...partido, ...partidoCompletoRes.data };
                  }
                } catch (e) {
                  // Error al cargar tiempo de inicio
                }
              } catch (e) {
                // Error al cargar datos live
              }
            }
            
            // Solo hacer peticiones si los IDs existen y no son null
            const equipoLocalPromise = partido.equipoLocalId && partido.equipoLocalId !== 'null' 
              ? api.get(`/equipos/${partido.equipoLocalId}`).catch(() => ({ data: null }))
              : Promise.resolve({ data: null });
              
            const equipoVisitantePromise = partido.equipoVisitanteId && partido.equipoVisitanteId !== 'null'
              ? api.get(`/equipos/${partido.equipoVisitanteId}`).catch(() => ({ data: null }))
              : Promise.resolve({ data: null });
            
            const [equipoLocalRes, equipoVisitanteRes] = await Promise.all([
              equipoLocalPromise,
              equipoVisitantePromise
            ]);
            
            return {
              ...partido,
              equipoLocal: equipoLocalRes.data,
              equipoVisitante: equipoVisitanteRes.data
            };
          } catch (error) {
            return partido;
          }
        }));
        
        setProximosPartidos(partidosConEquipos);
        setTorneosDisponibles(torneosRes.data?.torneos || torneosRes.data || []);
        
      } else if (rolePermissions.isArbitro) {
        // Cargar datos específicos de árbitro
        const userId = userProfile?.uid || userProfile?.id;
        const [statsRes, proximosRes, torneosRes] = await Promise.all([
          api.get(`/arbitros/perfil/${userId}`).catch((err) => {
            return { data: null };
          }),
          api.get('/partidos/proximos').catch((err) => {
            return { data: [] };
          }),
          api.get('/torneos').catch((err) => {
            return { data: { torneos: [] } };
          })
        ]);

        setEstadisticas(statsRes.data?.estadisticas || {
          partidosArbitrados: 0,
          partidosCompletados: 0,
          tarjetasAmarillas: 0,
          tarjetasRojas: 0
        });
        
        // Cargar datos completos de los partidos próximos
        const partidosConEquipos = await Promise.all((proximosRes.data || []).map(async (partido) => {
          try {
            // Si el partido está en curso o pausado, cargar datos completos desde el endpoint live
            if (partido.estado === 'En Curso' || partido.estado === 'pausado') {
              try {
                const liveRes = await api.get(`/partidos/${partido.id}/live`).catch(() => null);
                if (liveRes?.data) {
                  partido = { ...partido, ...liveRes.data };
                }
                
                // Cargar datos completos del partido para obtener tiempo.inicio (igual que GestionPartido)
                try {
                  const partidoCompletoRes = await api.get(`/partidos/${partido.id}`).catch(() => null);
                  if (partidoCompletoRes?.data) {
                    // Obtener tiempo de inicio del partido
                    const tiempoInicioPartido = partidoCompletoRes.data.tiempo?.inicio;
                    if (tiempoInicioPartido) {
                      // Convertir tiempo de inicio a timestamp (igual que GestionPartido)
                      let inicioTimestamp = null;
                      if (tiempoInicioPartido?.toMillis) {
                        inicioTimestamp = tiempoInicioPartido.toMillis();
                      } else if (tiempoInicioPartido?.seconds) {
                        inicioTimestamp = tiempoInicioPartido.seconds * 1000;
                      } else {
                        inicioTimestamp = new Date(tiempoInicioPartido).getTime();
                      }
                      
                      if (!isNaN(inicioTimestamp) && inicioTimestamp > 0) {
                        partido.tiempoInicioTimestamp = inicioTimestamp;
                      }
                    }
                    // También actualizar con datos del partido completo
                    partido = { ...partido, ...partidoCompletoRes.data };
                  }
                } catch (e) {
                  // Error al cargar tiempo de inicio
                }
              } catch (e) {
                // Error al cargar datos live
              }
            }
            
            // Solo hacer peticiones si los IDs existen y no son null
            const equipoLocalPromise = partido.equipoLocalId && partido.equipoLocalId !== 'null' 
              ? api.get(`/equipos/${partido.equipoLocalId}`).catch(() => ({ data: null }))
              : Promise.resolve({ data: null });
              
            const equipoVisitantePromise = partido.equipoVisitanteId && partido.equipoVisitanteId !== 'null'
              ? api.get(`/equipos/${partido.equipoVisitanteId}`).catch(() => ({ data: null }))
              : Promise.resolve({ data: null });
            
            const [equipoLocalRes, equipoVisitanteRes] = await Promise.all([
              equipoLocalPromise,
              equipoVisitantePromise
            ]);
            
            return {
              ...partido,
              equipoLocal: equipoLocalRes.data,
              equipoVisitante: equipoVisitanteRes.data
            };
          } catch (error) {
            return partido;
          }
        }));
        
        setProximosPartidos(partidosConEquipos);
        setTorneosDisponibles(torneosRes.data?.torneos || torneosRes.data || []);
      } else if (rolePermissions.isUsuario) {
        // Cargar datos para usuarios (solo información general)
        const [proximosRes, torneosRes] = await Promise.all([
          api.get('/partidos/proximos').catch((err) => {
            return { data: [] };
          }),
          api.get('/torneos').catch((err) => {
            return { data: { torneos: [] } };
          })
        ]);
        
        // Cargar datos completos de los partidos próximos
        const partidosConEquipos = await Promise.all((proximosRes.data || []).map(async (partido) => {
          try {
            // Si el partido está en curso o pausado, cargar datos completos desde el endpoint live
            if (partido.estado === 'En Curso' || partido.estado === 'pausado') {
              try {
                const liveRes = await api.get(`/partidos/${partido.id}/live`).catch(() => null);
                if (liveRes?.data) {
                  partido = { ...partido, ...liveRes.data };
                }
                
                // Cargar datos completos del partido para obtener tiempo.inicio (igual que GestionPartido)
                try {
                  const partidoCompletoRes = await api.get(`/partidos/${partido.id}`).catch(() => null);
                  if (partidoCompletoRes?.data) {
                    // Obtener tiempo de inicio del partido
                    const tiempoInicioPartido = partidoCompletoRes.data.tiempo?.inicio;
                    if (tiempoInicioPartido) {
                      // Convertir tiempo de inicio a timestamp (igual que GestionPartido)
                      let inicioTimestamp = null;
                      if (tiempoInicioPartido?.toMillis) {
                        inicioTimestamp = tiempoInicioPartido.toMillis();
                      } else if (tiempoInicioPartido?.seconds) {
                        inicioTimestamp = tiempoInicioPartido.seconds * 1000;
                      } else {
                        inicioTimestamp = new Date(tiempoInicioPartido).getTime();
                      }
                      
                      if (!isNaN(inicioTimestamp) && inicioTimestamp > 0) {
                        partido.tiempoInicioTimestamp = inicioTimestamp;
                      }
                    }
                    // También actualizar con datos del partido completo
                    partido = { ...partido, ...partidoCompletoRes.data };
                  }
                } catch (e) {
                  // Error al cargar tiempo de inicio
                }
              } catch (e) {
                // Error al cargar datos live
              }
            }
            
            // Solo hacer peticiones si los IDs existen y no son null
            const equipoLocalPromise = partido.equipoLocalId && partido.equipoLocalId !== 'null' 
              ? api.get(`/equipos/${partido.equipoLocalId}`).catch(() => ({ data: null }))
              : Promise.resolve({ data: null });
              
            const equipoVisitantePromise = partido.equipoVisitanteId && partido.equipoVisitanteId !== 'null'
              ? api.get(`/equipos/${partido.equipoVisitanteId}`).catch(() => ({ data: null }))
              : Promise.resolve({ data: null });
            
            const [equipoLocalRes, equipoVisitanteRes] = await Promise.all([
              equipoLocalPromise,
              equipoVisitantePromise
            ]);
            
            return {
              ...partido,
              equipoLocal: equipoLocalRes.data,
              equipoVisitante: equipoVisitanteRes.data
            };
          } catch (error) {
            return partido;
          }
        }));
        
        setProximosPartidos(partidosConEquipos);
        setTorneosDisponibles(torneosRes.data?.torneos || torneosRes.data || []);
      }
      
    } catch (error) {
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [userProfile, rolePermissions.isJugador, rolePermissions.isArbitro, rolePermissions.isUsuario]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Función para formatear tiempo
  const formatearTiempo = (segundos) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Inicializar tiempos de inicio y cronómetros cuando se cargan los partidos (igual que GestionPartido)
  useEffect(() => {
    if (proximosPartidos.length === 0) {
      return;
    }

    const nuevosTiemposInicio = { ...tiemposInicio };
    const nuevosCronometrosActivos = { ...cronometrosActivos };
    const nuevosTiemposTranscurridos = { ...tiemposTranscurridos };

    proximosPartidos.forEach(partido => {
      if ((partido.estado === 'En Curso' || partido.estado === 'pausado') && partido.id) {
        const tiempoInicioTimestamp = partido.tiempoInicioTimestamp;
        const tiempoBackend = partido.tiempoTranscurrido;

        // Si el partido está pausado, usar el tiempo guardado del backend
        if (partido.estado === 'pausado') {
          nuevosTiemposTranscurridos[partido.id] = tiempoBackend || 0;
          nuevosCronometrosActivos[partido.id] = false;
        } else if (partido.estado === 'En Curso') {
          // Si está en curso, calcular tiempo transcurrido
          if (tiempoInicioTimestamp) {
            // Calcular tiempo desde el inicio real
            const ahora = Date.now();
            const tiempoCalculado = Math.floor((ahora - tiempoInicioTimestamp) / 1000);
            nuevosTiemposTranscurridos[partido.id] = Math.max(0, tiempoCalculado);
            nuevosTiemposInicio[partido.id] = tiempoInicioTimestamp;
            nuevosCronometrosActivos[partido.id] = true;
          } else if (tiempoBackend !== undefined && tiempoBackend !== null && tiempoBackend > 0) {
            // Si no hay tiempo de inicio, usar el tiempo del backend y establecer un tiempo de inicio virtual
            const ahora = Date.now();
            const tiempoInicioVirtual = ahora - (tiempoBackend * 1000);
            nuevosTiemposInicio[partido.id] = tiempoInicioVirtual;
            nuevosTiemposTranscurridos[partido.id] = tiempoBackend;
            nuevosCronometrosActivos[partido.id] = true;
          } else {
            // Si no hay tiempo backend, inicializar desde ahora
            const ahora = Date.now();
            nuevosTiemposInicio[partido.id] = ahora;
            nuevosTiemposTranscurridos[partido.id] = 0;
            nuevosCronometrosActivos[partido.id] = true;
          }
        }
      }
    });

    setTiemposInicio(nuevosTiemposInicio);
    setCronometrosActivos(nuevosCronometrosActivos);
    setTiemposTranscurridos(nuevosTiemposTranscurridos);
  }, [proximosPartidos.map(p => `${p.id}-${p.estado}-${p.tiempoTranscurrido}-${p.tiempoInicioTimestamp}`).join(',')]);

  // Cronómetro - calcular tiempo transcurrido en tiempo real basado en tiempo de inicio (igual que GestionPartido)
  useEffect(() => {
    const partidosEnCurso = proximosPartidos.filter(p => p.estado === 'En Curso' && p.id && cronometrosActivos[p.id] && tiemposInicio[p.id]);

    if (partidosEnCurso.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setTiemposTranscurridos(prev => {
        const nuevos = { ...prev };
        partidosEnCurso.forEach(partido => {
          const inicioTimestamp = tiemposInicio[partido.id];
          if (inicioTimestamp && cronometrosActivos[partido.id]) {
            const ahora = Date.now();
            const tiempoCalculado = Math.floor((ahora - inicioTimestamp) / 1000);
            nuevos[partido.id] = Math.max(0, tiempoCalculado);
          }
        });
        return nuevos;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [proximosPartidos, tiemposInicio, cronometrosActivos]);

  // Sincronizar con backend periódicamente para asegurar precisión - Igual que GestionPartido
  useEffect(() => {
    const partidosEnCurso = proximosPartidos.filter(p => p.estado === 'En Curso' && p.id);
    
    if (partidosEnCurso.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      partidosEnCurso.forEach(async (partido) => {
        try {
          // Cargar datos completos del partido (igual que GestionPartido)
          const partidoCompletoRes = await api.get(`/partidos/${partido.id}`).catch(() => null);
          if (partidoCompletoRes?.data) {
            const tiempoInicioPartido = partidoCompletoRes.data.tiempo?.inicio;
            
            // Actualizar tiempo de inicio si existe
            if (tiempoInicioPartido) {
              let inicioTimestamp = null;
              if (tiempoInicioPartido?.toMillis) {
                inicioTimestamp = tiempoInicioPartido.toMillis();
              } else if (tiempoInicioPartido?.seconds) {
                inicioTimestamp = tiempoInicioPartido.seconds * 1000;
              } else {
                inicioTimestamp = new Date(tiempoInicioPartido).getTime();
              }
              
              if (!isNaN(inicioTimestamp) && inicioTimestamp > 0) {
                setTiemposInicio(prev => ({
                  ...prev,
                  [partido.id]: inicioTimestamp
                }));
              }
            }
            
            // Actualizar datos del partido
            let tiempoInicioTimestampCalc = null;
            if (tiempoInicioPartido) {
              if (tiempoInicioPartido?.toMillis) {
                tiempoInicioTimestampCalc = tiempoInicioPartido.toMillis();
              } else if (tiempoInicioPartido?.seconds) {
                tiempoInicioTimestampCalc = tiempoInicioPartido.seconds * 1000;
              } else {
                tiempoInicioTimestampCalc = new Date(tiempoInicioPartido).getTime();
              }
            }
            
            setProximosPartidos(prev => prev.map(p => 
              p.id === partido.id ? { ...p, ...partidoCompletoRes.data, tiempoInicioTimestamp: tiempoInicioTimestampCalc || p.tiempoInicioTimestamp } : p
            ));
          }
              } catch (e) {
                // Error actualizando partido en vivo
              }
      });
    }, 30000); // Sincronizar cada 30 segundos

    return () => clearInterval(interval);
  }, [proximosPartidos]);


  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'En Curso':
      case 'en_curso':
        return 'warning';
      case 'pendiente':
        return 'info';
      case 'finalizado':
        return 'success';
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEstadoText = (estado) => {
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
        return estado || 'Activo';
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ 
            p: 2, 
            borderRadius: 2, 
            bgcolor: `${color}.light`,
            color: `${color}.main`
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Componente para partidos en vivo - Copia exacta del CSS de DetallePartido.tsx
  const LivePartidoCard = ({ partido, compacta = false }) => {
    // Obtener tiempo actual: usar el mismo sistema que GestionPartido
    const tiempoActual = tiemposTranscurridos[partido.id] ?? partido.tiempoTranscurrido ?? 0;
    
    const resultado = partido.resultado || {};
    
    return (
      <Card sx={{ 
        bgcolor: darkMode ? '#2a2a2a' : 'white',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <CardContent sx={{ p: compacta ? 1.75 : 2.5 }}>
          {/* Header del partido */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: compacta ? 1.5 : 2 }}>
            <EmojiEvents sx={{ color: '#3F8CFF', mr: compacta ? 1 : 1, fontSize: compacta ? 20 : 24 }} />
            <Typography variant={compacta ? "body1" : "h6"} sx={{ 
              color: darkMode ? '#e0e0e0' : '#424242',
              fontWeight: 'bold',
              fontSize: compacta ? '1rem' : undefined
            }}>
              {partido.torneoNombre || partido.tipo || 'Partido'}
            </Typography>
          </Box>
          
          <Typography variant={compacta ? "body2" : "body2"} sx={{ 
            color: darkMode ? '#b0b0b0' : '#757575',
            mb: compacta ? 2 : 3,
            fontSize: compacta ? '0.85rem' : undefined
          }}>
            Partido en Vivo
          </Typography>

          {/* Equipos y resultado */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: compacta ? 2 : 3 }}>
            {/* Equipo Local */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              {typeof partido.equipoLocal === 'object' && partido.equipoLocalLogo ? (
                <Box sx={{
                  width: compacta ? 55 : 80,
                  height: compacta ? 55 : 80,
                  borderRadius: compacta ? 1.5 : 2,
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: compacta ? 0.75 : 1,
                  overflow: 'hidden',
                  border: compacta ? '1.5px solid' : '2px solid',
                  borderColor: '#3F8CFF'
                }}>
                  <img 
                    src={construirUrlImagen(partido.equipoLocalLogo)} 
                    alt={typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre : partido.equipoLocal}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      backgroundColor: 'white',
                      padding: compacta ? '3px' : '4px'
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{
                  width: compacta ? 55 : 80,
                  height: compacta ? 55 : 80,
                  borderRadius: compacta ? 1.5 : 2,
                  bgcolor: darkMode ? '#404040' : '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: compacta ? 0.75 : 1,
                  border: compacta ? '1.5px solid #3F8CFF' : '2px solid #3F8CFF'
                }}>
                  <Typography variant={compacta ? "h6" : "h5"} sx={{ 
                    fontWeight: 'bold', 
                    color: darkMode ? '#e0e0e0' : '#424242',
                    fontSize: compacta ? '1.1rem' : undefined
                  }}>
                    {typeof partido.equipoLocal === 'object' ? 
                      (partido.equipoLocal?.nombre || 'L').charAt(0) : 
                      (partido.equipoLocal || 'L').charAt(0)}
                  </Typography>
                </Box>
              )}
              <Typography variant={compacta ? "body2" : "body2"} sx={{ 
                color: darkMode ? '#e0e0e0' : '#424242',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: compacta ? '0.85rem' : undefined
              }}>
                {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Equipo Local' : partido.equipoLocal || 'Equipo Local'}
              </Typography>
            </Box>

            {/* Resultado */}
            <Box sx={{ mx: compacta ? 2 : 3 }}>
              <Typography variant={compacta ? "h4" : "h3"} sx={{ 
                color: darkMode ? '#e0e0e0' : '#424242',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: compacta ? '1.75rem' : undefined
              }}>
                {resultado.puntosLocal || 0} - {resultado.puntosVisitante || 0}
              </Typography>
            </Box>

            {/* Equipo Visitante */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              {typeof partido.equipoVisitante === 'object' && partido.equipoVisitanteLogo ? (
                <Box sx={{
                  width: compacta ? 55 : 80,
                  height: compacta ? 55 : 80,
                  borderRadius: compacta ? 1.5 : 2,
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: compacta ? 0.75 : 1,
                  overflow: 'hidden',
                  border: compacta ? '1.5px solid' : '2px solid',
                  borderColor: darkMode ? '#404040' : '#e0e0e0'
                }}>
                  <img 
                    src={construirUrlImagen(partido.equipoVisitanteLogo)} 
                    alt={typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre : partido.equipoVisitante}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      backgroundColor: 'white',
                      padding: compacta ? '3px' : '4px'
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{
                  width: compacta ? 55 : 80,
                  height: compacta ? 55 : 80,
                  borderRadius: compacta ? 1.5 : 2,
                  bgcolor: darkMode ? '#404040' : '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: compacta ? 0.75 : 1,
                  border: compacta ? (darkMode ? '1.5px solid white' : '1.5px solid #e0e0e0') : (darkMode ? '2px solid white' : '2px solid #e0e0e0')
                }}>
                  <Typography variant={compacta ? "h6" : "h5"} sx={{ 
                    fontWeight: 'bold', 
                    color: darkMode ? '#e0e0e0' : '#424242',
                    fontSize: compacta ? '1.1rem' : undefined
                  }}>
                    {typeof partido.equipoVisitante === 'object' ? 
                      (partido.equipoVisitante?.nombre || 'V').charAt(0) : 
                      (partido.equipoVisitante || 'V').charAt(0)}
                  </Typography>
                </Box>
              )}
              <Typography variant={compacta ? "body2" : "body2"} sx={{ 
                color: darkMode ? '#e0e0e0' : '#424242',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: compacta ? '0.85rem' : undefined
              }}>
                {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Equipo Visitante' : partido.equipoVisitante || 'Equipo Visitante'}
              </Typography>
            </Box>
          </Box>

          {/* Estado del partido y cronómetro */}
          <Box sx={{ textAlign: 'center', px: compacta ? 2 : 3 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: compacta ? 0.75 : 1,
                bgcolor: '#FF9800',
                px: compacta ? 1.25 : 2,
                py: compacta ? 0.6 : 1,
                borderRadius: compacta ? 1.5 : 2,
                fontWeight: 700,
                fontSize: compacta ? '0.8rem' : '0.9rem',
                minHeight: compacta ? 28 : 36
              }}
            >
              <TrendingUp sx={{ color: '#000000', fontSize: compacta ? '0.8rem' : '0.9rem' }} />
              <Typography sx={{ color: '#000000', fontWeight: 700, fontSize: compacta ? '0.8rem' : '0.9rem' }}>
                {partido?.estado === 'En Curso' ? 'PRIMER TIEMPO' : partido?.estado === 'pausado' ? 'PAUSADO' : (partido?.estado || 'PROGRAMADO').toUpperCase()}{(partido?.estado === 'En Curso' || partido?.estado === 'pausado') ? ` - ${formatearTiempo(tiempoActual)}` : ''}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const PartidoCard = ({ partido }) => (
    <Card 
      sx={{ 
        mb: 1.5,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: 2,
        border: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        {/* Header con estado */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
          <Chip 
            label={partido.estado || 'Programado'} 
            color={
              partido.estado === 'En Curso' ? 'success' : 
              partido.estado === 'pausado' ? 'warning' : 
              'default'
            }
            size="small"
            sx={{ 
              fontWeight: 600,
              fontSize: '0.65rem',
              height: 20
            }}
          />
        </Box>
        
        {/* Equipos con logos */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          {/* Equipo Local */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: 2, 
              backgroundColor: typeof partido.equipoLocal === 'object' && partido.equipoLocal?.logo ? 'white' : 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
              boxShadow: 3,
              overflow: 'hidden',
              border: '2px solid',
              borderColor: typeof partido.equipoLocal === 'object' && partido.equipoLocal?.logo ? 'divider' : 'grey.400'
            }}>
              {typeof partido.equipoLocal === 'object' && partido.equipoLocal?.logo ? (
                <img 
                  src={construirUrlImagen(partido.equipoLocal.logo)} 
                  alt={partido.equipoLocal.nombre}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    backgroundColor: 'white',
                    padding: '4px'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <Typography variant="h4" sx={{ 
                color: typeof partido.equipoLocal === 'object' && partido.equipoLocal?.logo ? 'text.primary' : 'grey.600', 
                fontWeight: 'bold', 
                fontSize: '1.5rem',
                display: typeof partido.equipoLocal === 'object' && partido.equipoLocal?.logo ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {typeof partido.equipoLocal === 'object' ? 
                  (partido.equipoLocal?.nombre || 'L').charAt(0) : 
                  (partido.equipoLocal || 'L').charAt(0)}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ 
              textAlign: 'center', 
              fontWeight: 600,
              fontSize: '0.8rem',
              maxWidth: 90,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {typeof partido.equipoLocal === 'object' ? partido.equipoLocal?.nombre || 'Equipo Local' : partido.equipoLocal || 'Equipo Local'}
            </Typography>
          </Box>

          {/* VS */}
          <Typography variant="h5" sx={{ 
            color: 'primary.main', 
            fontWeight: 'bold',
            mx: 2,
            fontSize: '1.2rem'
          }}>
            VS
          </Typography>

          {/* Equipo Visitante */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: 2, 
              backgroundColor: typeof partido.equipoVisitante === 'object' && partido.equipoVisitante?.logo ? 'white' : 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
              boxShadow: 3,
              overflow: 'hidden',
              border: '2px solid',
              borderColor: typeof partido.equipoVisitante === 'object' && partido.equipoVisitante?.logo ? 'divider' : 'grey.400'
            }}>
              {typeof partido.equipoVisitante === 'object' && partido.equipoVisitante?.logo ? (
                <img 
                  src={construirUrlImagen(partido.equipoVisitante.logo)} 
                  alt={partido.equipoVisitante.nombre}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    backgroundColor: 'white',
                    padding: '4px'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <Typography variant="h4" sx={{ 
                color: typeof partido.equipoVisitante === 'object' && partido.equipoVisitante?.logo ? 'text.primary' : 'grey.600', 
                fontWeight: 'bold', 
                fontSize: '1.2rem',
                display: typeof partido.equipoVisitante === 'object' && partido.equipoVisitante?.logo ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {typeof partido.equipoVisitante === 'object' ? 
                  (partido.equipoVisitante?.nombre || 'V').charAt(0) : 
                  (partido.equipoVisitante || 'V').charAt(0)}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ 
              textAlign: 'center', 
              fontWeight: 600,
              fontSize: '0.8rem',
              maxWidth: 90,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {typeof partido.equipoVisitante === 'object' ? partido.equipoVisitante?.nombre || 'Equipo Visitante' : partido.equipoVisitante || 'Equipo Visitante'}
            </Typography>
          </Box>
        </Box>
        
        {/* Información del partido */}
        <Box sx={{ mb: 1.5 }}>
          <Grid container spacing={1}>
            {/* Fecha y Hora */}
            <Grid item xs={6}>
              <Box sx={{ 
                p: 1.5,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    p: 0.5, 
                    borderRadius: '50%', 
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 1,
                    width: 24,
                    height: 24
                  }}>
                    <CalendarToday sx={{ fontSize: 14, color: 'white' }} />
                  </Box>
                  <Typography variant="caption" sx={{ 
                    color: 'text.primary', 
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    FECHA Y HORA
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ 
                    color: 'text.primary', 
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    mb: 0.5
                  }}>
                    {new Date(partido.fecha).toLocaleDateString('es-ES')}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.7rem'
                  }}>
                    {partido.hora || 'Hora no especificada'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            {/* Cancha */}
            <Grid item xs={6}>
              <Box sx={{ 
                p: 1.5,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    p: 0.5, 
                    borderRadius: '50%', 
                    backgroundColor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 1,
                    width: 24,
                    height: 24
                  }}>
                    <SportsRugby sx={{ fontSize: 14, color: 'white' }} />
                  </Box>
                  <Typography variant="caption" sx={{ 
                    color: 'text.primary', 
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    CANCHA O UBICACIÓN 
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ 
                    color: 'text.primary', 
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    mb: 0.5
                  }}>
                    {typeof partido.cancha === 'object' ? partido.cancha?.nombre || 'Por asignar' : partido.cancha || 'Por asignar'}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.7rem'
                  }}>
                    Campo de juego
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Botón de acción */}
        <Button 
          variant="contained" 
          size="small"
          fullWidth
          onClick={() => navigate(`/partidos/${partido.id}`)}
          endIcon={<Visibility />}
          sx={{ 
            borderRadius: 1.5,
            py: 0.5,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.75rem',
            boxShadow: 1,
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: 2
            }
          }}
        >
          Ver Detalles
        </Button>
      </CardContent>
    </Card>
  );

  const TorneoCard = ({ torneo }) => (
    <BaseCard>
      <CardContent sx={{ flexGrow: 1, p: 2, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography 
            variant="h6" 
            component="h2" 
            sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2
            }}
          >
            {torneo.nombre}
          </Typography>
          <Chip
            label={getEstadoText(torneo.estado)}
            color={getEstadoColor(torneo.estado)}
            size="small"
            sx={{ 
              fontWeight: 600,
              boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              '& .MuiChip-label': {
                fontSize: '0.7rem',
                fontWeight: 600
              }
            }}
          />
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1.25,
          p: 1.25,
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'action.hover',
            transform: 'translateX(4px)'
          }
        }}>
          <Box sx={{ 
            p: 0.75, 
            borderRadius: '50%', 
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1.25,
            boxShadow: 1
          }}>
            <SportsRugby sx={{ fontSize: 16, color: 'white' }} />
          </Box>
          <Typography variant="body2" sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            fontSize: '0.8rem'
          }}>
            {asText(torneo.categoria)}
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1.25,
          p: 1.25,
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'action.hover',
            transform: 'translateX(4px)'
          }
        }}>
          <Box sx={{ 
            p: 0.75, 
            borderRadius: '50%', 
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1.25,
            boxShadow: 1
          }}>
            <Schedule sx={{ fontSize: 16, color: 'white' }} />
          </Box>
          <Typography variant="body2" sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            fontSize: '0.8rem'
          }}>
            {torneo.fechaInicioFormatted || new Date(torneo.fechaInicio).toLocaleDateString()} - {torneo.fechaFinFormatted || new Date(torneo.fechaFin).toLocaleDateString()}
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          p: 1.25,
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'action.hover',
            transform: 'translateX(4px)'
          }
        }}>
          <Box sx={{ 
            p: 0.75, 
            borderRadius: '50%', 
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1.25,
            boxShadow: 1
          }}>
            <People sx={{ fontSize: 16, color: 'white' }} />
          </Box>
          <Typography variant="body2" sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            fontSize: '0.8rem'
          }}>
            Organizador: {torneo.organizadorNombre || (torneo.organizador && (torneo.organizador.nombre || torneo.organizador.id)) || 'Sistema'}
          </Typography>
        </Box>
      </CardContent>
      
      <Box sx={{ 
        p: 2, 
        pt: 0.5, 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <BaseButton
          variant="contained"
          onClick={() => navigate(`/torneos/${torneo.id}`)}
          sx={{ 
            minWidth: 'auto',
            borderRadius: 1.5,
            px: 2,
            py: 0.75,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.8rem',
            boxShadow: 1,
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: 2
            }
          }}
        >
          Ver Detalles
        </BaseButton>
      </Box>
    </BaseCard>
  );

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="lg" 
      disableGutters
      sx={{ 
        py: { xs: 2, sm: 4 }, 
        pb: { xs: 12, md: 10 }, 
        px: { xs: 2, sm: 2, md: 3 }, 
        overflow: 'hidden',
        maxWidth: '100%',
        width: '100%'
      }}
    >
      {/* Header Premium con foto blur */}
      <Box
        sx={{
          position: 'relative',
          mb: 4,
          p: 4,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          minHeight: 200
        }}
      >
        {/* Fondo con foto blur */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: userProfile?.foto 
              ? `url(${construirUrlImagen(userProfile.foto)})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(25px) brightness(0.85)',
            transform: 'scale(1.1)',
            transition: 'all 0.5s ease',
            zIndex: 0
          }}
        />
        
        {/* Overlay oscuro para mejor legibilidad */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(102, 126, 234, 0.15) 100%)',
            zIndex: 0
          }}
        />
        
        {/* Efectos de luz */}
        <Box
          sx={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '40%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
            transform: 'rotate(-15deg)',
            zIndex: 0
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-30%',
            left: '-5%',
            width: '30%',
            height: '150%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            transform: 'rotate(25deg)',
            zIndex: 0
          }}
        />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            {userProfile?.foto && (
              <Box
                component="img"
                src={construirUrlImagen(userProfile.foto)}
                alt={userProfile?.nombre}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  border: '4px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  objectFit: 'cover'
                }}
              />
            )}
            <Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800,
                  color: 'white',
                  textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                  mb: 1
                }}
              >
                ¡Hola, {userProfile?.nombre}! 👋
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'rgba(255,255,255,0.95)',
                  fontWeight: 500,
                  fontSize: { xs: '0.95rem', sm: '1.1rem' }
                }}
              >
                {rolePermissions.isJugador && `${userProfile?.posicion || 'Jugador'} - ${userProfile?.equipoNombre || 'Sin equipo'}`}
                {rolePermissions.isArbitro && `Árbitro`}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Estadísticas y Próximo Partido - Layout dividido equitativo */}
      {rolePermissions.isJugador && (
        <Grid container spacing={2} sx={{ mb: 4, width: '100%', mx: 0 }}>
          {/* Izquierda: Estadísticas (50%) */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              height: '100%',
              bgcolor: darkMode ? '#2a2a2a' : 'white',
              borderRadius: 3,
              overflow: 'hidden'
            }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ 
                  mb: 2, 
                  fontWeight: 'bold',
                  color: darkMode ? '#e0e0e0' : '#424242'
                }}>
                  Mi Estadística
                </Typography>
                <Grid container spacing={1.5} sx={{ flexGrow: 1 }}>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      p: 1.5, 
                      bgcolor: darkMode ? '#404040' : '#f0f0f0', 
                      borderRadius: 1 
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ p: 0.75, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <SportsRugby sx={{ fontSize: 18, color: 'white' }} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>Partidos</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: darkMode ? '#e0e0e0' : '#424242' }}>{estadisticas?.partidosJugados || 0}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      p: 1.5, 
                      bgcolor: darkMode ? '#404040' : '#f0f0f0', 
                      borderRadius: 1 
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ p: 0.75, borderRadius: '50%', bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Star sx={{ fontSize: 18, color: 'white' }} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>Tries</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: darkMode ? '#e0e0e0' : '#424242' }}>{estadisticas?.tries || 0}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      p: 1.5, 
                      bgcolor: darkMode ? '#404040' : '#f0f0f0', 
                      borderRadius: 1 
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ p: 0.75, borderRadius: '50%', bgcolor: 'info.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Timer sx={{ fontSize: 18, color: 'white' }} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>Minutos</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: darkMode ? '#e0e0e0' : '#424242' }}>{estadisticas?.minutosJugados || 0}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      p: 1.5, 
                      bgcolor: darkMode ? '#404040' : '#f0f0f0', 
                      borderRadius: 1 
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ p: 0.75, borderRadius: '50%', bgcolor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Star sx={{ fontSize: 18, color: 'white' }} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#757575' }}>Rating</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: darkMode ? '#e0e0e0' : '#424242' }}>{estadisticas?.rating?.toFixed(1) || '0.0'}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Derecha: Próximo Partido (50%) */}
          <Grid item xs={12} md={6}>
            <Box>
              {proximosPartidos.length > 0 ? (
                (proximosPartidos[0].estado === 'En Curso' || proximosPartidos[0].estado === 'pausado') ? (
                  <LivePartidoCard partido={proximosPartidos[0]} />
                ) : (
                  <PartidoCard partido={proximosPartidos[0]} />
                )
              ) : (
                <Alert severity="info">
                  No hay partidos programados próximamente
                </Alert>
              )}
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Estadísticas para Árbitro - 4 cards horizontales */}
      {rolePermissions.isArbitro && (
        <Grid container spacing={3} sx={{ mb: 4, width: '100%', mx: 0, justifyContent: 'center' }}>
          <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                width: '100%',
                maxWidth: { xs: '400px', sm: '100%' },
                '&:hover': {
                  boxShadow: 2,
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Gavel sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h3" fontWeight="bold" color="primary.main">
                    {estadisticas?.partidosArbitrados || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Partidos Arbitrados
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                width: '100%',
                maxWidth: { xs: '400px', sm: '100%' },
                '&:hover': {
                  boxShadow: 2,
                  borderColor: 'success.main'
                }
              }}
            >
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Schedule sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    {estadisticas?.partidosCompletados || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completados
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                width: '100%',
                maxWidth: { xs: '400px', sm: '100%' },
                '&:hover': {
                  boxShadow: 2,
                  borderColor: 'warning.main'
                }
              }}
            >
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <EmojiEvents sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h3" fontWeight="bold" color="warning.main">
                    {estadisticas?.tarjetasAmarillas || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tarjetas Amarillas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                width: '100%',
                maxWidth: { xs: '400px', sm: '100%' },
                '&:hover': {
                  boxShadow: 2,
                  borderColor: 'error.main'
                }
              }}
            >
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <TrendingUp sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                  <Typography variant="h3" fontWeight="bold" color="error.main">
                    {estadisticas?.tarjetasRojas || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tarjetas Rojas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Próximo Partido para Usuario */}
      {rolePermissions.isUsuario && (
        <Box sx={{ mb: 4 }}>
          {proximosPartidos.length > 0 ? (
            (proximosPartidos[0].estado === 'En Curso' || proximosPartidos[0].estado === 'pausado') ? (
              <Box sx={{ 
                width: { xs: '100%', sm: '100%', md: '50%' }
              }}>
                <LivePartidoCard partido={proximosPartidos[0]} compacta={true} />
              </Box>
            ) : (
              <Box sx={{ 
                width: { xs: '100%', sm: '100%', md: '50%' }
              }}>
                <PartidoCard partido={proximosPartidos[0]} />
              </Box>
            )
          ) : (
            <Alert severity="info">
              No hay partidos programados próximamente
            </Alert>
          )}
        </Box>
      )}

      {/* Sección principal: Torneos Disponibles */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          justifyContent: { xs: 'center', sm: 'flex-start' }
        }}>
          <EmojiEvents sx={{ mr: 1 }} color="primary" />
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            Torneos Disponibles
          </Typography>
        </Box>
        
        {torneosDisponibles.length > 0 ? (
          <>
            <Grid container spacing={2.5} sx={{ width: '100%', mx: 0 }}>
              {torneosDisponibles.slice(0, 9).map((torneo) => (
                <Grid item xs={12} sm={6} md={4} key={torneo.id}>
                  <TorneoCard torneo={torneo} />
                </Grid>
              ))}
            </Grid>
            {torneosDisponibles.length > 9 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <BaseButton
                  variant="outlined"
                  onClick={() => navigate('/torneos')}
                  startIcon={<EmojiEvents />}
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  Ver más torneos
                </BaseButton>
              </Box>
            )}
          </>
        ) : (
          <Alert severity="info">
            No hay torneos disponibles en este momento
          </Alert>
        )}
      </Box>

    </Container>
  );
};

export default DashboardJugadorArbitro;
