import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { writePoiCache } from '@/lib/poiCache';
import type { Poi } from '@/types/Poi';

export function usePois(cityId: number | null) {
  const [pois, setPois] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) return;

    let cancelled = false;

    const fetchPois = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('pois')
        .select('*')
        .eq('city_id', cityId);

      if (!cancelled && !error && data) {
        setPois(data as Poi[]);
        void writePoiCache(cityId, data as Poi[]);
      }

      setLoading(false);
    };

    fetchPois();

    return () => {
      cancelled = true;
    };
  }, [cityId]);

  return { pois, loading };
}
