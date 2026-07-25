import { useEffect, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SymbolView } from 'expo-symbols';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { View, Pressable as TwPressable } from '@/tw';
import { ThemedText } from '@/components/ThemedText';

// Warning shown below the Background tracking row on Android when
// tracking is On. The Android OS is aggressive about killing background
// services when battery optimization is enabled for the app; opening
// REQUEST_IGNORE_BATTERY_OPTIMIZATIONS shows a one-tap system prompt that
// adds the app to the battery-optimization allowlist. Dismissal is persisted
// so the banner does not nag the user every launch; it reappears only if
// they toggle tracking off and back on.

const DISMISS_KEY = 'explorience_battery_warning_dismissed';

type Props = {
  trackingEnabled: boolean;
};

export function BatteryOptimizationWarning({ trackingEnabled }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trackingEnabled) {
      setDismissed(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const v = await AsyncStorage.getItem(DISMISS_KEY);
      if (!cancelled) setDismissed(v === 'true');
    })();
    return () => {
      cancelled = true;
    };
  }, [trackingEnabled]);

  // Reset dismissal whenever the user turns tracking off → on.
  useEffect(() => {
    if (trackingEnabled) {
      // Fresh check on each enable transition.
      void (async () => {
        const v = await AsyncStorage.getItem(DISMISS_KEY);
        setDismissed(v === 'true');
      })();
    }
  }, [trackingEnabled]);

  if (Platform.OS !== 'android') return null;
  if (!trackingEnabled) return null;
  if (dismissed) return null;

  const openBatterySettings = async () => {
    try {
      setLoading(true);
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        {
          data: `package:${Application.applicationId}`,
        }
      );
      // Best-effort: assume the user acted on the dialog; persist dismissal
      // so the banner goes away after they return. If they didn't actually
      // allow it, they can re-toggle tracking to surface the banner again.
      await AsyncStorage.setItem(DISMISS_KEY, 'true');
      setDismissed(true);
    } catch (e) {
      console.warn('[BatteryOptimizationWarning] intent failed', e);
      // Fallback: open the generic battery-optimization list.
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
        );
      } catch {
        // give up silently
      }
    } finally {
      setLoading(false);
    }
  };

  const dismiss = async () => {
    await AsyncStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <View
      className="rounded-xl p-4 mt-3"
      style={{
        backgroundColor: colors.warning + '15',
        borderWidth: 1,
        borderColor: colors.warning + '40',
      }}
    >
      <View className="flex-row items-start gap-3">
        <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: colors.warning + '25' }}>
          <SymbolView
            name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'alert-triangle' }}
            size={14}
            tintColor={colors.warning}
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <ThemedText variant="body" className="font-semibold">Battery optimization</ThemedText>
            <TwPressable onPress={dismiss} hitSlop={8} className="w-6 h-6 items-center justify-center rounded-full active:opacity-60" style={{ backgroundColor: colors.border + '60' }}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'x' }}
                size={12}
                tintColor={colors.textTertiary}
              />
            </TwPressable>
          </View>
          <ThemedText variant="bodySmall" className="opacity-80 mb-3">
            Battery optimization may cause the background service to stop unexpectedly.
          </ThemedText>
          <Pressable
            onPress={openBatterySettings}
            disabled={loading}
            className="rounded-lg px-4 py-2 active:opacity-70"
            style={{
              backgroundColor: colors.warning,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <ThemedText variant="button" style={{ color: '#000000', fontSize: 13 }}>
              {loading ? 'Opening…' : 'Disable optimization'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
