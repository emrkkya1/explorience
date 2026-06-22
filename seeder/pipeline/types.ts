import { LLMClient } from '../clients/llm_client';
export { LLMClient };

export interface RawPlace {
  id: string;
  name: string;
  types: string[];
  rating?: number;
  totalReviews?: number;
  location: { lat: number; lng: number };
  gridId: string;
  primaryType?: string;
  qualityScore?: number;
  rarity?: Rarity;
  dropReason?: string;
}

export interface Place {
  id: string;
  name: string;
  types: string[];
  rating?: number;
  totalReviews?: number;
  location: { lat: number; lng: number };
  primaryType?: string;
  assignedCategory?: Category;
  rarity?: Rarity;
  description?: string;
  imageUrl?: string;
  imageReward?: number;
}

export type Category = "nightlife" | "food" | "landmark" | "history" | "nature" | "shopping" | "miscellaneous";

export type Rarity = "legendary" | "epic" | "rare" | "common";

export interface CityBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface StageConfig {
  name: string;
  enabled: boolean;
  params?: Record<string, any>;
}

export interface PipelineConfig {
  city: string;
  bounds: CityBounds;
  targetCount: number;
  stages: StageConfig[];
  types: string[];
  resolution: number;
}

export interface Stage {
  name: string;
  run(Places: (RawPlace | Place)[], config: PipelineConfig): Promise<(RawPlace | Place)[]>;
}

export type CategoryQuotaEntry = {
  typeName: string;
  threshold: number;
  weight: number;
  neverRemove: boolean;
};

export interface StageConstructor {
  new (llmClient?: LLMClient): Stage;
}
