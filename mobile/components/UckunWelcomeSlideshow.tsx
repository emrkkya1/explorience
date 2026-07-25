import { useRef, useState } from 'react';
import { Dimensions, Image, Modal, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, Text } from '@/tw';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { UCKUN_WELCOME_SLIDES } from '@/constants/UckunMode';
import type { UckunSlide } from '@/constants/UckunMode';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type UckunWelcomeSlideshowProps = {
  visible: boolean;
  onComplete: () => void;
};

export function UckunWelcomeSlideshow(props: UckunWelcomeSlideshowProps) {
  const { visible, onComplete } = props;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLast = currentIndex === UCKUN_WELCOME_SLIDES.length - 1;

  const goToSlide = (index: number) => {
    const clamped = Math.max(0, Math.min(index, UCKUN_WELCOME_SLIDES.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * SCREEN_WIDTH, animated: true });
    setCurrentIndex(clamped);
  };

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      goToSlide(currentIndex + 1);
    }
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onComplete}>
      <View className="flex-1 bg-bg dark:bg-bg-dark">
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={StyleSheet.absoluteFill}
        >
          {UCKUN_WELCOME_SLIDES.map((slide, index) => (
            <View key={index} style={{ width: SCREEN_WIDTH, flex: 1 }}>
              <SlideContent
                slide={slide}
                colors={colors}
                insets={insets}
              />
            </View>
          ))}
        </ScrollView>

        <View
          className="absolute left-0 right-0 flex-row items-center justify-center gap-2"
          style={{ bottom: insets.bottom + 132 }}
          pointerEvents="none"
        >
          {UCKUN_WELCOME_SLIDES.map((_, index) => (
            <View
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: index === currentIndex ? colors.primary : colors.textTertiary,
              }}
            />
          ))}
        </View>

        <View
          className="absolute left-6 right-6"
          style={{ bottom: insets.bottom + 36 }}
        >
          <Button
            title={isLast ? 'Başla!' : 'Devam'}
            onPress={handleNext}
            className="w-full"
          />
          {currentIndex > 0 ? (
            <Button
              title="Geri"
              variant="ghost"
              onPress={() => goToSlide(currentIndex - 1)}
              className="w-full mt-2"
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SlideContent(props: {
  slide: UckunSlide;
  colors: typeof Colors.light;
  insets: { top: number; bottom: number };
}) {
  const { slide, insets } = props;

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 200 }}
    >
      {slide.image ? (
        <Image
          source={slide.image}
          resizeMode="cover"
          style={{ width: 240, height: 240, borderRadius: 16, marginBottom: 32 }}
        />
      ) : slide.emoji ? (
        <Text style={{ fontSize: 96, marginBottom: 32 }}>{slide.emoji}</Text>
      ) : null}

      <ThemedText variant="h2" className="text-center mb-4" style={{ fontSize: 26, lineHeight: 34 }}>
        {slide.title}
      </ThemedText>

      {slide.description ? (
        <View className="items-center">
          {slide.descriptionEmoji ? (
            <Text style={{ fontSize: 48, marginBottom: 16 }}>{slide.descriptionEmoji}</Text>
          ) : null}
          <ThemedText
            variant="body"
            className="text-center text-text-secondary dark:text-text-secondary-dark"
            style={{ fontSize: 16, lineHeight: 24 }}
          >
            {slide.description}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}