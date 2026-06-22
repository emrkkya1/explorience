# AGENTS.md

## Expo SDK 56 — READ VERSIONED DOCS

Always use https://docs.expo.dev/versions/v56.0.0/ — APIs differ from older/newer SDKs.

## Commands

All commands must be run from the `mobile/` directory:

```
cd mobile
npx expo run:android  # primary dev/debug target: Android dev build on Pixel 10 emulator
npx expo run:ios     # iOS simulator (secondary)
npm run web          # Web (Metro bundler, static output)
npx tsc --noEmit     # BROKEN: hangs due to tsconfig "include" scanning node_modules — do not run
```

No lint, test, format, or CI pipeline is configured. Do not invent or run them.

## Architecture

- **Expo Router** file-based routing — entry point is `expo-router/entry`, routes live in `mobile/app/`
- **Path alias**: `@/*` → project root (configured in `mobile/tsconfig.json`)
- **Typed routes** enabled (`app.json` experiments) — route types auto-generated in `mobile/.expo/types/`
- **Backend**: Supabase (`@supabase/supabase-js`) — no visible config; likely needs env vars
- **Migrations**: Apply SQL migrations manually via the Supabase dashboard (SQL Editor) — no `supabase migration up` or automated pipeline. Migration files live in `mobile/supabase/migrations/`
- **Generated files**: `mobile/expo-env.d.ts` and `mobile/.expo/` are gitignored auto-generated — do not edit
- **Web**: Metro bundler with `output: "static"` (not server)
- **SPEC.md**: Read SPEC.md before developing a brand new feature / editing any schema to learn about this application and it's structure.

## File Structure

```
explorience/
├── mobile/
│   ├── app/                    # Expo Router file-based routing (screens)
│   │   ├── _layout.tsx         # Root layout
│   │   ├── +html.tsx           # Web-only root HTML
│   │   ├── +not-found.tsx      # 404 screen
│   │   └── (tabs)/             # Tab group
│   ├── components/             # Shared components and hooks (no separate hooks/ dir)
│   ├── constants/              # Constants, config, theme values
│   ├── lib/                    # Library/client initialization (Supabase, etc.)
│   ├── assets/                 # Static assets (fonts, images)
│   │   ├── fonts/
│   │   └── images/
│   ├── global.css              # Tailwind CSS imports
│   ├── app.json                # Expo config
│   └── tsconfig.json
└── seeder/                     # Database seeder
```

- Place new components in `mobile/components/` using `PascalCase.tsx` filenames.
- Place hooks alongside components in `mobile/components/` using `camelCase.ts` filenames (e.g. `useXyz.ts`).
- Add `.web.ts(x)` suffix for web-specific platform variants (Metro resolves these automatically).
- Use `Platform.OS !== 'web'` inline guards for small platform differences instead of separate files.
- Keep route groups in `mobile/app/(groupname)/` folders.
- No `hooks/`, `utils/`, `lib/`, `types/`, or `services/` directories exist yet — create them only when needed.

## Code Style

### TypeScript
- Strict mode is on — all function parameters and return types must be explicitly typed.
- Use `type` aliases for all type definitions, never `interface`.
- Use `import type { ... }` for type-only imports.
- Prefer utility types (`Omit<>`, `ComponentProps<>`, `React.ComponentProps<typeof ...>`) to derive prop types.

### Components
- Declare components with `function` keyword (not arrow functions).
- Props type goes inline: `export function Foo(props: { title: string })` or as a named type alias.
- Destructure props at the top of the function body, spread `...otherProps` last.
- Compose dynamic styles with array syntax: `style={[{ color: themeColor }, style]}`.
- Place static `StyleSheet.create()` calls after the component function, at the bottom of the file.
- Set `displayName` on wrapped components for debugging.

### Exports
- **Default exports** for Expo Router screen components (`app/` directory) and constants objects.
- **Named exports** for shared components, hooks, and utility functions.

### Imports
Three groups, separated by blank lines, in this order:
1. Third-party / external library imports
2. Local relative imports (`./`)
3. Path-alias imports (`@/constants/...`, `@/components/...`)

### Naming
| What | Convention | Example |
|---|---|---|
| Component files & functions | `PascalCase` | `Themed.tsx`, `ExternalLink` |
| Hooks (files & functions) | `camelCase`, `use` prefix | `useColorScheme.ts`, `useThemeColor` |
| Constants files | `PascalCase.ts` | `Colors.ts` |
| Variables & style keys | `camelCase` | `tintColorLight`, `styles.container` |

### Formatting
- **Single quotes** for strings.
- **Semicolons** at end of statements.
- **No trailing commas** in objects, arrays, or parameter lists.
- **No spaces** inside JSX curly braces: `{value}` not `{ value }`.
- 2-space indentation.

### Patterns
- Early return guards for loading/error states (`if (!loaded) return null;`).
- Use `StyleSheet.create()` for all static styles; inline styles only for dynamic values.
- Re-export with `export { X } from 'module';` syntax when forwarding exports.
- Spread `...otherProps` last on components to allow consumer overrides.

### CSS / Tailwind
- Tailwind utilities applied via `className` on components wrapped by `tw/` bindings.
- Global styles and font CSS variables go in `global.css`.
