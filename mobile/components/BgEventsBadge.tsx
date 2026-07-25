import { Pressable, StyleSheet, View as RNView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/tw';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import { useBgEventsBadge } from '@/components/useBgEventsBadge';
import Colors from '@/constants/Colors';

export function BgEventsBadge({ gameId }: { gameId: string | null }) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const {
    visible,
    hintCount,
    discoveryCount,
    dismiss,
  } = useBgEventsBadge(gameId);

  if (!visible || !gameId) return null;
  if (hintCount === 0 && discoveryCount === 0) return null;

  const surfaceColor = isDark ? Colors[colorScheme].surface + 'e8' : Colors[colorScheme].surface + 'e8';

  // Reserve space on the right so the badge doesn't slide under the EXPLORED
  // overlay button (MapControls top-right, ~56px wide incl. padding).
  const RIGHT_INSET = 64;

  return (
    <View
      className="absolute left-4 z-10"
      style={{ top: insets.top + 64, right: 16 + RIGHT_INSET }}
      pointerEvents="box-none"
    >
      <RNView
        style={[
          styles.card,
          { backgroundColor: surfaceColor },
        ]}
      >
        {discoveryCount > 0 && (
          <RNView style={styles.row}>
            <SymbolView
              name={{ ios: 'mappin.fill', android: 'location_pin', web: 'map-pin' }}
              size={16}
              tintColor={Colors[colorScheme].tint}
            />
            <ThemedText variant="bodySmall" style={styles.text} numberOfLines={1}>
              {discLabel(discoveryCount)}
            </ThemedText>
          </RNView>
        )}
        {hintCount > 0 && (
          <RNView style={[styles.row, discoveryCount > 0 ? styles.rowTop : null]}>
            <SymbolView
              name={{ ios: 'eye.fill', android: 'visibility', web: 'eye' }}
              size={16}
              tintColor={Colors[colorScheme].tabIconDefault}
            />
            <ThemedText variant="bodySmall" style={styles.text} numberOfLines={1}>
              {hintLabel(hintCount)}
            </ThemedText>
          </RNView>
        )}
        <Pressable
          onPress={() => { void dismiss(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'x' }}
            size={14}
            tintColor={Colors[colorScheme].tabIconDefault}
          />
        </Pressable>
      </RNView>
    </View>
  );
}

function discLabel(n: number): string {
  return `${n} new ${n === 1 ? 'discovery' : 'discoveries'}`;
}
function hintLabel(n: number): string {
  return `${n} new ${n === 1 ? 'hint' : 'hints'}`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 24,
  },
  rowTop: {
    marginTop: 4,
  },
  text: {
    flex: 1,
    fontWeight: '500',
  },
  closeBtn: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});