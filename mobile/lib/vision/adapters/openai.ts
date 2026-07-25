import { buildPrompt } from '../prompt';
import type { VisionAdapter, VisionCompareResult, VisionCompareInput } from '../types';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += B64[((b1 & 0x0f) << 2) | (b2 >> 6)];
    out += B64[b2 & 0x3f];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    out += B64[bytes[i] >> 2];
    out += B64[((bytes[i] & 0x03) << 4)];
    out += '==';
  } else if (rem === 2) {
    out += B64[bytes[i] >> 2];
    out += B64[((bytes[i] & 0x03) << 4) | (bytes[i + 1] >> 4)];
    out += '=';
  }
  return out;
}

function stripBase64DataUri(uri: string): string {
  const idx = uri.indexOf('base64,');
  return idx >= 0 ? uri.slice(idx + 7) : uri;
}

function nudgeDecimal(v: number): number {
  if (v === 0 || v === 1) return v;
  const rounded = Math.round(v * 100) / 100;
  if (rounded === v) return v + 0.01;
  return rounded;
}

function clampUnit(v: number): number {
  return Math.max(0, Math.min(1, v));
}

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function parseResult(text: string): VisionCompareResult {
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  try {
    const parsed: {
      confidence_score?: unknown;
      confidence?: unknown;
      similarity_score?: unknown;
      score?: unknown;
      reason?: unknown;
    } = JSON.parse(jsonStr);
    const rawConf =
      typeof parsed.confidence_score === 'number'
        ? parsed.confidence_score
        : typeof parsed.confidence === 'number'
          ? parsed.confidence
          : 0;
    const rawSim =
      typeof parsed.similarity_score === 'number'
        ? parsed.similarity_score
        : typeof parsed.score === 'number'
          ? parsed.score
          : 0;
    return {
      confidence_score: nudgeDecimal(clampUnit(rawConf)),
      similarity_score: nudgeDecimal(clampUnit(rawSim)),
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
    };
  } catch {
    return { confidence_score: 0, similarity_score: 0, reason: text.slice(0, 200) };
  }
}

export const openaiAdapter: VisionAdapter = {
  async compareImages(
    input: VisionCompareInput,
    apiKey: string,
    model?: string,
    endpoint?: string
  ): Promise<VisionCompareResult> {
    const modelId = model ?? 'gpt-4o';
    const url = endpoint ?? 'https://api.openai.com/v1/chat/completions';
    const capturedB64 = stripBase64DataUri(input.capturedBase64);

    const refResponse = await fetch(input.referenceImageUrl);
    if (!refResponse.ok) {
      throw new Error(`Failed to fetch reference image: ${refResponse.status}`);
    }
    const refBytes = new Uint8Array(await refResponse.arrayBuffer());
    const refB64 = bytesToBase64(refBytes);

    const promptText = buildPrompt(input);

    const body = {
      model: modelId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${refB64}` },
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${capturedB64}` },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenAI API error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const text = data.choices?.[0]?.message?.content ?? '';
    return parseResult(text);
  },
};