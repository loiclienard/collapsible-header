// @/components/header/reanimated-scroll-layout.tsx
import React, { ReactNode, useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


type RenderContentArgs = {
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

type RenderContent = (args: RenderContentArgs) => ReactNode;

type Props = {
  renderContent: RenderContent;
  overlap?: number;
  collapseThreshold?: number;
  expandThreshold?: number;
  // Minimal header customization
  title?: string;
  subtitle?: string;
};

const TOP_EPSILON = 4;

export default function HeaderScrollLayout({
  renderContent,
  overlap = 12,
  collapseThreshold = 3,
  expandThreshold = 3,
  title = 'Header',
  subtitle = 'Scrollable content below',
}: Props) {
  const insets = useSafeAreaInsets();

  // 0 = expanded, 1 = collapsed
  const headerProgress = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  const targetState = useSharedValue<'expanded' | 'collapsed' | null>(null);
  const hasSnappedThisGesture = useSharedValue(false);

  const [measuredHeight, setMeasuredHeight] = useState(0);

  const dragDeltaY = useSharedValue(0);
  const lastContentOffsetY = useSharedValue(0);

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

  // // Header wrapper stays fixed
  // const headerWrapperStyle = useAnimatedStyle(() => ({}));

  // Header inner scales as card overlaps
  const headerInnerAnimatedStyle = useAnimatedStyle(() => {
    const p = headerProgress.value;  // 0..1
    const scale = 1 - 0.2 * p;       // 1 -> 0.8
    const translateY = -10 * p;      // slight up shift

    return {
      transform: [
        { translateY },
        { scale },
      ],
      opacity: 1 - 0.2 * p,          // optional fade
    };
  });

  // Card / content slides over header
  const contentWrapperStyle = useAnimatedStyle(() => {
    const h = headerHeight.value;
    const baseTop = h - overlap; // header visible with overlap
    const collapsedTop = 0;      // card attached to top when collapsed
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
    if (h <= 0) {
      console.log('[snapHeader] Header height is 0, skipping');
      return;
    }

    let target: number;
    let targetStateName: 'expanded' | 'collapsed';
    
    if (force === 'collapse') {
      target = 1;
      targetStateName = 'collapsed';
    } else if (force === 'expand') {
      target = 0;
      targetStateName = 'expanded';
    } else {
      target = headerProgress.value < 0.5 ? 0 : 1;
      targetStateName = target === 0 ? 'expanded' : 'collapsed';
    }

    // Skip if already animating to this target
    if (targetState.value === targetStateName) {
      console.log('[snapHeader] Already animating to', targetStateName, ', skipping');
      return;
    }

    console.log('[snapHeader] Force:', force, 'Current:', headerProgress.value, 'Target:', target, 'State:', targetStateName);
    targetState.value = targetStateName;
    headerProgress.value = withTiming(target, { 
      duration: 250 
    }, (finished) => {
      'worklet';
      if (finished) {
        // Animation completed, reset target state
        targetState.value = null;
        console.log('[snapHeader] Animation finished, targetState reset');
      }
    });
  };

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: (event) => {
      console.log('[onBeginDrag] Starting drag at Y:', event.contentOffset.y);
      lastContentOffsetY.value = event.contentOffset.y;
      dragDeltaY.value = 0;
      hasSnappedThisGesture.value = false;
      console.log('[onBeginDrag] Reset hasSnappedThisGesture');
    },
    onScroll: (event) => {
      const h = headerHeight.value;
      const currentY = event.contentOffset.y;

      if (h <= 0) {
        lastContentOffsetY.value = currentY;
        return;
      }

      const dy = currentY - lastContentOffsetY.value;
      lastContentOffsetY.value = currentY;
      dragDeltaY.value += dy;

      console.log('[onScroll] dy:', dy.toFixed(2), 'currentY:', currentY.toFixed(2), 'headerProgress:', headerProgress.value.toFixed(3), 'dragDelta:', dragDeltaY.value.toFixed(2), 'hasSnapped:', hasSnappedThisGesture.value);

      // Only allow one snap per gesture
      if (hasSnappedThisGesture.value) {
        return;
      }

      // Scroll down: snap to collapsed (check cumulative dragDelta)
      if (dragDeltaY.value > collapseThreshold) {
        console.log('[onScroll] ⬇️ Scroll down detected, triggering collapse. dragDelta:', dragDeltaY.value.toFixed(2), 'threshold:', collapseThreshold);
        snapHeader('collapse');
        hasSnappedThisGesture.value = true;
      }

      // Scroll up: snap to expanded (check cumulative dragDelta)
      if (dragDeltaY.value < -expandThreshold) {
        console.log('[onScroll] ⬆️ Scroll up detected, triggering expand. dragDelta:', dragDeltaY.value.toFixed(2), 'threshold:', -expandThreshold);
        snapHeader('expand');
        hasSnappedThisGesture.value = true;
      }
    },
    onEndDrag: () => {
      console.log('[onEndDrag] Drag ended. Total dragDelta:', dragDeltaY.value.toFixed(2), 'headerProgress:', headerProgress.value.toFixed(3));
      // No additional snapping needed since we snap during scroll
    },
    onMomentumEnd: (event) => {
      const y = event.contentOffset.y;
      console.log('[onMomentumEnd] Momentum ended at Y:', y.toFixed(2), 'headerProgress:', headerProgress.value.toFixed(3));
      if (y <= TOP_EPSILON && headerProgress.value < 1) {
        console.log('[onMomentumEnd] At top, expanding header');
        snapHeader('expand');
      }
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrapper} onLayout={onHeaderLayout}>
        <Animated.View style={{backgroundColor: 'green'}}>
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
          {renderContent({ onScroll })}
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