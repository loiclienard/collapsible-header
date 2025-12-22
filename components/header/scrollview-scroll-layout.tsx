import React, { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  AnimatedScrollViewProps,
  Easing,
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_HEADER_HEIGHT = 56;
const HEADER_CARD_PLACEHOLDER_HEIGHT = 16;

// Props injected into the scrollable child
type InjectedScrollProps = {
  style?: StyleProp<ViewStyle>;
  onScroll: AnimatedScrollViewProps['onScroll'];
  scrollEventThrottle: number;
};

type HeaderScrollLayoutProps = {
  renderScroll: (injected: InjectedScrollProps) => ReactNode;
};

export function HeaderScrollLayout({ renderScroll }: HeaderScrollLayoutProps) {
  const { top } = useSafeAreaInsets();

  // Total visual header height (safe area + base + small overlap)
  const headerHeight = top + BASE_HEADER_HEIGHT + HEADER_CARD_PLACEHOLDER_HEIGHT;

  // 0 = expanded, 1 = collapsed
  const headerProgress = useSharedValue(0);

  // For direction/magnitude of current drag
  const lastDy = useSharedValue(0);
  const totalDy = useSharedValue(0);
  const lastY = useSharedValue(0);

  const SNAP_THRESHOLD_PX = 5; // minimal movement to trigger snapping

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: (event) => {
      const y = event.contentOffset.y;
      lastY.value = y;
      totalDy.value = 0;
      lastDy.value = 0;
    },
    onScroll: (event) => {
      const y = event.contentOffset.y;

      // ignore top rubber-band
      if (y < 0) {
        return;
      }

      const dy = y - lastY.value;
      lastY.value = y;

      if (dy === 0) return;

      lastDy.value = dy;
      totalDy.value += dy;

      const deltaProgress = Math.abs(dy) / headerHeight;

      if (dy > 0) {
        // scrolling down (content moves down) -> collapse header
        headerProgress.value = Math.min(1, headerProgress.value + deltaProgress);
      } else {
        // scrolling up (content moves up) -> expand header
        headerProgress.value = Math.max(0, headerProgress.value - deltaProgress);
      }
    },
    onEndDrag: () => {
      // tiny drag: keep current header state
      if (Math.abs(totalDy.value) < SNAP_THRESHOLD_PX) {
        return;
      }

      // direction-based snap
      const goingDown = lastDy.value > 0; // content moved down => collapse
      const target = goingDown ? 1 : 0;

      headerProgress.value = withTiming(target, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const p = headerProgress.value; // 0..1
    const translateY = interpolate(
      p,
      [0, 1],
      [0, -headerHeight],
      Extrapolate.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  const headerInnerAnimatedStyle = useAnimatedStyle(() => {
    const p = headerProgress.value;
    const scale = 1 - 0.1 * p;
    const innerTranslateY = -8 * p;
    const opacity = 1 - 0.2 * p;
    return {
      transform: [{ translateY: innerTranslateY }, { scale }],
      opacity,
    };
  });

  const injectedScrollProps: InjectedScrollProps = {
    style: styles.scroll,
    onScroll: scrollHandler,
    scrollEventThrottle: 16,
  };

  return (
    <View style={styles.container}>
      {/* Animated header */}
      <Animated.View
        style={[
          styles.header,
          { height: headerHeight },
          headerStyle,
        ]}
      >
        <Animated.View style={headerInnerAnimatedStyle}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: top,
            }}
          >
            <Text style={styles.headerTitle}>Custom Header</Text>
            <Text style={styles.headerSubtitle}>Custom Header Subtitle</Text>
          </View>
        </Animated.View>

        <View
          style={{
            height: HEADER_CARD_PLACEHOLDER_HEIGHT,
            alignSelf: 'stretch',
            borderTopRightRadius: 12,
            borderTopLeftRadius: 12,
            backgroundColor: 'white',
          }}
        />
      </Animated.View>

      {/* Scrollable content fills remaining space; layout owns all logic */}
      <View style={styles.contentWrapper}>
        {renderScroll(injectedScrollProps)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 2,
    backgroundColor: 'green',
    justifyContent: 'flex-end',
  },

  headerTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 20,
  },

  headerSubtitle: {
    color: 'white',
    opacity: 0.8,
    marginTop: 4,
  },

  contentWrapper: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },
});