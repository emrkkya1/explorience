# Explorience Design Guide

## Color System

All colors are theme-aware. Always use `Colors[colorScheme].token` or Tailwind classes (`bg-primary`, `text-text-primary`, etc.). **Never hardcode hex values.**

### Palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `background` | `#FAFAFA` | `#0A0A0A` | Screen backgrounds |
| `surface` | `#FFFFFF` | `#171717` | Cards, rows, modals |
| `text` | `#171717` | `#FAFAFA` | Primary text |
| `textTertiary` | `#A3A3A3` | `#525252` | Placeholders, subtle labels |
| `border` | `#E5E5E5` | `#262626` | Dividers, card borders |
| `primary` | `#EA580C` | `#F97316` | CTAs, active states, brand |
| `success` | `#16A34A` | `#22C55E` | Checkmarks, verified states |
| `warning` | `#CA8A04` | `#EAB308` | Alerts, battery warnings |
| `danger` | `#DC2626` | `#EF4444` | Destructive actions, errors |
| `tabIconDefault` | `#A3A3A3` | `#737373` | Inactive icons |
| `tabIconSelected` | `#EA580C` | `#F97316` | Active tab icons |

### Semantic Colors (import from `Colors.ts`)

```typescript
import Colors, { semanticColors } from '@/constants/Colors';

semanticColors.overlay[colorScheme]       // Modal backdrops
semanticColors.glassSurface[colorScheme]  // Map overlays (header, badge)
semanticColors.similarity.high/mid/low    // Gauge colors
```

### Rarity Colors

| Rarity | Color | Usage |
|---|---|---|
| Legendary | `#EAB308` | Gold — rarest POIs |
| Epic | `#A855F7` | Purple |
| Rare | `#3B82F6` | Blue |
| Common | `#78716C` | Warm gray |

Use `RARITY_COLORS` from `@/constants/Rarity` or `rarityColors` from `@/constants/Colors`.

---

## Typography

Fonts: **Anton** (headings), **Plus Jakarta Sans** (body).

| Variant | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `h1` | 32px | Anton bold | 1.2 | Brand titles, big numbers |
| `h2` | 24px | Anton bold | 1.2 | Section headers |
| `h3` | 18px | Jakarta bold | 1.2 | Card titles, row labels |
| `body` | 15px | Jakarta regular | 1.5 | Default text |
| `bodySmall` | 13px | Jakarta regular | 1.5 | Secondary descriptions |
| `caption` | 11px | Jakarta semibold | — | Uppercase labels, metadata |
| `button` | 14px | Jakarta bold | — | Button labels |
| `mono` | 13px | Jakarta medium | — | Stats, counts, codes |

Color override: `color="primary" | "secondary" | "accent" | "danger"`.

---

## Spacing & Layout

- Page padding: `px-4` (16px)
- Section gap: `gap-3` (12px) between rows, `mb-8` between sections
- Row height: `h-12` (48px) minimum touch target
- Card padding: `p-4` (16px)
- Safe area: use `useSafeAreaInsets()` + `paddingTop: insets.top + 16`

---

## Border Radius

| Class | Value | Usage |
|---|---|---|
| `rounded-lg` | 12px | Cards, inputs, buttons |
| `rounded-xl` | 16px | Large cards, modals |
| `rounded-2xl` | 20px | Bottom sheets, login inputs |
| `rounded-full` | 9999px | Avatars, pills, toggles |

---

## Components

### Button

```tsx
<Button title="Continue" variant="primary" />
<Button title="Back" variant="ghost" />
<Button title="Loading…" loading />
```

Variants: `primary` (filled orange), `secondary` (outlined), `ghost` (text only). Height: 48px.

### Card

```tsx
<Card>Content</Card>
<Card accent="primary">Left accent border</Card>
```

Surface background, 1px border, `rounded-xl`, `p-4`.

### IconButton

```tsx
<IconButton onPress={fn} size={36}>
  <SymbolView name={...} size={18} tintColor={colors.text} />
</IconButton>
```

Glass-morphism surface (80% opacity), `rounded-xl`. Default 48px.

### FormRow (settings pattern)

```tsx
<Pressable className="flex-row items-center gap-3 bg-surface rounded-xl p-4"
  style={{ borderWidth: 1, borderColor: colors.border }}>
  <View className="w-9 h-9 rounded-lg items-center justify-center"
    style={{ backgroundColor: colors.primary + '12' }}>
    <SymbolView name={...} size={18} tintColor={colors.primary} />
  </View>
  <View className="flex-1">
    <ThemedText variant="h3">Label</ThemedText>
    <ThemedText variant="caption" className="mt-0.5 normal-case opacity-70">Sublabel</ThemedText>
  </View>
  <SymbolView name="chevron.right" size={16} tintColor={colors.textTertiary} />
</Pressable>
```

### Input Field

```tsx
<View className="flex-row items-center bg-surface border border-border rounded-2xl px-4 h-14">
  <SymbolView name={...} size={18} tintColor={colors.tabIconDefault} />
  <TextInput className="flex-1 ml-3 h-full" placeholder="..."
    placeholderTextColor={colors.textTertiary} />
</View>
```

### Toggle Checkbox

```tsx
<View className="w-6 h-6 rounded-full items-center justify-center"
  style={{ backgroundColor: active ? colors.success : colors.border }}>
  {active && <SymbolView name="checkmark" size={14} tintColor="#FFFFFF" />}
</View>
```

---

## Map Overlays

Use `semanticColors.glassSurface[colorScheme]` for floating UI over the map.

- **MapHeader**: Top bar, `rounded-2xl`, `px-3 py-2`, compact rarity dots + total count
- **MapControls**: IconButton with glass background, positioned at screen edges
- **BgEventsBadge**: Glass card, left side below header
- **ExploredSidebar**: Right slide-in, full height, surface background
- **PoiDetailCard**: Bottom sheet, `borderRadius: 20`, drag handle at top

---

## Animations

- Slide transitions: `withTiming(value, { duration: 300 })`
- Fade transitions: `withTiming(value, { duration: 200 })`
- Card slide-up: `duration: 350`
- Press feedback: use `PressableScale` (built-in)

---

## Dark Mode Rules

1. Every color must have a dark variant defined in `Colors.ts`.
2. Use Tailwind `dark:` prefix classes (`bg-surface dark:bg-surface-dark`).
3. For inline `style` props, compute from `Colors[colorScheme]`.
4. Overlays use `semanticColors.overlay[colorScheme]` (darker in dark mode).
5. `Appearance.setColorScheme()` — only call for `'light'` or `'dark'`, never `'system'`.

---

## Icon Usage

- **expo-symbols** (`SymbolView`): SF Symbols on iOS, Material on Android. Preferred.
- **lucide-react-native**: Fallback for symbols not available in SF Symbols.
- Icon sizes: 14 (small), 16 (medium), 18 (default), 20 (large), 22+ (hero).
- Tint: `colors.tabIconDefault` for inactive, `colors.primary` for active/branded.

---

## Screen Patterns

### Settings Screen
- Group rows under `SectionHeader` captions (uppercase, `tracking-widest`)
- `gap-3` between rows, `mb-8` between sections
- Inline toggles for booleans, chevron rows for navigation

### Login Screen
- Compass icon brand mark + "EXPLORIENCE" wordmark
- Icon-prefixed inputs with `rounded-2xl`
- Card-based saved game rows with "Continue" button

### Map Screen
- Glass-morphism overlays (header, badge, controls)
- POI detail: bottom sheet with drag handle, full-width CTA
- Sidebar: segmented control with count badges, illustrated empty state
