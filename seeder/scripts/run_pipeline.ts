import 'dotenv/config';
import { LLMClient } from '../clients/llm_client';
import { GeminiAdapter } from '../clients/adapters/gemini_adapter';
import { OpenCodeGoAdapter } from '../clients/adapters/opencode_go_adapter';
import { Pipeline } from '../pipeline/pipeline';
import { pragueConfig } from '../config/prague';
import { logger } from '../utils/logging';

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

  const pipeline = new Pipeline(pragueConfig, llmClient, true);
  const result = await pipeline.run([]);

  logger.info('Pipeline execution complete', {
    city: pragueConfig.city,
    finalPlaces: result.length,
    target: pragueConfig.targetCount,
  });
}

main().catch(error => {
  logger.error('Pipeline failed', { error: error.message });
  process.exit(1);
});
