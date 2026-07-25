import { useSyncExternalStore } from 'react';

export type ExploreCaptureStatus = 'in-progress' | 'explored' | 'canceled';

export type ExploreCapture = {
  poiId: string;
  status: ExploreCaptureStatus;
};

let current: ExploreCapture | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function setExploreCapture(c: ExploreCapture | null): void {
  current = c;
  emit();
}

export function startExploreCapture(poiId: string): void {
  setExploreCapture({ poiId, status: 'in-progress' });
}

export function completeExploreCapture(
  poiId: string,
  status: Exclude<ExploreCaptureStatus, 'in-progress'>
): void {
  setExploreCapture({ poiId, status });
}

export function clearExploreCapture(): void {
  setExploreCapture(null);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ExploreCapture | null {
  return current;
}

// React 18 throws if the same reference is returned across renders when nothing
// changed; since `current` is replaced only on writes, returning it directly is
// stable between renders.
export function useExploreCapture(): ExploreCapture | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}