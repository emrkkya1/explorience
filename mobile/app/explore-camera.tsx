import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/tw';
import { Image } from '@/tw/image';
import { supabase } from '@/lib/supabase';
import { prepareImage } from '@/lib/imagePrep';
import { computeSimilarity } from '@/lib/imageSimilarity';
import { getVisionClient, SIMILARITY_MATCH_THRESHOLD } from '@/lib/vision';
import { markExploredAction } from '@/lib/poiDiscoveryActions';
import {
  completeExploreCapture,
  startExploreCapture,
} from '@/lib/exploreCaptureStore';
import { grantRandomHint } from '@/lib/exploreReward';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLlmConfig } from '@/components/LlmConfigContext';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { SimilarityRing } from '@/components/SimilarityRing';
import { RewardRevealOverlay } from '@/components/RewardRevealOverlay';
import type { Poi } from '@/types/Poi';
import type { ExploreReward } from '@/lib/exploreReward';
import { RARITY_COLORS } from '@/constants/Rarity';
import type { VisionCompareResult } from '@/lib/vision';

type Stage = 'permission' | 'camera' | 'review' | 'result';

const POI_EXPLORES_BUCKET = 'poi_explores';

type RouteParams = {
  poiId: string;
  gameId: string;
  playerId: string;
};

type ResultState =
  | { kind: 'success'; result: VisionCompareResult }
  | { kind: 'failure'; result: VisionCompareResult | null; error?: string };

// Headlines for the failure result stage, bracketed by similarity_score (0-1).
// 0.00-0.25 -> completely off; 0.25-0.50 -> not close; 0.50-0.75 -> almost;
// 0.75-1.00 wouldn't reach the failure stage (it's a match) but kept for safety.
function failureHeadline(score: number): string {
  if (score < 0.25) return 'Way off';
  if (score < 0.5) return 'Not close';
  if (score < 0.75) return 'Almost there';
  return 'So close';
}

