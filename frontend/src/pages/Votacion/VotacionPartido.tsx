import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VotacionJugadorPartido } from '../../components/Votacion';
import api from '../../services/api';
import './VotacionPartido.css';

interface Partido {
  id: string;
  estado: string;
  equipoLocal: {
    id: string;
    nombre: string;
    jugadores: any[];
  };
  equipoVisitante: {
    id: string;
    nombre: string;
    jugadores: any[];
  };
  fecha: string;
  horaInicio: string;
}

const VotacionPartido: React.FC = () => {
  const { partidoId } = useParams<{ partidoId: string }>();
  const navigate = useNavigate();
  const [partido, setPartido] = useState<Partido | null>(null);
  const [puedeVotar, setPuedeVotar] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [tabActiva, setTabActiva] = useState<'votar' | 'estadisticas'>('votar');

  const cargarDatosPartido = useCallback(async () => {
    try {
      setCargando(true);
      const response = await api.get(`/partidos/${partidoId}`);
      setPartido(response.data);
    } catch (error) {
      console.error('Error cargando partido:', error);
      setError('Error al cargar la información del partido');
    } finally {
      setCargando(false);
    }
  }, [partidoId]);

  const verificarPuedeVotar = useCallback(async () => {
    try {
      const response = await api.get(`/votaciones/puede-votar/${partidoId}`);
      setPuedeVotar(response.data.puedeVotar);
    } catch (error) {
      console.error('Error verificando si puede votar:', error);
      setPuedeVotar(false);
    }
  }, [partidoId]);

  useEffect(() => {
    if (partidoId) {
      cargarDatosPartido();
      verificarPuedeVotar();
    }
  }, [partidoId, cargarDatosPartido, verificarPuedeVotar]);

  const handleVotacionCompletada = () => {
    setPuedeVotar(false);
    setTabActiva('estadisticas');
  };

  if (cargando) {
    return (
      <div className="votacion-partido-container">
        <div className="votacion-loading">
          <div className="spinner"></div>
          <p>Cargando información del partido...</p>
        </div>
      </div>
    );
  }

  if (error || !partido) {
    return (
      <div className="votacion-partido-container">
        <div className="votacion-error">
          <h2>Error</h2>
          <p>{error || 'No se pudo cargar la información del partido'}</p>
          <button onClick={() => navigate(-1)} className="btn-volver">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="votacion-partido-container">
      {/* Header del Partido */}
      <div className="partido-header">
        <div className="partido-info">
          <h1>Votación y Reconocimiento</h1>
          <div className="partido-details">
            <div className="equipos">
              <div className="equipo">
                <span className="equipo-nombre">{partido.equipoLocal.nombre}</span>
                <span className="vs">VS</span>
                <span className="equipo-nombre">{partido.equipoVisitante.nombre}</span>
              </div>
            </div>
            <div className="partido-meta">
              <span className="fecha">
                📅 {new Date(partido.fecha).toLocaleDateString()}
              </span>
              <span className="hora">
                🕐 {partido.horaInicio}
              </span>
              <span className={`estado estado-${partido.estado}`}>
                {partido.estado.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="btn-cerrar">
          ✕
        </button>
      </div>

      {/* Navegación de Tabs */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${tabActiva === 'votar' ? 'activa' : ''}`}
          onClick={() => setTabActiva('votar')}
        >
          {puedeVotar ? '🗳️ Votar' : '✅ Ya Votaste'}
        </button>
        <button
          className={`tab-btn ${tabActiva === 'estadisticas' ? 'activa' : ''}`}
          onClick={() => setTabActiva('estadisticas')}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* Contenido de las Tabs */}
      <div className="tab-content">
        {tabActiva === 'votar' && partido && (
          <div className="tab-panel">
            <VotacionJugadorPartido
              partidoId={partidoId!}
              equipoLocal={{
                id: partido.equipoLocal.id,
                nombre: partido.equipoLocal.nombre,
                jugadores: partido.equipoLocal.jugadores || []
              }}
              equipoVisitante={{
                id: partido.equipoVisitante.id,
                nombre: partido.equipoVisitante.nombre,
                jugadores: partido.equipoVisitante.jugadores || []
              }}
              estadoPartido={partido.estado}
              convocadosLocal={partido.equipoLocal.jugadores || []}
              convocadosVisitante={partido.equipoVisitante.jugadores || []}
            />
          </div>
        )}

        {tabActiva === 'estadisticas' && (
          <div className="tab-panel">
            <div className="ya-votado">
              <div className="ya-votado-icon">📊</div>
              <h3>Estadísticas de Votación</h3>
              <p>Las estadísticas detalladas se muestran en el componente de votación</p>
            </div>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="votacion-info">
        <h3>ℹ️ Información sobre la Votación</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon">🎯</span>
            <div className="info-content">
              <h4>Objetivo</h4>
              <p>Reconocer al jugador del equipo rival que más se destacó en el partido</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">⚖️</span>
            <div className="info-content">
              <h4>Justicia Deportiva</h4>
              <p>Promover el fair play y el reconocimiento mutuo entre equipos</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">🏆</span>
            <div className="info-content">
              <h4>Gamificación</h4>
              <p>Participa en el sistema de reconocimiento del torneo</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">📝</span>
            <div className="info-content">
              <h4>Reglas</h4>
              <p>Solo puedes votar una vez por partido y solo a jugadores del equipo rival</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotacionPartido;
