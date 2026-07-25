import type { PoiRarity } from '@/types/Poi';

export const RARITY_COLORS: Record<PoiRarity, string> = {
  legendary: '#EAB308',
  epic: '#A855F7',
  rare: '#3B82F6',
  common: '#78716C',
};

export const RARITY_LABELS: Record<PoiRarity, string> = {
  legendary: 'LEGENDARY',
  epic: 'EPIC',
  rare: 'RARE',
  common: 'COMMON',
};
