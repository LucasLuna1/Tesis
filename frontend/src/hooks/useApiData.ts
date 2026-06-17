import { useState, useEffect, useCallback, DependencyList } from 'react';
import toast from 'react-hot-toast';
import { UseApiDataReturn, UseApiMutationReturn } from '@/types';

/**
 * Hook personalizado para manejo de datos de API
 */
export const useApiData = <T = any>(
  apiCall: () => Promise<{ data: T }>,
  dependencies: DependencyList = []
): UseApiDataReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result.data);
    } catch (err: any) {
      setError(err);
      toast.error(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback((): void => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};

/**
 * Hook para operaciones de creación/actualización
 */
export const useApiMutation = <T = any, D = any>(
  apiCall: (data: D) => Promise<T>
): UseApiMutationReturn<T> => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const mutate = useCallback(async (data: D): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(data);
      toast.success('Operación exitosa');
      return result;
    } catch (err: any) {
      setError(err);
      toast.error(err.response?.data?.message || 'Error en la operación');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { mutate, loading, error };
};
