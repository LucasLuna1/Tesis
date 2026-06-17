import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { ThemeContextType } from '@/types';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored === 'true' || stored === 'false') return stored === 'true';
    // Sin preferencia guardada → seguir preferencia del SO
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Aplicar el tema al body cuando cambia el modo
  useEffect(() => {
    if (darkMode) {
      document.body.style.backgroundColor = '#1e1e1e';
      document.body.style.color = '#e0e0e0';
    } else {
      document.body.style.backgroundColor = '#f5f5f5';
      document.body.style.color = '#000000';
    }
  }, [darkMode]);

  let theme = createTheme({
    spacing: 8, // escala 4/8– basada en 8px
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: darkMode ? '#60a5fa' : '#1976d2',
        light: darkMode ? '#93c5fd' : '#42a5f5',
        dark: darkMode ? '#3b82f6' : '#1565c0',
      },
      secondary: {
        main: darkMode ? '#f472b6' : '#dc004e',
        light: darkMode ? '#f9a8d4' : '#f73378',
        dark: darkMode ? '#ec4899' : '#c51162',
      },
      success: {
        main: darkMode ? '#22c55e' : '#2e7d32',
        light: darkMode ? '#86efac' : '#4caf50',
        dark: darkMode ? '#16a34a' : '#1b5e20',
      },
      info: {
        main: darkMode ? '#38bdf8' : '#0288d1',
        light: darkMode ? '#7dd3fc' : '#03a9f4',
        dark: darkMode ? '#0ea5e9' : '#01579b',
      },
      warning: {
        main: darkMode ? '#f59e0b' : '#ed6c02',
      },
      error: {
        main: darkMode ? '#ef4444' : '#d32f2f',
      },
      background: {
        default: darkMode ? '#1e1e1e' : '#f5f5f5',
        paper: darkMode ? '#2d2d2d' : '#ffffff',
      },
      text: {
        primary: darkMode ? '#e0e0e0' : '#000000',
        secondary: darkMode ? '#a0a0a0' : '#666666',
      },
      divider: darkMode ? '#404040' : '#e0e0e0',
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
      h1: { fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.2 },
      h2: { fontWeight: 700, fontSize: '1.875rem', lineHeight: 1.25 },
      h3: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.3 },
      h4: { fontWeight: 700, fontSize: '1.375rem', lineHeight: 1.35 },
      h5: { fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.4 },
      h6: { fontWeight: 700, fontSize: '1rem', lineHeight: 1.45 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    shadows: [
      'none',
      '0 2px 6px rgba(0,0,0,0.06)',
      '0 4px 10px rgba(0,0,0,0.08)',
      '0 6px 16px rgba(0,0,0,0.1)',
      ...Array(22).fill('0 8px 20px rgba(0,0,0,0.12)')
    ] as any,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            letterSpacing: 0,
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#2d2d2d' : '#1976d2',
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: darkMode ? '#252526' : '#ffffff',
            borderRight: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: darkMode ? '#2d2d2d' : '#ffffff',
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiChip: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: darkMode ? 'rgba(96, 165, 250, 0.16)' : 'rgba(25, 118, 210, 0.12)',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(96, 165, 250, 0.24)' : 'rgba(25, 118, 210, 0.18)',
              },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${darkMode ? '#404040' : '#e0e0e0'}`,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: darkMode ? '#3a3a3a' : '#ffffff',
              '& fieldset': {
                borderColor: darkMode ? '#404040' : '#e0e0e0',
              },
              '&:hover fieldset': {
                borderColor: darkMode ? '#555555' : '#e0e0e0',
              },
              '&.Mui-focused fieldset': {
                borderColor: darkMode ? '#60a5fa' : '#1976d2',
              },
            },
            '& .MuiInputLabel-root': {
              color: darkMode ? '#b0b0b0' : '#666666',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: darkMode ? '#60a5fa' : '#1976d2',
            },
            '& .MuiOutlinedInput-input': {
              color: darkMode ? '#ffffff' : '#000000',
            },
          },
        },
      },
      MuiFormControl: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: darkMode ? '#3a3a3a' : '#ffffff',
              '& fieldset': {
                borderColor: darkMode ? '#404040' : '#e0e0e0',
              },
              '&:hover fieldset': {
                borderColor: darkMode ? '#555555' : '#e0e0e0',
              },
              '&.Mui-focused fieldset': {
                borderColor: darkMode ? '#60a5fa' : '#1976d2',
              },
            },
            '& .MuiInputLabel-root': {
              color: darkMode ? '#b0b0b0' : '#666666',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: darkMode ? '#60a5fa' : '#1976d2',
            },
            '& .MuiOutlinedInput-input': {
              color: darkMode ? '#ffffff' : '#000000',
            },
            '& .MuiSelect-select': {
              color: darkMode ? '#ffffff' : '#000000',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#3a3a3a' : '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? '#404040' : '#e0e0e0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? '#555555' : '#e0e0e0',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? '#60a5fa' : '#1976d2',
            },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#3a3a3a' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
            '&:hover': {
              backgroundColor: darkMode ? '#4a4a4a' : '#f5f5f5',
            },
            '&.Mui-selected': {
              backgroundColor: darkMode ? '#60a5fa' : '#1976d2',
              color: darkMode ? '#ffffff' : '#ffffff',
            },
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: darkMode ? '#3a3a3a' : '#ffffff',
            border: darkMode ? '1px solid #404040' : '1px solid #e0e0e0',
          },
        },
      },
    },
  });

  // Tipografías responsivas por breakpoint
  theme = responsiveFontSizes(theme, { factor: 2.5 });

  const toggleDarkMode = (): void => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  // Seguir cambios del SO cuando no hay preferencia guardada explícita
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored === 'true' || stored === 'false') return;
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler as any);
    };
  }, []);

  const value: ThemeContextType = {
    darkMode,
    toggleDarkMode,
    theme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
