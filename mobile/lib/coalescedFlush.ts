// Plain (non-React) factory extracted from useCoalescedFlush, so the
// background location task (which has no React tree) can reuse the exact
// same coalesced write + retry-on-failure behavior as the foreground path.

export type CoalescedFlush = {
  schedule: () => void;
  flushNow: () => Promise<void>;
  dispose: () => Promise<void>;
};

export function createCoalescedFlush(
  flush: () => Promise<boolean>,
  coalesceMs: number
): CoalescedFlush {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const runFlush = async (): Promise<void> => {
    const ok = await flush();
    if (!ok && !disposed && timer === null) {
      timer = setTimeout(() => {
        timer = null;
        void runFlush();
      }, coalesceMs);
    }
  };

  return {
    schedule: () => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        void runFlush();
      }, coalesceMs);
    },
    flushNow: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return runFlush();
    },
    dispose: async () => {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await flush();
    },
  };
}