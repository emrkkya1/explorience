import { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';

import { View, Text, TextInput, Pressable } from '@/tw';
import { useGameSession } from '@/components/useGameSession';
import {
  loadSessions,
  setActiveSession,
  removeSession,
  clearAllSessions
} from '@/lib/sessionStore';
import { CITIES } from '@/constants/Cities';
import type { StoredSession } from '@/lib/sessionStore';
import type { City } from '@/constants/Cities';

type Step = 'loading' | 'picker' | 'select' | 'join' | 'create';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('loading');
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]);
  const { createGame, joinGame, loading, error } = useGameSession();

  useEffect(() => {
    loadSessions().then((s) => {
      setSessions(s);
      setStep(s.length > 0 ? 'picker' : 'select');
    });
  }, []);

  const refreshSessions = () => {
    loadSessions().then((s) => {
      setSessions(s);
      setStep(s.length > 0 ? 'picker' : 'select');
    });
  };

  const handlePickGame = async (session: StoredSession) => {
    await setActiveSession(session.gameId);
    setModalOpen(false);
    router.replace('/(tabs)/home');
  };

  const handleRemoveGame = async (gameId: string) => {
    await removeSession(gameId);
    refreshSessions();
  };

  const handleClearAll = async () => {
    await clearAllSessions();
    setSessions([]);
    setModalOpen(false);
    setStep('select');
  };

  const handleJoin = async () => {
    const trimmedUser = username.trim();
    const trimmedCode = gameCode.trim().toUpperCase();
    if (!trimmedUser) {
      Alert.alert('Missing username', 'Please enter a username.');
      return;
    }
    if (!trimmedCode || trimmedCode.length < 4) {
      Alert.alert('Invalid code', 'Game code must be at least 4 characters.');
      return;
    }
    try {
      await joinGame(trimmedUser, trimmedCode);
      router.replace('/(tabs)/home');
    } catch {
      // error handled by hook
    }
  };

  const handleCreate = async () => {
    const trimmedUser = username.trim();
    if (!trimmedUser) {
      Alert.alert('Missing username', 'Please enter a username.');
      return;
    }
    try {
      const sess = await createGame(trimmedUser, selectedCity.name);
      Alert.alert(
        'Game Created',
        `Your game code is: ${sess.gameCode}\n\nShare this code with others to join!`
      );
      router.replace('/(tabs)/home');
    } catch {
      // error handled by hook
    }
  };

  const goBack = () => {
    setUsername('');
    setGameCode('');
    setStep('select');
  };

  if (step === 'loading') {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (step === 'picker') {
    return (
      <View className="flex-1 px-6 pt-16">
        <Text className="text-3xl font-bold mb-10">Explorience</Text>

        <Pressable
          className="w-full bg-white border border-gray-300 rounded-xl px-5 py-4 mb-4 flex-row items-center justify-between active:opacity-80"
          onPress={() => setModalOpen(true)}
        >
          <Text className="text-lg text-gray-700">Saved Games</Text>
          <Text className="text-gray-400 text-sm">{sessions.length} saved</Text>
        </Pressable>

        <Pressable
          className="w-full bg-blue-500 rounded-xl py-4 items-center active:opacity-80"
          onPress={() => setStep('select')}
        >
          <Text className="text-white text-lg font-semibold">New Game</Text>
        </Pressable>

        <Modal
          visible={modalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalOpen(false)}
        >
          <View className="flex-1 px-6 pt-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold">Saved Games</Text>
              <Pressable onPress={() => setModalOpen(false)} className="p-2">
                <Text className="text-blue-500 text-lg">Done</Text>
              </Pressable>
            </View>

            <FlatList
              data={sessions}
              keyExtractor={(s) => s.gameId}
              renderItem={({ item }) => (
                <View className="flex-row items-center border-b border-gray-100 py-4">
                  <Pressable
                    className="flex-1 active:opacity-60"
                    onPress={() => handlePickGame(item)}
                  >
                    <Text className="text-lg font-semibold">{item.username}</Text>
                    <Text className="text-gray-400 text-sm mt-0.5">
                      {item.cityName} &middot; {item.gameCode}
                    </Text>
                  </Pressable>
                  <Pressable
                    className="ml-3 w-8 h-8 items-center justify-center rounded-full bg-red-100 active:opacity-60"
                    onPress={() => handleRemoveGame(item.gameId)}
                  >
                    <Text className="text-red-500 font-bold text-lg">&times;</Text>
                  </Pressable>
                </View>
              )}
              ListFooterComponent={
                sessions.length > 0 ? (
                  <Pressable className="py-6 items-center" onPress={handleClearAll}>
                    <Text className="text-red-400 text-sm">Clear All Saved Games</Text>
                  </Pressable>
                ) : null
              }
            />
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View className="flex-1 items-center justify-center px-8">
        {step === 'select' && (
          <View className="w-full items-center">
            <Text className="text-3xl font-bold mb-12">Explorience</Text>
            <Pressable
              className="w-full bg-blue-500 rounded-xl py-4 mb-4 items-center active:opacity-80"
              onPress={() => setStep('join')}
            >
              <Text className="text-white text-lg font-semibold">Join a Game</Text>
            </Pressable>
            <Pressable
              className="w-full bg-emerald-500 rounded-xl py-4 items-center active:opacity-80"
              onPress={() => setStep('create')}
            >
              <Text className="text-white text-lg font-semibold">Create a Game</Text>
            </Pressable>

            {sessions.length > 0 && (
              <Pressable className="mt-8 py-2" onPress={() => refreshSessions()}>
                <Text className="text-gray-400 text-base">Saved Games</Text>
              </Pressable>
            )}
          </View>
        )}

        {step === 'join' && (
          <View className="w-full items-center">
            <Text className="text-2xl font-bold mb-8">Join a Game</Text>

            <TextInput
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 text-lg"
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 text-lg"
              placeholder="Game Code"
              placeholderTextColor="#999"
              value={gameCode}
              onChangeText={(t) => setGameCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />

            {error ? (
              <Text className="text-red-500 mb-4">{error}</Text>
            ) : null}

            <Pressable
              className="w-full bg-blue-500 rounded-xl py-4 mb-3 items-center active:opacity-80 disabled:opacity-50"
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-semibold">Join</Text>
              )}
            </Pressable>

            <Pressable className="py-2" onPress={goBack}>
              <Text className="text-blue-500 text-base">Back</Text>
            </Pressable>
          </View>
        )}

        {step === 'create' && (
          <View className="w-full items-center">
            <Text className="text-2xl font-bold mb-8">Create a Game</Text>

            <TextInput
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 text-lg"
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between active:bg-gray-50"
              onPress={() => setCityModalOpen(true)}
            >
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">{selectedCity.flag}</Text>
                <Text className="text-lg text-gray-600">{selectedCity.name}</Text>
              </View>
              <Text className="text-gray-400 text-sm">Change</Text>
            </Pressable>

            <Modal
              visible={cityModalOpen}
              animationType="fade"
              transparent
              onRequestClose={() => setCityModalOpen(false)}
            >
              <Pressable
                className="flex-1 bg-black/40 items-center justify-center"
                onPress={() => setCityModalOpen(false)}
              >
                <View className="bg-white rounded-2xl w-4/5 max-h-80">
                  <View className="px-5 py-4 border-b border-gray-100">
                    <Text className="text-xl font-bold text-center">Select City</Text>
                  </View>
                  {CITIES.map((city) => (
                    <Pressable
                      key={city.name}
                      className="flex-row items-center px-5 py-4 border-b border-gray-50 active:bg-gray-50"
                      onPress={() => {
                        setSelectedCity(city);
                        setCityModalOpen(false);
                      }}
                    >
                      <Text className="text-3xl mr-4">{city.flag}</Text>
                      <View>
                        <Text className="text-lg font-semibold">{city.name}</Text>
                        <Text className="text-gray-400 text-sm">{city.country}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            </Modal>

            {error ? (
              <Text className="text-red-500 mb-4">{error}</Text>
            ) : null}

            <Pressable
              className="w-full bg-emerald-500 rounded-xl py-4 mb-3 items-center active:opacity-80 disabled:opacity-50"
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-semibold">Create Game</Text>
              )}
            </Pressable>

            <Pressable className="py-2" onPress={goBack}>
              <Text className="text-blue-500 text-base">Back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
