import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './EstadisticasVotacion.css';

interface EstadisticasVotacionProps {
  partidoId: string;
}

interface JugadorDestacado {
  id: string;
  nombre: string;
  totalVotos: number;
  puntuacionPromedio: number;
}

interface Estadisticas {
  totalVotos: number;
  votosPorCategoria: Record<string, number>;
  votosPorJugador: Record<string, {
    nombre: string;
    totalVotos: number;
    puntuacionTotal: number;
    puntuacionPromedio: number;
  }>;
  puntuacionPromedio: number;
  votosValidos: number;
  votosInvalidos: number;
}

const EstadisticasVotacion: React.FC<EstadisticasVotacionProps> = ({ partidoId }) => {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [jugadorDestacado, setJugadorDestacado] = useState<JugadorDestacado | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const cargarEstadisticas = useCallback(async () => {
    try {
      setCargando(true);
      const response = await api.get(`/votaciones/partido/${partidoId}/estadisticas`);
      setEstadisticas(response.data.estadisticas);
      setJugadorDestacado(response.data.jugadorMasVotado);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setError('Error al cargar las estadísticas de votación');
    } finally {
      setCargando(false);
    }
  }, [partidoId]);

  useEffect(() => {
    cargarEstadisticas();
  }, [partidoId, cargarEstadisticas]);

  const getCategoriaIcon = (categoria: string) => {
    const icons: Record<string, string> = {
      'destacado': '⭐',
      'fair_play': '🤝',
      'liderazgo': '👑',
      'deportividad': '🏆',
      'esfuerzo': '💪'
    };
    return icons[categoria] || '📊';
  };

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      'destacado': 'Jugador Destacado',
      'fair_play': 'Fair Play',
      'liderazgo': 'Liderazgo',
      'deportividad': 'Deportividad',
      'esfuerzo': 'Esfuerzo'
    };
    return labels[categoria] || categoria;
  };

  if (cargando) {
    return (
      <div className="estadisticas-container">
        <div className="estadisticas-loading">
          <div className="spinner"></div>
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="estadisticas-container">
        <div className="estadisticas-error">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!estadisticas || estadisticas.totalVotos === 0) {
    return (
      <div className="estadisticas-container">
        <div className="estadisticas-vacio">
          <h3>Sin votaciones</h3>
          <p>No hay votaciones registradas para este partido</p>
        </div>
      </div>
    );
  }

  return (
    <div className="estadisticas-container">
      <div className="estadisticas-header">
        <h2>Estadísticas de Votación</h2>
        <p>Resultados del reconocimiento de jugadores</p>
      </div>

      {/* Jugador Destacado */}
      {jugadorDestacado && (
        <div className="jugador-destacado">
          <div className="destacado-header">
            <span className="destacado-icon">🏆</span>
            <h3>Jugador Más Votado</h3>
          </div>
          <div className="destacado-info">
            <h4>{jugadorDestacado.nombre}</h4>
            <div className="destacado-stats">
              <div className="stat">
                <span className="stat-label">Votos:</span>
                <span className="stat-value">{jugadorDestacado.totalVotos}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Puntuación Promedio:</span>
                <span className="stat-value">{jugadorDestacado.puntuacionPromedio.toFixed(1)}/5</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen General */}
      <div className="resumen-general">
        <h3>Resumen General</h3>
        <div className="resumen-grid">
          <div className="resumen-card">
            <div className="resumen-icon">📊</div>
            <div className="resumen-info">
              <span className="resumen-label">Total Votos</span>
              <span className="resumen-value">{estadisticas.totalVotos}</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon">✅</div>
            <div className="resumen-info">
              <span className="resumen-label">Votos Válidos</span>
              <span className="resumen-value">{estadisticas.votosValidos}</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon">❌</div>
            <div className="resumen-info">
              <span className="resumen-label">Votos Inválidos</span>
              <span className="resumen-value">{estadisticas.votosInvalidos}</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon">⭐</div>
            <div className="resumen-info">
              <span className="resumen-label">Puntuación Promedio</span>
              <span className="resumen-value">{estadisticas.puntuacionPromedio.toFixed(1)}/5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Votos por Categoría */}
      {Object.keys(estadisticas.votosPorCategoria).length > 0 && (
        <div className="votos-categoria">
          <h3>Votos por Categoría</h3>
          <div className="categoria-stats">
            {Object.entries(estadisticas.votosPorCategoria).map(([categoria, votos]) => (
              <div key={categoria} className="categoria-stat">
                <div className="categoria-header">
                  <span className="categoria-icon">{getCategoriaIcon(categoria)}</span>
                  <span className="categoria-label">{getCategoriaLabel(categoria)}</span>
                </div>
                <div className="categoria-votos">
                  <span className="votos-count">{votos}</span>
                  <span className="votos-label">votos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking de Jugadores */}
      {Object.keys(estadisticas.votosPorJugador).length > 0 && (
        <div className="ranking-jugadores">
          <h3>Ranking de Jugadores</h3>
          <div className="jugadores-ranking">
            {Object.entries(estadisticas.votosPorJugador)
              .sort(([, a], [, b]) => b.totalVotos - a.totalVotos)
              .map(([jugadorId, jugador], index) => (
                <div key={jugadorId} className="jugador-ranking">
                  <div className="ranking-position">
                    <span className="position-number">#{index + 1}</span>
                  </div>
                  <div className="jugador-info">
                    <h4>{jugador.nombre}</h4>
                    <div className="jugador-stats">
                      <div className="stat">
                        <span className="stat-label">Votos:</span>
                        <span className="stat-value">{jugador.totalVotos}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Promedio:</span>
                        <span className="stat-value">{jugador.puntuacionPromedio.toFixed(1)}/5</span>
                      </div>
                    </div>
                  </div>
                  <div className="ranking-badge">
                    {index === 0 && <span className="badge oro">🥇</span>}
                    {index === 1 && <span className="badge plata">🥈</span>}
                    {index === 2 && <span className="badge bronce">🥉</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadisticasVotacion;
