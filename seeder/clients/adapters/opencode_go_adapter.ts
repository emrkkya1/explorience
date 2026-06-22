import { LLMAdapter, LLMGenerateOptions, LLMGenerateResponse } from './llm_adapter';
import { logger } from '../../utils/logging';

export class OpenCodeGoAdapter implements LLMAdapter {
  constructor(
    private apiKey: string,
    private defaultModel: string = ''
  ) {}

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMGenerateResponse> {
    const model = options?.model || this.defaultModel;

    logger.debug('OpenCode GO API call', { model, promptLength: prompt.length });

    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens ?? 2048,
      stream: false,
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options?.responseSchema) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://opencode.ai/zen/go/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenCode GO API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    return {
      text: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }
}
