# Plan: "Explored" POI Verification Feature

## Overview
Add an "explored" state to POI discoveries. A user who has discovered a POI can enter a camera UI, capture a photo matching the reference image, and have a vision-LLM verify they're at the same place. On match, the POI is marked "explored" globally for all players in the session. Users can supply their own LLM API key via the Options screen or environment variable.

---

## 1. Database Migration (`018_poi_explored.sql`)

```sql
-- Add explored columns to poi_discoveries
ALTER TABLE poi_discoveries
  ADD COLUMN IF NOT EXISTS explored BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS explored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS explored_by UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_photo_uri TEXT;

-- Create poi_explores storage bucket (public read, auth insert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('poi_explores', 'poi_explores', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for objects in poi_explores bucket
DROP POLICY IF EXISTS "Public read access for poi_explores" ON storage.objects;
CREATE POLICY "Public read access for poi_explores"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'poi_explores');

-- Auth users can insert into poi_explores bucket
DROP POLICY IF EXISTS "Auth users can insert into poi_explores" ON storage.objects;
CREATE POLICY "Auth users can insert into poi_explores"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'poi_explores' AND auth.role() = 'authenticated');
```

**Human action:** Run this SQL in Supabase SQL Editor.

---

## 2. `SECURITY-CONSIDERATIONS-FOR-LATER.md` + AGENTS.md pointer

New file at repo root with these entries:
- **Attestation gap (thick-client trust).** Explored state is set by a client-side LLM call with no server verification. Malicious players can UPDATE poi_discoveries.explored=TRUE directly. Later: gate the flip via an RPC that records an LLM response transcript / signed payload.
- **Loose `explored_by` UPDATE policy.** Game-member UPDATE policy permits setting explored_by to any player_id. Tighten CHECK to require explored_by = auth.player_id.
- **Plaintext LLM API key in AsyncStorage.** Acceptable for early iteration; consider OS keystore (Keychain/Keystore via expo-secure-store) before public release.
- **User verification photos** are store-public-readable. Anyone with the URL can view; fine for nostalgia display, not for PII scenes.

Add to AGENTS.md:
```
# Security considerations
Append to SECURITY-CONSIDERATIONS-FOR-LATER.md as you discover security gaps. It's okay to leave some security considerations for later, as these are the early iterations of this application. Keep entries concise.
```

---

## 3. Types

### `mobile/types/PoiDiscovery.ts` (new)
```ts
export type PoiDiscoveryState = {
  poi_id: string;
  discovered_by: string;       // existing player_id
  explored: boolean;
  explored_at: string | null;
  explored_by: string | null;  // UUID of player who verified
  user_photo_uri: string | null;
};
```

---

## 4. Image Similarity Utility (`mobile/lib/imageSimilarity.ts`)

Exports:
```ts
export type SimilarityResult = {
  structureSimilarity: number;  // 0..1, dHash (8x8 gradient hash)
  colorSimilarity: number;      // 0..1, HSV histogram correlation
};

export function computeSimilarity(
  imageBytesA: ArrayBuffer,
  imageBytesB: ArrayBuffer
): Promise<SimilarityResult>;
```

Implementation:
- **dHash (structure):** Downscale to 8×8 grayscale → compute gradient hash → `1 − hammingDistance / 64`
- **HSV histogram (color):** Downscale to 32×32 → histogram over H + S channels → `1 − chiSquaredDistance`
- Both images must first be decoded from JPEG bytes. Use `expo-image-manipulator` for downscaling, then read pixel data from the manipulated file.

---

## 5. Calibration Sub-step

**User provides 4 real image pairs:**
1. Trivially the same (almost identical vantage/time)
2. Same place, different conditions (different angle, minor changes)
3. Completely different place
4. Day/night (same place, daytime vs nighttime)

**Developer action:** Drop pairs under `mobile/assets/similarity-calibration/` in subdirs, then run calibration.

### Calibration script (`mobile/lib/imageSimilarity.calibrate.ts` or `__DEV__` screen)

Reads pairs from `mobile/assets/similarity-calibration/`, runs `computeSimilarity()` on each, prints scores to console.

