import { LLMAdapter } from './adapters/llm_adapter';
import { LLMGenerateOptions, LLMGenerateResponse } from './adapters/llm_adapter';

export class LLMClient {
  constructor(private adapter: LLMAdapter) {}

  async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMGenerateResponse> {
    return this.adapter.generate(prompt, options);
  }
}
