import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, messaging, getToken } from '../config/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { AuthContextType, Jugador, Arbitro, Manager, User } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<Jugador | Arbitro | Manager | User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // ⏰ Timeout de inactividad: cerrar sesión después de 24 horas sin actividad
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas

    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }

      // Solo establecer timeout si hay un usuario logueado
      if (user) {
        inactivityTimer = setTimeout(() => {
          signOut(auth).then(() => {
            localStorage.removeItem('firebaseToken');
            sessionStorage.clear();
            toast.error('Sesión cerrada por inactividad');
            window.location.href = '/login';
          });
        }, INACTIVITY_TIMEOUT);
      }
    };

    // Eventos que indican actividad del usuario
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Iniciar el timer
    resetInactivityTimer();

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [user]);

  // 🔄 Efecto para refrescar automáticamente el token de Firebase cada 50 minutos
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(true);
          localStorage.setItem('firebaseToken', freshToken);
        }
      } catch (error) {
        console.error('❌ Error refrescando token:', error);
      }
    }, 50 * 60 * 1000); // 50 minutos

    return () => clearInterval(refreshInterval);
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    let isProcessing = false; // 🚫 Prevenir procesamiento múltiple simultáneo
    let lastUserId: string | null = null; // 🔄 Evitar re-procesar el mismo usuario
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // 🚫 Prevenir procesamiento si ya se está procesando o no está montado
      if (!isMounted || isProcessing) return;
      
      // 🚫 Prevenir procesamiento del mismo usuario múltiples veces
      const currentUserId = firebaseUser?.uid || null;
      if (lastUserId === currentUserId && currentUserId !== null) {
        return;
      }
      lastUserId = currentUserId;
      
      isProcessing = true;
      setLoading(true);
      if (firebaseUser) {
        try {
          // 🔑 Obtener y guardar el token de Firebase (se refresca automáticamente)
          const token = await firebaseUser.getIdToken(true); // force refresh
          localStorage.setItem('firebaseToken', token);
          
          // 🚀 OPTIMIZACIÓN: Agregar timeout para evitar esperas largas
          const timeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout al cargar perfil')), 5000);
          });
          
          // Buscar primero en 'users', luego en colecciones específicas
          let userDoc = await Promise.race([getDoc(doc(db, 'users', firebaseUser.uid)), timeoutPromise]);
          
          if (!isMounted) return;
          
          // Si no existe en 'users', buscar en colecciones específicas según tipo de usuario
          if (!userDoc || !userDoc.exists()) {
            const collections = ['jugadores', 'arbitros', 'organizadores', 'managers', 'usuarios'];
            for (const collection of collections) {
              try {
                const specificDoc = await getDoc(doc(db, collection, firebaseUser.uid));
                if (specificDoc.exists()) {
                  userDoc = specificDoc;
                  break;
                }
              } catch (e) {
                // Continuar buscando en la siguiente colección
                continue;
              }
            }
          }
          
          if (userDoc && userDoc.exists()) {
            const userData = userDoc.data() as Jugador | Arbitro | Manager | User;
            // 🔄 Solo actualizar si es diferente para evitar re-renders innecesarios
            setUserProfile(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(userData)) {
                return userData;
              }
              return prev;
            });
            setUser(firebaseUser);

            // Registrar token FCM para notificaciones push
            try {
              if (messaging && typeof Notification !== 'undefined') {
                const perm = await Notification.requestPermission();
                if (perm === 'granted') {
                  const fcmToken = await getToken(messaging, {
                    vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY as string | undefined
                  });
                  if (fcmToken) {
                    // Registrar en backend
                    const defaultExport = await import('../services/api');
                    const api = defaultExport.default;
                    await api.post('/notificaciones/registrar-token', { fcmToken });
                  }
                }
              }
            } catch (e) {
              console.warn('⚠️ No se pudo registrar el token FCM:', (e as any)?.message || e);
            }
          } else {
            // Si no existe perfil, NO crear uno automáticamente
            // El usuario debe registrarse correctamente a través del formulario de registro
            console.warn('Usuario sin perfil encontrado. Debe registrarse correctamente.');
            setUserProfile(null);
            setUser(firebaseUser);
            return;
          }
        } catch (error) {
          console.warn('Error al obtener perfil del usuario (usando perfil temporal):', error);
          // 🚀 En caso de error o timeout, crear perfil temporal
          if (isMounted) {
            const perfilTemporal = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              nombre: firebaseUser.displayName?.split(' ')[0] || 'Usuario',
              apellido: firebaseUser.displayName?.split(' ')[1] || 'Prueba',
              email: firebaseUser.email || '',
              telefono: '',
              fechaNacimiento: new Date().toISOString(),
              foto: firebaseUser.photoURL || '',
              posicion: 'Centro',
              altura: 175,
              peso: 70,
              numero: undefined,
              equipoId: undefined,
              equipoNombre: '',
              fechaIncorporacion: new Date(),
              titular: false,
              estadisticas: {
                partidosJugados: 0,
                partidosTitular: 0,
                partidosSuplente: 0,
                minutosJugados: 0,
                tries: 0,
                conversiones: 0,
                penales: 0,
                drops: 0,
                asistencias: 0,
                placajes: 0,
                tarjetasAmarillas: 0,
                tarjetasRojas: 0,
                rating: 0
              },
              activo: true,
              disponible: true,
              sancionado: false,
              fechaCreacion: new Date(),
              fechaActualizacion: new Date(),
              tipoUsuario: 'jugador'
            } as Jugador;
            setUserProfile(perfilTemporal);
            setUser(firebaseUser);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
            isProcessing = false;
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          isProcessing = false;
        }
      }
    });

    return () => {
      isMounted = false;
      isProcessing = false;
      unsubscribe();
    };
  }, []);

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      localStorage.removeItem('firebaseToken');
      sessionStorage.clear();
      setUser(null);
      setUserProfile(null);
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    setUserProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
