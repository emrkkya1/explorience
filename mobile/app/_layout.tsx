import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthSync } from '@/components/useAuthSync';
import { MapPreferencesProvider } from '@/components/MapPreferencesContext';
import { LlmConfigProvider } from '@/components/LlmConfigContext';
import { initializeMapbox } from '@/lib/mapbox';
import '@/lib/backgroundLocationTask';
import Colors from '@/constants/Colors';

initializeMapbox();

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Anton: Anton_400Regular,
    PlusJakartaSans: PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  useAuthSync();

  return (
    <LlmConfigProvider>
      <MapPreferencesProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="visuals" options={{
            headerShown: true,
            title: 'VISUALS',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: {
              color: colors.text,
              fontFamily: 'Anton',
              fontSize: 22,
            },
            headerShadowVisible: false,
          }} />
          <Stack.Screen name="vision-ai" options={{
            headerShown: true,
            title: 'VISION AI',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: {
              color: colors.text,
              fontFamily: 'Anton',
              fontSize: 22,
            },
            headerShadowVisible: false,
          }} />
          <Stack.Screen name="explore-camera" options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }} />
        </Stack>
        </ThemeProvider>
      </MapPreferencesProvider>
    </LlmConfigProvider>
  );
}
