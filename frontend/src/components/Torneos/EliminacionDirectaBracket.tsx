import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  EmojiEvents,
  SportsRugby,
  TrendingUp,
  Edit,
  Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Equipo {
  id: string;
  nombre: string;
  logo?: string;
  esBye?: boolean;
}

interface Llave {
  numero: number;
  equipo1: Equipo | null;
  equipo2: Equipo | null;
  ganador: Equipo | null;
  partidoId: string | null;
  partido?: {
    id: string;
    estado: string;
    resultado?: {
      puntosLocal: number;
      puntosVisitante: number;
    };
    fecha?: string;
    horaInicio?: string;
  };
}

interface Fase {
  numero: number;
  nombre: string;
  equiposEnFase: number;
  partidosPorFase: number;
  llaves: Llave[];
}

interface EstructuraEliminacion {
  fases: Fase[];
  llaves: Llave[];
  faseActual: number;
  equiposPorLlave: number;
  totalFases: number;
}

interface EliminacionDirectaBracketProps {
  estructuraEliminacion: EstructuraEliminacion;
  torneoNombre: string;
  campeon?: Equipo;
  subcampeon?: Equipo;
  partidos?: Array<{
    id: string;
    estado: string;
    resultado?: {
      puntosLocal: number;
      puntosVisitante: number;
    };
    fecha?: string;
    horaInicio?: string;
  }>;
  onEditPartido?: (partidoId: string) => void;
  canEdit?: boolean;
}

