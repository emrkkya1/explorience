import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, Text } from '@/tw';
import type { PoiRarity } from '@/types/Poi';
import Colors from '@/constants/Colors';
import { semanticColors } from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { RARITY_COLORS } from '@/constants/Rarity';

type MapHeaderProps = {
  discovered: Record<PoiRarity, number>;
  total: Record<PoiRarity, number>;
  cityName?: string;
};

const RARITY_ORDER: PoiRarity[] = ['legendary', 'epic', 'rare', 'common'];
const RARITY_LABELS: Record<PoiRarity, string> = {
  legendary: 'L',
  epic: 'E',
  rare: 'R',
  common: 'C',
};

export function MapHeader({ discovered, total, cityName }: MapHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const discoveredTotal = RARITY_ORDER.reduce((sum, r) => sum + discovered[r], 0);
  const allTotal = RARITY_ORDER.reduce((sum, r) => sum + total[r], 0);

  const glassBg = semanticColors.glassSurface[colorScheme];

  return (
    <View
      className="absolute top-0 left-0 right-0 px-3 z-10"
      style={{ paddingTop: insets.top + 6 }}
    >
      <View
        className="flex-row items-center rounded-2xl px-3 py-2"
        style={{
          backgroundColor: glassBg,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.4 : 0.1,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        {cityName ? (
          <View className="mr-3 pr-3 border-r border-border dark:border-border-dark">
            <Text className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark tracking-wide">
              {cityName.toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View className="flex-1 flex-row items-center gap-2">
          {RARITY_ORDER.map((rarity) => (
            <View key={rarity} className="flex-row items-center gap-1">
              <View
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: RARITY_COLORS[rarity] }}
              />
              <Text
                className="text-[11px] font-semibold"
                style={{ color: RARITY_COLORS[rarity] }}
              >
                {discovered[rarity]}/{total[rarity]}
              </Text>
            </View>
          ))}
        </View>

        <View className="w-[1px] h-4 bg-border dark:bg-border-dark mx-2" />

        <View className="flex-row items-center gap-1">
          <Text
            className="text-[13px] font-bold"
            style={{ color: colors.text }}
          >
            {discoveredTotal}
          </Text>
          <Text
            className="text-[11px] text-text-secondary dark:text-text-secondary-dark"
          >
            /{allTotal}
          </Text>
        </View>
      </View>
    </View>
  );
}
