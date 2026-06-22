import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const PRAGUE_BOUNDS = {
  north: 50.15,
  south: 50.00,
  east: 14.55,
  west: 14.25
};

const INCLUDED_TYPES = ['historical_landmark', 'tourist_attraction', 'church', 'museum', 'monument'];
const MAX_RESULTS_PER_FETCH = 20;
const REQUEST_DELAY_MS = 125;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeCellRadius(cellNorth: number, cellSouth: number, cellEast: number, cellWest: number): number {
  const centerLat = (cellNorth + cellSouth) / 2;
  const centerLng = (cellEast + cellWest) / 2;
  return haversineDistance(centerLat, centerLng, cellNorth, cellEast);
}

function printBarChart(data: number[], title: string, maxValue: number = 20): string {
  const maxBarWidth = 40;
  const max = Math.max(...data, maxValue);
  const lines: string[] = [];
  lines.push(`\n${title}`);
  lines.push('─'.repeat(maxBarWidth + 15));
  data.forEach((value, index) => {
    const barWidth = Math.round((value / max) * maxBarWidth);
    const bar = '█'.repeat(barWidth);
    lines.push(`  ${String(index + 1).padStart(2)}. ${bar.padEnd(maxBarWidth)} ${value}`);
  });
  return lines.join('\n');
}

