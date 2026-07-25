import AsyncStorage from '@react-native-async-storage/async-storage';

import type { VisionProvider } from '@/lib/vision/types';

export type LlmConfig = {
  provider: VisionProvider;
  model: string;
  apiKey: string;
  endpoint: string;
};

export const LLM_PROVIDER_KEY = 'explorience_llm_provider';
export const LLM_MODEL_KEY = 'explorience_llm_model';
export const LLM_API_KEY_KEY = 'explorience_llm_api_key';
export const LLM_ENDPOINT_KEY = 'explorience_llm_endpoint';

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: '',
  endpoint: '',
};

let cachedApiKey: string | null = null;

export function setCachedApiKey(key: string | null): void {
  cachedApiKey = key;
}

// Sync getter: returns the AsyncStorage-cached value (kept up to date by
// LlmConfigContext) or falls back to env vars. Returns null if neither is set.
export function getApiKey(): string | null {
  if (cachedApiKey) return cachedApiKey;
  return (
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ??
    process.env.EXPO_PUBLIC_LLM_API_KEY ??
    null
  );
}

export async function loadLlmConfigAsync(): Promise<LlmConfig> {
  const [providerRaw, modelRaw, apiKeyRaw, endpointRaw] = await Promise.all([
    AsyncStorage.getItem(LLM_PROVIDER_KEY),
    AsyncStorage.getItem(LLM_MODEL_KEY),
    AsyncStorage.getItem(LLM_API_KEY_KEY),
    AsyncStorage.getItem(LLM_ENDPOINT_KEY),
  ]);

  const envFallback =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ??
    process.env.EXPO_PUBLIC_LLM_API_KEY ??
    '';

  const apiKey = apiKeyRaw ?? envFallback;
  setCachedApiKey(apiKey || null);

  return {
    provider: providerRaw === 'gemini' || providerRaw === 'openai-compatible' || providerRaw === 'anthropic'
      ? providerRaw
      : DEFAULT_LLM_CONFIG.provider,
    model: modelRaw ?? DEFAULT_LLM_CONFIG.model,
    apiKey,
    endpoint: endpointRaw ?? '',
  };
}

export async function saveLlmConfigAsync(config: LlmConfig): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(LLM_PROVIDER_KEY, config.provider),
    AsyncStorage.setItem(LLM_MODEL_KEY, config.model),
    AsyncStorage.setItem(LLM_API_KEY_KEY, config.apiKey),
    AsyncStorage.setItem(LLM_ENDPOINT_KEY, config.endpoint),
  ]);
  setCachedApiKey(config.apiKey || null);
}

// Render an API key as first3...last3 (e.g. "AIz...x9K"), or a placeholder when empty.
export function maskApiKey(key: string): string {
  if (!key) return 'Not set';
  if (key.length <= 6) return '••••••';
  return `${key.slice(0, 3)}...${key.slice(-3)}`;
}

// Normalize an OpenAI-compatible endpoint URL: strip trailing slash, append /chat/completions if missing.
export function normalizeOpenAIEndpoint(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  let url = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  if (!url.endsWith('/chat/completions')) {
    url += '/chat/completions';
  }
  return url;
}