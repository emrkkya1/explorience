import fs from 'fs';
import path from 'path';

const GENERIC_TYPES = new Set(['establishment', 'point_of_interest', 'service', 'food', 'store']);

function getPrimaryType(types: string[]): string {
  const specific = types.filter(t => !GENERIC_TYPES.has(t));
  return specific.length > 0 ? specific[0] : types[0];
}

function getQualityScore(rating: number | undefined, reviews: number | undefined): number {
  const r = rating ?? 0;
  const rev = reviews ?? 0;
  return r * Math.log10(rev + 1);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return 'N/A';
  return n.toLocaleString();
}

function createHistogram(values: number[], buckets: number[]): { bucket: string; count: number; percentage: number }[] {
  const histogram: { bucket: string; count: number; percentage: number }[] = [];
  const total = values.length;

  for (let i = 0; i < buckets.length - 1; i++) {
    const min = buckets[i];
    const max = buckets[i + 1];
    const count = values.filter(v => v >= min && v < max).length;
    const percentage = (count / total) * 100;
    histogram.push({ bucket: `${min}-${max}`, count, percentage });
  }

  return histogram;
}

function createAsciiBar(value: number, max: number, width: number = 40): string {
  const barWidth = Math.round((value / max) * width);
  return '█'.repeat(barWidth);
}

interface Place {
  name: string;
  google_place_id: string;
  types: string[];
  rating?: number;
  total_reviews?: number;
  calculated_rarity: number;
  grid_id: string;
  coordinates: { lat: number; lng: number };
  primary_type?: string;
  quality_score?: number;
}

interface AnalysisResult {
  resolution: number;
  totalPlaces: number;
  avgRating: number;
  medianRating: number;
  avgReviews: number;
  medianReviews: number;
  avgQualityScore: number;
  typeDistribution: Map<string, number>;
  ratingHistogram: { bucket: string; count: number; percentage: number }[];
  reviewHistogram: { bucket: string; count: number; percentage: number }[];
  crossTab: number[][];
  topByReviews: Place[];
  topByQualityScore: Place[];
  gridStats: { min: number; max: number; avg: number; median: number; emptyCells: number; totalCells: number };
}

function analyzeResolution(resolution: number): AnalysisResult {
  const filePath = path.join('output', `prague-r${resolution}.json`);
  const data: Place[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Enrich data
  data.forEach(p => {
    p.primary_type = getPrimaryType(p.types);
    p.quality_score = getQualityScore(p.rating, p.total_reviews);
  });

  // Type distribution
  const typeDistribution = new Map<string, number>();
  data.forEach(p => {
    p.types.forEach(t => {
      typeDistribution.set(t, (typeDistribution.get(t) || 0) + 1);
    });
  });

  // Rating histogram
  const ratings = data.map(p => p.rating ?? 0);
  const ratingHistogram = createHistogram(ratings, [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.1]);

  // Review histogram
  const reviews = data.map(p => p.total_reviews ?? 0);
  const reviewHistogram = createHistogram(reviews, [0, 100, 500, 1000, 5000, 10000, 50000, Infinity]);

  // Cross-tab: Rating (rows) × Reviews (cols)
  const ratingBuckets = [0, 3.0, 3.5, 4.0, 4.5, 5.1];
  const reviewBuckets = [0, 100, 1000, 10000, 100000, Infinity];
  const crossTab: number[][] = Array(ratingBuckets.length - 1).fill(null).map(() => Array(reviewBuckets.length - 1).fill(0));

  data.forEach(p => {
    const rating = p.rating ?? 0;
    const totalReviews = p.total_reviews ?? 0;

    let rIdx = ratingBuckets.length - 2;
    for (let i = 0; i < ratingBuckets.length - 1; i++) {
      if (rating >= ratingBuckets[i] && rating < ratingBuckets[i + 1]) {
        rIdx = i;
        break;
      }
    }

    let cIdx = reviewBuckets.length - 2;
    for (let i = 0; i < reviewBuckets.length - 1; i++) {
      if (totalReviews >= reviewBuckets[i] && totalReviews < reviewBuckets[i + 1]) {
        cIdx = i;
        break;
      }
    }

    crossTab[rIdx][cIdx]++;
  });

  // Top places
  const topByReviews = [...data].sort((a, b) => (b.total_reviews ?? 0) - (a.total_reviews ?? 0)).slice(0, 20);
  const topByQualityScore = [...data].sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0)).slice(0, 30);

  // Grid stats (based on coordinate-based 100m grid cells)
  const gridCounts = new Map<string, number>();
  data.forEach(p => {
    gridCounts.set(p.grid_id, (gridCounts.get(p.grid_id) || 0) + 1);
  });

  const gridValues = Array.from(gridCounts.values());
  const totalCells = gridCounts.size;
  const emptyCells = 0; // Not applicable for coordinate-based grid

  const gridStats = {
    min: Math.min(...gridValues),
    max: Math.max(...gridValues),
    avg: mean(gridValues),
    median: median(gridValues),
    emptyCells,
    totalCells
  };

  return {
    resolution,
    totalPlaces: data.length,
    avgRating: mean(ratings),
    medianRating: median(ratings),
    avgReviews: mean(reviews),
    medianReviews: median(reviews),
    avgQualityScore: mean(data.map(p => p.quality_score || 0)),
    typeDistribution,
    ratingHistogram,
    reviewHistogram,
    crossTab,
    topByReviews,
    topByQualityScore,
    gridStats
  };
}

