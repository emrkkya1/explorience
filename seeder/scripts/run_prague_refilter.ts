import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { LLMClient } from '../clients/llm_client';
import { GeminiAdapter } from '../clients/adapters/gemini_adapter';
import { OpenCodeGoAdapter } from '../clients/adapters/opencode_go_adapter';
import { Pipeline } from '../pipeline/pipeline';
import { pragueConfig } from '../config/prague';
import { logger } from '../utils/logging';
import { RawPlace } from '../pipeline/types';

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
    logger.error('No LLM API key found');
    process.exit(1);
  }

  const initialDataPath = path.join('output', 'pipeline', 'prague', '00-initial.json');
  if (!fs.existsSync(initialDataPath)) {
    logger.error('Initial data not found', { path: initialDataPath });
    process.exit(1);
  }

  const initialData: RawPlace[] = JSON.parse(fs.readFileSync(initialDataPath, 'utf-8'));
  logger.info('Loaded initial data', { places: initialData.length });

  const configWithoutFetching = {
    ...pragueConfig,
    stages: pragueConfig.stages.map(s =>
      s.name === 'place_fetching' ? { ...s, enabled: false } : s
    ),
  };

  const pipeline = new Pipeline(configWithoutFetching, llmClient, true);
  const result = await pipeline.run(initialData);

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
