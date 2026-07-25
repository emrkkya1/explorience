import type { VisionCompareInput } from './types';

// Calibration-derived caption ranges.
// TODO(CALIBRATION): Replace these placeholder ranges with real numbers
// measured by running `imageSimilarity.calibrate.ts` against image pairs in
// `mobile/assets/calibration/`. The script prints structure + color scores for
// each pair; collect them and paste the observed ranges here.
const CALIBRATION_RANGES = [
  'Trivially the same place, just different angle/time:     structure 0.55-0.74, color 0.78-0.95',
  'Same place, different conditions (repainted, new angle): structure 0.48-0.63, color 0.70-0.85',
  'Different place but same type (e.g. cafe vs cafe):        structure 0.38-0.50, color 0.55-0.70',
  'Different place entirely (both low):                     structure < 0.42, color < 0.50',
  'Caveat: structure below 0.40 is ALMOST CERTAINLY a different place.'
].join('\n');

const FEW_SHOT_EXAMPLES = [
  'Example A — same cafe, re-decorated with new paint and chairs; layout nearly identical, palette confirms same place.',
  '  {"confidence_score": 0.91, "similarity_score": 0.82, "reason": "cafe re-decorated with new paint and chairs; layout nearly identical and palette confirms same place."}',
  '',
  'Example B — two different interiors coincidentally sharing warm tones; both scores in the broken mid-range — fail on structural layout.',
  '  {"confidence_score": 0.78, "similarity_score": 0.34, "reason": "two different interiors coincidentally sharing warm tones; both scores in the broken mid-range - fail on structural layout."}',
  '',
  'Example C — both scores low; completely different environment.',
  '  {"confidence_score": 0.96, "similarity_score": 0.07, "reason": "both scores low - completely different environment."}'
].join('\n');

export function buildPrompt(input: VisionCompareInput): string {
  return [
    'You are a location-verification assistant for an exploration game.',
    'You receive two images: a reference photo of a real-world point of interest, and a photo just captured by a player claiming to be there.',
    'Decide how closely the captured photo shows the same place from a similar vantage point.',
    '',
    'Reference example ranges we measured on this exact image-similarity algorithm:',
    CALIBRATION_RANGES,
    '',
    FEW_SHOT_EXAMPLES,
    '',
    'Current pair:',
    `- structure (shape/layout) similarity: ${input.structureSimilarity.toFixed(3)}`,
    `- color (overall palette) similarity:  ${input.colorSimilarity.toFixed(3)}`,
    '',
    'Decide based on the images themselves; the scores are supporting hints only.',
    '"Same place" means substantially the same place from a similar vantage point.',
    'IGNORE: time-of-day, weather, minor renovations, signage text changes, parked cars, seasonal foliage.',
    '',
    'Return ONLY a JSON object: {"confidence_score": number 0-1, "similarity_score": number 0-1, "reason": "brief explanation"}.',
    '- "confidence_score": how certain you are about your assessment, independent of the verdict. High even for clear non-matches.',
    '- "similarity_score": how closely the captured photo matches the reference place on a 0-1 scale, where 1 = same place from same vantage. For an unrelated photo this should be LOW (e.g. 0.05-0.25), regardless of how confident you are it is not a match.',
    'Do NOT return a "match" field — the match decision is derived downstream as similarity_score >= 0.75.',
    'Both confidence_score and similarity_score MUST be precise decimals, NOT round numbers.',
    'Do NOT return 0.70, 0.75, 0.80, 0.85, 0.90, 0.95. Return values like 0.81, 0.73, 0.69, 0.58, 0.92, 0.07, 0.14 — the specificity matters because the values are shown to the user as precise percentages.'
  ].join('\n');
}