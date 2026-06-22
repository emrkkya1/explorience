import { LLMClient } from '../../clients/llm_client';
import { Category, PipelineConfig, Place, Rarity, RawPlace, Stage } from '../types';
import { logger } from '../../utils/logging';

type LLMBatchRecord = {
  index: number;
  name: string;
  types: string[];
  rating?: number;
  totalReviews?: number;
  primaryType?: string;
  qualityScore: number;
};

type LLMResponseItem = {
  index: number;
  shouldRemove: boolean;
  assignedCategory: Category;
  assignedRarity: Rarity;
  description: string;
  justification: string;
};

const VALID_CATEGORIES: Category[] = ['nightlife', 'food', 'landmark', 'history', 'nature', 'shopping', 'miscellaneous'];
const VALID_RARITIES: Rarity[] = ['legendary', 'epic', 'rare', 'common'];

const RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      index: {
        type: 'integer',
        description: 'The same index value from the input entry. Used to match responses to entries.',
      },
      shouldRemove: {
        type: 'boolean',
        description: 'Whether this place should be removed from the final list.',
      },
      assignedCategory: {
        type: 'string',
        enum: VALID_CATEGORIES,
        description: 'The category this place belongs to. Set to any value if shouldRemove is true.',
      },
      assignedRarity: {
        type: 'string',
        enum: VALID_RARITIES,
        description: 'The rarity tier of this place, 60% of your decision is based on your knowledge of the place\'s significance and 40% is on its qualityScore/rating/reviews. Set to any value if shouldRemove is true.',
      },
      description: {
        type: 'string',
        description: 'One-sentence description of the place. Should be engaging and approachable, fitting to an RPG game without being too cheesy. Will be shown to players. Write based on your own knowledge about the place. If you don\'t have enough knowledge, write a generic but in-game-appropriate sentence that won\'t look weird. Set to empty string if shouldRemove is true.',
      },
      justification: {
        type: 'string',
        description: 'Reasoning behind your decision. If shouldRemove is true, explain why it should be removed. If shouldRemove is false, explain the reasoning for the assigned category and rarity. Should be concise and clear.',
      },
    },
    required: ['index', 'shouldRemove', 'assignedCategory', 'assignedRarity', 'description', 'justification'],
  },
};

export class LLMRankingStage implements Stage {
  name = 'llm_ranking';

  constructor(private llmClient?: LLMClient) {}

  async run(places: (RawPlace | Place)[], config: PipelineConfig): Promise<(RawPlace | Place)[]> {
    if (!this.llmClient) {
      logger.warn('llm_ranking: no LLM client available, passthrough');
      return places;
    }

    const stageConfig = config.stages.find(s => s.name === this.name);
    const batchSize = stageConfig?.params?.batch_size ?? 1;
    const model = stageConfig?.params?.model;
    const temperature = stageConfig?.params?.temperature;
    const maxTokens = stageConfig?.params?.maxTokens ?? 16384;

    logger.summary({
      places: places.length,
      'batch size': batchSize,
      model: model ?? 'default',
      temperature: temperature ?? 'provider default',
    });

    const rawPlaces = places as RawPlace[];
    const batches = this.prepareBatches(rawPlaces, batchSize);
    const totalEntries = rawPlaces.length;

    logger.info(`Processing ${batches.length} batch${batches.length !== 1 ? 'es' : ''}`);

    const allResponses: LLMResponseItem[] = [];
    let processedEntries = 0;
    let removedEntries = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.progress(i, batches.length, 'llm_ranking');

      const responses = await this.processBatch(batch, config.city, model, temperature, maxTokens, totalEntries, batchSize, processedEntries, removedEntries, config.targetCount);
      allResponses.push(...responses);

      const batchRemoved = batch.length - responses.filter(r => !r.shouldRemove).length;
      processedEntries += batch.length;
      removedEntries += batchRemoved;
    }

    logger.progress(batches.length, batches.length, 'llm_ranking');

    const result = this.applyResults(rawPlaces, allResponses);

