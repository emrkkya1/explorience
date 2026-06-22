import fs from 'fs';
import 'dotenv/config';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Center of Prague Old Town Square (Staroměstské náměstí)
const PRAGUE_LAT = 50.0874;
const PRAGUE_LNG = 14.4213;

async function testPlaceQuality() {
  console.log("🔍 Scanning Prague for RPG POIs...");

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.userRatingCount,places.types,places.rating'
      },
      body: JSON.stringify({
        // Target types for a dense, historical European city
        includedTypes: ['historical_landmark', 'tourist_attraction', 'church', 'museum', 'monument'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: PRAGUE_LAT, longitude: PRAGUE_LNG },
            radius: 1200.0 // 1.2km radius covers Old Town, Charles Bridge, and up towards the Castle
          }
        }
      })
    });

    const data = await response.json();

    if (!data.places) {
      console.log("No places found or API error.", data);
      return;
    }

    const processedPlaces = data.places.map((place: any) => {
      const lat = place.location.latitude;
      const lng = place.location.longitude;

      // Calculate the 100x100m Grid ID
      const gridId = `${(Math.floor(lat * 1000) / 1000).toFixed(3)},${(Math.floor(lng * 1000) / 1000).toFixed(3)}`;

      // Calculate Rarity based on review counts
      let rarity = 3; // Legendary (Hidden/Obscure)
      if (place.userRatingCount > 15000) rarity = 1; // Common (Major landmarks like Charles Bridge)
      else if (place.userRatingCount > 2000) rarity = 2; // Rare (Notable statues or smaller churches)

      return {
        name: place.displayName.text,
        google_place_id: place.id,
        types: place.types,
        rating: place.rating,
        total_reviews: place.userRatingCount,
        calculated_rarity: rarity,
        grid_id: gridId,
        coordinates: { lat, lng }
      };
    });

    // Sort by most reviewed so the major landmarks appear at the top of your JSON file
    processedPlaces.sort((a: any, b: any) => b.total_reviews - a.total_reviews);

    // Write to a Prague-specific file
    fs.writeFileSync('prague-test-data.json', JSON.stringify(processedPlaces, null, 2));

    console.log(`✅ Success! Wrote ${processedPlaces.length} places to prague-test-data.json`);
    console.log("Open 'prague-test-data.json' to see what kind of landmarks the game will generate.");

  } catch (error) {
    console.error("❌ Script Failed:", error);
  }
}

testPlaceQuality();
