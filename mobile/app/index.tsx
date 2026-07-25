import { useState, useEffect } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { UCKUN_MODE, UCKUN_LOADING_MESSAGES } from '@/constants/UckunMode';
import { useColorScheme } from '@/components/useColorScheme';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { useGameSession } from '@/components/useGameSession';
import {
  loadSessions,
  setActiveSession,
  removeSession,
  clearAllSessions,
} from '@/lib/sessionStore';
import { hasShownUckunWelcome, setUckunWelcomeShown } from '@/lib/uckunStore';
import { CITIES } from '@/constants/Cities';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { UckunModeBadge } from '@/components/UckunModeBadge';
import { UckunWelcomeSlideshow } from '@/components/UckunWelcomeSlideshow';
import type { StoredSession } from '@/lib/sessionStore';
import type { City } from '@/constants/Cities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'loading' | 'picker' | 'select' | 'join' | 'create';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [step, setStep] = useState<Step>('loading');
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]);
  const { createGame, joinGame, loading, error } = useGameSession();
  const [showUckunWelcome, setShowUckunWelcome] = useState(false);
  const [loadingMessage] = useState(() =>
    UCKUN_MODE
      ? UCKUN_LOADING_MESSAGES[Math.floor(Math.random() * UCKUN_LOADING_MESSAGES.length)]
      : ''
  );

  useEffect(() => {
    loadSessions().then((s) => {
      setSessions(s);
      setStep(s.length > 0 ? 'picker' : 'select');
    });
  }, []);

  useEffect(() => {
    if (UCKUN_MODE) {
      hasShownUckunWelcome().then((shown) => {
        if (!shown) setShowUckunWelcome(true);
      });
    }
  }, []);

  const handleUckunWelcomeComplete = () => {
    setUckunWelcomeShown();
    setShowUckunWelcome(false);
  };

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
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
        <ActivityIndicator size="large" color={colors.primary} />
        {UCKUN_MODE ? (
          <ThemedText variant="body" className="mt-4 text-text-secondary dark:text-text-secondary-dark">
            {loadingMessage}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <UckunWelcomeSlideshow
        visible={showUckunWelcome}
        onComplete={handleUckunWelcomeComplete}
      />
      <ScrollView
        className="flex-1 bg-bg dark:bg-bg-dark"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        {step === 'picker' && (
          <View className="px-6">
            <View className="items-center mb-10">
              <Image
                source={require('@/assets/images/explorience-logo.png')}
                style={{ width: 96, height: 96 }}
                resizeMode="contain"
              />
              <View className="relative self-center">
                <ThemedText variant="h1" className="mt-2 text-center tracking-wider">EXPLORIENCE</ThemedText>
                {UCKUN_MODE ? (
                  <View className="absolute -right-2 -bottom-1">
                    <UckunModeBadge size="small" />
                  </View>
                ) : null}
              </View>
            </View>

            <Pressable
              className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl px-5 py-5 mb-4 active:opacity-80 flex-row items-center"
              onPress={() => setModalOpen(true)}
            >
              <View className="flex-1">
                <ThemedText variant="h3">Saved Games</ThemedText>
                <ThemedText variant="bodySmall" className="text-text-secondary dark:text-text-secondary-dark mt-0.5">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''} saved
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={16}
                tintColor={colors.tabIconDefault}
              />
            </Pressable>

            <Button title="New Game" onPress={() => setStep('select')} />

            <Modal
              visible={modalOpen}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setModalOpen(false)}
            >
              <View className="flex-1 bg-bg dark:bg-bg-dark">
                <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                  <ThemedText variant="h2">SAVED GAMES</ThemedText>
                  <Pressable onPress={() => setModalOpen(false)} className="px-3 py-2">
                    <ThemedText variant="body" color="accent">Done</ThemedText>
                  </Pressable>
                </View>

                <FlatList
                  data={sessions}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                  keyExtractor={(s) => s.gameId}
                  renderItem={({ item }) => (
                    <View className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 mb-3">
                      <View className="flex-1">
                        <ThemedText variant="h3">{item.username}</ThemedText>
                        <ThemedText variant="bodySmall" className="text-text-secondary dark:text-text-secondary-dark mt-0.5">
                          {item.cityName} &middot; {item.gameCode}
                        </ThemedText>
                      </View>
                      <Pressable
                        className="w-9 h-9 items-center justify-center rounded-xl bg-danger/10 active:opacity-60 mr-2"
                        onPress={() => handleRemoveGame(item.gameId)}
                      >
                        <Text className="text-danger dark:text-danger-dark font-bold text-base">&times;</Text>
                      </Pressable>
                      <Button title="Continue" onPress={() => handlePickGame(item)} />
                    </View>
                  )}
                  ListFooterComponent={
                    sessions.length > 0 ? (
                      <Pressable className="py-4 items-center" onPress={handleClearAll}>
                        <ThemedText variant="bodySmall" color="danger">Clear All Saved Games</ThemedText>
                      </Pressable>
                    ) : null
                  }
                />
              </View>
            </Modal>
          </View>
        )}

        {step === 'select' && (
          <View className="px-6 items-center pt-16">
            <Image
              source={require('@/assets/images/explorience-logo.png')}
              style={{ width: 128, height: 128 }}
              resizeMode="contain"
            />
            <View className="relative self-center">
              <ThemedText variant="h1" className="mt-3 mb-2 text-center tracking-wider">EXPLORIENCE</ThemedText>
              {UCKUN_MODE ? (
                <View className="absolute -right-2 -bottom-1">
                  <UckunModeBadge size="small" />
                </View>
              ) : null}
            </View>
            <ThemedText variant="body" className="text-text-secondary dark:text-text-secondary-dark text-center mb-10">
              Explore cities, discover places
            </ThemedText>

            <Button title="Join a Game" onPress={() => setStep('join')} className="w-full mb-3" />
            <Button title="Create a Game" variant="secondary" onPress={() => setStep('create')} className="w-full" />

            {sessions.length > 0 && (
              <Pressable className="mt-8 py-2" onPress={() => refreshSessions()}>
                <ThemedText variant="bodySmall" className="text-text-secondary dark:text-text-secondary-dark">
                  {sessions.length} saved session{sessions.length !== 1 ? 's' : ''}
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {step === 'join' && (
          <View className="px-6">
            <View className="flex-row items-center gap-3 mb-8">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <SymbolView
                  name={{ ios: 'gamecontroller.fill', android: 'sports_esports', web: 'controller' }}
                  size={20}
                  tintColor={colors.primary}
                />
              </View>
              <View>
                <ThemedText variant="h2">JOIN A GAME</ThemedText>
              </View>
            </View>

            <View className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl px-4 h-14 mb-4">
              <SymbolView
                name={{ ios: 'person.fill', android: 'person', web: 'user' }}
                size={18}
                tintColor={colors.tabIconDefault}
              />
              <TextInput
                className="flex-1 ml-3 h-full text-text-primary dark:text-text-primary-dark font-jakarta text-[15px]"
                placeholder="Username"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl px-4 h-14 mb-4">
              <SymbolView
                name={{ ios: 'key.fill', android: 'key', web: 'key' }}
                size={18}
                tintColor={colors.tabIconDefault}
              />
              <TextInput
                className="flex-1 ml-3 h-full text-text-primary dark:text-text-primary-dark font-jakarta text-[15px] tracking-widest"
                placeholder="Game Code"
                placeholderTextColor={colors.textTertiary}
                value={gameCode}
                onChangeText={(t) => setGameCode(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
              />
            </View>

            {error ? (
              <ThemedText variant="bodySmall" color="danger" className="mb-4">{error}</ThemedText>
            ) : null}

            <Button title="Join" onPress={handleJoin} loading={loading} className="w-full mb-3" />
            <Button title="Back" variant="ghost" onPress={goBack} className="w-full" />
          </View>
        )}

        {step === 'create' && (
          <View className="px-6">
            <View className="flex-row items-center gap-3 mb-8">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <SymbolView
                  name={{ ios: 'plus.square.fill', android: 'add_box', web: 'plus-square' }}
                  size={20}
                  tintColor={colors.primary}
                />
              </View>
              <View>
                <ThemedText variant="h2">CREATE A GAME</ThemedText>
              </View>
            </View>

            <View className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl px-4 h-14 mb-4">
              <SymbolView
                name={{ ios: 'person.fill', android: 'person', web: 'user' }}
                size={18}
                tintColor={colors.tabIconDefault}
              />
              <TextInput
                className="flex-1 ml-3 h-full text-text-primary dark:text-text-primary-dark font-jakarta text-[15px]"
                placeholder="Username"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Pressable
              className="w-full h-14 px-4 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex-row items-center justify-between active:opacity-80 mb-4"
              onPress={() => setCityModalOpen(true)}
            >
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-xl bg-bg dark:bg-bg-dark items-center justify-center mr-3">
                  <Text className="text-xl">{selectedCity.flag}</Text>
                </View>
                <View>
                  <ThemedText variant="body" className="font-semibold">{selectedCity.name}</ThemedText>
                  <ThemedText variant="caption">{selectedCity.country}</ThemedText>
                </View>
              </View>
              <SymbolView
                name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'expand_more' }}
                size={18}
                tintColor={colors.tabIconDefault}
              />
            </Pressable>

            <Modal
              visible={cityModalOpen}
              animationType="fade"
              transparent
              onRequestClose={() => setCityModalOpen(false)}
            >
              <Pressable
                className="flex-1 bg-black/50 items-center justify-center"
                onPress={() => setCityModalOpen(false)}
              >
                <Card className="w-4/5 max-h-80 p-0 overflow-hidden rounded-2xl">
                  <View className="px-5 py-4 border-b border-border dark:border-border-dark">
                    <ThemedText variant="h3" className="text-center">SELECT CITY</ThemedText>
                  </View>
                  <ScrollView className="max-h-72">
                    {CITIES.map((city) => (
                      <Pressable
                        key={city.name}
                        className="flex-row items-center px-5 py-4 border-b border-border/50 dark:border-border-dark/50 active:opacity-60"
                        onPress={() => {
                          setSelectedCity(city);
                          setCityModalOpen(false);
                        }}
                      >
                        <Text className="text-3xl mr-4">{city.flag}</Text>
                        <View>
                          <ThemedText variant="h3">{city.name}</ThemedText>
                          <ThemedText variant="bodySmall" className="text-text-secondary dark:text-text-secondary-dark">{city.country}</ThemedText>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Card>
              </Pressable>
            </Modal>

            {error ? (
              <ThemedText variant="bodySmall" color="danger" className="mb-4">{error}</ThemedText>
            ) : null}

            <Button title="Create Game" onPress={handleCreate} loading={loading} className="w-full mb-3" />
            <Button title="Back" variant="ghost" onPress={goBack} className="w-full" />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
