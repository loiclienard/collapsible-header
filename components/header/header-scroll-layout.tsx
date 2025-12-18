import { CustomHeader } from '@/components/header/util';
import React, { ReactNode, useMemo } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    AnimatedScrollViewProps,
    Extrapolate,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_HEADER_HEIGHT = 56;
const HEADER_CARD_PLACEHOLDER_HEIGHT = 16;

// Types for what we inject into the scroll child
type InjectedScrollProps = {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onScroll: AnimatedScrollViewProps['onScroll'];
  scrollEventThrottle: number;
};

type HeaderScrollLayoutProps = {
  renderScroll: (injected: InjectedScrollProps) => ReactNode;
};

export function HeaderScrollLayout({ renderScroll }: HeaderScrollLayoutProps) {
  const { top } = useSafeAreaInsets();

  const headerHeight = top + BASE_HEADER_HEIGHT + HEADER_CARD_PLACEHOLDER_HEIGHT;

  const styles = useMemo(() => createStyles(headerHeight), [headerHeight]);

  // 0 = fully expanded, 1 = fully collapsed
  const headerProgress = useSharedValue(0);
  const lastY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
  onBeginDrag: (event) => {
    // Initialize lastY at the current offset
    lastY.value = event.contentOffset.y;
  },
  onScroll: (event) => {
    const y = event.contentOffset.y;

    // --- TOP RUBBER-BAND (y < 0) ---
    if (y < 0) {
      // Ignore overscroll above the top
      lastY.value = 0;
      return;
    }

    // --- BOTTOM RUBBER-BAND ---
    // NOTE: contentSize & layoutMeasurement are available on
    // native scroll events (React Native 0.71+ / Reanimated 3+).
    const contentHeight = event.contentSize?.height;
    const viewportHeight = event.layoutMeasurement?.height;

    let maxY: number | null = null;

    if (typeof contentHeight === 'number' && typeof viewportHeight === 'number') {
      maxY = Math.max(0, contentHeight - viewportHeight);
    }

    // If we could compute maxY, use it to ignore bottom rubber-band
    if (maxY !== null && y > maxY) {
      lastY.value = maxY;
      return;
    }

    // Use a clampedY in case we want to be extra safe
    const clampedY = maxY === null ? y : Math.min(Math.max(y, 0), maxY);

    const dy = clampedY - lastY.value;
    lastY.value = clampedY;

    if (dy === 0) return;

    const deltaProgress = Math.abs(dy) / headerHeight;

    if (dy > 0) {
      // scrolling down -> collapse
      headerProgress.value = Math.min(1, headerProgress.value + deltaProgress);
    } else {
      // scrolling up -> expand
      headerProgress.value = Math.max(0, headerProgress.value - deltaProgress);
    }
  },
});

  const headerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      headerProgress.value,
      [0, 1],
      [0, -headerHeight],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }],
    };
  });

  // Props we inject into whatever scrollable child is rendered
  const injectedScrollProps: InjectedScrollProps = {
    style: styles.scroll,
    contentContainerStyle: { paddingBottom: Platform.OS === 'android' ? headerHeight : 0, },
    onScroll: scrollHandler,
    scrollEventThrottle: 16,
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerStyle]}>
        <CustomHeader headerHeight={headerHeight} />
      </Animated.View>

      {renderScroll(injectedScrollProps)}
    </View>
  );
}

const createStyles = (headerHeight: number) =>
  StyleSheet.create({
    container: { flex: 1 },

    header: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: headerHeight,
      zIndex: 2,
    },

    scroll: {
      flex: 1,
      paddingTop: headerHeight,  // needed so content starts below header
      backgroundColor: 'red',
      // REMOVE this line:
      // paddingBottom: headerHeight,
      zIndex: 1,
    },
  });