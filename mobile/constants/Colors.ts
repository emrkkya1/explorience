export default {
  light: {
    text: '#171717',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    tint: '#EA580C',
    primary: '#EA580C',
    secondary: '#737373',
    accent: '#EA580C',
    danger: '#DC2626',
    border: '#E5E5E5',
    tabIconDefault: '#A3A3A3',
    tabIconSelected: '#EA580C',
    success: '#16A34A',
    warning: '#CA8A04',
    textTertiary: '#A3A3A3',
  },
  dark: {
    text: '#FAFAFA',
    background: '#0A0A0A',
    surface: '#171717',
    tint: '#F97316',
    primary: '#F97316',
    secondary: '#A3A3A3',
    accent: '#F97316',
    danger: '#EF4444',
    border: '#262626',
    tabIconDefault: '#737373',
    tabIconSelected: '#F97316',
    success: '#22C55E',
    warning: '#EAB308',
    textTertiary: '#525252',
  },
} as const;

export const rarityColors = {
  legendary: '#EAB308',
  epic: '#A855F7',
  rare: '#3B82F6',
  common: '#78716C',
};

export const semanticColors = {
  overlay: { light: 'rgba(0,0,0,0.50)', dark: 'rgba(0,0,0,0.70)' },
  glassSurface: { light: 'rgba(255,255,255,0.90)', dark: 'rgba(23,23,23,0.92)' },
  similarity: {
    track: { light: '#E5E5E5', dark: '#262626' },
    high: { light: '#16A34A', dark: '#22C55E' },
    mid: { light: '#CA8A04', dark: '#EAB308' },
    low: { light: '#DC2626', dark: '#EF4444' },
  },
};
