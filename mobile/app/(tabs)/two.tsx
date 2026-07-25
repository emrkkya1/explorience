import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { View, Pressable, ScrollView } from '@/tw';
import { supabase } from '@/lib/supabase';
import { clearActiveSession } from '@/lib/sessionStore';
import { stopBackgroundTracking } from '@/lib/backgroundTracking';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { BatteryOptimizationWarning } from '@/components/BatteryOptimizationWarning';
import { useMapPreferences, type ThemeMode } from '@/components/MapPreferencesContext';
import { useBackgroundTracking } from '@/components/useBackgroundTracking';

export default function OptionsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { showDebug, setShowDebug, themeMode, setThemeMode } = useMapPreferences();
  const { statusText, toggle } = useBackgroundTracking();
  const trackOn = statusText === 'On';

  const handleLogOut = async () => {
    await stopBackgroundTracking();
    await clearActiveSession();
    await supabase.auth.signOut();
    router.replace('/');
  };

  const FormRow = (props: { icon: { ios: string; android: string; web: string }; label: string; sublabel?: string; right?: React.ReactNode; onPress: () => void }) => (
    <Pressable
      className="flex-row items-center gap-3 bg-surface dark:bg-surface-dark rounded-xl p-4 active:opacity-70"
      style={{ borderWidth: 1, borderColor: colors.border }}
      onPress={props.onPress}
    >
      <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: colors.primary + '12' }}>
        <SymbolView name={props.icon} size={18} tintColor={colors.primary} />
      </View>
      <View className="flex-1">
        <ThemedText variant="h3">{props.label}</ThemedText>
        {props.sublabel ? (
          <ThemedText variant="caption" className="mt-0.5 normal-case opacity-70">
            {props.sublabel}
          </ThemedText>
        ) : null}
      </View>
      {props.right}
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="px-4 pb-8" style={{ paddingTop: insets.top + 16 }}>
        <ThemedText variant="h2" className="mb-6">OPTIONS</ThemedText>

        <View className="gap-3 mb-8">
          <SectionHeader title="APPEARANCE" />

          <FormRow
            icon={{ ios: 'paintpalette.fill', android: 'palette', web: 'palette' }}
            label="Visuals"
            sublabel="Fog color, player marker"
            onPress={() => router.push('/visuals')}
            right={
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={16}
                tintColor={colors.textTertiary}
              />
            }
          />

          <View className="bg-surface dark:bg-surface-dark rounded-xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <ThemedText variant="body" className="mb-3">Theme</ThemedText>
            <View className="flex-row gap-2">
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
                const active = themeMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setThemeMode(mode)}
                    className="flex-1 h-10 rounded-lg items-center justify-center active:opacity-70"
                    style={{
                      backgroundColor: active ? colors.primary : 'transparent',
                    }}
                  >
                    <ThemedText
                      variant="button"
                      style={{
                        color: active ? '#FFFFFF' : colors.textTertiary,
                        fontSize: 13,
                      }}
                    >
                      {mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View className="gap-3 mb-8">
          <SectionHeader title="GAMEPLAY" />

          <FormRow
            icon={{ ios: 'camera.metering.matrix', android: 'auto_awesome', web: 'auto_awesome' }}
            label="Vision AI"
            sublabel="Provider, model, API key"
            onPress={() => router.push('/vision-ai')}
            right={
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={16}
                tintColor={colors.textTertiary}
              />
            }
          />

          <Pressable
            className="flex-row items-center justify-between bg-surface dark:bg-surface-dark rounded-xl p-4 active:opacity-70"
            style={{ borderWidth: 1, borderColor: colors.border }}
            onPress={toggle}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: (trackOn ? colors.success : colors.primary) + '12' }}>
                <SymbolView
                  name={{ ios: 'location.fill', android: 'my_location', web: 'map-pin' }}
                  size={18}
                  tintColor={trackOn ? colors.success : colors.textTertiary}
                />
              </View>
              <View>
                <ThemedText variant="h3">Background tracking</ThemedText>
                <ThemedText variant="caption" className="mt-0.5 normal-case opacity-70">
                  {statusText}
                </ThemedText>
              </View>
            </View>
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{
                backgroundColor: trackOn ? colors.success : colors.border,
              }}
            >
              {trackOn && (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={14}
                  tintColor="#FFFFFF"
                />
              )}
            </View>
          </Pressable>

          <BatteryOptimizationWarning trackingEnabled={trackOn} />
        </View>

        <View className="gap-3 mb-8">
          <SectionHeader title="DEVELOPER" />

          <Pressable
            className="flex-row items-center justify-between bg-surface dark:bg-surface-dark rounded-xl p-4 active:opacity-70"
            style={{ borderWidth: 1, borderColor: colors.border }}
            onPress={() => setShowDebug(!showDebug)}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: (showDebug ? colors.danger : colors.primary) + '12' }}>
                <SymbolView
                  name={{ ios: 'ladybug.fill', android: 'bug_report', web: 'bug' }}
                  size={18}
                  tintColor={showDebug ? colors.danger : colors.textTertiary}
                />
              </View>
              <ThemedText variant="h3">Debug Overlay</ThemedText>
            </View>
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{
                backgroundColor: showDebug ? colors.danger : colors.border,
              }}
            >
              {showDebug && (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={14}
                  tintColor="#FFFFFF"
                />
              )}
            </View>
          </Pressable>
        </View>

        <Button title="Log Out" variant="ghost" onPress={handleLogOut} />
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <ThemedText
      variant="caption"
      className="text-text-secondary dark:text-text-secondary-dark tracking-widest"
    >
      {title}
    </ThemedText>
  );
}