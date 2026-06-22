export type FogColorPreset = {
  id: string;
  name: string;
  color: string;
};

export const FOG_COLOR_PRESETS: FogColorPreset[] = [
  { id: 'teal', name: 'Muted Teal', color: '#1a2f3a' },
  { id: 'navy', name: 'Deep Navy', color: '#0a1628' },
  { id: 'forest', name: 'Forest', color: '#1a3a2a' },
  { id: 'amethyst', name: 'Amethyst', color: '#2a1a3a' },
  { id: 'ember', name: 'Ember', color: '#3a1a1a' },
];

export const DEFAULT_FOG_COLOR = FOG_COLOR_PRESETS[0];
