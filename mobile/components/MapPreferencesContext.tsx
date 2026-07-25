import type { ReactNode } from 'react';
import { Appearance } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_FOG_COLOR } from '@/constants/FogColors';

export const PLAYER_COLOR_PRESETS = [
  { id: 'red', name: 'Red', color: '#E23636' },
  { id: 'blue', name: 'Blue', color: '#3498DB' },
  { id: 'green', name: 'Green', color: '#2ECC71' },
  { id: 'orange', name: 'Orange', color: '#E67E22' },
  { id: 'purple', name: 'Purple', color: '#9B59B6' },
  { id: 'yellow', name: 'Yellow', color: '#F1C40F' },
] as const;

export const DEFAULT_PLAYER_COLOR = '#E23636';

export type ThemeMode = 'system' | 'light' | 'dark';

type MapPreferences = {
  fogColorId: string;
  showDebug: boolean;
  playerColor: string;
  themeMode: ThemeMode;
  setFogColorId: (id: string) => void;
  setShowDebug: (show: boolean) => void;
  setPlayerColor: (color: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const MapPreferencesContext = createContext<MapPreferences | null>(null);

const FOG_COLOR_KEY = 'explorience_fog_color_id';
const SHOW_DEBUG_KEY = 'explorience_show_debug';
const PLAYER_COLOR_KEY = 'explorience_player_color';
const THEME_MODE_KEY = 'explorience_theme_mode';

type MapPreferencesProviderProps = {
  children: ReactNode;
};

export function MapPreferencesProvider({ children }: MapPreferencesProviderProps) {
  const [fogColorId, setFogColorIdState] = useState<string>(DEFAULT_FOG_COLOR.id);
  const [showDebug, setShowDebugState] = useState<boolean>(false);
  const [playerColor, setPlayerColorState] = useState<string>(DEFAULT_PLAYER_COLOR);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [fogRaw, debugRaw, playerRaw, themeRaw] = await Promise.all([
        AsyncStorage.getItem(FOG_COLOR_KEY),
        AsyncStorage.getItem(SHOW_DEBUG_KEY),
        AsyncStorage.getItem(PLAYER_COLOR_KEY),
        AsyncStorage.getItem(THEME_MODE_KEY),
      ]);

      if (cancelled) return;

      if (fogRaw) setFogColorIdState(fogRaw);
      if (debugRaw) setShowDebugState(debugRaw === 'true');
      if (playerRaw) setPlayerColorState(playerRaw);
      if (themeRaw === 'light' || themeRaw === 'dark' || themeRaw === 'system') {
        setThemeModeState(themeRaw);
        if (themeRaw !== 'system') {
          Appearance.setColorScheme(themeRaw);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setFogColorId = useCallback((id: string) => {
    setFogColorIdState(id);
    AsyncStorage.setItem(FOG_COLOR_KEY, id).catch(() => {});
  }, []);

  const setShowDebug = useCallback((show: boolean) => {
    setShowDebugState(show);
    AsyncStorage.setItem(SHOW_DEBUG_KEY, String(show)).catch(() => {});
  }, []);

  const setPlayerColor = useCallback((color: string) => {
    setPlayerColorState(color);
    AsyncStorage.setItem(PLAYER_COLOR_KEY, color).catch(() => {});
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_MODE_KEY, mode).catch(() => {});
    if (mode !== 'system') {
      Appearance.setColorScheme(mode);
    }
  }, []);

  return (
    <MapPreferencesContext.Provider value={{
      fogColorId, showDebug, playerColor, themeMode,
      setFogColorId, setShowDebug, setPlayerColor, setThemeMode,
    }}>
      {children}
    </MapPreferencesContext.Provider>
  );
}

export function useMapPreferences(): MapPreferences {
  const context = useContext(MapPreferencesContext);
  if (!context) {
    throw new Error('useMapPreferences must be used within a MapPreferencesProvider');
  }
  return context;
}
