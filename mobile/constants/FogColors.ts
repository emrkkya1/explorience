export type FogColorPreset = {
  id: string;
  name: string;
  color: string;
};

export const FOG_COLOR_PRESETS: FogColorPreset[] = [
  { id: 'teal', name: 'Teal', color: '#1a2f3a' },
  { id: 'amethyst', name: 'Amethyst', color: '#2a1a3a' },
  { id: 'ember', name: 'Ember', color: '#3a1a1a' },
  { id: 'midnight', name: 'Midnight', color: '#3a639c' },
  { id: 'violet', name: 'Violet', color: '#6a4a9c' },
];

export const DEFAULT_FOG_COLOR = FOG_COLOR_PRESETS[0];
