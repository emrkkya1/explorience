import { useState, useEffect } from 'react';
import { Pressable as RNPressable, Image as NativeImage, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Cpu, Play, CheckCircle, XCircle } from 'lucide-react-native';

import Colors, { semanticColors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { View, Pressable, ScrollView, TextInput } from '@/tw';
import { Animated } from '@/tw/animated';
import { Image } from '@/tw/image';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { useLlmConfig } from '@/components/LlmConfigContext';
import { ProviderLogo } from '@/components/ProviderLogo';
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { Dropdown } from '@/components/Dropdown';
import { bytesToBase64 } from '@/lib/vision/adapters/gemini';
import { maskApiKey, normalizeOpenAIEndpoint } from '@/lib/llmConfig';
import {
  VISION_PROVIDERS,
  PROVIDER_MODELS,
} from '@/constants/VisionModels';
import type { VisionProvider } from '@/lib/vision/types';

const TEST_IMAGE = require('../assets/images/test-image.png');

type ConfirmDialogProps = {
  visible: boolean;
  providerLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmProviderDialog({ visible, providerLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const colorScheme = useColorScheme();

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-[70] items-center justify-center" pointerEvents="box-none">
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: semanticColors.overlay[colorScheme],
          opacity: opacity,
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <RNPressable className="flex-1" onPress={onCancel} />
      </Animated.View>

      <Animated.View
        style={{ opacity: opacity }}
        className="w-[85%] max-w-sm"
      >
        <View className="rounded-2xl bg-bg dark:bg-bg-dark border border-border dark:border-border-dark p-5">
          <ThemedText variant="h3" className="text-center mb-4">
            Switch to {providerLabel}?
          </ThemedText>
          <ThemedText variant="bodySmall" className="text-center mb-4 text-text-secondary dark:text-text-secondary-dark">
            Your current model settings may change.
          </ThemedText>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button title="Cancel" variant="ghost" onPress={onCancel} />
            </View>
            <View className="flex-1">
              <Button title="Yes" variant="primary" onPress={onConfirm} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

ConfirmProviderDialog.displayName = 'ConfirmProviderDialog';

export default function VisionAiScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { config, setProvider, setModel, setApiKey, setEndpoint } = useLlmConfig();
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [endpointInput, setEndpointInput] = useState(config.endpoint);
  const [modelInput, setModelInput] = useState(config.model);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<VisionProvider | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    setEndpointInput(config.endpoint);
  }, [config.endpoint]);

  useEffect(() => {
    setModelInput(config.model);
  }, [config.model]);

  const fetchFavicon = async (url: string) => {
    if (!url) {
      setFaviconUrl(null);
      return;
    }
    try {
      const parsed = new URL(url);
      const faviconPath = `${parsed.origin}/favicon.ico`;
      const response = await fetch(faviconPath, { method: 'HEAD' });
      if (response.ok) {
        setFaviconUrl(faviconPath);
      } else {
        setFaviconUrl(null);
      }
    } catch {
      setFaviconUrl(null);
    }
  };

  useEffect(() => {
    if (config.provider === 'openai-compatible' && config.endpoint) {
      fetchFavicon(config.endpoint);
    } else {
      setFaviconUrl(null);
    }
  }, [config.provider, config.endpoint]);

  const handleEndpointBlur = () => {
    const normalized = normalizeOpenAIEndpoint(endpointInput);
    setEndpointInput(normalized);
    setEndpoint(normalized);
    fetchFavicon(normalized);
  };

  const handleModelBlur = () => {
    setModel(modelInput.trim());
  };

  const handleTestEndpoint = async () => {
    setTestStatus('loading');
    try {
      const asset = NativeImage.resolveAssetSource(TEST_IMAGE);
      console.log('[TestEndpoint] Loading test image from:', asset.uri);
      const response = await fetch(asset.uri);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const base64 = bytesToBase64(bytes);
      console.log('[TestEndpoint] Base64 length:', base64.length);
      const url = normalizeOpenAIEndpoint(endpointInput);
      console.log('[TestEndpoint] Testing endpoint:', url, 'with model:', config.model);
      const body = {
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "If you can see a simple illustration of sun and clouds in the shared image, give the exact response \"Yes\". Your response should be only 3 letters, and nothing else. If you cannot see it or seeing something else, respond with something else.",
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${base64}` },
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 5,
      };
      const apiResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      console.log('[TestEndpoint] Response status:', apiResponse.status);
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('[TestEndpoint] HTTP error:', apiResponse.status, errorText);
        throw new Error(`HTTP ${apiResponse.status}`);
      }
      const data = await apiResponse.json();
      console.log('[TestEndpoint] Response data:', JSON.stringify(data, null, 2));
      const text = data.choices?.[0]?.message?.content ?? '';
      console.log('[TestEndpoint] Extracted text:', text);
      const cleaned = text.trim().replace(/^["'.,:;<>]+|["'.,:;<>]+$/g, '').toLowerCase();
      if (cleaned === 'yes') {
        console.log('[TestEndpoint] Test successful!');
        setTestStatus('success');
      } else {
        console.warn('[TestEndpoint] Test failed - unexpected response:', text);
        setTestStatus('error');
      }
    } catch (error) {
      console.error('[TestEndpoint] Test failed with error:', error);
      setTestStatus('error');
    }
  };

  const handleProviderPress = (provider: VisionProvider, available: boolean) => {
    if (!available) return;
    if (provider === config.provider) return;
    if (pendingProvider === provider) return;
    setPendingProvider(provider);
  };

  const confirmProviderChange = () => {
    if (!pendingProvider) return;
    const newProvider = pendingProvider;
    setPendingProvider(null);
    setProvider(newProvider);
    const models = PROVIDER_MODELS[newProvider];
    if (models.length > 0 && !models.some((m) => m.id === config.model)) {
      setModel(models[0].id);
    }
  };

  const cancelProviderChange = () => {
    setPendingProvider(null);
  };

  const pendingProviderLabel = pendingProvider
    ? VISION_PROVIDERS.find((p) => p.id === pendingProvider)?.label ?? pendingProvider
    : '';

  const availableModels = PROVIDER_MODELS[config.provider] ?? [];
  const isOpenAICompatible = config.provider === 'openai-compatible';

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="px-4 pb-8" style={{ paddingTop: 16, paddingBottom: insets.bottom + 32 }}>
        <View className="gap-4">
          <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
            <ThemedText variant="h3" className="mb-3">Provider</ThemedText>
            <View className="gap-2">
              {VISION_PROVIDERS.map((opt) => {
                const selected = config.provider === opt.id;
                const showFavicon = opt.id === 'openai-compatible' && faviconUrl;
                return (
                  <Pressable
                    key={opt.id}
                    disabled={!opt.available}
                    className={`flex-row items-center gap-3 rounded-lg p-3 border active:opacity-70 ${
                      selected
                        ? 'bg-primary/10 dark:bg-primary-dark/20 border-primary dark:border-primary-dark'
                        : 'bg-transparent border-border dark:border-border-dark'
                    } ${opt.available ? '' : 'opacity-40'}`}
                    onPress={() => handleProviderPress(opt.id, opt.available)}
                  >
                    {showFavicon ? (
                      <Image
                        source={{ uri: faviconUrl! }}
                        style={{ width: 28, height: 28 }}
                        contentFit="contain"
                      />
                    ) : (
                      <ProviderLogo provider={opt.id} size={28} />
                    )}
                    <View className="flex-1">
                      <ThemedText variant="body">{opt.label}</ThemedText>
                      {!opt.available && (
                        <ThemedText variant="caption">coming soon</ThemedText>
                      )}
                    </View>
                    {selected && (
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        size={18}
                        tintColor={colors.success}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
            <View className="gap-4">
              {isOpenAICompatible && (
                <View>
                  <ThemedText variant="h3" className="mb-3">Endpoint</ThemedText>
                  <View className="flex-row items-center gap-3">
                    {faviconUrl ? (
                      <Image
                        source={{ uri: faviconUrl }}
                        style={{ width: 24, height: 24 }}
                        contentFit="contain"
                      />
                    ) : (
                      <ProviderLogo provider="openai-compatible" size={24} />
                    )}
                    <TextInput
                      value={endpointInput}
                      onChangeText={setEndpointInput}
                      onBlur={handleEndpointBlur}
                      placeholder="https://api.openai.com/v1"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      className="flex-1 rounded-lg bg-bg dark:bg-bg-dark border border-border dark:border-border-dark px-3 py-3 text-text-primary dark:text-text-primary-dark"
                    />
                  </View>
                </View>
              )}

              <View>
                <ThemedText variant="h3" className="mb-3">Model</ThemedText>
                {isOpenAICompatible ? (
                  <View className="flex-row items-center gap-3">
                    <Cpu size={20} color={colors.tabIconDefault} strokeWidth={2.5} />
                    <TextInput
                      value={modelInput}
                      onChangeText={setModelInput}
                      onBlur={handleModelBlur}
                      placeholder="gpt-4o"
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="flex-1 rounded-lg bg-bg dark:bg-bg-dark border border-border dark:border-border-dark px-3 py-3 text-text-primary dark:text-text-primary-dark"
                    />
                  </View>
                ) : availableModels.length === 0 ? (
                  <ThemedText variant="bodySmall" className="text-text-secondary dark:text-text-secondary-dark">
                    No models available for this provider.
                  </ThemedText>
                ) : (
                  <Dropdown
                    options={availableModels.map((m) => ({ value: m.id, label: m.label }))}
                    value={config.model}
                    onChange={(id) => setModel(id)}
                    placeholder="Select a model"
                  />
                )}
              </View>

              <View>
                <ThemedText variant="h3" className="mb-3">API Key</ThemedText>
                <Pressable
                  className="flex-row items-center justify-between active:opacity-70"
                  onPress={() => setApiKeyDialogOpen(true)}
                >
                  <View className="flex-row items-center gap-3">
                    <SymbolView
                      name={{ ios: 'key.fill', android: 'key', web: 'key' }}
                      size={20}
                      tintColor={colors.tabIconDefault}
                    />
                    <View>
                      <ThemedText variant="caption" className="text-text-secondary dark:text-text-secondary-dark">
                        {maskApiKey(config.apiKey)}
                      </ThemedText>
                    </View>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={16}
                    tintColor={colors.tabIconDefault}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {isOpenAICompatible && (
            <Pressable
              className="flex-row items-center gap-3 bg-primary dark:bg-primary-dark rounded-md px-6 py-3 active:opacity-70"
              onPress={handleTestEndpoint}
              disabled={testStatus === 'loading' || !config.apiKey || !endpointInput.trim()}
            >
              {testStatus === 'loading' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : testStatus === 'success' ? (
                <CheckCircle size={22} color="#FFFFFF" strokeWidth={2.5} />
              ) : testStatus === 'error' ? (
                <XCircle size={22} color="#FFFFFF" strokeWidth={2.5} />
              ) : (
                <Play size={18} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <View className="flex-1">
                <ThemedText variant="button" className="text-white uppercase">
                  {testStatus === 'loading' ? 'Testing endpoint...' : 'Test Endpoint'}
                </ThemedText>
                {testStatus !== 'idle' && (
                  <ThemedText variant="caption" className="text-white/70 normal-case">
                    {testStatus === 'success' ? 'Connected successfully' : testStatus === 'error' ? 'Test failed' : ''}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <ApiKeyDialog
        visible={apiKeyDialogOpen}
        initialValue={config.apiKey}
        onSubmit={(key) => {
          setApiKey(key);
          setApiKeyDialogOpen(false);
        }}
        onCancel={() => setApiKeyDialogOpen(false)}
      />

      <ConfirmProviderDialog
        visible={pendingProvider !== null}
        providerLabel={pendingProviderLabel}
        onConfirm={confirmProviderChange}
        onCancel={cancelProviderChange}
      />
    </ScrollView>
  );
}
