export type PoiDiscoveryState = {
  poi_id: string;
  discovered_by: string;
  explored: boolean;
  explored_at: string | null;
  explored_by: string | null;
  user_photo_uri: string | null;
};