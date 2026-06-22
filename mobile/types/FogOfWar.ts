import type { Poi } from './Poi';

export type PlayerLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  timestamp: number;
};

export type GridCell = {
  id: string;
  latitude: number;
  longitude: number;
};

export type FogOfWarState = {
  exploredGrids: Set<string>;
  hintedPoiIds: Set<string>;
  discoveredPoiIds: Set<string>;
};

export type DiscoverySyncPayload = {
  game_id: string;
  player_id: string;
  grid_ids: string[];
  poi_ids: string[];
};
