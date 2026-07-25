import type { VisionProvider } from '@/lib/vision/types';

export type ProviderModelOption = {
  id: string;
  label: string;
};

export type ProviderOption = {
  id: VisionProvider;
  label: string;
  available: boolean;
};

export const VISION_PROVIDERS: ProviderOption[] = [
  { id: 'gemini', label: 'Gemini', available: true },
  { id: 'anthropic', label: 'Claude', available: false },
  { id: 'openai-compatible', label: 'OpenAI Compatible', available: true },
];

export const PROVIDER_MODELS: Record<VisionProvider, ProviderModelOption[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', label: '2.5 Flash' },
    { id: 'gemini-3.5-flash', label: '3.5 Flash' },
    { id: 'gemini-3.1-flash-lite', label: '3.1 Flash-Lite' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4.5', label: 'Claude Opus 4.5' },
  ],
  'openai-compatible': [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
  ],
};

export function getProviderLabel(provider: VisionProvider): string {
  return VISION_PROVIDERS.find((p) => p.id === provider)?.label ?? provider;
}