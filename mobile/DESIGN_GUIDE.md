# Explorience Design Guide

## 1. Design Principles

- **Grounded, not gimmicky** — solid surfaces, no floating glass. The UI lives in a header bar, a bottom bar, and stable cards.
- **Vibrant but usable** — bold color, but never at the expense of legibility or tap targets.
- **Navigation-first** — the map is the primary interface; all UI is chrome around it, never covering it unnecessarily.
- **Game-feel through color & typography, not illustrations** — no custom SVGs or illustrations. Semi-RPG energy comes from the forest/navy/gold palette, condensed bold headings, and badge/XP UI patterns.
- **Dark mode from day one** — every token has a light and dark variant.

---

## 2. Color Palette

### Light Mode

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#F8F7F4` | Page background |
| `surface` | `#FFFFFF` | Cards, header bar, bottom bar |
| `primary` | `#2D6A4F` | Buttons, active states, success |
| `secondary` | `#1E3A5F` | Secondary surfaces, outlines |
| `accent` | `#D4A843` | Highlights, badges, XP bars |
| `textPrimary` | `#1A1A1A` | Body text, headings |
| `textSecondary` | `#5A5A5A` | Captions, labels, placeholders |
| `danger` | `#C4463A` | Errors, destructive actions |
| `border` | `#E2E0DC` | Subtle borders, dividers |

### Dark Mode

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0D1B2A` | Page background |
| `surface` | `#1B2838` | Cards, header bar, bottom bar |
| `primary` | `#40916C` | Buttons, active states, success |
| `secondary` | `#2C3E50` | Secondary surfaces, outlines |
| `accent` | `#E8C45A` | Highlights, badges, XP bars |
| `textPrimary` | `#F0F0F0` | Body text, headings |
| `textSecondary` | `#A0A0A0` | Captions, labels, placeholders |
| `danger` | `#E85D50` | Errors, destructive actions |
| `border` | `#2E4050` | Subtle borders, dividers |

---

## 3. Typography

| Role | Font | Weight | Size | Case |
|---|---|---|---|---|
| Heading 1 | Anton | 400 | 32px | UPPERCASE |
| Heading 2 | Anton | 400 | 24px | UPPERCASE |
| Heading 3 | Plus Jakarta Sans | 700 | 18px | Sentence |
| Body | Plus Jakarta Sans | 400 | 15px | Sentence |
| Body Small | Plus Jakarta Sans | 400 | 13px | Sentence |
| Caption / Label | Plus Jakarta Sans | 600 | 11px | UPPERCASE |
| Button Label | Plus Jakarta Sans | 700 | 14px | Sentence |
| Mono / Stats | Plus Jakarta Sans | 500 | 13px | UPPERCASE |

- **Anton** is used exclusively for large headings (never body text). Anton renders in uppercase; write source text in sentence case and let the font do the capitalization.
- **Plus Jakarta Sans** handles everything else.
- Line-height: 1.2 for Anton headings, 1.5 for body text.
- Letter-spacing: +0.5px for caption labels (uppercase), normal for everything else.
- Web fallback: `'Anton', sans-serif` / `'Plus Jakarta Sans', sans-serif`.

---

## 4. Spacing & Layout

### Spacing Scale

```
4   8   12   16   20   24   32   48
```

- Use the scale consistently. Avoid arbitrary values.
- 16px is the default padding for cards and screen edges.
- 8px is the default gap between stacked elements.
- 12px is the default gap between inline elements.

### Radii

| Token | Value | Usage |
|---|---|---|
| `radiusSm` | 4px | Small indicators, avatars |
| `radiusMd` | 8px | Buttons, inputs, badges |
| `radiusLg` | 12px | Cards, sheets, modals |
| `radiusFull` | 0px | None — no pill shapes |

### Layout Shell

- **Header bar**: 56px height, `surface` background, horizontal padding 16px. No shadow — use a 1px bottom `border` instead.
- **Bottom tab bar**: 64px total height (48px bar + 16px safe area), `surface` background, 1px top `border`. Icons + label below.
- **Content area**: padding 0 (flush with header and tab bar). Cards inside content use 16px horizontal margin.
- **Safe area**: respected via `react-native-safe-area-context`. Header and tab bar include safe area insets.

---

## 5. Component Styles

### Buttons

