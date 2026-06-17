import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge
} from '@mui/material';
import {
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import NotificacionesSidebar from './NotificacionesSidebar';

const NotificacionesBell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contador, setContador] = useState(0);
  const navigate = useNavigate();

  const cargarContador = async () => {
    // Ruta deshabilitada temporalmente
    // try {
    //   const response = await api.get('/notificaciones/no-leidas/contador');
    //   setContador(response.data.contador || 0);
    // } catch (err) {
    //   console.error('Error al cargar contador:', err);
    //   setContador(0);
    // }
    setContador(0);
  };

  // Cargar contador inicial y configurar polling
  useEffect(() => {
    cargarContador();
    
    // Actualizar el contador cada 10 segundos para mayor responsividad
    const intervalo = setInterval(() => {
      cargarContador();
    }, 10000); // 10 segundos

    // Limpiar el intervalo al desmontar el componente
    return () => clearInterval(intervalo);
  }, []);

  const handleClick = async () => {
    // Si estamos abriendo el sidebar, marcar todas las notificaciones como leídas
    if (!sidebarOpen) {
      try {
        await api.patch('/notificaciones/marcar-todas-leidas');
        setContador(0);
      } catch (err) {
        console.error('Error al marcar todas como leídas:', err);
      }
    }
    
    // Si el sidebar está abierto, cerrarlo; si está cerrado, abrirlo
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleVerUsuario = (usuarioId: string) => {
    // Navegar al perfil del usuario
    navigate(`/jugadores/${usuarioId}`);
    // Cerrar el sidebar después de navegar
    setSidebarOpen(false);
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="notificaciones"
      >
        <Badge badgeContent={contador} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <NotificacionesSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        onVerUsuario={handleVerUsuario}
      />
    </>
  );
};

export default NotificacionesBell;