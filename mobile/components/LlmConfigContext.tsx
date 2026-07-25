import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  DEFAULT_LLM_CONFIG,
  loadLlmConfigAsync,
  saveLlmConfigAsync,
} from '@/lib/llmConfig';
import type { LlmConfig } from '@/lib/llmConfig';
import type { VisionProvider } from '@/lib/vision/types';

type LlmConfigContextValue = {
  config: LlmConfig;
  ready: boolean;
  setProvider: (provider: VisionProvider) => void;
  setModel: (model: string) => void;
  setApiKey: (apiKey: string) => void;
  setEndpoint: (endpoint: string) => void;
};

const LlmConfigContext = createContext<LlmConfigContextValue | null>(null);

type LlmConfigProviderProps = {
  children: ReactNode;
};

export function LlmConfigProvider({ children }: LlmConfigProviderProps) {
  const [config, setConfig] = useState<LlmConfig>(DEFAULT_LLM_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadLlmConfigAsync();
      if (cancelled) return;
      setConfig(loaded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setProvider = useCallback(
    (provider: VisionProvider) => {
      setConfig(prev => {
        const next = { ...prev, provider };
        saveLlmConfigAsync(next).catch((err) => {
          console.error('[LlmConfig] save error', err);
        });
        return next;
      });
    },
    []
  );
  const setModel = useCallback(
    (model: string) => {
      setConfig(prev => {
        const next = { ...prev, model };
        saveLlmConfigAsync(next).catch((err) => {
          console.error('[LlmConfig] save error', err);
        });
        return next;
      });
    },
    []
  );
  const setApiKey = useCallback(
    (apiKey: string) => {
      setConfig(prev => {
        const next = { ...prev, apiKey };
        saveLlmConfigAsync(next).catch((err) => {
          console.error('[LlmConfig] save error', err);
        });
        return next;
      });
    },
    []
  );
  const setEndpoint = useCallback(
    (endpoint: string) => {
      setConfig(prev => {
        const next = { ...prev, endpoint };
        saveLlmConfigAsync(next).catch((err) => {
          console.error('[LlmConfig] save error', err);
        });
        return next;
      });
    },
    []
  );

  return (
    <LlmConfigContext.Provider
      value={{ config, ready, setProvider, setModel, setApiKey, setEndpoint }}
    >
      {children}
    </LlmConfigContext.Provider>
  );
}

export function useLlmConfig(): LlmConfigContextValue {
  const ctx = useContext(LlmConfigContext);
  if (!ctx) {
    throw new Error('useLlmConfig must be used within an LlmConfigProvider');
  }
  return ctx;
}