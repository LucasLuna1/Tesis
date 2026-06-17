import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import './VotacionJugadorDestacado.css';

interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  numero: number;
  posicion: string;
  foto?: string;
}

interface Partido {
  id: string;
  estado: string;
  equipoLocal: {
    id: string;
    nombre: string;
    jugadores: Jugador[];
  };
  equipoVisitante: {
    id: string;
    nombre: string;
    jugadores: Jugador[];
  };
}

interface VotacionJugadorDestacadoProps {
  partidoId: string;
  onVotacionCompletada?: () => void;
}

const VotacionJugadorDestacado: React.FC<VotacionJugadorDestacadoProps> = ({
  partidoId,
  onVotacionCompletada
}) => {
  const authContext = useAuth();
  const user = authContext?.user;
  const [partido, setPartido] = useState<Partido | null>(null);
  const [jugadoresRivales, setJugadoresRivales] = useState<Jugador[]>([]);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('destacado');
  const [puntuacion, setPuntuacion] = useState<number>(5);
  const [motivo, setMotivo] = useState<string>('');
  const [puedeVotar, setPuedeVotar] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [exito, setExito] = useState<boolean>(false);

  const categorias = [
    { value: 'destacado', label: 'Jugador Destacado', icon: '⭐' },
    { value: 'fair_play', label: 'Fair Play', icon: '🤝' },
    { value: 'liderazgo', label: 'Liderazgo', icon: '👑' },
    { value: 'deportividad', label: 'Deportividad', icon: '🏆' },
    { value: 'esfuerzo', label: 'Esfuerzo', icon: '💪' }
  ];

  const cargarDatosPartido = useCallback(async () => {
    try {
      setCargando(true);
      const response = await api.get(`/partidos/${partidoId}`);
      const partidoData = response.data;
      setPartido(partidoData);

      // Determinar jugadores del equipo rival
      const miEquipo = partidoData.equipoLocal.jugadores.some((j: Jugador) => j.id === user?.uid) 
        ? 'local' : 'visitante';
      
      const jugadoresRivales = miEquipo === 'local' 
        ? partidoData.equipoVisitante.jugadores 
        : partidoData.equipoLocal.jugadores;
      
      setJugadoresRivales(jugadoresRivales);
    } catch (error) {
      console.error('Error cargando partido:', error);
      setError('Error al cargar los datos del partido');
    } finally {
      setCargando(false);
    }
  }, [partidoId, user?.uid]);

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
    cargarDatosPartido();
    verificarPuedeVotar();
  }, [partidoId, cargarDatosPartido, verificarPuedeVotar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jugadorSeleccionado) {
      setError('Debes seleccionar un jugador');
      return;
    }

    if (!motivo.trim()) {
      setError('Debes escribir un motivo para tu votación');
      return;
    }

    try {
      setEnviando(true);
      setError('');

      const jugadorSeleccionadoData = jugadoresRivales.find(j => j.id === jugadorSeleccionado);
      
      await api.post('/votaciones', {
        partidoId,
        jugadorVotadoId: jugadorSeleccionado,
        jugadorVotadoNombre: `${jugadorSeleccionadoData?.nombre} ${jugadorSeleccionadoData?.apellido}`,
        jugadorVotadoEquipo: partido?.equipoLocal.jugadores.some(j => j.id === jugadorSeleccionado) 
          ? partido?.equipoLocal.nombre 
          : partido?.equipoVisitante.nombre,
        categoria,
        puntuacion,
        motivo: motivo.trim()
      });

      setExito(true);
      setPuedeVotar(false);
      
      if (onVotacionCompletada) {
        onVotacionCompletada();
      }
    } catch (error: any) {
      console.error('Error enviando votación:', error);
      setError(error.response?.data?.error || 'Error al enviar la votación');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="votacion-container">
        <div className="votacion-loading">
          <div className="spinner"></div>
          <p>Cargando datos del partido...</p>
        </div>
      </div>
    );
  }

  if (!partido) {
    return (
      <div className="votacion-container">
        <div className="votacion-error">
          <h3>Error</h3>
          <p>No se pudo cargar la información del partido</p>
        </div>
      </div>
    );
  }

  if (partido.estado !== 'finalizado') {
    return (
      <div className="votacion-container">
        <div className="votacion-info">
          <h3>Votación no disponible</h3>
          <p>La votación solo está disponible para partidos finalizados</p>
          <p>Estado actual: <span className="estado-partido">{partido.estado}</span></p>
        </div>
      </div>
    );
  }

  if (!puedeVotar) {
    return (
      <div className="votacion-container">
        <div className="votacion-info">
          <h3>Ya has votado</h3>
          <p>Ya has realizado tu votación para este partido</p>
        </div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="votacion-container">
        <div className="votacion-exito">
          <div className="exito-icon">✅</div>
          <h3>¡Votación enviada!</h3>
          <p>Tu votación ha sido registrada correctamente</p>
          <p>Gracias por participar en el reconocimiento de jugadores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="votacion-container">
      <div className="votacion-header">
        <h2>Votar Jugador Destacado</h2>
        <p>Selecciona al jugador del equipo rival que consideras más destacado</p>
      </div>

      <form onSubmit={handleSubmit} className="votacion-form">
        {/* Selección de jugador */}
        <div className="form-group">
          <label htmlFor="jugador">Jugador Destacado *</label>
          <div className="jugadores-grid">
            {jugadoresRivales.map((jugador) => (
              <div
                key={jugador.id}
                className={`jugador-card ${jugadorSeleccionado === jugador.id ? 'seleccionado' : ''}`}
                onClick={() => setJugadorSeleccionado(jugador.id)}
              >
                <div className="jugador-foto">
                  {jugador.foto ? (
                    <img src={jugador.foto} alt={jugador.nombre} />
                  ) : (
                    <div className="foto-placeholder">
                      {jugador.nombre.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="jugador-info">
                  <h4>{jugador.nombre} {jugador.apellido}</h4>
                  <p>#{jugador.numero} - {jugador.posicion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categoría de votación */}
        <div className="form-group">
          <label htmlFor="categoria">Categoría *</label>
          <div className="categorias-grid">
            {categorias.map((cat) => (
              <div
                key={cat.value}
                className={`categoria-card ${categoria === cat.value ? 'seleccionada' : ''}`}
                onClick={() => setCategoria(cat.value)}
              >
                <span className="categoria-icon">{cat.icon}</span>
                <span className="categoria-label">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Puntuación */}
        <div className="form-group">
          <label htmlFor="puntuacion">Puntuación *</label>
          <div className="puntuacion-container">
            {[1, 2, 3, 4, 5].map((punt) => (
              <button
                key={punt}
                type="button"
                className={`puntuacion-btn ${puntuacion === punt ? 'seleccionada' : ''}`}
                onClick={() => setPuntuacion(punt)}
              >
                {punt}
              </button>
            ))}
          </div>
          <p className="puntuacion-descripcion">
            {puntuacion === 1 && 'Muy malo'}
            {puntuacion === 2 && 'Malo'}
            {puntuacion === 3 && 'Regular'}
            {puntuacion === 4 && 'Bueno'}
            {puntuacion === 5 && 'Excelente'}
          </p>
        </div>

        {/* Motivo */}
        <div className="form-group">
          <label htmlFor="motivo">Motivo de la votación *</label>
          <textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explica por qué consideras que este jugador se destacó en el partido..."
            rows={4}
            maxLength={500}
            required
          />
          <div className="caracteres-restantes">
            {motivo.length}/500 caracteres
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={enviando || !jugadorSeleccionado || !motivo.trim()}
            className="btn-votar"
          >
            {enviando ? 'Enviando...' : 'Enviar Votación'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VotacionJugadorDestacado;
