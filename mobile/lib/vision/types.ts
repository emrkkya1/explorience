export type VisionProvider = 'gemini' | 'openai-compatible' | 'anthropic';

// The LLM assesses the photo pair and returns two independent scores.
// The match decision is derived downstream as `similarity_score >= 0.5`,
// so the LLM never gates its own verdict.
export type VisionCompareResult = {
  confidence_score: number; // how certain the model is about its assessment (0-1)
  similarity_score: number; // how closely the photos depict the same place (0-1)
  reason?: string;
};

export type VisionCompareInput = {
  referenceImageUrl: string;
  capturedBase64: string;
  structureSimilarity: number;
  colorSimilarity: number;
};

export type VisionAdapter = {
  compareImages(
    input: VisionCompareInput,
    apiKey: string,
    model?: string,
    endpoint?: string
  ): Promise<VisionCompareResult>;
};

export type VisionClientConfig = {
  provider: VisionProvider;
  model: string;
  endpoint?: string;
};

// Match threshold: similarity_score at or above this value counts as a match.
export const SIMILARITY_MATCH_THRESHOLD = 0.75;