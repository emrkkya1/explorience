import Svg, { Circle, G, Polygon } from 'react-native-svg';

import { useMapPreferences } from './MapPreferencesContext';

type PlayerMarkerProps = {
  cameraHeading: number;
};

export function PlayerMarker({ cameraHeading }: PlayerMarkerProps) {
  const { playerColor } = useMapPreferences();

  // PointAnnotation renders in screen space.
  // Map north is at angle -cameraHeading from screen-up.
  const northAngle = ((-cameraHeading % 360) + 360) % 360;

  return (
    <Svg width={44} height={52} viewBox="0 0 44 52">
      <Circle cx={22} cy={26} r={15} fill="#FFFFFF" />
      <Circle cx={22} cy={26} r={12} fill={playerColor} />
      <Circle cx={22} cy={26} r={5} fill="#FFFFFF" />
      <G origin="22, 26" rotation={northAngle}>
        <Polygon
          points="18,13 26,13 22,3"
          fill={playerColor}
        />
      </G>
    </Svg>
  );
}
