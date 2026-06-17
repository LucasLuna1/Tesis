import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './BotonVotacion.css';

interface BotonVotacionProps {
  partidoId: string;
  partidoEstado: string;
  className?: string;
}

const BotonVotacion: React.FC<BotonVotacionProps> = ({
  partidoId,
  partidoEstado,
  className = ''
}) => {
  const navigate = useNavigate();
  const [puedeVotar, setPuedeVotar] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);
  const [yaVoto, setYaVoto] = useState<boolean>(false);

  const verificarEstadoVotacion = useCallback(async () => {
    try {
      setCargando(true);
      const response = await api.get(`/votaciones/puede-votar/${partidoId}`);
      setPuedeVotar(response.data.puedeVotar);
      setYaVoto(!response.data.puedeVotar && response.data.partidoFinalizado);
    } catch (error) {
      console.error('Error verificando estado de votación:', error);
      setPuedeVotar(false);
    } finally {
      setCargando(false);
    }
  }, [partidoId]);

  useEffect(() => {
    if (partidoEstado === 'finalizado') {
      verificarEstadoVotacion();
    } else {
      setCargando(false);
    }
  }, [partidoId, partidoEstado, verificarEstadoVotacion]);

  const handleVotar = () => {
    navigate(`/votacion/${partidoId}`);
  };

  if (cargando) {
    return (
      <div className={`boton-votacion ${className}`}>
        <div className="boton-cargando">
          <div className="spinner"></div>
          <span>Verificando...</span>
        </div>
      </div>
    );
  }

  if (partidoEstado !== 'finalizado') {
    return null; // No mostrar el botón si el partido no está finalizado
  }

  if (yaVoto) {
    return (
      <div className={`boton-votacion ya-votado ${className}`}>
        <button className="btn-ya-votado" onClick={handleVotar}>
          <span className="icon">✅</span>
          <span className="texto">Ver Mi Votación</span>
        </button>
      </div>
    );
  }

  if (puedeVotar) {
    return (
      <div className={`boton-votacion puede-votar ${className}`}>
        <button className="btn-votar" onClick={handleVotar}>
          <span className="icon">🗳️</span>
          <span className="texto">Votar Jugador Destacado</span>
        </button>
      </div>
    );
  }

  return null;
};

export default BotonVotacion;
