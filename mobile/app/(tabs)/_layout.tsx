import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tabIconSelected,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].surface,
          borderTopColor: Colors[colorScheme].border,
          borderTopWidth: 1,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'location.fill',
                android: 'location_on',
                web: 'map-pin',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Options',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'gearshape.fill',
                android: 'settings',
                web: 'settings',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
