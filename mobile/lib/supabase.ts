import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
