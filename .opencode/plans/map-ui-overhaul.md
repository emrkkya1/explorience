# Map UI Overhaul — Implementation Plan

## Decisions Made

| Decision | Choice |
|---|---|
| Map base style | `StyleURL.Light` — warm, parchment-like feel |
| Fog of war | Noise texture fill + feathered edge rings |
| Fog color | Muted teal `#1a2f3a` at 65% opacity |
| Mapbox ornaments | Hide everything (logo, scale bar, attribution) |
| Icon library | `@phosphor-icons/react` (installed) |
| Fog texture | Generated programmatically (Perlin noise PNG) |
| Marker approach | `CircleLayer` (rarity bg) + `SymbolLayer` (category icon) |

---

## Phase 1: Dependencies

**Already done**: `@phosphor-icons/react` and `react-native-svg` installed. `pngjs` installed as devDependency for texture generation.

---

## Phase 2: Fog Noise Texture

Generate a 256x256 tileable Perlin noise PNG using a Node.js script (`/tmp/opencode/generate-fog-texture.js`). The script:
- Seeds a permutation table
- Generates 6-octave fBm noise
- Outputs a grayscale PNG to `mobile/assets/images/fog-texture.png`

This texture will be registered as a Mapbox sprite and used as `fillPattern` on the fog `FillLayer`.

---

## Phase 3: `GameMap.tsx` — Style & Ornaments

Changes:
- Add `styleURL={Mapbox.StyleURL.Light}` to `MapView`
- Add `logoEnabled={false}`, `scaleBarEnabled={false}`, `attributionEnabled={false}`
- No other structural changes

---

## Phase 4: `FogOfWarLayer.tsx` — Complete Rewrite

### Architecture
Two layers rendered on top of each other:

1. **Feather layer** (bottom): `FillLayer` with expanded rectangles around explored areas
   - `fillColor: '#1a2f3a'`
   - `fillOpacity: 0.3`
   - Solid fill (no texture) — creates the soft edge gradient
   
2. **Main fog layer** (top): `FillLayer` with the original fog polygon + holes
   - `fillColor: '#1a2f3a'`
   - `fillOpacity: 0.65`
   - `fillPattern: 'fog-texture'` — tiled noise texture

### Feather Geometry
For each explored rectangle `{x, y, w, h}`:
- Compute feather rect: `{x-1, y-1, w+2, h+2}` (clamped to bitmap bounds)
- Convert to geo coordinates using `bounds.west + x * CELL_SIZE` etc.
- Collect all feather rects into a single MultiPolygon GeoJSON

### Sprite Registration
Add `<Mapbox.Images>` with the fog texture:
```tsx
<Mapbox.Images images={{ 'fog-texture': require('@/assets/images/fog-texture.png') }} />
```

### Visual Result
Clear explored area → 30% opacity teal feather ring → 65% opacity textured fog → unexplored

---

## Phase 5: `PoiLayer.tsx` — Category Icons

### Sprite Registration
Register 7 Phosphor icons as Mapbox sprites via `<Mapbox.Images>` + `<Mapbox.Image>`:

| Category | Phosphor Icon | Sprite Name |
|---|---|---|
| nightlife | `Moon` | `icon-nightlife` |
| food | `ForkKnife` | `icon-food` |
| landmark | `Buildings` | `icon-landmark` |
| history | `Scroll` | `icon-history` |
| nature | `Tree` | `icon-nature` |
| shopping | `ShoppingBag` | `icon-shopping` |
| miscellaneous | `MapPin` | `icon-misc` |

Each sprite: white icon (24x24px) on transparent background, rendered via `<Mapbox.Image name="..."><View>...</View></Mapbox.Image>`.

### Layer Structure
**Hinted POIs** (undiscovered, in hint range):
- `CircleLayer`: `accent` (`#D4A843`) background, 14px radius, white stroke
- `SymbolLayer`: `?` text label in dark text

**Discovered POIs**:
- `CircleLayer`: rarity-colored background via `match` expression:
  - legendary → `#FFD700` (gold)
  - epic → `#9B59B6` (purple)
  - rare → `#3498DB` (blue)
  - common → `#95A5A6` (gray)
- `SymbolLayer`: white category icon via `iconImage` matched by `category` property:
  ```
  ['match', ['get', 'category'],
    'nightlife', 'icon-nightlife',
    'food', 'icon-food',
    ...
    'icon-misc']
  ```

Both layers share the same `ShapeSource`.

---

## Phase 6: `PlayerMarker.tsx` — Design Palette

- Outer dot: `primary` (`#2D6A4F`) instead of Google blue
- Border: white (keep)
- Heading cone: `primary` (`#2D6A4F`)
- Optional: small `accent` (`#E8C45A`) inner dot for RPG feel

---

## File Changes Summary

| File | Action |
|---|---|
| `mobile/assets/images/fog-texture.png` | **New** — generated noise texture |
| `mobile/components/GameMap.tsx` | **Edit** — style URL, ornament props |
| `mobile/components/FogOfWarLayer.tsx` | **Rewrite** — texture + feather + new color |
| `mobile/components/PoiLayer.tsx` | **Rewrite** — Phosphor icons as sprites |
| `mobile/components/PlayerMarker.tsx` | **Edit** — palette colors |

---

## Implementation Order

1. Generate fog texture PNG (script → asset)
2. `GameMap.tsx` — quick style/ornament changes
3. `FogOfWarLayer.tsx` — full rewrite
4. `PoiLayer.tsx` — full rewrite
5. `PlayerMarker.tsx` — color updates
