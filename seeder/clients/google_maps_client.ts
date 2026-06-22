import { CityBounds, RawPlace } from "../pipeline/types";
import {
    computeCellRadius,
    computeGridId
} from "../utils/geo";
import { logger } from "../utils/logging";

export interface SearchNearbyParams {
  center: { lat: number; lng: number };
  radius: number;
  includedTypes: string[];
  maxResults?: number;
}

export class GoogleMapsClient {
  constructor(private apiKey: string) {}

  async searchNearby(params: SearchNearbyParams): Promise<RawPlace[]> {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.location,places.userRatingCount,places.types,places.rating",
        },
        body: JSON.stringify({
          includedTypes: params.includedTypes,
          maxResultCount: params.maxResults || 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: params.center.lat,
                longitude: params.center.lng,
              },
              radius: params.radius,
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Maps API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    if (!data.places) return [];

    return data.places.map((place: any) => ({
      id: place.id,
      name: place.displayName.text,
      types: place.types,
      rating: place.rating,
      totalReviews: place.userRatingCount,
      location: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      gridId: computeGridId(place.location.latitude, place.location.longitude),
    }));
  }

  async fetchCityGrid(
    bounds: CityBounds,
    types: string[],
    resolution: number,
    delayMs: number = 125,
  ): Promise<RawPlace[]> {
    const allPlaces = new Map<string, RawPlace>();
    const latStep = (bounds.north - bounds.south) / resolution;
    const lngStep = (bounds.east - bounds.west) / resolution;
    const radius = computeCellRadius(
      bounds.south + latStep,
      bounds.south,
      bounds.west + lngStep,
      bounds.west,
    );

    let fetchCount = 0;
    const totalFetches = resolution * resolution;
    let lastReportedPct = -10;

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const centerLat = bounds.south + (i + 0.5) * latStep;
        const centerLng = bounds.west + (j + 0.5) * lngStep;

        const places = await this.searchNearby({
          center: { lat: centerLat, lng: centerLng },
          radius,
          includedTypes: types,
        });

        places.forEach((place) => allPlaces.set(place.id, place));

        fetchCount++;
        const pct = Math.round((fetchCount / totalFetches) * 100);
        if (pct - lastReportedPct >= 10) {
          logger.info(`place_fetching: ${fetchCount}/${totalFetches} cells (${pct}%) — ${allPlaces.size} places so far`);
          lastReportedPct = pct;
        }

        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    const result = Array.from(allPlaces.values());
    return result;
  }
}
