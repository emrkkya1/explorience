import fs from 'fs';
import 'dotenv/config';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Prague bounding box
const PRAGUE_BOUNDS = {
  north: 50.15,
  south: 50.00,
  east: 14.55,
  west: 14.25
};

// Expanded types including food establishments
const INCLUDED_TYPES = [
  'historical_landmark',
  'tourist_attraction',
  'church',
  'museum',
  'monument',
  'restaurant',
  'cafe',
  'bar',
  'pub',
  'bakery',
  'fast_food_restaurant'
];

const RESOLUTION = 5; // Quick test with 5x5 grid

async function fetchPlacesInGrid() {
  console.log(`🔍 Testing with expanded types (including food)...\n`);
  console.log(`Types: ${INCLUDED_TYPES.join(', ')}\n`);

  const latStep = (PRAGUE_BOUNDS.north - PRAGUE_BOUNDS.south) / RESOLUTION;
  const lngStep = (PRAGUE_BOUNDS.east - PRAGUE_BOUNDS.west) / RESOLUTION;
  const radius = Math.sqrt(latStep * latStep + lngStep * lngStep) * 111000 / 2;

  const allPlaces = new Map<string, any>();
  let fetchCount = 0;

  for (let i = 0; i < RESOLUTION; i++) {
    for (let j = 0; j < RESOLUTION; j++) {
      const centerLat = PRAGUE_BOUNDS.south + (i + 0.5) * latStep;
      const centerLng = PRAGUE_BOUNDS.west + (j + 0.5) * lngStep;

      fetchCount++;
      console.log(`  [${fetchCount}/${RESOLUTION ** 2}] Fetching cell (${i},${j})...`);

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
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: { latitude: centerLat, longitude: centerLng },
                radius: radius
              }
            }
          })
        });

        const data = await response.json();

        if (data.places) {
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
          console.log(`    ✓ ${data.places.length} places (${allPlaces.size} unique total)`);
        }

        await new Promise(resolve => setTimeout(resolve, 125));

      } catch (error) {
        console.error(`    ✗ Error:`, error);
      }
    }
  }

  const processedPlaces = Array.from(allPlaces.values());
  processedPlaces.sort((a, b) => b.total_reviews - a.total_reviews);

  // Count food places
  const foodTypes = new Set(['restaurant', 'cafe', 'bar', 'pub', 'bakery', 'fast_food_restaurant']);
  const foodPlaces = processedPlaces.filter(p => p.types.some(t => foodTypes.has(t)));

  fs.writeFileSync('prague-expanded-test.json', JSON.stringify(processedPlaces, null, 2));

  console.log(`\n✅ Results:`);
  console.log(`   Total places: ${processedPlaces.length}`);
  console.log(`   Food places: ${foodPlaces.length} (${((foodPlaces.length / processedPlaces.length) * 100).toFixed(1)}%)`);
  console.log(`\n   Compare to R=5 (original): 397 places, ~2% food`);
  console.log(`\n   Saved to prague-expanded-test.json`);
}

fetchPlacesInGrid();
