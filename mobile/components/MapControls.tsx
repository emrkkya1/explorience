import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/tw';
import { ThemedText } from './ThemedText';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { IconButton } from './IconButton';

type MapControlsProps = {
  onOpenSidebar: () => void;
  onOpenPlayers: () => void;
  onCenterPlayer: () => void;
};

export function MapControls({ onOpenSidebar, onOpenPlayers, onCenterPlayer }: MapControlsProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = Colors[colorScheme].text;

  return (
    <>
      <View
        className="absolute right-4 z-10 items-center"
        style={{ top: insets.top + 76 }}
      >
        <IconButton onPress={onOpenSidebar}>
          <SymbolView
            name={{
              ios: 'mappin',
              android: 'location_pin',
              web: 'map-pin',
            }}
            size={22}
            tintColor={iconColor}
          />
        </IconButton>
        <ThemedText variant="caption" className="mt-0.5">PLACES</ThemedText>
      </View>

      <View
        className="absolute left-4 z-10"
        style={{ bottom: insets.bottom - 8 }}
      >
        <IconButton onPress={onOpenPlayers}>
          <SymbolView
            name={{
              ios: 'person.fill',
              android: 'person',
              web: 'user',
            }}
            size={22}
            tintColor={iconColor}
          />
        </IconButton>
      </View>

      <View
        className="absolute right-4 z-10"
        style={{ bottom: insets.bottom - 8 }}
      >
        <IconButton onPress={onCenterPlayer}>
          <SymbolView
            name={{
              ios: 'location.north.line.fill',
              android: 'navigation',
              web: 'navigation',
            }}
            size={22}
            tintColor={iconColor}
          />
        </IconButton>
      </View>
    </>
  );
}
