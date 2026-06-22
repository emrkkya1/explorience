# Place Seeding Pipeline

A modular, city-agnostic pipeline for curating high-quality places from Google Maps API for exploration/RPG games.

## Architecture

```
seeder/
├── clients/                    # External API clients
│   ├── google_maps_client.ts   # Google Maps API wrapper
│   ├── llm_client.ts           # LLM client with adapter pattern
│   └── adapters/
│       ├── llm_adapter.ts      # Base adapter interface
│       └── gemini_adapter.ts   # Gemini implementation
├── pipeline/                   # Core pipeline logic
│   ├── stages/                 # Individual filtering stages
│   │   ├── name_similarity_dedup.ts
│   │   ├── proximity_dedup.ts
│   │   ├── rating_threshold.ts
│   │   ├── generic_filter.ts
│   │   ├── category_quotas.ts
│   │   └── llm_ranking.ts
│   ├── pipeline.ts             # Pipeline orchestrator
│   └── types.ts                # Shared types
├── config/                     # City-specific configurations
│   ├── base.ts                 # Base config template
│   └── prague.ts               # Prague config
├── utils/                      # Shared utilities
│   ├── logging.ts              # Concise logging
│   └── geo.ts                  # Geographic calculations
└── scripts/
    ├── run_pipeline.ts         # Main entry point
    └── test_pipeline.ts        # Test with existing data
```

## Key Features

### 1. **City-Agnostic Design**
- All city-specific settings in config files
- Easy to add new cities (just create a new config)
- No hardcoded city logic in pipeline stages

### 2. **Pluggable Stages**
- Each stage implements `Stage` interface
- Stages can be enabled/disabled per city
- Stages can be reordered or replaced
- Easy to add new filtering stages

### 3. **External API Clients**
- Google Maps client handles all API interactions
- LLM client uses adapter pattern for multiple providers
- Currently supports: Gemini (easily add OpenAI, Anthropic, etc.)

### 4. **Concise Logging**
- Clean, timestamped logs with emoji indicators
- Progress tracking for long operations
- Stage-by-stage metrics (before → after counts)

### 5. **Intermediate Snapshots**
- Saves results after each stage
- Easy to debug and inspect filtering decisions
- Located in `output/pipeline/{city}/`

## Pipeline Stages

The pipeline runs 6 stages in order (all currently placeholders):

1. **Name Similarity Deduplication** - Remove places with very similar names
2. **Proximity Deduplication** - Remove places < 50m apart
3. **Rating Threshold** - Drop places with < 5 reviews
4. **Generic Filter** - Remove non-destinations (gas stations, services, etc.)
5. **Category Quotas** - Balance place types (max 15 restaurants, min 3 parks, etc.)
6. **LLM Ranking** - Use AI to assign rarity (legendary/epic/rare/common)

See `FILTERING_PIPELINE.md` for detailed stage specifications.

## Usage

### Test with existing data
```bash
npm run test:pipeline
```

### Run full pipeline (fetches from Google Maps)
```bash
npm run pipeline
```

### Add a new city
1. Create `config/{city}.ts` based on `prague.ts`
2. Update bounds, types, and stage parameters
3. Import and use in `scripts/run_pipeline.ts`

## Configuration

### Base Config (`config/base.ts`)
Default settings applied to all cities:
- Target: 150 places
- Resolution: 15 (grid cells)
- Default place types
- Default stage parameters

### City Config (`config/prague.ts`)
City-specific overrides:
- Geographic bounds
- Custom place types
- Stage-specific parameters (blacklists, quotas, weights)

### Stage Parameters

**Name Similarity Dedup:**
```typescript
{ threshold: 0.85 }
```

**Proximity Dedup:**
```typescript
{ thresholdMeters: 50 }
```

**Rating Threshold:**
```typescript
{ minReviews: 5 }
```

**Generic Filter:**
```typescript
{
  blacklistedTypes: ['gas_station', 'car_wash', ...],
  namePatterns: [/^Cemetery$/i, /^Park$/i, ...]
}
```

**Category Quotas:**
```typescript
{
  mustHave: ['castle', 'museum', ...],
  capped: { restaurant: 15, cafe: 10, ... },
  minimum: { park: 3, zoo: 2, ... },
  categoryWeights: { historical_landmark: 1.2, ... }
}
```

## Environment Variables

```bash
GOOGLE_MAPS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

## Output

### Intermediate Snapshots
```
output/pipeline/prague/
├── 00-initial.json
├── 01-name_similarity_dedup.json
├── 01-proximity_dedup.json
├── 01-rating_threshold.json
├── 01-generic_filter.json
├── 01-category_quotas.json
├── 01-llm_ranking.json
└── 99-final.json
```

### Final Output
- `99-final.json` - Curated places with rarity rankings
- Each place includes: id, name, types, rating, reviews, location, rarity

## Extending the Pipeline

### Add a new stage
1. Create `pipeline/stages/{name}.ts`
2. Implement `Stage` interface
3. Add to pipeline in `scripts/run_pipeline.ts`
4. Add config to `config/base.ts` and city configs

### Add a new LLM provider
1. Create `clients/adapters/{provider}_adapter.ts`
2. Implement `LLMAdapter` interface
3. Use in `scripts/run_pipeline.ts`:
   ```typescript
   const llmClient = new LLMClient(new OpenAIAdapter(apiKey));
   ```

### Add a new city
1. Copy `config/prague.ts` to `config/{city}.ts`
2. Update bounds (use Google Maps to find coordinates)
3. Adjust types and parameters for the city
4. Import in `scripts/run_pipeline.ts`

## Data Analysis

The subagent analysis of Prague data revealed:
- **2,599 places** fetched from Google Maps
- **Noise identified:**
  - 118 places with zero ratings/reviews
  - 135 non-destination services (gas stations, dentists, etc.)
  - ~140 chain duplicates (30 McDonald's, 31 MOL gas stations, etc.)
  - 68 cemeteries (most tiny/unnamed)
  - 26 dog parks (mostly training clubs)
  - Generic names ("Cemetery", "Park", "dog park")

- **High-value entries:**
  - 41 legendary places (15k+ reviews)
  - ~300 epic places (2k-15k reviews)
  - Hidden gems with high ratings but low reviews

Expected result after filtering: **~150 high-quality places**

## Next Steps

1. **Implement stages** - Replace placeholders with actual filtering logic
2. **Test with Prague** - Verify filtering produces ~150 quality places
3. **Add more cities** - Create configs for Berlin, Vienna, etc.
4. **Add more LLM providers** - OpenAI, Anthropic adapters
5. **Add photo filtering** - Stage to check photo quality/availability
6. **Add opening hours** - Stage to filter by operating hours

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run pipeline` | Run full pipeline (fetches from Google Maps) |
| `npm run test:pipeline` | Test pipeline with existing Prague data |
| `npm run trial2` | Fetch places with custom parameters |
| `npm run analyze` | Analyze fetched data |

## License

MIT
