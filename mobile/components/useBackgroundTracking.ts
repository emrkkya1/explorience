import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import {
  startBackgroundTracking,
  stopBackgroundTracking,
  isTrackingRunning,
} from '@/lib/backgroundTracking';
import { getBgTrackingEnabled } from '@/lib/bgTrackingState';
import { getActiveSession } from '@/lib/sessionStore';

export type BgTrackingStatus =
  | 'off'
  | 'on'
  | 'permission-needed'
  | 'session-required'
  | 'starting'
  | 'error';

export function useBackgroundTracking(): {
  status: BgTrackingStatus;
  statusText: string;
  toggle: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<BgTrackingStatus>('off');

  const refresh = useCallback(async () => {
    const enabled = await getBgTrackingEnabled();
    const running = await isTrackingRunning();
    if (enabled && running) {
      setStatus('on');
    } else if (enabled && !running) {
      // Toggle was on but OS revoked permission, or app killed and restart
      // did not re-start the task — surface as permission-needed so the
      // user can re-grant via OS settings.
      const session = await getActiveSession();
      setStatus(session ? 'permission-needed' : 'session-required');
    } else {
      setStatus('off');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(async () => {
    if (status === 'on') {
      await stopBackgroundTracking();
      setStatus('off');
      return;
    }
    setStatus('starting');
    try {
      await startBackgroundTracking();
      setStatus('on');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'foreground-denied' || msg === 'background-denied') {
        setStatus('permission-needed');
        try {
          await Linking.openURL('app-settings:');
        } catch {
          // settings deep-link unavailable — leave surfaced as permission-needed
        }
      } else if (msg === 'no-active-session') {
        setStatus('session-required');
      } else {
        setStatus('error');
        console.error('[useBackgroundTracking] toggle error', e);
      }
    }
  }, [status]);

  const statusText =
    status === 'on'
      ? 'On'
      : status === 'permission-needed'
      ? 'Permission needed'
      : status === 'session-required'
      ? 'Sign in first'
      : status === 'starting'
      ? 'Starting…'
      : status === 'error'
      ? 'Error'
      : 'Off';

  return { status, statusText, toggle, refresh };
}