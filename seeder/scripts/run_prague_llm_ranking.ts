import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { LLMClient } from '../clients/llm_client';
import { OpenCodeGoAdapter } from '../clients/adapters/opencode_go_adapter';
import { LLMRankingStage } from '../pipeline/stages/llm_ranking';
import { pragueConfig } from '../config/prague';
import { logger } from '../utils/logging';
import type { RawPlace, Place } from '../pipeline/types';

async function main() {
  logger.setLevel('debug');
  const openCodeGoApiKey = process.env.OPENCODE_GO_API_KEY;

  if (!openCodeGoApiKey) {
    logger.error('OPENCODE_GO_API_KEY not found');
    process.exit(1);
  }

  const model = 'deepseek-v4-flash';
  const llmClient = new LLMClient(new OpenCodeGoAdapter(openCodeGoApiKey, model));
  logger.info('Using OpenCode GO adapter', { model });

  const inputPath = path.join('output', 'pipeline', 'prague', '01-category_quotas.json');
  const inputPlaces: RawPlace[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  logger.info('Loaded category_quotas output', { count: inputPlaces.length });

  const configWithBatchSize = {
    ...pragueConfig,
    stages: pragueConfig.stages.map(s =>
      s.name === 'llm_ranking' ? { ...s, params: { ...s.params, batch_size: 15 } } : s
    ),
  };

  const stage = new LLMRankingStage(llmClient);
  const result = await stage.run(inputPlaces, configWithBatchSize);

  const uid = crypto.randomUUID();
  const outputDir = path.join('output', 'pipeline', 'prague');
  const outputPath = path.join(outputDir, `llm_ranking_${uid}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  logger.info('Saved LLM ranking results', { uid, count: result.length, path: outputPath });
}

main().catch(error => {
  logger.error('LLM ranking failed', { error: error.message });
  process.exit(1);
});
