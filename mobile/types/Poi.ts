export type PoiCategory = 'nightlife' | 'food' | 'landmark' | 'history' | 'nature' | 'shopping' | 'miscellaneous';
export type PoiRarity = 'legendary' | 'epic' | 'rare' | 'common';

export type Poi = {
  id: string;
  city_id: number;
  google_place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  types: string[];
  primary_type: string | null;
  category: PoiCategory;
  rarity: PoiRarity;
  description: string | null;
  rating: number | null;
  total_reviews: number | null;
};
