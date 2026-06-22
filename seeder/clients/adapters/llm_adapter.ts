export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  responseSchema?: Record<string, unknown>;
}

export interface LLMGenerateResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMAdapter {
  generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMGenerateResponse>;
}
