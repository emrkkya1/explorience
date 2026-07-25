import { View, Text } from 'react-native';
import {
  Moon,
  UtensilsCrossed,
  Landmark,
  ScrollText,
  TreePine,
  ShoppingBag,
  Ellipsis,
  type LucideIcon,
} from 'lucide-react-native';

import type { PoiCategory, PoiRarity } from '@/types/Poi';
import { RARITY_COLORS } from '@/constants/Rarity';

type PoiMarkerIconProps = {
  category: PoiCategory;
  rarity: PoiRarity;
};

const categoryIconMap: Record<PoiCategory, LucideIcon> = {
  nightlife: Moon,
  food: UtensilsCrossed,
  landmark: Landmark,
  history: ScrollText,
  nature: TreePine,
  shopping: ShoppingBag,
  miscellaneous: Ellipsis,
};

export function PoiMarkerIcon({ category, rarity }: PoiMarkerIconProps) {
  const color = RARITY_COLORS[rarity];
  const Icon = categoryIconMap[category];

  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={16} color="#FFFFFF" strokeWidth={2.5} />
    </View>
  );
}

export function HintMarkerIcon() {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#737373',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#737373' }}>?</Text>
    </View>
  );
}
