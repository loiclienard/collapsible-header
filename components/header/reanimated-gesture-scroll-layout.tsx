// @/components/header/reanimated-scroll-layout.tsx
import React, { ReactNode, useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RenderContentArgs = {
  scrollableRef: React.RefObject<any>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

type Props = {
  renderContent: (args: RenderContentArgs) => ReactNode;
  overlap?: number;
  collapseThreshold?: number;
  expandThreshold?: number;
  title?: string;
  subtitle?: string;
};

const TOP_EPSILON = 2;

function log(tag: string, data: any) {
  console.log(tag, data);
}

export default function HeaderScrollLayout({
  renderContent,
  overlap = 12,
  collapseThreshold = 5,
  expandThreshold = 5,
  title = 'Header',
  subtitle = 'Scrollable content below',
}: Props) {
  const insets = useSafeAreaInsets();
  const headerProgress = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  const contentOffsetY = useSharedValue(0);
  const dragDeltaY = useSharedValue(0);
  const lastGestureDy = useSharedValue(0);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const scrollableRef = useAnimatedRef();

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
    return {
      transform: [{ translateY: -10 * p }, { scale: 1 - 0.2 * p }],
      opacity: 1 - 0.2 * p,
    };
  });

  const contentWrapperStyle = useAnimatedStyle(() => {
    const h = headerHeight.value;
    const baseTop = h - overlap;
    return {
      top: baseTop - headerProgress.value * baseTop,
      borderTopLeftRadius: overlap,
      borderTopRightRadius: overlap,
    };
  });

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      contentOffsetY.value = event.contentOffset.y;
    },
  });

  const snapHeader = (force?: 'collapse' | 'expand') => {
    'worklet';
    if (headerHeight.value <= 0) return;
    let target = headerProgress.value < 0.5 ? 0 : 1;
    if (force === 'collapse') target = 1;
    if (force === 'expand') target = 0;
    headerProgress.value = withTiming(target, { duration: 200 });
  };

  const handleHeaderCollapse = (dy: number, h: number) => {
    'worklet';
    const remainingHeaderPx = (1 - headerProgress.value) * h;
    const headerDragDelta = Math.min(dy, remainingHeaderPx);
    
    if (headerDragDelta > 0) {
      headerProgress.value += headerDragDelta / h;

      if (contentOffsetY.value > 0) {
        const newY = Math.max(0, contentOffsetY.value - headerDragDelta);
        contentOffsetY.value = newY;
        scrollTo(scrollableRef, 0, newY, false);
      } else {
        scrollTo(scrollableRef, 0, 0, false);
      }
    }

    return headerDragDelta;
  };

  const handleHeaderExpand = (dy: number, h: number) => {
    'worklet';
    const remainingHeaderPx = headerProgress.value * h;
    const headerDragDelta = Math.max(dy, -remainingHeaderPx);
    
    if (headerDragDelta !== 0) {
      headerProgress.value += headerDragDelta / h;

      if (contentOffsetY.value > 0) {
        const newY = contentOffsetY.value - headerDragDelta;
        contentOffsetY.value = newY;
        scrollTo(scrollableRef, 0, newY, false);
      } else {
        contentOffsetY.value = 0;
        scrollTo(scrollableRef, 0, 0, false);
      }
    }

    return headerDragDelta;
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      dragDeltaY.value = 0;
      lastGestureDy.value = 0;
    })
    .onUpdate((event) => {
      'worklet';
      const h = headerHeight.value;
      if (h <= 0) return;

      const totalDy = -event.translationY;
      let dy = totalDy - lastGestureDy.value;
      lastGestureDy.value = totalDy;
      if (dy === 0) return;

      dragDeltaY.value += dy;

      const collapsing = dy > 0;
      const expanding = dy < 0;
      const isScrolledToTop = contentOffsetY.value <= TOP_EPSILON;

      runOnJS(log)('[Pan]', { dy, collapsing, expanding, isScrolledToTop, headerProgress: headerProgress.value });

      if (!isScrolledToTop && collapsing && headerProgress.value >= 1) return;
      if (!isScrolledToTop && expanding && headerProgress.value <= 0) return;

      if (collapsing && headerProgress.value < 1) {
        const headerDragDelta = handleHeaderCollapse(dy, h);
        dy -= headerDragDelta;
      }

      if (expanding && headerProgress.value > 0) {
        const headerDragDelta = handleHeaderExpand(dy, h);
        dy -= headerDragDelta;
      }
    })
    .onEnd(() => {
      'worklet';
      const delta = dragDeltaY.value;
      if (delta > collapseThreshold) snapHeader('collapse');
      else if (delta < -expandThreshold) snapHeader('expand');
      else snapHeader();
    });

  const nativeScrollGesture = Gesture.Native();
  const composedGesture = Gesture.Simultaneous(panGesture, nativeScrollGesture);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture} >
        <Animated.View collapsable={false} style={{ flex: 1 }}>
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

          {measuredHeight > 0 && (
            <Animated.View style={[styles.contentWrapper, contentWrapperStyle]}>
              {renderContent({ scrollableRef, onScroll })}
            </Animated.View>
          )}
        </Animated.View>

      </GestureDetector>
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