async function fetchPlacesInGrid(resolution: number) {
  console.log(`🔍 Scanning Prague with ${resolution}×${resolution} grid (${resolution ** 2} fetches)...`);

  const startTime = Date.now();

  const latStep = (PRAGUE_BOUNDS.north - PRAGUE_BOUNDS.south) / resolution;
  const lngStep = (PRAGUE_BOUNDS.east - PRAGUE_BOUNDS.west) / resolution;
  const radius = computeCellRadius(
    PRAGUE_BOUNDS.south + latStep,
    PRAGUE_BOUNDS.south,
    PRAGUE_BOUNDS.west + lngStep,
    PRAGUE_BOUNDS.west
  );

  console.log(`   Cell: ${latStep.toFixed(4)}° lat × ${lngStep.toFixed(4)}° lng`);
  console.log(`   Radius: ${Math.round(radius)}m (circumscribes each cell)`);

  const allPlaces = new Map<string, any>();
  let fetchCount = 0;
  let totalRawResults = 0;
  const uniquePerFetch: number[] = [];
  const cumulativeUnique: number[] = [];
  const rawPerFetch: number[] = [];

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const cellSouth = PRAGUE_BOUNDS.south + i * latStep;
      const cellWest = PRAGUE_BOUNDS.west + j * lngStep;
      const centerLat = cellSouth + latStep / 2;
      const centerLng = cellWest + lngStep / 2;

      fetchCount++;
      const uniqueBefore = allPlaces.size;

      try {
        const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.userRatingCount,places.types,places.rating'
          },
          body: JSON.stringify({
            includedTypes: INCLUDED_TYPES,
            maxResultCount: MAX_RESULTS_PER_FETCH,
            locationRestriction: {
              circle: {
                center: { latitude: centerLat, longitude: centerLng },
                radius
              }
            }
          })
        });

        const data = await response.json();

        if (data.places) {
          const rawCount = data.places.length;
          totalRawResults += rawCount;
          rawPerFetch.push(rawCount);

          for (const place of data.places) {
            if (!allPlaces.has(place.id)) {
              const lat = place.location.latitude;
              const lng = place.location.longitude;
              const gridId = `${(Math.floor(lat * 1000) / 1000).toFixed(3)},${(Math.floor(lng * 1000) / 1000).toFixed(3)}`;

              let rarity = 3;
              if (place.userRatingCount > 15000) rarity = 1;
              else if (place.userRatingCount > 2000) rarity = 2;

              allPlaces.set(place.id, {
                name: place.displayName.text,
                google_place_id: place.id,
                types: place.types,
                rating: place.rating,
                total_reviews: place.userRatingCount,
                calculated_rarity: rarity,
                grid_id: gridId,
                coordinates: { lat, lng }
              });
            }
          }

          const uniqueAdded = allPlaces.size - uniqueBefore;
          uniquePerFetch.push(uniqueAdded);
          cumulativeUnique.push(allPlaces.size);

          console.log(`  [${fetchCount}/${resolution ** 2}] Cell (${i},${j}): ${rawCount} raw → ${uniqueAdded} new (${allPlaces.size} total)`);
        } else {
          uniquePerFetch.push(0);
          rawPerFetch.push(0);
          cumulativeUnique.push(allPlaces.size);
          console.log(`  [${fetchCount}/${resolution ** 2}] Cell (${i},${j}): 0 places`);
        }

        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));

      } catch (error) {
        console.error(`  [${fetchCount}/${resolution ** 2}] ✗ Error:`, error);
        uniquePerFetch.push(0);
        rawPerFetch.push(0);
        cumulativeUnique.push(allPlaces.size);
      }
    }
  }

  const processedPlaces = Array.from(allPlaces.values());
  processedPlaces.sort((a, b) => b.total_reviews - a.total_reviews);

  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationSec = (durationMs / 1000).toFixed(1);

  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `prague-r${resolution}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(processedPlaces, null, 2));

  console.log(`\n✅ Wrote ${processedPlaces.length} unique places → ${outputPath}`);

  // Statistics
  const totalDeduplications = totalRawResults - processedPlaces.length;
  const avgUniquePerFetch = processedPlaces.length / resolution ** 2;
  const avgRawPerFetch = totalRawResults / resolution ** 2;
  const overlapPercentage = (totalRawResults > 0) ? (totalDeduplications / totalRawResults) * 100 : 0;
  const efficiency = processedPlaces.length / resolution ** 2;
  const avgTimePerFetch = (durationMs / resolution ** 2).toFixed(0);

  const reportLines: string[] = [];
  reportLines.push(`# Prague Grid Scan Report — Resolution ${resolution}`);
  reportLines.push(`\n**Generated:** ${new Date().toISOString()}`);
  reportLines.push(`**Duration:** ${durationSec}s (${avgTimePerFetch}ms avg per fetch)`);
  reportLines.push('');
  reportLines.push('## Configuration');
  reportLines.push(`- Resolution: ${resolution}×${resolution} (${resolution ** 2} fetches)`);
  reportLines.push(`- Cell size: ${latStep.toFixed(4)}° lat × ${lngStep.toFixed(4)}° lng`);
  reportLines.push(`- Radius: ${Math.round(radius)}m (circumscribes each cell)`);
  reportLines.push(`- Request delay: ${REQUEST_DELAY_MS}ms`);
  reportLines.push('');
  reportLines.push('## Statistics');
  reportLines.push('| Metric | Value |');
  reportLines.push('|--------|-------|');
  reportLines.push(`| Total fetches | ${resolution ** 2} |`);
  reportLines.push(`| Total raw results | ${totalRawResults} |`);
  reportLines.push(`| Unique places | ${processedPlaces.length} |`);
  reportLines.push(`| Total deduplications | ${totalDeduplications} |`);
  reportLines.push(`| Overlap percentage | ${overlapPercentage.toFixed(1)}% |`);
  reportLines.push(`| Avg raw per fetch | ${avgRawPerFetch.toFixed(1)} |`);
  reportLines.push(`| Avg unique per fetch | ${avgUniquePerFetch.toFixed(1)} |`);
  reportLines.push(`| Efficiency (unique/N²) | ${efficiency.toFixed(1)} places/fetch |`);
  reportLines.push(`| Duration | ${durationSec}s |`);
  reportLines.push(`| Avg time per fetch | ${avgTimePerFetch}ms |`);
  reportLines.push('');
  reportLines.push(printBarChart(uniquePerFetch, '## Unique Places per Fetch', MAX_RESULTS_PER_FETCH));
  reportLines.push('');
  reportLines.push(printBarChart(cumulativeUnique, '## Cumulative Unique Places', processedPlaces.length));
  reportLines.push('');

  const report = reportLines.join('\n');

  const reportPath = path.join(outputDir, `prague-r${resolution}-report.md`);
  fs.writeFileSync(reportPath, report);

  console.log(`📄 Report saved → ${reportPath}`);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 STATISTICS');
  console.log('═'.repeat(60));
  console.log(`Total fetches:          ${resolution ** 2}`);
  console.log(`Total raw results:      ${totalRawResults}`);
  console.log(`Unique places:          ${processedPlaces.length}`);
  console.log(`Total deduplications:   ${totalDeduplications}`);
  console.log(`Overlap percentage:     ${overlapPercentage.toFixed(1)}%`);
  console.log(`Avg raw per fetch:      ${avgRawPerFetch.toFixed(1)}`);
  console.log(`Avg unique per fetch:   ${avgUniquePerFetch.toFixed(1)}`);
  console.log(`Efficiency (unique/N²): ${efficiency.toFixed(1)} places/fetch`);
  console.log(`Duration:               ${durationSec}s`);
  console.log(`Avg time per fetch:     ${avgTimePerFetch}ms`);

  console.log(printBarChart(uniquePerFetch, '📈 Unique Places per Fetch', MAX_RESULTS_PER_FETCH));
  console.log(printBarChart(cumulativeUnique, '📈 Cumulative Unique Places', processedPlaces.length));

  console.log('\n' + '═'.repeat(60));

  return processedPlaces;
}

const resolution = parseInt(process.argv[2] || '', 10);
if (isNaN(resolution) || resolution < 1) {
  console.error('Usage: tsx scripts/trial2.ts <resolution>');
  process.exit(1);
}

fetchPlacesInGrid(resolution);