const EliminacionDirectaBracket: React.FC<EliminacionDirectaBracketProps> = ({
  estructuraEliminacion,
  torneoNombre,
  campeon,
  subcampeon,
  partidos = [],
  onEditPartido,
  canEdit = false
}) => {
  const navigate = useNavigate();
  
  // Función para obtener los datos del partido
  const getPartidoData = (partidoId: string | null) => {
    if (!partidoId || !partidos) return null;
    return partidos.find(p => p.id === partidoId) || null;
  };
  
  const getFaseColor = (fase: Fase) => {
    if (fase.nombre === 'Final') return 'error';
    if (fase.nombre === 'Semifinales') return 'warning';
    if (fase.nombre === 'Cuartos de Final') return 'info';
    if (fase.nombre === 'Octavos de Final') return 'secondary';
    return 'default';
  };

  const getFaseIcon = (fase: Fase) => {
    if (fase.nombre === 'Final') return <EmojiEvents />;
    if (fase.nombre === 'Semifinales') return <TrendingUp />;
    return <SportsRugby />;
  };

  const renderEquipo = (equipo: Equipo | null, esGanador: boolean = false) => {
    if (!equipo) return <Typography variant="body2" color="text.secondary">TBD</Typography>;
    
    if (equipo.esBye) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Descanso
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {equipo.logo && (
          <Box
            component="img"
            src={equipo.logo}
            alt={equipo.nombre}
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        )}
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: esGanador ? 'bold' : 'normal',
            color: esGanador ? 'primary.main' : 'text.primary'
          }}
        >
          {equipo.nombre}
        </Typography>
        {esGanador && <Chip label="Ganador" size="small" color="primary" />}
      </Box>
    );
  };

  const renderLlave = (llave: Llave, fase: Fase) => {
    const esFinal = fase.nombre === 'Final';
    const esGanador1 = llave.ganador?.id === llave.equipo1?.id;
    const esGanador2 = llave.ganador?.id === llave.equipo2?.id;
    const esFaseFutura = !llave.equipo1 || !llave.equipo2;
    const tienePartido = llave.partidoId && !esFaseFutura;
    
    // Obtener datos del partido
    const partidoData = getPartidoData(llave.partidoId);
    const llaveConPartido = { ...llave, partido: partidoData };

    const handleClick = () => {
      if (tienePartido) {
        navigate(`/partidos/${llave.partidoId}`);
      }
    };

    return (
      <Card 
        key={llave.numero} 
        variant="outlined" 
        sx={{ 
          mb: 2,
          borderRadius: 2,
          bgcolor: '#1B5E20', // Verde oscuro como en la imagen
          border: 'none',
          opacity: esFaseFutura ? 0.6 : 1,
          cursor: tienePartido ? 'pointer' : 'default',
          transition: 'all 0.2s ease-in-out',
          minHeight: '120px',
          '&:hover': tienePartido ? {
            transform: 'translateY(-2px)',
            boxShadow: 4,
            bgcolor: '#2E7D32'
          } : {}
        }}
        onClick={handleClick}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Equipo 1 */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 1,
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {llave.equipo1?.logo && (
                <Box
                  component="img"
                  src={llave.equipo1.logo}
                  alt={llave.equipo1.nombre}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    objectFit: 'contain'
                  }}
                />
              )}
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}
              >
                {llave.equipo1?.nombre || 'TBD'}
              </Typography>
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              {llaveConPartido.partido?.estado === 'finalizado' && llaveConPartido.partido?.resultado 
                ? llaveConPartido.partido.resultado.puntosLocal 
                : '0'}
            </Typography>
          </Box>

          {/* Indicador Global/VS */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            my: 1
          }}>
            {llaveConPartido.partido?.estado === 'finalizado' && llaveConPartido.partido?.resultado ? (
              <Chip 
                label="Global" 
                size="small" 
                sx={{ 
                  bgcolor: '#4CAF50',
                  color: 'white',
                  fontSize: '0.75rem',
                  height: '24px',
                  borderRadius: '12px'
                }}
              />
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#B0BEC5',
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}
              >
                VS
              </Typography>
            )}
          </Box>

          {/* Equipo 2 */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {llave.equipo2?.logo && (
                <Box
                  component="img"
                  src={llave.equipo2.logo}
                  alt={llave.equipo2.nombre}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    objectFit: 'contain'
                  }}
                />
              )}
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#FFD700', // Amarillo como en la imagen
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}
              >
                {llave.equipo2?.nombre || 'TBD'}
              </Typography>
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#FFD700', // Amarillo como en la imagen
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              {llaveConPartido.partido?.estado === 'finalizado' && llaveConPartido.partido?.resultado 
                ? llaveConPartido.partido.resultado.puntosVisitante 
                : '0'}
            </Typography>
          </Box>

          {/* Información adicional (solo si hay partido) */}
          {llave.partidoId && (
            <Box sx={{ 
              mt: 1.5, 
              pt: 1, 
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {llaveConPartido.partido && (
                  <Chip 
                    label={llaveConPartido.partido.estado} 
                    size="small" 
                    color={llaveConPartido.partido.estado === 'finalizado' ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.7rem', 
                      height: '20px',
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.3)'
                    }}
                  />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {tienePartido && (
                  <Tooltip title="Ver Partido">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/partidos/${llave.partidoId}`);
                      }}
                      sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': { color: 'white' }
                      }}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                {canEdit && onEditPartido && (
                  <Tooltip title="Editar Partido">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPartido(llave.partidoId!);
                      }}
                      sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': { color: '#FFD700' }
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          )}

          {/* Mensaje para fases futuras */}
          {esFaseFutura && (
            <Typography 
              variant="caption" 
              sx={{ 
                mt: 1, 
                display: 'block', 
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
                fontSize: '0.75rem'
              }}
            >
              Se llenará cuando se progrese la fase anterior
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderFase = (fase: Fase) => {
    const esFaseActual = estructuraEliminacion.fases.indexOf(fase) === estructuraEliminacion.faseActual;
    const esFaseCompletada = estructuraEliminacion.fases.indexOf(fase) < estructuraEliminacion.faseActual;

    return (
      <Grid item xs={12} md={6} lg={4} key={fase.numero}>
        <Card 
          variant="outlined"
          sx={{ 
            height: '100%',
            border: esFaseActual ? 2 : 1,
            borderColor: esFaseActual ? 'primary.main' : 'divider'
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {getFaseIcon(fase)}
              <Typography variant="h6" component="h3">
                {fase.nombre}
              </Typography>
              <Chip 
                label={esFaseActual ? 'Actual' : esFaseCompletada ? 'Completada' : 'Pendiente'}
                size="small"
                color={getFaseColor(fase)}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              {fase.partidosPorFase} partido{fase.partidosPorFase !== 1 ? 's' : ''}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {fase.llaves.map(llave => renderLlave(llave, fase))}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmojiEvents color="primary" />
        {torneoNombre}
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Torneo de Eliminación Directa
      </Typography>

      {/* Información del torneo */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Equipos por llave:</strong> {estructuraEliminacion.equiposPorLlave}<br/>
          <strong>Total de fases:</strong> {estructuraEliminacion.totalFases}<br/>
          <strong>Fase actual:</strong> {estructuraEliminacion.fases[estructuraEliminacion.faseActual]?.nombre || 'N/A'}
        </Typography>
      </Alert>

      {/* Clasificación final si el torneo está terminado */}
      {(campeon || subcampeon) && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🏆 Clasificación Final
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {campeon && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="🥇 Campeón" color="primary" />
                <Typography variant="body1" fontWeight="bold">
                  {campeon.nombre}
                </Typography>
              </Box>
            )}
            {subcampeon && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="🥈 Subcampeón" color="secondary" />
                <Typography variant="body1">
                  {subcampeon.nombre}
                </Typography>
              </Box>
            )}
          </Box>
        </Alert>
      )}

      {/* Fases del torneo */}
      <Grid container spacing={3}>
        {estructuraEliminacion.fases.map(renderFase)}
      </Grid>
    </Box>
  );
};

export default EliminacionDirectaBracket;
