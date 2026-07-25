import AsyncStorage from '@react-native-async-storage/async-storage';

const UCKUN_WELCOME_KEY = '@uckun_welcome_shown';

export async function hasShownUckunWelcome(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(UCKUN_WELCOME_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setUckunWelcomeShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(UCKUN_WELCOME_KEY, 'true');
  } catch {
    // ignore storage failures
  }
}