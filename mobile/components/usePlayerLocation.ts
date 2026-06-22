import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import type { PlayerLocation } from '@/types/FogOfWar';
import { FOG_CONFIG } from '@/constants/FogOfWar';

export function usePlayerLocation(enabled: boolean = true) {
  const [location, setLocation] = useState<PlayerLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied' | 'loading'>('loading');
  const headingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setPermissionStatus('undetermined');
      return;
    }

    let locationSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setPermissionStatus('denied');
          setLoading(false);
          return;
        }

        setPermissionStatus('granted');

        headingSubscription = await Location.watchHeadingAsync((heading) => {
          headingRef.current = heading.trueHeading;
        });

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: FOG_CONFIG.LOCATION_UPDATE_INTERVAL_MS,
            distanceInterval: FOG_CONFIG.LOCATION_UPDATE_DISTANCE_M,
          },
          (loc) => {
            setLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              heading: headingRef.current,
              timestamp: loc.timestamp,
            });
            setLoading(false);
          }
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to get location');
        setLoading(false);
      }
    })();

    return () => {
      locationSubscription?.remove();
      headingSubscription?.remove();
    };
  }, [enabled]);

  return { location, error, loading, permissionStatus };
}
