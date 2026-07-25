import type { ComponentProps, ReactNode } from 'react';
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  TextInput as RNTextInput,
  ScrollView as RNScrollView,
  FlatList as RNFlatList,
  Image as RNImage,
} from 'react-native';
import { useCssElement } from 'react-native-css';

export type ViewProps = ComponentProps<typeof RNView> & { className?: string };
export function View(props: ViewProps): ReactNode {
  return useCssElement(RNView, props, { className: 'style' });
}

export type TextProps = ComponentProps<typeof RNText> & { className?: string };
export function Text(props: TextProps): ReactNode {
  return useCssElement(RNText, props, { className: 'style' });
}

export type PressableProps = ComponentProps<typeof RNPressable> & { className?: string };
export function Pressable(props: PressableProps): ReactNode {
  return useCssElement(RNPressable, props, { className: 'style' });
}

export type TextInputProps = ComponentProps<typeof RNTextInput> & { className?: string };
export function TextInput(props: TextInputProps): ReactNode {
  return useCssElement(RNTextInput, props, { className: 'style' });
}

export type ScrollViewProps = ComponentProps<typeof RNScrollView> & {
  className?: string;
  contentContainerClassName?: string;
};
export function ScrollView(props: ScrollViewProps): ReactNode {
  return useCssElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
}

export type FlatListProps = ComponentProps<typeof RNFlatList> & { className?: string };
export function FlatList(props: FlatListProps): ReactNode {
  return useCssElement(RNFlatList, props, { className: 'style' });
}

export type ImageProps = ComponentProps<typeof RNImage> & { className?: string };
export function Image(props: ImageProps): ReactNode {
  return useCssElement(RNImage, props, { className: 'style' });
}
