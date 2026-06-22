import 'dotenv/config';
import { LLMClient } from '../clients/llm_client';
import { GeminiAdapter } from '../clients/adapters/gemini_adapter';
import { Pipeline } from '../pipeline/pipeline';
import { izmirConfig } from '../config/izmir';
import { logger } from '../utils/logging';

async function main() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    logger.info('GEMINI_API_KEY found — LLM stages will be active');
  }

  const llmClient = geminiApiKey
    ? new LLMClient(new GeminiAdapter(geminiApiKey))
    : undefined;

  const pipeline = new Pipeline(izmirConfig, llmClient, true);
  const result = await pipeline.run([]);

  logger.info('Pipeline execution complete', {
    city: izmirConfig.city,
    finalPlaces: result.length,
    target: izmirConfig.targetCount,
  });
}

main().catch(error => {
  logger.error('Pipeline failed', { error: error.message });
  process.exit(1);
});
