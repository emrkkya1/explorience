import Svg, { Circle, Path } from 'react-native-svg';

import Colors, { semanticColors } from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { ThemedText } from './ThemedText';

type SimilarityRingProps = {
  similarityScore: number; // 0..1
  size?: number;
};

function colorFor(value: number, colorScheme: 'light' | 'dark'): string {
  const colors = semanticColors.similarity;
  if (value >= 0.85) return colors.high[colorScheme];
  if (value >= 0.6) return colors.mid[colorScheme];
  return colors.low[colorScheme];
}

// arcPath builds an SVG path for a circular arc from -90deg sweeping clockwise
// by `sweepDeg`. Center (r,r), radius r.
function arcPath(r: number, sweepDeg: number): string {
  if (sweepDeg <= 0) return '';
  if (sweepDeg >= 360) {
    // Full circle as two arcs to avoid 0/360 ambiguity.
    return `M ${r} 0 A ${r} ${r} 0 1 1 ${r} ${2 * r} A ${r} ${r} 0 1 1 ${r} 0 Z`;
  }
  const startRad = (-90 * Math.PI) / 180;
  const endRad = ((-90 + sweepDeg) * Math.PI) / 180;
  const x1 = r + r * Math.cos(startRad);
  const y1 = r + r * Math.sin(startRad);
  const x2 = r + r * Math.cos(endRad);
  const y2 = r + r * Math.sin(endRad);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

export function SimilarityRing({ similarityScore, size = 120 }: SimilarityRingProps) {
  const colorScheme = useColorScheme();
  const clamped = Math.max(0, Math.min(1, similarityScore));
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const color = colorFor(clamped, colorScheme);
  const sweepDeg = clamped * 360;
  const pct = Math.round(clamped * 100);
  const trackColor = semanticColors.similarity.track[colorScheme];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={r}
        cy={r}
        r={r - stroke / 2}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
      />
      {sweepDeg > 0 ? (
        <Path
          d={arcPath(r, sweepDeg)}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      ) : null}
      <ThemedText
        variant="h2"
        className="text-center"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          textAlign: 'center',
          lineHeight: size,
        }}
      >
        {`${pct}%`}
      </ThemedText>
    </Svg>
  );
}

SimilarityRing.displayName = 'SimilarityRing';