    const kept = result.length;
    const removed = rawPlaces.length - kept;
    const rarityCounts = this.countRarities(result);

    logger.summary({
      kept,
      removed,
      'legendary': rarityCounts.legendary,
      'epic': rarityCounts.epic,
      'rare': rarityCounts.rare,
      'common': rarityCounts.common,
    });

    return result;
  }

  private prepareBatches(places: RawPlace[], batchSize: number): LLMBatchRecord[][] {
    const batches: LLMBatchRecord[][] = [];
    let currentBatch: LLMBatchRecord[] = [];

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      currentBatch.push({
        index: i,
        name: place.name,
        types: place.types,
        rating: place.rating,
        totalReviews: place.totalReviews,
        primaryType: place.primaryType,
        qualityScore: place.qualityScore ?? 0,
      });

      if (currentBatch.length >= batchSize) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private async processBatch(
    batch: LLMBatchRecord[],
    city: string,
    model: string | undefined,
    temperature: number | undefined,
    maxTokens: number,
    totalEntries: number,
    batchSize: number,
    processedEntries: number,
    removedEntries: number,
    targetCount: number,
  ): Promise<LLMResponseItem[]> {
    const prompt = this.buildPrompt(batch, city, totalEntries, batchSize, processedEntries, removedEntries, targetCount);
    logger.debug('llm_ranking: prompt', prompt);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.llmClient!.generate(prompt, { model, temperature, maxTokens, responseSchema: RESPONSE_SCHEMA });
        const parsed = this.parseResponse(response.text);

        if (parsed.length > 0) {
          return parsed;
        }

        if (attempt === 0) {
          logger.warn(`llm_ranking: empty parse, retrying batch ${batch[0].index}–${batch[batch.length - 1].index}`);
        }
      } catch (err) {
        if (attempt === 0) {
          logger.warn(`llm_ranking: parse error, retrying: ${err}`);
        } else {
          logger.error(`llm_ranking: failed to parse batch after 2 attempts`);
        }
      }
    }

    return [];
  }

  private buildPrompt(
    batch: LLMBatchRecord[],
    city: string,
    totalEntries: number,
    batchSize: number,
    processedEntries: number,
    removedEntries: number,
    targetCount: number,
  ): string {
    const categories = VALID_CATEGORIES.join(', ');
    const rarities = VALID_RARITIES.join(', ');
    const targetSentence = totalEntries > targetCount
      ? `\nIn the end, our goal is to have ${targetCount} entries.`
      : '';

    return `You are curating a list of places for an RPG exploration game set in ${city}.

## Categories
${categories}

## Rarity Levels
- **legendary**: Only a few exist in a city, must-see. (Expected: ~5-10 places)
- **epic**: Major attractions, highly notable (e.g., National Museum, Lennon Wall) (Expected: ~20-30 places)
- **rare**: Interesting places worth seeking out (e.g., specific statues, small museums, very interesting cafes, famous local restaurants) (Expected: ~40-50 places)
- **common**: Nice to find, adds flavor (e.g., local cafes, neighborhood parks) (Expected: ~60-80 places)

## Task
For each place in the batch below:
1. Decide if it should be removed (shouldRemove: true) or kept (shouldRemove: false)
2. If kept, assign a category and rarity
3. Write a one-sentence description of the place
4. Provide justification for your decision

When assigning rarity, weight your decision as 60% your own knowledge about the place's significance and fame, and 40% the qualityScore, rating, and review count provided in the entry.

**IMPORTANT**: Be conservative with removals. Most places should be kept. Only remove places that are clearly not game-worthy. Aim to keep at least 70-80% of places.

Note: assignedCategory and assignedRarity, and description should be set to "None" if shouldRemove is true.

## Criteria for Removal (BE STRICT — only remove if clearly matches)
- Generic squares/plazas with no specific identity
- Street entries or area boundaries
- Fast food chains, supermarkets, etc.
- Very low-quality places with poor ratings and few reviews
- Religious places that don't have any tourist value (e.g., small local churches, chapels, etc.)
- Duplicates that slipped through

**DO NOT remove** places just because they seem ordinary — if it's a real place that players might visit, keep it as "common" rarity.

## Few-Shot Examples

Example 1 (Legendary):
Input: {"index": 5, "name": "Eiffel Tower", "types": ["tourist_attraction", "landmark"], "rating": 4.7, "totalReviews": 250000, "primaryType": "tourist_attraction", "qualityScore": 4.8}
Output: {"index": 5, "shouldRemove": false, "assignedCategory": "landmark", "assignedRarity": "legendary", "description": "The iconic iron tower that defines the Paris skyline and draws millions of visitors yearly.", "justification": "Eiffel Tower is the most recognizable symbol of Paris and France, a world-famous engineering marvel that is absolutely must-see for any visitor. Legendary status is warranted."}

Example 2 (Epic):
Input: {"index": 12, "name": "Sainte-Chapelle", "types": ["church", "tourist_attraction", "history"], "rating": 4.8, "totalReviews": 45000, "primaryType": "church", "qualityScore": 4.2}
Output: {"index": 12, "shouldRemove": false, "assignedCategory": "history", "assignedRarity": "epic", "description": "Gothic masterpiece housing the Crown of Thorns and stunning 13th-century stained glass windows.", "justification": "Sainte-Chapelle is a major historical attraction with exceptional Gothic architecture and religious significance. Highly notable but not as universally iconic as the Eiffel Tower, so epic rather than legendary."}

Example 3 (Epic):
Input: {"index": 18, "name": "Café de Flore", "types": ["cafe", "restaurant"], "rating": 4.0, "totalReviews": 12000, "primaryType": "cafe", "qualityScore": 4.0}
Output: {"index": 18, "shouldRemove": false, "assignedCategory": "food", "assignedRarity": "epic", "description": "Historic café where Hemingway, Picasso, and other literary giants once gathered.", "justification": "Café de Flore is a famous literary café with significant cultural history. Major attraction for those interested in Parisian intellectual history, but more specialized than the top landmarks, so epic is appropriate."}

Example 4 (Rare):
Input: {"index": 25, "name": "Tour Jean-sans-Peur", "types": ["museum", "history"], "rating": 4.3, "totalReviews": 800, "primaryType": "museum", "qualityScore": 3.5}
Output: {"index": 25, "shouldRemove": false, "assignedCategory": "history", "assignedRarity": "rare", "description": "Medieval tower that once served as a fortress and now offers panoramic views of the Latin Quarter.", "justification": "Tour Jean-sans-Peur is an interesting historical site worth seeking out for history enthusiasts. Not as well-known as major attractions, but provides unique insight into medieval Paris. Rare fits well."}

Example 5 (Common):
Input: {"index": 31, "name": "Le Petit Bistro", "types": ["restaurant", "food"], "rating": 4.2, "totalReviews": 350, "primaryType": "restaurant", "qualityScore": 2.8}
Output: {"index": 31, "shouldRemove": false, "assignedCategory": "food", "assignedRarity": "common", "description": "Charming neighborhood bistro serving classic French cuisine in a cozy atmosphere.", "justification": "Le Petit Bistro is a pleasant local spot that adds flavor to the exploration experience. Not a major draw on its own, but nice to discover while exploring the area. Common rarity is appropriate."}

Example 6 (Remove):
Input: {"index": 42, "name": "Place de la République", "types": ["plaza", "point_of_interest"], "rating": 3.8, "totalReviews": 120, "primaryType": "plaza", "qualityScore": 1.2}
Output: {"index": 42, "shouldRemove": true, "assignedCategory": "miscellaneous", "assignedRarity": "common", "description": "", "justification": "Generic plaza with no specific identity or historical significance. Just an open space between buildings that doesn't offer a unique exploration experience. Should be removed to maintain quality."}

Example 7 (Remove):
Input: {"index": 48, "name": "McDonald's", "types": ["restaurant", "food", "meal_takeaway"], "rating": 3.2, "totalReviews": 800, "primaryType": "restaurant", "qualityScore": 1.5}
Output: {"index": 48, "shouldRemove": true, "assignedCategory": "food", "assignedRarity": "common", "description": "", "justification": "Fast food chain location with no unique character or local significance. Doesn't fit the exploration game theme of discovering interesting, culturally relevant places. Should be removed."}


## Data Insights

Total entries: ${totalEntries}
Batch size: ${batchSize}
Processed Entries Until Now: ${processedEntries}
Removed Entries Until Now: ${removedEntries}${targetSentence}

## Batch Data
\`\`\`json
${JSON.stringify(batch, null, 2)}
\`\`\`

## Output Format
Respond with a JSON array of objects. Each object must have (**OMISSION IS A VIOLATION OF GUIDELINES**):
- \`index\`: the same index value from the input
- \`shouldRemove\`: boolean
- \`assignedCategory\`: one of [${categories}]
- \`assignedRarity\`: one of [${rarities}]
- \`description\`: one-sentence description of the place. Should be engaging and approachable. Will be shown to players. Write based on your own knowledge about the place. If you don't have enough knowledge about the place, write a generic but in-game-appropriate sentence that won't look weird.
- \`justification\`: Reasoning behind your decision (removal (only if shouldRemove: true), category, rarity). Should be concise and clear. Explain all thoughts behind your decision clearly and honestly.

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON array.`;
  }

  private parseResponse(text: string): LLMResponseItem[] {
    let cleaned = text.trim();

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    const valid: LLMResponseItem[] = [];

    for (const item of parsed) {
      if (typeof item.index !== 'number') {
        logger.warn(`llm_ranking: skipping item with invalid index`);
        continue;
      }

      if (typeof item.shouldRemove !== 'boolean') {
        logger.warn(`llm_ranking: skipping item ${item.index} with invalid shouldRemove`);
        continue;
      }

      if (!item.shouldRemove) {
        if (!VALID_CATEGORIES.includes(item.assignedCategory)) {
          logger.warn(`llm_ranking: item ${item.index} has invalid category "${item.assignedCategory}"`);
          continue;
        }

        if (!VALID_RARITIES.includes(item.assignedRarity)) {
          logger.warn(`llm_ranking: item ${item.index} has invalid rarity "${item.assignedRarity}"`);
          continue;
        }

        if (typeof item.description !== 'string' || item.description.length === 0) {
          logger.warn(`llm_ranking: item ${item.index} has empty description`);
          continue;
        }
      }

      if (typeof item.justification !== 'string') {
        logger.warn(`llm_ranking: item ${item.index} has no justification`);
        continue;
      }

      valid.push(item as LLMResponseItem);
    }

    return valid;
  }

  private applyResults(places: RawPlace[], responses: LLMResponseItem[]): Place[] {
    const responseMap = new Map(responses.map(r => [r.index, r]));
    const result: Place[] = [];

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const response = responseMap.get(i);

      if (!response) {
        logger.warn(`llm_ranking: no response for index ${i}, keeping place unenriched`);
        result.push({
          id: place.id,
          name: place.name,
          types: place.types,
          rating: place.rating,
          totalReviews: place.totalReviews,
          location: place.location,
          primaryType: place.primaryType,
        });
        continue;
      }

      if (response.shouldRemove) {
        continue;
      }

      result.push({
        id: place.id,
        name: place.name,
        types: place.types,
        rating: place.rating,
        totalReviews: place.totalReviews,
        location: place.location,
        primaryType: place.primaryType,
        assignedCategory: response.assignedCategory,
        rarity: response.assignedRarity,
        description: response.description,
      });
    }

    return result;
  }

  private countRarities(places: Place[]): Record<Rarity, number> {
    const counts: Record<Rarity, number> = {
      legendary: 0,
      epic: 0,
      rare: 0,
      common: 0,
    };

    for (const place of places) {
      if (place.rarity) {
        counts[place.rarity]++;
      }
    }

    return counts;
  }
}
