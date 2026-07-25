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

import type { PoiCategory } from '@/types/Poi';

const categoryIconMap: Record<PoiCategory, LucideIcon> = {
  nightlife: Moon,
  food: UtensilsCrossed,
  landmark: Landmark,
  history: ScrollText,
  nature: TreePine,
  shopping: ShoppingBag,
  miscellaneous: Ellipsis,
};

type PoiCategoryIconProps = {
  category: PoiCategory;
  size?: number;
  color?: string;
};

export function PoiCategoryIcon({ category, size = 18, color = '#FFFFFF' }: PoiCategoryIconProps) {
  const Icon = categoryIconMap[category];
  return <Icon size={size} color={color} strokeWidth={2.5} />;
}
