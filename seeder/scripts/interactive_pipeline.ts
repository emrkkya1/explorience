import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { select, confirm, input, number, checkbox } from '@inquirer/prompts';
import { Pipeline } from '../pipeline/pipeline';
import { LLMClient } from '../clients/llm_client';
import { GeminiAdapter } from '../clients/adapters/gemini_adapter';
import { OpenCodeGoAdapter } from '../clients/adapters/opencode_go_adapter';
import { PipelineConfig, StageConfig, CategoryQuotaEntry, RawPlace } from '../pipeline/types';
import { logger, LogLevel } from '../utils/logging';
import { pragueConfig } from '../config/prague';
import { krakowConfig } from '../config/krakow';
import { izmirConfig } from '../config/izmir';
import { baseConfig } from '../config/base';

const CITY_CONFIGS: Record<string, PipelineConfig> = {
  prague: pragueConfig,
  krakow: krakowConfig,
  izmir: izmirConfig,
  base: { ...baseConfig, city: 'Base', bounds: { north: 0, south: 0, east: 0, west: 0 } },
};

async function selectStartingFile(city: string): Promise<RawPlace[]> {
  console.log('\n--- Starting Data ---');

  const outputDir = path.join('output', 'pipeline', city.toLowerCase());

  if (!fs.existsSync(outputDir)) {
    console.log(`No existing data found for ${city}`);
    return [];
  }

  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log(`No JSON files found in ${outputDir}`);
    return [];
  }

  const runs = new Map<string, { files: string[]; timestamp: string }>();

  for (const file of files) {
    const match = file.match(/^(.+?)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.json$/);
    if (match) {
      const [, stageName, timestamp] = match;
      if (!runs.has(timestamp)) {
        runs.set(timestamp, { files: [], timestamp });
      }
      runs.get(timestamp)!.files.push(stageName);
    } else {
      const key = `__standalone__${file}`;
      runs.set(key, { files: [file], timestamp: file });
    }
  }

  const choices = [
    { name: 'Start fresh (fetch from Google Maps)', value: '__fresh__' },
    ...Array.from(runs.entries()).map(([key, run]) => {
      if (key.startsWith('__standalone__')) {
        const file = run.files[0];
        const filePath = path.join(outputDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const count = Array.isArray(data) ? data.length : 0;
        return { name: `${file} (${count} places)`, value: `__file__${file}` };
      }

      const latestFile = run.files[run.files.length - 1];
      const filePath = path.join(outputDir, `${latestFile}_${run.timestamp}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const count = Array.isArray(data) ? data.length : 0;
      const stages = run.files.join(', ');
      return {
        name: `Run ${run.timestamp} — ${stages} (final: ${count} places)`,
        value: `__run__${run.timestamp}`,
      };
    }),
  ];

  const selected = await select({
    message: 'Select starting data:',
    choices,
  });

  if (selected === '__fresh__') {
    return [];
  }

  if (selected.startsWith('__file__')) {
    const file = selected.slice(8);
    const filePath = path.join(outputDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    logger.info(`Loaded starting data from ${file}`, { count: data.length });
    return data;
  }

  if (selected.startsWith('__run__')) {
    const timestamp = selected.slice(7);
    const run = runs.get(timestamp);
    if (!run) return [];

    const latestFile = run.files[run.files.length - 1];
    const filePath = path.join(outputDir, `${latestFile}_${timestamp}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    logger.info(`Loaded starting data from run ${timestamp}`, {
      stage: latestFile,
      count: data.length,
    });
    return data;
  }

  return [];
}

async function selectCity(): Promise<string> {
  return select({
    message: 'Select city config:',
    choices: [
      { name: 'Prague', value: 'prague' },
      { name: 'Krakow', value: 'krakow' },
      { name: 'Izmir', value: 'izmir' },
      { name: 'Base (template)', value: 'base' },
    ],
  });
}

async function editGlobalSettings(config: PipelineConfig): Promise<PipelineConfig> {
  console.log('\n--- Global Settings ---');

  const targetCount = await number({
    message: 'Target place count:',
    default: config.targetCount,
  });

  const resolution = await number({
    message: 'Grid resolution:',
    default: config.resolution,
  });

  const logLevel = await select<LogLevel>({
    message: 'Log level:',
    choices: [
      { name: 'debug', value: 'debug' },
      { name: 'info', value: 'info' },
      { name: 'warn', value: 'warn' },
      { name: 'error', value: 'error' },
    ],
    default: 'info',
  });

  logger.setLevel(logLevel);

  return { ...config, targetCount: targetCount ?? config.targetCount, resolution: resolution ?? config.resolution };
}

async function toggleStages(stages: StageConfig[]): Promise<StageConfig[]> {
  console.log('\n--- Stage Configuration ---');

  const stageNames = stages.map(s => s.name);
  const selected = await checkbox({
    message: 'Enable stages (space to toggle, enter to confirm):',
    choices: stages.map(s => ({
      name: s.name,
      value: s.name,
      checked: s.enabled,
    })),
  });

  return stages.map(s => ({ ...s, enabled: selected.includes(s.name) }));
}

async function editStageParams(stage: StageConfig): Promise<StageConfig> {
  const params = { ...(stage.params || {}) };

  switch (stage.name) {
    case 'place_fetching': {
      const delayMs = await number({ message: '  delayMs (API delay):', default: params.delayMs ?? 125 });
      params.delayMs = delayMs ?? params.delayMs;
      break;
    }

    case 'name_similarity_dedup': {
      const threshold = await number({ message: '  threshold (similarity):', default: params.threshold ?? 0.85 });
      const maxDistanceMeters = await number({ message: '  maxDistanceMeters:', default: params.maxDistanceMeters ?? 100 });
      params.threshold = threshold ?? params.threshold;
      params.maxDistanceMeters = maxDistanceMeters ?? params.maxDistanceMeters;
      break;
    }

    case 'proximity_dedup': {
      const thresholdMeters = await number({ message: '  thresholdMeters:', default: params.thresholdMeters ?? 50 });
      params.thresholdMeters = thresholdMeters ?? params.thresholdMeters;
      break;
    }

    case 'rating_threshold': {
      const minReviews = await number({ message: '  minReviews:', default: params.minReviews ?? 5 });
      params.minReviews = minReviews ?? params.minReviews;
      break;
    }

    case 'generic_filter': {
      const blacklistedTypesStr = await input({
        message: '  blacklistedTypes (comma-separated):',
        default: (params.blacklistedTypes ?? []).join(', '),
      });
      params.blacklistedTypes = blacklistedTypesStr.split(',').map(s => s.trim()).filter(Boolean);

      const namePatternsStr = await input({
        message: '  namePatterns (regex strings, comma-separated):',
        default: (params.namePatterns ?? []).map((p: RegExp) => p.source).join(', '),
      });
      params.namePatterns = namePatternsStr.split(',').map(s => new RegExp(s.trim(), 'i')).filter(Boolean);
      break;
    }

    case 'category_quotas': {
      const maxPlaces = await number({ message: '  maxPlaces:', default: params.maxPlaces ?? 500 });
      const defaultWeight = await number({ message: '  defaultWeight:', default: params.defaultWeight ?? 0.5 });
      params.maxPlaces = maxPlaces ?? params.maxPlaces;
      params.defaultWeight = defaultWeight ?? params.defaultWeight;

      const quotas = (params.quotas ?? []) as CategoryQuotaEntry[];
      if (quotas.length > 0) {
        const advanced = await confirm({ message: '  Edit individual quota entries? (advanced)', default: false });
        if (advanced) {
          for (let i = 0; i < quotas.length; i++) {
            const q = quotas[i];
            console.log(`    [${i + 1}/${quotas.length}] ${q.typeName}`);
            const threshold = await number({ message: `      threshold:`, default: q.threshold });
            const weight = await number({ message: `      weight:`, default: q.weight });
            const neverRemove = await confirm({ message: `      neverRemove:`, default: q.neverRemove });
            quotas[i] = {
              ...q,
              threshold: threshold ?? q.threshold,
              weight: weight ?? q.weight,
              neverRemove,
            };
          }
        }
      }
      params.quotas = quotas;
      break;
    }

    case 'llm_ranking': {
      const batchSize = await number({ message: '  batch_size:', default: params.batch_size ?? 1 });
      const model = await input({ message: '  model (empty for default):', default: params.model ?? '' });
      const temperature = await number({ message: '  temperature (empty for default):', default: params.temperature });
      const maxTokens = await number({ message: '  maxTokens:', default: params.maxTokens ?? 16384 });
      params.batch_size = batchSize ?? params.batch_size;
      params.model = model || undefined;
      params.temperature = temperature ?? params.temperature;
      params.maxTokens = maxTokens ?? params.maxTokens;
      break;
    }
  }

  return { ...stage, params };
}

async function editAllStageParams(stages: StageConfig[]): Promise<StageConfig[]> {
  const result: StageConfig[] = [];

  for (const stage of stages) {
    if (!stage.enabled) {
      result.push(stage);
      continue;
    }

    console.log(`\n--- ${stage.name} ---`);
    const edit = await confirm({ message: `Edit parameters for ${stage.name}?`, default: false });

    if (edit) {
      result.push(await editStageParams(stage));
    } else {
      result.push(stage);
    }
  }

  return result;
}

async function selectLLMAdapter(): Promise<LLMClient | undefined> {
  console.log('\n--- LLM Configuration ---');

  const openCodeGoKey = process.env.OPENCODE_GO_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const choices: { name: string; value: string }[] = [];

  if (openCodeGoKey) {
    choices.push({ name: 'OpenCode GO', value: 'opencode_go' });
  }
  if (geminiKey) {
    choices.push({ name: 'Gemini', value: 'gemini' });
  }
  choices.push({ name: 'None (skip LLM stages)', value: 'none' });

  if (choices.length === 1) {
    logger.warn('No LLM API keys found in environment');
    return undefined;
  }

  const selected = await select({
    message: 'Select LLM adapter:',
    choices,
  });

  if (selected === 'none') return undefined;

  if (selected === 'opencode_go') {
    const model = await input({
      message: 'OpenCode GO model:',
      default: process.env.OPENCODE_GO_MODEL || 'qwen3-coder-plus',
    });
    return new LLMClient(new OpenCodeGoAdapter(openCodeGoKey!, model));
  }

  if (selected === 'gemini') {
    const model = await input({
      message: 'Gemini model:',
      default: 'gemini-3.1-flash-lite',
    });
    return new LLMClient(new GeminiAdapter(geminiKey!, model));
  }

  return undefined;
}

function printSummary(config: PipelineConfig, llmClient: LLMClient | undefined, initialPlacesCount: number): void {
  console.log('\n' + '='.repeat(50));
  console.log('PIPELINE CONFIGURATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`City: ${config.city}`);
  console.log(`Starting data: ${initialPlacesCount > 0 ? `${initialPlacesCount} places loaded` : 'fresh (will fetch from Google Maps)'}`);
  console.log(`Target count: ${config.targetCount}`);
  console.log(`Resolution: ${config.resolution}`);
  console.log(`LLM: ${llmClient ? 'enabled' : 'disabled'}`);
  console.log('\nStages:');

  for (const stage of config.stages) {
    const status = stage.enabled ? '✓' : '✗';
    const paramsStr = stage.params ? JSON.stringify(stage.params).slice(0, 60) + '...' : '';
    console.log(`  ${status} ${stage.name}${stage.params ? ' ' + paramsStr : ''}`);
  }

  console.log('='.repeat(50));
}

async function main() {
  console.log('\n🗺️  Interactive Pipeline Runner\n');

  const cityKey = await selectCity();
  let config = { ...CITY_CONFIGS[cityKey] };

  const initialPlaces = await selectStartingFile(cityKey);

  config = await editGlobalSettings(config);
  config.stages = await toggleStages(config.stages);
  config.stages = await editAllStageParams(config.stages);

  const llmClient = await selectLLMAdapter();

  await printSummary(config, llmClient, initialPlaces.length);

  const run = await confirm({ message: '\nRun pipeline with this configuration?', default: true });

  if (!run) {
    console.log('Aborted.');
    return;
  }

  const pipeline = new Pipeline(config, llmClient, true);
  const result = await pipeline.run(initialPlaces);

  logger.info('Pipeline complete', {
    city: config.city,
    finalPlaces: result.length,
    target: config.targetCount,
  });
}

main().catch(error => {
  logger.error('Pipeline failed', { error: error.message });
  process.exit(1);
});
