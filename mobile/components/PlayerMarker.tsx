import { View } from 'react-native';

type PlayerMarkerProps = {
  heading: number | null;
};

export function PlayerMarker({ heading }: PlayerMarkerProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#2D6A4F',
          borderWidth: 3,
          borderColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#E8C45A',
        }}
      />
      {heading !== null && (
        <View
          style={{
            position: 'absolute',
            top: -8,
            transform: [{ rotate: `${heading}deg` }],
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderBottomWidth: 12,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: '#2D6A4F',
            }}
          />
        </View>
      )}
    </View>
  );
}