After collecting real numbers, the calibration-derived ranges are hard-coded as static constants in `lib/vision/prompt.ts` (see step 6).

---

## 6. LLM Vision Adapters (`mobile/lib/vision/`)

### `mobile/lib/vision/types.ts`
```ts
export type VisionProvider = 'gemini' | 'openai' | 'anthropic';

export type VisionCompareResult = {
  match: boolean;
  confidence: number;   // 0..1
  reason?: string;
};

export type VisionCompareInput = {
  referenceImageUrl: string;      // public URL of poi.image_uri
  capturedBase64: string;         // base64 of user's captured photo
  structureSimilarity: number;    // dHash 0..1
  colorSimilarity: number;        // HSV histogram 0..1
};

export type VisionAdapter = {
  compareImages(input: VisionCompareInput, apiKey: string): Promise<VisionCompareResult>;
};
```

### `mobile/lib/vision/prompt.ts`

Contains `buildPrompt(input: VisionCompareInput): string` that injects:

1. **Calibration-derived caption ranges** (hard-coded from calibration run):
   ```
   Reference example ranges we measured on this exact algorithm:
   - Trivially the same place, just different angle/time:  structure ≈ 0.55–0.74, color ≈ 0.78–0.95
   - Same place, different conditions (repainted, different angle): structure ≈ 0.48–0.63, color ≈ 0.70–0.85
   - Different place but same type (e.g. café vs café):  structure ≈ 0.38–0.50, color ≈ 0.55–0.70
   - Different places entirely:                           structure < 0.42, color < 0.50  (both low)
   - Caveat: scores below 0.40 on structure mean ALMOST CERTAINLY a different place.
   ```

2. **2-3 in-context few-shot examples** using realistic score ranges:
   ```
   Example A — structure 0.61, color 0.89 → IS match.
     Reason: "café re-decorated with new paint and chairs; layout nearly identical and palette confirms same place."

   Example B — structure 0.45, color 0.62 → NOT a match.
     Reason: "two different interiors coincidentally sharing warm tones; both scores in the broken mid-range — fail on structural layout."

   Example C — structure 0.31, color 0.40 → NOT a match.
     Reason: "both scores low — completely different environment."
   ```

3. **Actual scores** for the current pair:
   ```
   Current pair:
   - structure (shape/layout) similarity: ${input.structureSimilarity}
   - color (overall palette) similarity: ${input.colorSimilarity}
   ```

4. **Judging instructions:**
   ```
   Decide based on the images themselves; the scores are supporting hints only.
   "Match" means substantially the same place from a similar vantage point.
   IGNORE: time-of-day, weather, minor renovations, signage text changes, parked cars, seasonal foliage.
   Return JSON: {"match": boolean, "confidence": number 0-1, "reason": "brief explanation"}
   ```

### `mobile/lib/vision/adapters/gemini.ts`
- Implement adapter for Gemini API (`gemini-3.5-flash`)
- Send both images + structured prompt via Gemini's vision API (`generateContent`)
- Parse structured JSON response → `VisionCompareResult`

### `mobile/lib/vision/adapters/openai.ts` (skeleton for later)
### `mobile/lib/vision/adapters/anthropic.ts` (skeleton for later)

### `mobile/lib/vision/index.ts`
```ts
export function getVisionClient(config: {
  provider: VisionProvider;
  model: string;
}): VisionAdapter;
```
- Resolves provider → adapter.
- Initial implementation: Gemini only (others throw "not implemented yet").

---

## 7. LLM Config & Context (`mobile/lib/llmConfig.ts` + `LlmConfigContext`)

### `mobile/lib/llmConfig.ts`
```ts
export type LlmConfig = {
  provider: VisionProvider;
  model: string;
  apiKey: string;
};

export function getApiKey(): string | null;
// Returns AsyncStorage value, or fallback to:
// - EXPO_PUBLIC_GEMINI_API_KEY
// - EXPO_PUBLIC_LLM_API_KEY
// (checked via expo-constants)

// AsyncStorage keys:
// - explorience_llm_provider
// - explorience_llm_model
// - explorience_llm_api_key
```

