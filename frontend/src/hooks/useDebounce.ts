import { useEffect, useState } from 'react';

/**
 * Hook personalizado para debouncing de valores
 * Útil para optimizar búsquedas y reducir llamadas a API
 * 
 * @param value - Valor a debounce
 * @param delay - Delay en milisegundos (default: 500ms)
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Crear un timer que actualizará el valor después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancelar el timer si el valor cambia antes de que se complete
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para throttling de funciones
 * Útil para eventos de scroll o resize
 * 
 * @param callback - Función a throttle
 * @param delay - Delay en milisegundos (default: 300ms)
 * @returns Función throttled
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const [lastRan, setLastRan] = useState(Date.now());

  return ((...args: Parameters<T>) => {
    if (Date.now() - lastRan >= delay) {
      callback(...args);
      setLastRan(Date.now());
    }
  }) as T;
}

export default useDebounce;

