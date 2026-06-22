# Place Filtering Pipeline

## Overview

This document describes the multi-stage filtering pipeline used to reduce raw Google Places API results to a curated set of ~150 high-quality places per city.

**Target output:** ~150 places per city, ranked as Legendary/Epic/Rare/Common

**Pipeline philosophy:** Apply cheap filters first, expensive filters (LLM) last.

---

## Pipeline Stages

### Stage 1: Name Similarity Deduplication

**Goal:** Remove duplicate entries with very similar names.

**Problem:** Google may return the same place with slightly different names (e.g., "McDonald's" vs "McDonalds", "Prague Castle" vs "Castle of Prague", "Café Louvre" vs "Cafe Louvre").

**Algorithm:**
- Calculate string similarity between all place name pairs using algorithms like:
  - Levenshtein distance (edit distance)
  - Jaro-Winkler similarity
  - Cosine similarity on normalized names
- If similarity > 0.85 (configurable threshold), treat as potential duplicates
- Consider location proximity when deciding (places < 100m apart with similar names are likely duplicates)
- Keep the entry with more reviews (or higher rating if reviews are equal)
- Merge any additional metadata (combine types arrays, keep best rating)

**Expected reduction:** 5-10% of places

---

### Stage 2: Proximity Deduplication

**Goal:** Remove duplicate entries for the same physical location.

**Problem:** Google may return the same place with slightly different coordinates or the same place appears in multiple grid cells.

**Algorithm:**
- Calculate distance between all place pairs
- If two places are < 50 meters apart, treat them as duplicates
- Keep the entry with more reviews (or higher rating if reviews are equal)
- Merge any additional metadata (combine types arrays, keep best rating)

**Expected reduction:** 5-15% of places

---

### Stage 3: Rating & Review Threshold

**Goal:** Remove places with insufficient or no user feedback.

**Rules:**
- Drop places with `rating === null` or `rating === undefined`
- Drop places with `total_reviews < 5`

**Rationale:** Places with fewer than 5 reviews don't have reliable quality signals. For an RPG game, we want places that real people have actually visited and reviewed.

**Expected reduction:** 10-20% of places

---

### Stage 3: Generic Name Noise Filter

**Goal:** Remove obviously generic or non-interesting entries before expensive processing.

**Rules:**
- Drop places matching generic name patterns:
  - Pure street names (e.g., "Dlouhá Street")
  - Generic area names (e.g., "Old Town District")
  - Numbered addresses (e.g., "Building 42")
- Drop places with only generic types:
  - `transit_station`, `real_estate_agency`, `corporate_office`, `hospital`, `school`
  - Any place where all types are in the generic blacklist

**Implementation:**
- Regex patterns for name matching
- Type blacklist (configurable per city)

**Expected reduction:** 5-10% of places

---

### Stage 4: Category Quotas

**Goal:** Ensure balanced representation across place categories, prevent flooding from high-density categories.

**Category Classification:**

| Tier | Categories | Quota |
|------|-----------|-------|
| **Must-Have** | castle, historical_landmark, monument, bridge, museum, church | Keep all that pass Stage 1-3 |
| **Capped** | restaurant, cafe, bar, pub, bakery | Max 10-15 per category |
| **Minimum** | park, garden, zoo, stadium, theater | At least 2-3 per category |
| **Flexible** | All others | Fill remaining slots |

**Algorithm:**
1. Classify each place by its `primary_type` (most specific non-generic type)
2. For **Must-Have** categories: keep all places
3. For **Capped** categories: rank by quality score, keep top N
4. For **Minimum** categories: ensure at least 2-3 places (boost if needed)
5. For **Flexible** categories: fill remaining slots to reach ~150 total

**Quality Score Formula:**
```
quality_score = rating × log10(reviews + 1) × category_weight
```

Where `category_weight` is configurable per category (e.g., historical landmarks get 1.2x, restaurants get 0.8x).

**Expected reduction:** 40-60% of places (brings us close to ~150)

---

### Stage 5: Geographic Spread Enforcement

**Goal:** Ensure places are distributed across the city, not clustered in one area.

**Problem:** Quality-based filtering might concentrate all 150 places in the tourist center, leaving other neighborhoods empty.

**Algorithm:**
1. Divide city into grid cells (reuse the 100m × 100m grid from data collection)
2. Count places per cell
3. Identify empty cells (cells with 0 places after Stage 4)
4. For each empty cell:
   - Find the best remaining candidate in that cell (from the original dataset)
   - Swap it with the lowest-quality place from an over-represented cell
5. Ensure at least 1 place per grid cell that had places in the original data