### `mobile/components/LlmConfigContext.tsx` (new)
- Similar pattern to `MapPreferencesContext.tsx`: provider + model + apiKey state, persisted via AsyncStorage, loaded on mount, exposed via React context.
- Default: `{ provider: 'gemini', model: 'gemini-3.5-flash', apiKey: '' }`

---

## 8. Options Screen ("Vision AI" section)

Add to `mobile/app/(tabs)/two.tsx`:

- **Provider picker** (Gemini / OpenAI / Anthropic — Gemini only works for now; others labeled "coming soon")
- **Model** text input (defaults to `gemini-3.5-flash`)
- **API Key** masked text input with show/hide toggle (icon button)
- Note text: "API key can also be set via EXPO_PUBLIC_GEMINI_API_KEY or EXPO_PUBLIC_LLM_API_KEY environment variable"
- All persisted through `LlmConfigContext`

---

## 9. `usePoiDiscovery` Extension

Extend existing `usePoiDiscovery` hook to:
- SELECT now includes `explored`, `explored_at`, `explored_by`, `user_photo_uri` from `poi_discoveries`
- Return `exploredStates: Map<string, PoiDiscoveryState>` (keyed by `poi_id`)
- Realtime UPDATE handler: on `poi_discoveries` UPDATE payload, refresh the `explored`/`explored_by`/`user_photo_uri` state so teammates see the flip live
- Export function: `markExplored(gameId, playerId, poiId, userPhotoUri)` — fire-and-forget Supabase UPDATE setting `explored=TRUE, explored_at=now(), explored_by=playerId, user_photo_uri=userPhotoUri`

---

## 10. `components/ExploreCamera.tsx`

Props: `{ visible: boolean; referenceImageUri: string; onCapture: (capturedUri: string) => void; onClose: () => void }`

- Full-screen modal (`absolute inset-0 z-50`) with `expo-camera` `CameraView`
- **Bottom-left reference thumbnail** (~72×72, rounded, border): `expo-image` showing `referenceImageUri`
  - Tapping the thumbnail shows an **enlarged overlay** (centered, max 80% viewport) with the reference image + ✕ close button + backdrop dismiss
- **Shutter button** bottom-center: circular white ring with white fill, triggers `camera.current.takePictureAsync({ quality: 0.8 })`
- **Close button** (✕) top-left
- On capture: calls `onCapture(result.uri)` then auto-closes modal

- **Permissions:** camera permission requested on mount via `useCameraPermissions()`

---

## 11. `components/ExploreCompareSheet.tsx`

Props: `{ visible: boolean; originalImageUri: string; capturedImageUri: string; onConfirm: (verified: boolean) => void; onRetry: () => void }`

- Slide-up sheet (similar animation to PoiDetailCard)
- **Side-by-side images:** original (left) + captured (right) in two panels
- **"Confirm?"** label centered above
- **Two buttons side-by-side:** "Yes" (primary/green variant) and "Try Again" (secondary variant)
- **"Yes" flow** (handled by consumer component, see step 12):
  1. Downscale both images via `expo-image-manipulator` to 512px max dimension
  2. Convert manipulated files to base64
  3. Run `computeSimilarity()` from `lib/imageSimilarity.ts`
  4. Upload captured photo to `poi_explores` bucket (`${gameId}/${poiId}/${playerId}_${timestamp}.jpg`)
  5. Call `getVisionClient(config).compareImages()` with the public reference URL, captured base64, and similarity scores
  6. On `match=true`: call `markExplored()` (from usePoiDiscovery) → show success animation → close sheet
  7. On `match=false`: show LLM `reason` text + "Try Again" button

---

## 12. `PoiDetailCard` Integration

### New: `components/PoiExploreButton.tsx`
Props: `{ poi: Poi; isExplored: boolean; exploredByUsername?: string; userPhotoUri?: string; onExplore: () => void }`
- Renders differently based on state:
  - **Not explored + has image_uri:** camera icon button onPress → opens ExploreCamera
  - **Explored:** "Explored ✓" badge with `exploredByUsername` + small nostalgia preview of `userPhotoUri` (tappable to enlarge)

