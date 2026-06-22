import { router } from 'expo-router';

import { View, Text, Pressable } from '@/tw';
import { supabase } from '@/lib/supabase';
import { clearActiveSession } from '@/lib/sessionStore';

export default function DetailsScreen() {
  const handleLogOut = async () => {
    await clearActiveSession();
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-white">
      <Pressable className="px-6 py-4 active:bg-gray-50">
        <Text className="text-lg text-gray-800">Settings</Text>
      </Pressable>
      <View className="h-[1px] bg-gray-200 mx-6" />
      <Pressable className="px-6 py-4 active:bg-gray-50" onPress={handleLogOut}>
        <Text className="text-lg text-red-500">Log Out</Text>
      </Pressable>
    </View>
  );
}