| Variant | bg | text | border | radius |
|---|---|---|---|---|
| Primary | `primary` | white | none | 8px (iOS) / 4px (Android) |
| Secondary | transparent | `primary` | 1.5px `primary` | 8px / 4px |
| Ghost | transparent | `textPrimary` | none | 8px / 4px |

- Height: 48px (touch-friendly). Horizontal padding: 24px.
- Loading state: show a `ActivityIndicator` in place of label.

### Cards

- `surface` background, `radiusLg` (12px), 16px padding.
- No shadow — 1px `border` (`border` token).
- Optional: left accent bar in `primary` or `accent`.

### Badges / Chips

- `accent` background, dark text (`#1A1A1A` or `#0D1B2A`), `radiusMd` (8px).
- Horizontal padding 8px, vertical padding 4px.
- Compact for inline use (e.g. XP gain, item rarity label).

### Progress / XP Bars

- Height: 6px. Background: `border` token. Fill: `primary` (regular) or `accent` (XP/gold).
- `radiusSm` (4px) on the track and fill.
- Optional label above (right-aligned, `caption` style).

### Input Fields

- `surface` background, 1px `border`, `radiusMd` (8px).
- Height: 48px. Horizontal padding: 16px. 15px body text.
- Focus state: `primary` border. Error state: `danger` border.
- Placeholder: `textSecondary`.

### Map Markers / POI

- Solid circle, 28px diameter, `primary` or `accent` background.
- 2px white inner ring + shadow for depth.
- Hinted (undiscovered) POI: `accent` with `?` label.
- Discovered POI: colored by rarity (gold → `accent`, purple → rarity color, blue → common).
- Player marker: `primary` dot with heading cone, no glow.

---

## 6. Iconography

- Use `expo-symbols` (`SymbolView`) for all icons.
- Prefer **filled** variants over outlined.
- Common mappings:

| Action | Symbol Name |
|---|---|
| Map / Explore | `location.fill` |
| Details / Settings | `gearshape.fill` |
| Profile / Player | `person.fill` |
| Back | `chevron.left` |
| Close | `xmark` |
| Search | `magnifyingglass` |
| Log Out | `rectangle.portrait.and.arrow.right` |
| XP / Progress | `star.fill` |
| Achievements | `trophy.fill` |
| Compass / Direction | `location.north.line.fill` |

- Icon color: inherit from text color of parent element, or use `accent` for highlighted icons.
- Icon size: 20–22px (tab bar), 16–18px (inline), 24px (standalone).
- No custom SVG icons unless explicitly required.

---

## 7. Motion & Animation

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Button press | Scale 0.97 | 100ms | ease-out |
| Tab switch | Cross-fade | 150ms | ease-out |
| Page push (iOS) | Slide from right | 350ms | default (system) |
| Page push (Android) | Fade + elevation | 300ms | ease-out |
| Map marker appear | Scale 0 → 1 (spring) | 300ms | spring (damping 12, stiffness 200) |
| Bottom sheet / modal | Slide up | 350ms | ease-out |

- Use `react-native-reanimated` for custom animations (button press, marker appear).
- Default Expo Router transitions are acceptable for page navigation.
- Avoid decorative animations — motion should communicate state changes.

---

## 8. Logo & Brand Assets

> **Status: Pending** — logo, wordmark, and brand marks have not been designed yet.

Guidelines for future reference:
- Logo should work in two variants: **solid** (on `bg` / `surface`) and **reversed** (on `primary`).
- Prefer a mark-only icon (no text) for the app icon and tab bar.
- Wordmark font should use **Anton** for consistency with headings.
- Current `assets/images/icon.png`, `splash-icon.png`, and adaptive icons are generated defaults — replace when brand assets are ready.

---

## 9. Dark Mode Rules

- All backgrounds are **navy-based**, not pure black (`#000`). This prevents harsh contrast and keeps the semi-RPG atmosphere.
- `surface` is one step lighter than `bg` in dark mode to create depth.
- Gold accent (`#E8C45A`) is brighter in dark mode to maintain legibility — pure gold (`#D4A843`) is too dim on navy.
- Text contrast ratio must meet **≥ 4.5:1** for body text, **≥ 3:1** for large headings.
- Use `useColorScheme()` or `useThemeColor` to switch tokens. Prefer CSS class-level switching via the `dark` class in `global.css` on web.
- **Map**: remain light by default. Map tiles have their own lighting and dark map tiles would reduce POI legibility.
- Transition between modes: instant (no animated cross-fade for now).
