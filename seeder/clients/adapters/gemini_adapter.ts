import { LLMAdapter, LLMGenerateOptions, LLMGenerateResponse } from './llm_adapter';
import { logger } from '../../utils/logging';

export class GeminiAdapter implements LLMAdapter {
  constructor(
    private apiKey: string,
    private defaultModel: string = 'gemini-3.1-flash-lite'
  ) {}

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMGenerateResponse> {
    const model = options?.model || this.defaultModel;
    
    logger.debug('Gemini API call', { model, promptLength: prompt.length });

    const generationConfig: Record<string, unknown> = {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 2048,
    };

    if (options?.responseSchema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = options.responseSchema;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    return {
      text: data.candidates[0].content.parts[0].text,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }
}