**Expected reduction:** 0% (this stage may add places, but keeps total at ~150)

---

### Stage 6: LLM Ranking & Final Curation

**Goal:** Use LLM to apply subjective judgment and assign rarity ranks.

**Input to LLM:**
- All places remaining after Stage 5 (~150-200 places)
- City context (e.g., "Prague, historical European city, 1.3M population")
- Current category distribution
- Grid coverage map

**LLM Tasks:**
1. **Rank each place** as:
   - **Legendary** (5-10 places): Iconic landmarks, must-visit, world-famous
   - **Epic** (20-30 places): Major attractions, highly notable
   - **Rare** (40-50 places): Interesting places, worth seeking out
   - **Common** (60-80 places): Nice to find, adds flavor

2. **Drop places** that don't fit the game:
   - Generic squares or plazas with no specific identity
   - Street entries or area boundaries
   - Places that are technically interesting but not "game-worthy"
   - Duplicates that slipped through (different names, same place)

3. **Provide reasoning** for each drop/ranking (for debugging)

**LLM Prompt Structure:**
```
You are curating a list of places for an RPG exploration game set in {CITY}.

Context:
- {CITY} is a {description}
- We want ~150 places total
- Current distribution: {category_counts}
- Grid coverage: {grid_stats}

For each place below, assign a rank (Legendary/Epic/Rare/Common) or mark as DROP.

Criteria:
- Legendary: World-famous, iconic, must-visit (e.g., Charles Bridge, Prague Castle)
- Epic: Major attractions, highly notable (e.g., National Museum, Lennon Wall)
- Rare: Interesting places worth seeking out (e.g., specific statues, small museums)
- Common: Nice to find, adds flavor (e.g., local cafes, neighborhood parks)
- DROP: Generic, not game-worthy, or duplicate

Places:
{place_list_with_details}

Output format:
- place_id: rank or DROP
- reasoning: brief explanation
```

**Expected reduction:** 10-20% (drops ~20-40 places, final count ~150)

---

## Pipeline Summary

| Stage | Action | Expected Reduction | Running Total |
|-------|--------|-------------------|---------------|
| **Input** | Raw API results | - | 1,000-2,000 |
| 1 | Proximity dedup | 5-15% | 850-1,900 |
| 2 | Rating/review threshold | 10-20% | 680-1,710 |
| 3 | Generic name filter | 5-10% | 610-1,625 |
| 4 | Category quotas | 40-60% | ~150-200 |
| 5 | Geographic spread | 0% (rebalance) | ~150-200 |
| 6 | LLM ranking & curation | 10-20% | **~150** |

---

## Configuration

All thresholds and quotas should be configurable per city:

```json
{
  "city": "Prague",
  "target_count": 150,
  "proximity_threshold_meters": 50,
  "min_reviews": 5,
  "category_quotas": {
    "must_have": ["castle", "historical_landmark", "monument", "bridge", "museum", "church"],
    "capped": {
      "restaurant": 15,
      "cafe": 10,
      "bar": 10
    },
    "minimum": {
      "park": 3,
      "zoo": 2,
      "stadium": 2
    }
  },
  "category_weights": {
    "historical_landmark": 1.2,
    "castle": 1.3,
    "restaurant": 0.8,
    "cafe": 0.7
  }
}
```

---

## Implementation Notes

### Performance
- Stages 1-5 are fast (seconds to minutes)
- Stage 6 (LLM) is the bottleneck (minutes, depending on API rate limits)
- Consider batching LLM requests if processing multiple cities

### Cost
- LLM cost: ~150-200 places × input tokens + output tokens
- Estimate: ~$0.01-0.05 per city (depending on model and token count)

### Debugging
- Log place counts after each stage
- Save intermediate results to JSON files for inspection
- LLM should provide reasoning for each drop/ranking

### Extensibility
- Easy to add new stages (e.g., photo quality check, opening hours filter)
- Category classifications and quotas can be tuned per city
- Quality score formula can be adjusted based on feedback

---

## Future Enhancements

1. **Photo quality check:** Use computer vision to filter out places with poor/no photos
2. **Opening hours filter:** Prefer places with known opening hours
3. **Seasonal weighting:** Adjust rankings based on season (e.g., outdoor places in summer)
4. **User feedback loop:** Track which places players visit most, adjust weights accordingly
5. **Multi-city optimization:** Share LLM learnings across cities (e.g., what makes a "legendary" place)

---

## References

- Google Places API types: `possible_parameters.txt`
- Data collection scripts: `scripts/trial2.ts`
- Analysis scripts: `scripts/analyze.ts`
- Output data: `output/prague-r{N}-enriched.json`
