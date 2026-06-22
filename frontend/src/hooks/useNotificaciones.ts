import { useState, useEffect, useCallback } from 'react';
import { onMessage, getToken, messaging } from '../config/firebase';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Notificacion {
  id: string;
  tipo: 'partido' | 'sancion' | 'recordatorio' | 'general' | 'noticia_equipo' | 'noticia_general' | 'nuevo_seguidor';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  prioridad: 'alta' | 'normal' | 'baja';
  data?: any;
}

interface UseNotificacionesReturn {
  notificaciones: Notificacion[];
  contador: number;
  loading: boolean;
  error: string | null;
  cargarNotificaciones: () => Promise<void>;
  marcarComoLeida: (id: string) => Promise<void>;
  marcarTodasComoLeidas: () => Promise<void>;
  eliminarNotificacion: (id: string) => Promise<void>;
  registrarTokenFCM: () => Promise<void>;
}

export const useNotificaciones = (): UseNotificacionesReturn => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [contador, setContador] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar notificaciones
  const cargarNotificaciones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/notificaciones?limit=50');
      setNotificaciones(response.data.notificaciones || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar contador de notificaciones no leídas
  const cargarContador = useCallback(async () => {
    try {
      const response = await api.get('/notificaciones/no-leidas/contador');
      setContador(response.data.contador || 0);
    } catch (err) {
      console.error('Error al cargar contador:', err);
      setContador(0);
    }
  }, []);

  // Marcar notificación como leída
  const marcarComoLeida = useCallback(async (id: string) => {
    try {
      await api.patch(`/notificaciones/${id}/marcar-leida`);
      setNotificaciones(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, leida: true } : notif
        )
      );
      setContador(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error al marcar como leída:', err);
    }
  }, []);

  // Marcar todas como leídas
  const marcarTodasComoLeidas = useCallback(async () => {
    try {
      await api.patch('/notificaciones/marcar-todas-leidas');
      setNotificaciones(prev => 
        prev.map(notif => ({ ...notif, leida: true }))
      );
      setContador(0);
    } catch (err: any) {
      console.error('Error al marcar todas como leídas:', err);
    }
  }, []);

  // Eliminar notificación
  const eliminarNotificacion = useCallback(async (id: string) => {
    try {
      await api.delete(`/notificaciones/${id}`);
      setNotificaciones(prev => prev.filter(notif => notif.id !== id));
      setContador(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error al eliminar notificación:', err);
    }
  }, []);

  // Registrar token FCM
  const registrarTokenFCM = useCallback(async () => {
    try {
      if (!messaging) {
        return;
      }

      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
      });

      if (token) {
        await api.post('/notificaciones/registrar-token', {
          fcmToken: token
        });
      } else {

      }
    } catch (err: any) {
      console.error('Error al registrar token FCM:', err);
    }
  }, []);

  // Configurar listener para notificaciones en tiempo real
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {

      // Mostrar notificación toast
      toast.success(payload.notification?.title || 'Nueva notificación', {
        duration: 5000,
        position: 'top-right'
      });

      // Actualizar contador
      setContador(prev => prev + 1);

      // Agregar notificación a la lista si es necesario
      if (payload.data) {
        const nuevaNotificacion: Notificacion = {
          id: payload.data.notificacionId || Date.now().toString(),
          tipo: payload.data.tipo as any,
          titulo: payload.notification?.title || 'Nueva notificación',
          mensaje: payload.notification?.body || '',
          fecha: new Date().toISOString(),
          leida: false,
          prioridad: 'normal',
          data: payload.data
        };

        setNotificaciones(prev => [nuevaNotificacion, ...prev]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    cargarNotificaciones();
    cargarContador();
    registrarTokenFCM();
  }, [cargarNotificaciones, cargarContador, registrarTokenFCM]);

  return {
    notificaciones,
    contador,
    loading,
    error,
    cargarNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    registrarTokenFCM
  };
};