export default function ExploreCameraScreen() {
  const params = useLocalSearchParams() as unknown as RouteParams;
  const { poiId, gameId, playerId } = params;
  const colorScheme = useColorScheme();
  const { config: llmConfig } = useLlmConfig();

  const [poi, setPoi] = useState<Poi | null>(null);
  const [poiError, setPoiError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('permission');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resultState, setResultState] = useState<ResultState | null>(null);
  const [reward, setReward] = useState<ExploreReward>(undefined);

  const cameraRef = useRef<CameraView>(null);
  const didFinalizeRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  // finalize is called in place of `completeExploreCapture + router.back()` so
  // the cleanup effect knows we already wrote a terminal status and skips its
  // own (canceled) write.
  const finalize = (status: 'explored' | 'canceled'): void => {
    if (didFinalizeRef.current) return;
    didFinalizeRef.current = true;
    completeExploreCapture(poiId, status);
    router.back();
  };

  // Mount: fetch POI + advertise in-progress capture. Cleanup: mark canceled
  // only if the route unmounts before finalize() wrote a terminal status
  // (system back button, swipe-back, app kill).
  useEffect(() => {
    let cancelled = false;
    startExploreCapture(poiId);
    (async () => {
      const { data, error } = await supabase
        .from('pois')
        .select('*')
        .eq('id', poiId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setPoiError('Could not load this location.');
        return;
      }
      setPoi(data as Poi);
    })();
    return () => {
      cancelled = true;
      if (!didFinalizeRef.current) {
        completeExploreCapture(poiId, 'canceled');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poiId]);

  // Stage cross-fade.
  const fadeOpacity = useSharedValue(0);
  useEffect(() => {
    fadeOpacity.value = 0;
    fadeOpacity.value = withTiming(1, { duration: 200 });
  }, [stage, fadeOpacity]);
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    flex: 1,
  }));

  const referenceImageUri = poi?.image_uri ?? '';

  // Open camera stage when permission arrives granted during initial mount.
  useEffect(() => {
    if (permission?.granted && stage === 'permission') {
      setStage('camera');
    }
  }, [permission?.granted, stage]);

  const handleShutter = async (): Promise<void> => {
    if (verifying || !cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setStage('review');
      }
    } catch (err) {
      console.error('[explore-camera] takePicture error', err);
    }
  };

  const handleVerify = async (): Promise<void> => {
    if (!poi || !capturedUri || !gameId || !playerId) {
      setResultState({
        kind: 'failure',
        result: null,
        error: 'Missing capture or session context.',
      });
      setStage('result');
      return;
    }

    setVerifying(true);
    try {
      const [refImage, capImage] = await Promise.all([
        prepareImage(poi.image_uri!),
        prepareImage(capturedUri),
      ]);

      const { structureSimilarity, colorSimilarity } = computeSimilarity(
        refImage.bytes,
        capImage.bytes
      );
      console.log('[explore-camera] similarity:', {
        structure: structureSimilarity.toFixed(3),
        color: colorSimilarity.toFixed(3),
      });

      // Upload the original captured JPEG (smaller than the PNG) to the bucket.
      const uploadPath = `${gameId}/${poi.id}/${playerId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(POI_EXPLORES_BUCKET)
        .upload(
          uploadPath,
          { uri: capturedUri, type: 'image/jpeg' } as unknown as ArrayBuffer,
          { contentType: 'image/jpeg', upsert: false }
        );
      if (uploadError) {
        console.warn(
          '[explore-camera] upload error (continuing):',
          uploadError.message
        );
      }
      const { data: publicUrlData } = supabase.storage
        .from(POI_EXPLORES_BUCKET)
        .getPublicUrl(uploadPath);
      const userPhotoUrl = publicUrlData.publicUrl || null;

      const client = getVisionClient({
        provider: llmConfig.provider,
        model: llmConfig.model,
        endpoint: llmConfig.endpoint,
      });
      const result = await client.compareImages(
        {
          referenceImageUrl: poi.image_uri!,
          capturedBase64: capImage.base64,
          structureSimilarity,
          colorSimilarity,
        },
        llmConfig.apiKey
      );
      console.log('[explore-camera] vision:', {
        confidence_score: result.confidence_score.toFixed(3),
        similarity_score: result.similarity_score.toFixed(3),
      });

      const isMatch = result.similarity_score >= SIMILARITY_MATCH_THRESHOLD;
      if (isMatch) {
        try {
          await markExploredAction(gameId, playerId, poi.id, userPhotoUrl);
        } catch (markErr) {
          console.error('[explore-camera] markExplored failed', markErr);
        }
        let granted: ExploreReward = null;
        try {
          granted = await grantRandomHint(gameId, playerId);
        } catch (grantErr) {
          console.warn('[explore-camera] grantRandomHint failed', grantErr);
        }
        setReward(granted);
        setResultState({ kind: 'success', result });
        setStage('result');
      } else {
        setResultState({ kind: 'failure', result });
        setStage('result');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResultState({
        kind: 'failure',
        result: null,
        error: `Verification failed: ${msg}`,
      });
      setStage('result');
    } finally {
      setVerifying(false);
    }
  };

  const handleRetryFromReview = (): void => {
    setCapturedUri(null);
    setStage('camera');
  };

  const handleRetryFromResult = (): void => {
    setResultState(null);
    setCapturedUri(null);
    setStage('camera');
  };

  const handleSuccessDone = (): void => {
    finalize('explored');
  };

  const handleCancel = (): void => {
    finalize('canceled');
  };

  // ----- POI load error fallback -------------------------------------------
  if (poiError) {
    return (
      <View className="flex-1 bg-bg dark:bg-bg-dark items-center justify-center px-6">
        <ThemedText variant="h3" className="mb-3 text-center">
          {poiError}
        </ThemedText>
        <Button title="Go back" variant="ghost" onPress={handleCancel} />
      </View>
    );
  }

  // ----- API key gate ------------------------------------------------------
  // Prevent the camera permission prompt from firing when the user can't use
  // the feature anyway. Send them to the Vision AI settings to add a key.
  if (!llmConfig.apiKey) {
    return (
      <View className="flex-1 bg-bg dark:bg-bg-dark items-center justify-center px-6">
        <SymbolView
          name={{ ios: 'key.fill', android: 'key', web: 'key' }}
          size={48}
          tintColor={Colors[colorScheme].tabIconDefault}
        />
        <ThemedText variant="h3" className="mt-4 mb-3 text-center">
          API key required
        </ThemedText>
        <ThemedText
          variant="bodySmall"
          className="text-center mb-6 text-text-secondary dark:text-text-secondary-dark"
        >
          Set your Vision AI provider's API key in Options → Vision AI to verify discovered locations.
        </ThemedText>
        <Button title="Open Vision AI settings" onPress={() => router.push('/vision-ai')} />
        <View className="h-3" />
        <Button title="Cancel" variant="ghost" onPress={handleCancel} />
      </View>
    );
  }

  // ----- Permission stage --------------------------------------------------
  if (!permission) {
    return (
      <View className="flex-1 bg-bg dark:bg-bg-dark items-center justify-center">
        <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
      </View>
    );
  }

  if (!permission.granted && stage === 'permission') {
    return (
      <View className="flex-1 bg-bg dark:bg-bg-dark items-center justify-center px-6">
        <SymbolView
          name={{ ios: 'camera.fill', android: 'photo_camera', web: 'camera' }}
          size={48}
          tintColor={Colors[colorScheme].tabIconDefault}
        />
        <ThemedText variant="h3" className="mt-4 mb-3 text-center">
          Camera permission needed
        </ThemedText>
        <ThemedText
          variant="bodySmall"
          className="text-center mb-6 text-text-secondary dark:text-text-secondary-dark"
        >
          Explorience needs camera access to verify discovered locations.
        </ThemedText>
        <Button title="Grant permission" onPress={requestPermission} />
        <View className="h-3" />
        <Button title="Cancel" variant="ghost" onPress={handleCancel} />
      </View>
    );
  }

  // ----- Animated stage switch ---------------------------------------------
  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <Animated.View key={stage} style={fadeStyle}>
        {stage === 'camera' && (
          <CameraStage
            cameraRef={cameraRef}
            referenceImageUri={referenceImageUri}
            onShutter={handleShutter}
            onClose={handleCancel}
          />
        )}

        {stage === 'review' && (
          <ReviewStage
            referenceImageUri={referenceImageUri}
            capturedUri={capturedUri}
            verifying={verifying}
            onConfirm={handleVerify}
            onRetry={handleRetryFromReview}
            onClose={handleCancel}
          />
        )}

        {stage === 'result' && resultState && (
          <ResultStage
            poi={poi}
            resultState={resultState}
            referenceImageUri={referenceImageUri}
            capturedUri={capturedUri}
            onDone={handleSuccessDone}
            onRetry={handleRetryFromResult}
            onCancel={handleCancel}
          />
        )}

        {stage === 'permission' && (
          // granted flag flips async; show a brief loader while we wait for the
          // camera-stage transition to kick in.
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
          </View>
        )}
      </Animated.View>

      <RewardRevealOverlay
        visible={!!reward}
        reward={reward}
        onClose={() => setReward(undefined)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Camera stage
// ---------------------------------------------------------------------------

type CameraStageProps = {
  cameraRef: React.RefObject<CameraView>;
  referenceImageUri: string;
  onShutter: () => void;
  onClose: () => void;
};

function CameraStage({
  cameraRef,
  referenceImageUri,
  onShutter,
  onClose,
}: CameraStageProps) {
  const [referenceZoom, setReferenceZoom] = useState(false);

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} facing="back" style={{ flex: 1 }} />

      <Pressable
        style={{
          position: 'absolute',
          top: 48,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={onClose}
      >
        <SymbolView
          name={{ ios: 'xmark', android: 'close', web: 'x' }}
          size={20}
          tintColor="#FFFFFF"
        />
      </Pressable>

      <Pressable
        style={{
          position: 'absolute',
          bottom: 40,
          left: 16,
          width: 72,
          height: 72,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.8)',
        }}
        onPress={() => setReferenceZoom(true)}
      >
        {referenceImageUri ? (
          <Image
            source={referenceImageUri}
            contentFit="cover"
            className="w-full h-full"
          />
        ) : (
          <View className="w-full h-full bg-white/20" />
        )}
      </Pressable>

      <Pressable
        style={{
          position: 'absolute',
          bottom: 48,
          left: '50%',
          marginLeft: -36,
          width: 72,
          height: 72,
          borderRadius: 36,
          borderWidth: 4,
          borderColor: '#FFFFFF',
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={onShutter}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#FFFFFF',
          }}
        />
      </Pressable>

      {referenceZoom && referenceImageUri ? (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setReferenceZoom(false)}
        >
          <View
            style={{
              width: '80%',
              height: '80%',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <Image
              source={referenceImageUri}
              contentFit="contain"
              className="w-full h-full"
            />
          </View>
          <Pressable
            style={{
              position: 'absolute',
              top: 48,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setReferenceZoom(false)}
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'x' }}
              size={20}
              tintColor="#FFFFFF"
            />
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Review stage
// ---------------------------------------------------------------------------

type ReviewStageProps = {
  referenceImageUri: string;
  capturedUri: string | null;
  verifying: boolean;
  onConfirm: () => void;
  onRetry: () => void;
  onClose: () => void;
};

function ReviewStage({
  referenceImageUri,
  capturedUri,
  verifying,
  onConfirm,
  onRetry,
  onClose,
}: ReviewStageProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-row items-center justify-between px-4 mb-4">
        <ThemedText variant="h3">Confirm match?</ThemedText>
        <Pressable
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          onPress={onClose}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'x' }}
            size={20}
            tintColor={Colors[colorScheme].tabIconDefault}
          />
        </Pressable>
      </View>

      <View className="flex-row gap-3 px-4 mb-6">
        <View className="flex-1">
          <ThemedText variant="caption" className="mb-1 text-center">
            REFERENCE
          </ThemedText>
          <View className="h-64 rounded-xl overflow-hidden bg-surface dark:bg-surface-dark">
            <Image
              source={referenceImageUri}
              contentFit="cover"
              className="w-full h-full"
            />
          </View>
        </View>
        <View className="flex-1">
          <ThemedText variant="caption" className="mb-1 text-center">
            YOUR PHOTO
          </ThemedText>
          <View className="h-64 rounded-xl overflow-hidden bg-surface dark:bg-surface-dark">
            {capturedUri ? (
              <Image
                source={capturedUri}
                contentFit="cover"
                className="w-full h-full"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ThemedText variant="bodySmall">No capture yet</ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="flex-row gap-3 px-4">
        <View className="flex-1">
          <Button
            title="Yes, verify"
            variant="primary"
            loading={verifying}
            disabled={verifying}
            onPress={onConfirm}
          />
        </View>
        <View className="flex-1">
          <Button
            title="Retake"
            variant="secondary"
            disabled={verifying}
            onPress={onRetry}
          />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Result stage (success or failure)
// ---------------------------------------------------------------------------

type ResultStageProps = {
  poi: Poi | null;
  resultState: ResultState;
  referenceImageUri: string;
  capturedUri: string | null;
  onDone: () => void;
  onRetry: () => void;
  onCancel: () => void;
};

function ResultStage({
  poi,
  resultState,
  referenceImageUri,
  capturedUri,
  onDone,
  onRetry,
  onCancel,
}: ResultStageProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  if (resultState.kind === 'success') {
    const rarityColor = poi ? RARITY_COLORS[poi.rarity] : Colors[colorScheme].primary;
    return (
      <View
        className="flex-1 bg-primary/5 dark:bg-primary-dark/10"
        style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
      >
        <View className="items-center px-6">
          <SimilarityRing similarityScore={resultState.result.similarity_score} size={140} />

          <View className="flex-row items-center gap-2 mt-8 mb-2">
            <SymbolView
              name={{
                ios: 'checkmark.seal.fill',
                android: 'verified',
                web: 'badge-check',
              }}
              size={28}
              tintColor={rarityColor}
            />
            <ThemedText variant="h1" style={{ color: rarityColor }}>
              EXPLORED
            </ThemedText>
          </View>

          {poi ? (
            <ThemedText variant="h3" className="mb-6 text-center">
              {poi.name}
            </ThemedText>
          ) : null}

          <View className="flex-row gap-3 mb-6">
            <View className="w-20 h-20 rounded-lg overflow-hidden border border-border dark:border-border-dark">
              <Image
                source={referenceImageUri}
                contentFit="cover"
                className="w-full h-full"
              />
            </View>
            <View className="w-20 h-20 rounded-lg overflow-hidden border border-border dark:border-border-dark">
              {capturedUri ? (
                <Image
                  source={capturedUri}
                  contentFit="cover"
                  className="w-full h-full"
                />
              ) : null}
            </View>
          </View>

          {resultState.result.reason ? (
            <View
              className="self-stretch rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-3 mb-8"
              style={{ borderLeftWidth: 4, borderLeftColor: rarityColor }}
            >
              <ThemedText
                variant="bodySmall"
                className="italic text-text-secondary dark:text-text-secondary-dark"
              >
                {resultState.result.reason}
              </ThemedText>
            </View>
          ) : null}

          <Button title="Done" variant="primary" onPress={onDone} />
        </View>
      </View>
    );
  }

  // Failure.
  const similarityScore = resultState.result?.similarity_score ?? 0;
  return (
    <View
      className="flex-1 bg-bg dark:bg-bg-dark"
      style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
    >
      <View className="items-center px-6">
        <SimilarityRing similarityScore={similarityScore} size={120} />

        <ThemedText variant="h1" className="mt-8 mb-2">
          {failureHeadline(similarityScore)}
        </ThemedText>

        {resultState.error || resultState.result?.reason ? (
          <View
            className="self-stretch rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4 mb-6"
            style={{ borderLeftWidth: 4, borderLeftColor: Colors[colorScheme].accent }}
          >
            {resultState.error ? (
              <ThemedText variant="bodySmall" className="mb-2 text-text-secondary dark:text-text-secondary-dark">
                {resultState.error}
              </ThemedText>
            ) : null}
            {resultState.result?.reason ? (
              <ThemedText variant="body">
                {resultState.result.reason}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row gap-3 mb-8">
          <View className="flex-1">
            <ThemedText variant="caption" className="mb-1 text-center">
              REFERENCE
            </ThemedText>
            <View className="h-36 rounded-xl overflow-hidden bg-surface dark:bg-surface-dark">
              <Image
                source={referenceImageUri}
                contentFit="cover"
                className="w-full h-full"
              />
            </View>
          </View>
          <View className="flex-1">
            <ThemedText variant="caption" className="mb-1 text-center">
              YOUR PHOTO
            </ThemedText>
            <View className="h-36 rounded-xl overflow-hidden bg-surface dark:bg-surface-dark">
              {capturedUri ? (
                <Image
                  source={capturedUri}
                  contentFit="cover"
                  className="w-full h-full"
                />
              ) : null}
            </View>
          </View>
        </View>

        <View className="flex-row gap-3 self-stretch">
          <View className="flex-1">
            <Button title="Try Again" variant="primary" onPress={onRetry} />
          </View>
          <View className="flex-1">
            <Button title="Cancel" variant="ghost" onPress={onCancel} />
          </View>
        </View>
      </View>
    </View>
  );
}