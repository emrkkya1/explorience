import 'dotenv/config';
import { LLMClient } from '../clients/llm_client';
import { GeminiAdapter } from '../clients/adapters/gemini_adapter';
import { Pipeline } from '../pipeline/pipeline';
import { krakowConfig } from '../config/krakow';
import { logger } from '../utils/logging';

async function main() {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    logger.warn('GEMINI_API_KEY not found - LLM stages will fail');
  }

  const llmClient = geminiApiKey
    ? new LLMClient(new GeminiAdapter(geminiApiKey))
    : undefined;

  const pipeline = new Pipeline(krakowConfig, llmClient, true);
  const result = await pipeline.run([]);

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