function generatePerResolutionReport(result: AnalysisResult): string {
  const lines: string[] = [];
  const r = result.resolution;

  lines.push(`# Analysis Report: Resolution ${r}×${r}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Resolution | ${r}×${r} (${r * r} fetches) |`);
  lines.push(`| Total Unique Places | ${formatNumber(result.totalPlaces)} |`);
  lines.push(`| Avg Rating | ${result.avgRating.toFixed(2)} |`);
  lines.push(`| Median Rating | ${result.medianRating.toFixed(2)} |`);
  lines.push(`| Avg Reviews | ${formatNumber(Math.round(result.avgReviews))} |`);
  lines.push(`| Median Reviews | ${formatNumber(Math.round(result.medianReviews))} |`);
  lines.push(`| Avg Quality Score | ${result.avgQualityScore.toFixed(2)} |`);
  lines.push('');

  // Type distribution
  lines.push('## Type Distribution');
  lines.push('');
  lines.push('All unique Google Maps types found, sorted by frequency:');
  lines.push('');
  lines.push('| Type | Count | % of Places |');
  lines.push('|------|-------|-------------|');

  const sortedTypes = Array.from(result.typeDistribution.entries())
    .sort((a, b) => b[1] - a[1]);

  const maxTypeCount = sortedTypes[0]?.[1] || 1;
  sortedTypes.forEach(([type, count]) => {
    const percentage = ((count / result.totalPlaces) * 100).toFixed(1);
    const bar = createAsciiBar(count, maxTypeCount, 30);
    lines.push(`| ${type} | ${formatNumber(count)} | ${percentage}% ${bar} |`);
  });

  lines.push('');
  lines.push(`**Total unique types:** ${result.typeDistribution.size}`);
  lines.push('');

  // Rating distribution
  lines.push('## Rating Distribution');
  lines.push('');
  lines.push('| Range | Count | % | Distribution |');
  lines.push('|-------|-------|---|--------------|');

  const maxRatingCount = Math.max(...result.ratingHistogram.map(h => h.count));
  result.ratingHistogram.forEach(h => {
    const bar = createAsciiBar(h.count, maxRatingCount, 30);
    lines.push(`| ${h.bucket} | ${formatNumber(h.count)} | ${h.percentage.toFixed(1)}% | ${bar} |`);
  });

  lines.push('');

  // Review distribution
  lines.push('## Review Count Distribution');
  lines.push('');
  lines.push('| Range | Count | % | Distribution |');
  lines.push('|-------|-------|---|--------------|');

  const maxReviewCount = Math.max(...result.reviewHistogram.map(h => h.count));
  result.reviewHistogram.forEach(h => {
    const bucket = h.bucket === '100000-Infinity' ? '100k+' : h.bucket;
    const bar = createAsciiBar(h.count, maxReviewCount, 30);
    lines.push(`| ${bucket} | ${formatNumber(h.count)} | ${h.percentage.toFixed(1)}% | ${bar} |`);
  });

  lines.push('');

  // Cross-tab
  lines.push('## Rating × Review Count Cross-Tab');
  lines.push('');
  lines.push('Number of places in each bucket:');
  lines.push('');

  const ratingLabels = ['<3.0', '3.0-3.5', '3.5-4.0', '4.0-4.5', '4.5+'];
  const reviewLabels = ['<100', '100-1k', '1k-10k', '10k-100k', '100k+'];

  lines.push('| Rating \\ Reviews | ' + reviewLabels.join(' | ') + ' |');
  lines.push('|-----------------|' + reviewLabels.map(() => '------').join('|') + '|');

  result.crossTab.forEach((row, i) => {
    lines.push(`| ${ratingLabels[i]} | ${row.join(' | ')} |`);
  });

  lines.push('');

  // Grid coverage
  lines.push('## Grid Coverage Statistics');
  lines.push('');
  lines.push('Based on 100m × 100m coordinate grid cells:');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total grid cells with places | ${result.gridStats.totalCells} |`);
  lines.push(`| Min places per cell | ${result.gridStats.min} |`);
  lines.push(`| Max places per cell | ${result.gridStats.max} |`);
  lines.push(`| Avg places per cell | ${result.gridStats.avg.toFixed(1)} |`);
  lines.push(`| Median places per cell | ${result.gridStats.median} |`);
  lines.push('');

  // Top by reviews
  lines.push('## Top 20 Places by Review Count');
  lines.push('');
  lines.push('| # | Name | Rating | Reviews | Primary Type | Quality Score |');
  lines.push('|---|------|--------|---------|--------------|---------------|');

  result.topByReviews.forEach((p, i) => {
    const rating = p.rating !== undefined ? p.rating.toFixed(1) : 'N/A';
    const reviews = p.total_reviews !== undefined ? formatNumber(p.total_reviews) : 'N/A';
    lines.push(`| ${i + 1} | ${p.name} | ${rating} | ${reviews} | ${p.primary_type} | ${(p.quality_score || 0).toFixed(2)} |`);
  });

  lines.push('');

  // Top by quality score
  lines.push('## Top 30 Places by Quality Score');
  lines.push('');
  lines.push('Quality Score = Rating × log₁₀(Reviews + 1)');
  lines.push('');
  lines.push('| # | Name | Rating | Reviews | Primary Type | Quality Score |');
  lines.push('|---|------|--------|---------|--------------|---------------|');

  result.topByQualityScore.forEach((p, i) => {
    const rating = p.rating !== undefined ? p.rating.toFixed(1) : 'N/A';
    const reviews = p.total_reviews !== undefined ? formatNumber(p.total_reviews) : 'N/A';
    lines.push(`| ${i + 1} | ${p.name} | ${rating} | ${reviews} | ${p.primary_type} | ${(p.quality_score || 0).toFixed(2)} |`);
  });

  lines.push('');

  return lines.join('\n');
}

function generateComparisonReport(results: AnalysisResult[]): string {
  const lines: string[] = [];

  lines.push('# Cross-Resolution Comparison Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  // Summary table
  lines.push('## Summary Comparison');
  lines.push('');
  lines.push('| Resolution | Fetches | Unique Places | Avg Rating | Avg Reviews | Avg Quality Score |');
  lines.push('|------------|---------|---------------|------------|-------------|-------------------|');

  results.forEach(r => {
    lines.push(`| ${r.resolution}×${r.resolution} | ${r.resolution * r.resolution} | ${formatNumber(r.totalPlaces)} | ${r.avgRating.toFixed(2)} | ${formatNumber(Math.round(r.avgReviews))} | ${r.avgQualityScore.toFixed(2)} |`);
  });

  lines.push('');

  // Overlap analysis
  lines.push('## Overlap Analysis');
  lines.push('');
  lines.push('Places shared between resolutions:');
  lines.push('');

  const resolutions = [3, 5, 8, 10, 12, 15];
  const placeIdsByRes = new Map<number, Set<string>>();

  resolutions.forEach(r => {
    const filePath = path.join('output', `prague-r${r}.json`);
    const data: Place[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    placeIdsByRes.set(r, new Set(data.map(p => p.google_place_id)));
  });

  lines.push('| Pair | Shared Places | % of Smaller Set |');
  lines.push('|------|---------------|------------------|');

  for (let i = 0; i < resolutions.length; i++) {
    for (let j = i + 1; j < resolutions.length; j++) {
      const r1 = resolutions[i];
      const r2 = resolutions[j];
      const set1 = placeIdsByRes.get(r1)!;
      const set2 = placeIdsByRes.get(r2)!;
      const shared = new Set([...set1].filter(id => set2.has(id)));
      const percentage = ((shared.size / set1.size) * 100).toFixed(1);
      lines.push(`| R${r1} ∩ R${r2} | ${formatNumber(shared.size)} | ${percentage}% |`);
    }
  }

  lines.push('');

  // Incremental value
  lines.push('## Incremental Value');
  lines.push('');
  lines.push('New places found at each resolution (not in the previous resolution):');
  lines.push('');
  lines.push('| Resolution | New Places | % of Total | Cumulative |');
  lines.push('|------------|------------|------------|------------|');

  let cumulative = 0;
  resolutions.forEach((r, i) => {
    const currentSet = placeIdsByRes.get(r)!;
    let newCount: number;

    if (i === 0) {
      newCount = currentSet.size;
    } else {
      // Places in current that are NOT in the previous resolution
      const prevSet = placeIdsByRes.get(resolutions[i - 1])!;
      const newPlaces = new Set([...currentSet].filter(id => !prevSet.has(id)));
      newCount = newPlaces.size;
    }

    cumulative += newCount;
    const percentage = ((newCount / currentSet.size) * 100).toFixed(1);
    lines.push(`| ${r}×${r} | ${formatNumber(newCount)} | ${percentage}% | ${formatNumber(cumulative)} |`);
  });

  lines.push('');

  // Diminishing returns
  lines.push('## Diminishing Returns Analysis');
  lines.push('');
  lines.push('| Resolution | Places/Fetch | Efficiency Ratio |');
  lines.push('|------------|--------------|------------------|');

  const baselineEfficiency = results[0].totalPlaces / (results[0].resolution * results[0].resolution);

  results.forEach(r => {
    const efficiency = r.totalPlaces / (r.resolution * r.resolution);
    const ratio = ((efficiency / baselineEfficiency) * 100).toFixed(1);
    lines.push(`| ${r.resolution}×${r.resolution} | ${efficiency.toFixed(1)} | ${ratio}% |`);
  });

  lines.push('');
  lines.push('**Interpretation:** As resolution increases, each fetch returns fewer unique places due to overlap and smaller search areas.');
  lines.push('');

  return lines.join('\n');
}

function enrichAndSaveData(resolution: number): void {
  const filePath = path.join('output', `prague-r${resolution}.json`);
  const data: Place[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.forEach(p => {
    p.primary_type = getPrimaryType(p.types);
    p.quality_score = getQualityScore(p.rating, p.total_reviews);
  });

  const enrichedPath = path.join('output', `prague-r${resolution}-enriched.json`);
  fs.writeFileSync(enrichedPath, JSON.stringify(data, null, 2));
}

function main() {
  console.log('🔍 Analyzing Prague grid scan data...\n');

  const resolutions = [3, 5, 8, 10, 12, 15];
  const results: AnalysisResult[] = [];

  // Analyze each resolution
  resolutions.forEach(r => {
    console.log(`  Analyzing R=${r}...`);
    const result = analyzeResolution(r);
    results.push(result);

    // Generate per-resolution report
    const report = generatePerResolutionReport(result);
    const reportPath = path.join('output', `analysis-r${r}.md`);
    fs.writeFileSync(reportPath, report);

    // Save enriched data
    enrichAndSaveData(r);
  });

  // Generate comparison report
  console.log('\n  Generating comparison report...');
  const comparisonReport = generateComparisonReport(results);
  const comparisonPath = path.join('output', 'analysis-comparison.md');
  fs.writeFileSync(comparisonPath, comparisonReport);

  console.log('\n✅ Analysis complete!');
  console.log('   Generated: output/analysis-r{3,5,8,10,12,15}.md');
  console.log('   Generated: output/analysis-comparison.md');
  console.log('   Generated: output/prague-r{3,5,8,10,12,15}-enriched.json');
}

main();