### Wire into PoiDetailCard
- Accept new props or read from context: `exploredStates: Map<string, PoiDiscoveryState>`
- Lookup `explored_by` username: `supabase.from('players').select('username').eq('id', explored_by).single()` → cached in local state when the explored state changes
- Render `PoiExploreButton` in the card body (below description, above category badge row)
- Show camera icon only when `poi.image_uri` exists AND POI is not yet explored

---

## 13. Wiring it together (home.tsx or GameMap)

The parent component that holds `PoiDetailCard` needs to:
1. Get `exploredStates` from `usePoiDiscovery`
2. Pass it to `PoiDetailCard`
3. Handle the full explore flow (camera open → capture → compare sheet → verify → mark explored)
4. Provide access to `LlmConfigContext` values

The explore flow state machine lives in a new hook: **`mobile/components/useExploreFlow.ts`**
```ts
type ExploreFlowState = 'idle' | 'camera' | 'comparing' | 'verifying' | 'success' | 'failed';

export function useExploreFlow(): {
  state: ExploreFlowState;
  startExplore: (poi: Poi, gameId: string, playerId: string) => void;
  handleCapture: (capturedUri: string) => void;
  handleConfirm: () => Promise<void>;
  handleRetry: () => void;
  close: () => void;
  ...
};
```

---

## 14. Dependencies & Native Config

### `mobile/package.json` additions
```json
{
  "expo-camera": "~56.0.x",
  "expo-file-system": "~56.0.x",
  "expo-image-manipulator": "~56.0.x"
}
```

### `mobile/app.json` additions
```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Explorience to use your camera to verify discovered locations."
        }
      ]
    ]
  }
}
```

### Android `app.json` addition
```json
{
  "android": {
    "permissions": ["CAMERA"]
  }
}
```

### iOS Info.plist addition (via app.json)
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "Allow Explorience to use your camera to verify discovered locations."
    }
  }
}
```

### Native rebuild required
After step 14, run:
```bash
cd mobile && npx expo run:android
```

---

## Implementation Order

| Step | Description | Native rebuild needed? |
|------|-------------|----------------------|
| 1 | Migration `018_poi_explored.sql` (run manually) | No |
| 2 | `SECURITY-CONSIDERATIONS-FOR-LATER.md` + AGENTS.md pointer | No |
| 3 | `mobile/types/PoiDiscovery.ts` | No |
| 4 | `mobile/lib/imageSimilarity.ts` (dHash + HSV histogram) | No |
| 5 | Calibration — user provides 4 image pairs → `mobile/assets/similarity-calibration/` → run calibration script → hard-code ranges in prompt.ts | No |
| 6 | `mobile/lib/vision/*` (types, prompt.ts, adapters/gemini.ts, index.ts) | No |
| 7 | `mobile/lib/llmConfig.ts` + `mobile/components/LlmConfigContext.tsx` | No |
| 8 | Options screen "Vision AI" section in `two.tsx` | No |
| 9 | `usePoiDiscovery` extension (SELECT new cols, realtime UPDATE handler, `markExplored`) | No |
| 10 | `components/ExploreCamera.tsx` | **Yes (camera)** |
| 11 | `components/ExploreCompareSheet.tsx` | No |
| 12 | `components/PoiExploreButton.tsx` + wire into `PoiDetailCard` | No |
| 13 | `components/useExploreFlow.ts` + wire into GameMap/home | No |
| 14 | Dependencies + `app.json` plugin config → native rebuild | **Yes** |

Steps 1–9 can be built and tested incrementally (all non-native code). Steps 10–14 require native rebuild and should be batched.

---

## Unresolved / Future

- **Security concerns** documented in `SECURITY-CONSIDERATIONS-FOR-LATER.md`
- **Proximity enforcement**: SPEC §2C requires GPS proximity before exploring — implicit because detail card only visible for close/hinted POIs. No explicit check in this iteration.
- **Offline / rate limits**: LLM may fail; inline error + retry handled in compare sheet. No queue/persistence for failed attempts.
- **OpenAI / Anthropic adapters**: skeletons only; implement when requested.
- **Calibration**: pair 4 (day/night) provided by user; if day/night is too extreme for the algorithm, re-tune the prompt captions to explicitly state this weakness.
