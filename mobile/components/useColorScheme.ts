import { useColorScheme as useColorSchemeCore } from 'react-native';

import { useMapPreferences } from './MapPreferencesContext';

type ColorScheme = 'light' | 'dark';

let globalPreferred: ColorScheme | null = null;

export function setPreferredColorScheme(scheme: ColorScheme | null) {
  globalPreferred = scheme;
}

export const useColorScheme = (): ColorScheme => {
  const coreScheme = useColorSchemeCore();
  const systemScheme: ColorScheme = coreScheme === 'dark' ? 'dark' : 'light';

  try {
    const { themeMode } = useMapPreferences();
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    return systemScheme;
  } catch {
    return globalPreferred ?? systemScheme;
  }
};
