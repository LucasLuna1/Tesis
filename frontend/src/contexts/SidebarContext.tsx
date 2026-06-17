import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SidebarContextType } from '@/types';
import { useMediaQuery, useTheme } from '@mui/material';

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar debe ser usado dentro de un SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estado inicial: abierto en desktop, cerrado en móvil
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    // Inicializar basado en el tamaño de pantalla
    return !isMobile;
  });

  // Efecto para ajustar cuando cambia el tamaño de pantalla
  useEffect(() => {
    // Solo cerrar automáticamente si cambia a móvil
    // En desktop, mantener el estado que el usuario eligió
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = (): void => {
    setSidebarOpen(prev => !prev);
  };

  const openSidebar = (): void => {
    setSidebarOpen(true);
  };

  const closeSidebar = (): void => {
    setSidebarOpen(false);
  };

  const value: SidebarContextType = {
    sidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};
