import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  // ⚠️ No lanzar error aquí para mantener compatibilidad con código existente
  // El AuthContext ya tiene su propio hook useAuth con validación
  return context;
};
