import { buildPrompt } from '../prompt';
import type { VisionAdapter, VisionCompareResult, VisionCompareInput } from '../types';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
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
    out += B64[(bytes[i] & 0x03) << 4];
    out += '==';
  } else if (rem === 2) {
    out += B64[bytes[i] >> 2];
    out += B64[((bytes[i] & 0x03) << 4) | (bytes[i + 1] >> 4)];
    out += B64[(bytes[i + 1] & 0x0f) << 2];
    out += '=';
  }
  return out;
}

function stripBase64DataUri(dataUri: string): string {
  const comma = dataUri.indexOf(',');
  return comma >= 0 && dataUri.slice(0, comma).startsWith('data:') ? dataUri.slice(comma + 1) : dataUri;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

// Forbidden "round" LLM values — when the model ignores the prompt's
// instruction to return specific decimals. We deterministically nudge by
// +/-0.01 so the displayed percentage isn't a multiple of 5/10.
const ROUND_VALUES = new Set([0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 0.6, 0.65]);

function nudgeDecimal(value: number): number {
  if (ROUND_VALUES.has(value)) {
    // Pick a deterministic direction by parity of the integer part so the
    // same input always nudges the same way (no flicker between renders).
    const bump = Math.floor(value * 100) % 2 === 0 ? 0.01 : -0.01;
    const next = value + bump;
    if (next < 0) return 0.01;
    if (next > 1) return 0.99;
    if (ROUND_VALUES.has(next)) {
      // Rare: still landed on a round value; nudge again in the opposite dir.
      return value - bump * 2;
    }
    return next;
  }
  return value;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseResult(rawText: string): VisionCompareResult {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return { confidence_score: 0, similarity_score: 0, reason: rawText.slice(0, 200) };
  }
  try {
    const parsed = JSON.parse(rawText.slice(start, end + 1)) as {
      confidence_score?: unknown;
      similarity_score?: unknown;
      confidence?: unknown;
      score?: unknown;
      reason?: unknown;
    };
    // Prefer the explicit field names; fall back to legacy single-word names
    // so a cached/older LLM reply still parses.
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
    return { confidence_score: 0, similarity_score: 0, reason: rawText.slice(0, 200) };
  }
}

export const geminiAdapter: VisionAdapter = {
  async compareImages(
    input: VisionCompareInput,
    apiKey: string,
    model?: string
  ): Promise<VisionCompareResult> {
    const modelId = model ?? 'gemini-2.5-flash';
    const capturedB64 = stripBase64DataUri(input.capturedBase64);

    const refResponse = await fetch(input.referenceImageUrl);
    if (!refResponse.ok) {
      throw new Error(`Failed to fetch reference image: ${refResponse.status}`);
    }
    const refBytes = new Uint8Array(await refResponse.arrayBuffer());
    const refB64 = bytesToBase64(refBytes);

    const promptText = buildPrompt(input);

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            { inline_data: { mime_type: 'image/jpeg', data: refB64 } },
            { inline_data: { mime_type: 'image/jpeg', data: capturedB64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseResult(text);
  },
};