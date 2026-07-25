import { useCallback, useEffect, useRef } from 'react';

import { createCoalescedFlush } from '@/lib/coalescedFlush';

// React-friendly wrapper around the plain coalesced-flush factory. The
// background location task uses the plain factory directly; foreground hooks
// keep using this wrapper so unmount semantics remain intact.
export function useCoalescedFlush(
  flush: () => Promise<boolean>,
  coalesceMs: number
): { schedule: () => void } {
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const instanceRef = useRef<ReturnType<typeof createCoalescedFlush> | null>(null);

  if (instanceRef.current === null) {
    instanceRef.current = createCoalescedFlush(() => flushRef.current(), coalesceMs);
  }

  const schedule = useCallback(() => {
    instanceRef.current?.schedule();
  }, []);

  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        void instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, []);

  return { schedule };
}