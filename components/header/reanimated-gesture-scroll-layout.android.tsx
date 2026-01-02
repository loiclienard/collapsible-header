// @/components/header/reanimated-gesture-scroll-layout.android.tsx
import React, { ReactNode, useCallback, useState } from 'react';
import {
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    AnimatedRef,
    cancelAnimation,
    scrollTo,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Types ------------------------------------------------

type RenderContentArgs = {
  scrollableRef: AnimatedRef<Animated.ScrollView>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

type RenderContent = (args: RenderContentArgs) => ReactNode;

type Props = {
  renderContent: RenderContent;
  overlap?: number;
  collapseThreshold?: number;
  expandThreshold?: number;
  title?: string;
  subtitle?: string;
};

// --- Utils ------------------------------------------------

const TOP_EPSILON = 2; // Distance from top considered "at top"
const DIRECTION_CHANGE_THRESHOLD = 3; // Minimum movement in pixels to count as direction change
const TINY_MOVEMENT_THRESHOLD = 3; // Movements smaller than this are completely ignored

// --- Component --------------------------------------------

export default function HeaderScrollLayout({
  renderContent,
  overlap = 12,
  collapseThreshold = 5,
  expandThreshold = 5,
  title = 'Header',
  subtitle = 'Scrollable content below',
}: Props) {
  const insets = useSafeAreaInsets();

  // 0 = expanded, 1 = collapsed
  const headerProgress = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const dragDeltaY = useSharedValue(0);
  const lastContentOffsetY = useSharedValue(0);
  const isSnapping = useSharedValue(false);
  const lastDirection = useSharedValue<'up' | 'down' | 'none'>('none');

  const onHeaderLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== measuredHeight) {
        setMeasuredHeight(h);
        headerHeight.value = h;
      }
    },
    [measuredHeight, headerHeight],
  );

  const headerInnerAnimatedStyle = useAnimatedStyle(() => {
    const p = headerProgress.value;
    const scale = 1 - 0.2 * p;
    const translateY = -10 * p;

    return {
      transform: [{ translateY }, { scale }],
      opacity: 1 - 0.2 * p,
    };
  });

  const contentWrapperStyle = useAnimatedStyle(() => {
    const h = headerHeight.value;
    const baseTop = h - overlap;
    const collapsedTop = 0;
    const animatedTop = baseTop - headerProgress.value * (baseTop - collapsedTop);
    return {
      top: animatedTop,
      borderTopLeftRadius: overlap,
      borderTopRightRadius: overlap,
    };
  });

  const snapHeader = (force?: 'collapse' | 'expand') => {
    'worklet';
    const h = headerHeight.value;
    if (h <= 0) return;

    let target: number;
    if (force === 'collapse') target = 1;
    else if (force === 'expand') target = 0;
    else target = headerProgress.value < 0.5 ? 0 : 1;

    isSnapping.value = true;
    headerProgress.value = withTiming(target, { duration: 200 }, (finished) => {
      'worklet';
      if (finished) {
        isSnapping.value = false;
      }
    });
  };

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: (event) => {
      cancelAnimation(headerProgress);
      isSnapping.value = false;
      lastDirection.value = 'none';
      lastContentOffsetY.value = event.contentOffset.y;
      dragDeltaY.value = 0;
    },
    onScroll: (event) => {
      const h = headerHeight.value;
      const currentY = event.contentOffset.y;

      if (h <= 0) {
        lastContentOffsetY.value = currentY;
        return;
      }

      const dy = currentY - lastContentOffsetY.value;
      const atTop = currentY <= TOP_EPSILON;
      
      // Only treat significant movements as direction changes (ignore sub-pixel jitter)
      const absDy = Math.abs(dy);
      const currentDirection: 'up' | 'down' | 'none' = 
        dy > DIRECTION_CHANGE_THRESHOLD ? 'down' : 
        dy < -DIRECTION_CHANGE_THRESHOLD ? 'up' : 
        'none';
      const directionChanged = lastDirection.value !== 'none' && currentDirection !== 'none' && lastDirection.value !== currentDirection;

      // Skip manual header updates if snap animation is running
      if (isSnapping.value) {
        lastContentOffsetY.value = currentY;
        return;
      }

      // Skip tiny movements to prevent jitter from touch noise
      if (absDy < TINY_MOVEMENT_THRESHOLD) {
        lastContentOffsetY.value = currentY;
        return;
      }

      // Collapse header when scrolling down (while header is not fully collapsed)
      if (dy > 0 && headerProgress.value < 1) {
        const remainingCollapse = (1 - headerProgress.value) * h;
        const headerDy = Math.min(dy, remainingCollapse);
        const leftoverDy = dy - headerDy;
        
        if (headerDy > 0) {
          headerProgress.value += headerDy / h;
          dragDeltaY.value += headerDy;
          
          // Only update lastDirection if this was a significant movement
          if (currentDirection === 'down') {
            lastDirection.value = 'down';
          }
          
          // If we consumed all the scroll for header, prevent list scroll
          if (atTop && leftoverDy <= 0) {
            scrollTo(scrollableRef, 0, 0, false);
            lastContentOffsetY.value = 0;
            return;
          }
          
          // Not at top: allow remaining scroll to continue
          lastContentOffsetY.value = currentY;
          return;
        }
      }

      // Expand header when scrolling up - works at any scroll position
      if (dy < 0 && headerProgress.value > 0) {
        const remainingExpand = headerProgress.value * h;
        const headerDy = Math.max(dy, -remainingExpand);
        
        if (headerDy !== 0) {
          headerProgress.value += headerDy / h;
          dragDeltaY.value += headerDy;
          
          // Only update lastDirection if this was a significant movement
          if (currentDirection === 'up') {
            lastDirection.value = 'up';
          }
          
          // If at top, keep scroll at 0 while header expands
          if (atTop) {
            scrollTo(scrollableRef, 0, 0, false);
            lastContentOffsetY.value = 0;
            return;
          }
          
          // Not at top: keep current scroll position
          lastContentOffsetY.value = currentY;
          return;
        }
      }

      // Update tracking values
      lastContentOffsetY.value = currentY;
      dragDeltaY.value += dy;
    },
    onEndDrag: () => {
      const delta = dragDeltaY.value;
      if (delta > collapseThreshold) snapHeader('collapse');
      else if (delta < -expandThreshold) snapHeader('expand');
      else snapHeader();
    },
    onMomentumEnd: (event) => {
      const y = event.contentOffset.y;
      if (y <= TOP_EPSILON && headerProgress.value < 1) {
        snapHeader('expand');
      }
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrapper} onLayout={onHeaderLayout}>
        <Animated.View style={{ backgroundColor: 'green' }}>
          <Animated.View style={headerInnerAnimatedStyle}>
            <View
              style={[
                styles.headerInner,
                { paddingTop: insets.top, paddingBottom: 16 + overlap },
              ]}
            >
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Content card */}
      {measuredHeight > 0 && (
        <Animated.View style={[styles.contentWrapper, contentWrapperStyle]}>
          {renderContent({
            scrollableRef,
            onScroll,
          })}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  headerInner: {
    paddingHorizontal: 16,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    overflow: 'hidden',
    zIndex: 2,
  },
});
