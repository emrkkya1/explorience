import { useEffect, useRef, useState } from 'react';

export type SmoothedHeadingOptions = {
  alpha: number;
  deadZoneDeg: number;
  throttleMs: number;
};

const DEFAULT_OPTIONS: SmoothedHeadingOptions = {
  alpha: 0.2,
  deadZoneDeg: 2,
  throttleMs: 80
};

export function useSmoothedHeading(
  rawHeading: number | null,
  options: Partial<SmoothedHeadingOptions> = {}
): number | null {
  const alpha = options.alpha ?? DEFAULT_OPTIONS.alpha;
  const deadZoneDeg = options.deadZoneDeg ?? DEFAULT_OPTIONS.deadZoneDeg;
  const throttleMs = options.throttleMs ?? DEFAULT_OPTIONS.throttleMs;

  const [smoothed, setSmoothed] = useState<number | null>(rawHeading);
  const smoothedRef = useRef<number | null>(rawHeading);
  const targetRef = useRef<number | null>(rawHeading);

  useEffect(() => {
    if (rawHeading == null) {
      targetRef.current = null;
      return;
    }
    const current = smoothedRef.current;
    if (current == null) {
      smoothedRef.current = rawHeading;
      targetRef.current = rawHeading;
      setSmoothed(rawHeading);
      return;
    }
    const base = targetRef.current ?? current;
    const delta = shortestArcDelta(rawHeading - base);
    targetRef.current = base + delta;
  }, [rawHeading]);

  useEffect(() => {
    const interval = setInterval(() => {
      const target = targetRef.current;
      const current = smoothedRef.current;
      if (target == null || current == null) return;
      const delta = shortestArcDelta(target - current);
      if (Math.abs(delta) < deadZoneDeg) return;
      const next = current + alpha * delta;
      smoothedRef.current = next;
      setSmoothed(((next % 360) + 360) % 360);
    }, throttleMs);
    return () => clearInterval(interval);
  }, [alpha, deadZoneDeg, throttleMs]);

  return smoothed;
}

function shortestArcDelta(delta: number): number {
  return ((delta + 540) % 360) - 180;
}
