import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { LLMClient } from '../clients/llm_client';
import { GeminiAdapter } from '../clients/adapters/gemini_adapter';
import { OpenCodeGoAdapter } from '../clients/adapters/opencode_go_adapter';
import { Pipeline } from '../pipeline/pipeline';
import { krakowConfig } from '../config/krakow';
import { logger } from '../utils/logging';
import type { RawPlace } from '../pipeline/types';

async function main() {
  const openCodeGoApiKey = process.env.OPENCODE_GO_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  let llmClient: LLMClient | undefined;

  if (openCodeGoApiKey) {
    const model = process.env.OPENCODE_GO_MODEL || 'qwen3-coder-plus';
    llmClient = new LLMClient(new OpenCodeGoAdapter(openCodeGoApiKey, model));
    logger.info('Using OpenCode GO adapter', { model });
  } else if (geminiApiKey) {
    llmClient = new LLMClient(new GeminiAdapter(geminiApiKey));
    logger.info('Using Gemini adapter');
  } else {
    logger.warn('No LLM API key found - LLM stages will fail');
  }

  const initialPath = path.join('output', 'pipeline', 'krakow', '01-place_fetching.json');
  const initialPlaces: RawPlace[] = JSON.parse(fs.readFileSync(initialPath, 'utf-8'));

  logger.info('Loaded fetched places', { count: initialPlaces.length });

  const pipeline = new Pipeline(krakowConfig, llmClient, true);
  const result = await pipeline.run(initialPlaces);

  logger.info('Pipeline execution complete', {
    city: krakowConfig.city,
    finalPlaces: result.length,
    target: krakowConfig.targetCount,
  });
}

main().catch(error => {
  logger.error('Pipeline failed', { error: error.message });
  process.exit(1);
});
