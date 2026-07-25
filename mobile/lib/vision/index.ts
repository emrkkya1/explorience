import { geminiAdapter } from './adapters/gemini';
import { openaiAdapter } from './adapters/openai';
import { anthropicAdapter } from './adapters/anthropic';
import type { VisionAdapter, VisionClientConfig, VisionCompareInput, VisionCompareResult } from './types';

const ADAPTERS: Record<VisionClientConfig['provider'], VisionAdapter> = {
  gemini: geminiAdapter,
  'openai-compatible': openaiAdapter,
  anthropic: anthropicAdapter,
};

export function getVisionClient(config: VisionClientConfig): VisionAdapter {
  const base = ADAPTERS[config.provider];
  if (config.provider === 'gemini') {
    return {
      async compareImages(
        input: VisionCompareInput,
        apiKey: string
      ): Promise<VisionCompareResult> {
        return base.compareImages(input, apiKey, config.model);
      },
    };
  }
  if (config.provider === 'openai-compatible') {
    return {
      async compareImages(
        input: VisionCompareInput,
        apiKey: string
      ): Promise<VisionCompareResult> {
        return base.compareImages(input, apiKey, config.model, config.endpoint);
      },
    };
  }
  return base;
}

export { buildPrompt } from './prompt';
export { SIMILARITY_MATCH_THRESHOLD } from './types';
export type {
  VisionProvider,
  VisionAdapter,
  VisionCompareInput,
  VisionCompareResult,
  VisionClientConfig,
} from './types';