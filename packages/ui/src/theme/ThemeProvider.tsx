import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type ColorScheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(lightTheme);

export interface ThemeProviderProps {
  /** Force a color scheme. If you do not set it, the provider follows the system setting. */
  scheme?: ColorScheme;
  children: ReactNode;
}

export function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  const system = useColorScheme();
  const resolved: ColorScheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  return (
    <ThemeContext.Provider value={resolved === 'dark' ? darkTheme : lightTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Creates a StyleSheet from the current theme. The styles change only when
 * the theme changes.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  // The factory is a module-level function in each component, so it is stable
  // and the styles change only when the theme changes.
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
}
