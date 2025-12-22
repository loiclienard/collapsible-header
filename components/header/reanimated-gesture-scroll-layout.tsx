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
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
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

// --- Types ------------------------------------------------

type RenderContentArgs = {
  listRef: React.RefObject<Animated.ScrollView | Animated.FlatList<any>>;
  internalOnScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
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

const TOP_EPSILON = 2;

function jsLog(tag: string, payload: any) {
   
  console.log(tag, payload);
}

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

  const listRef = useAnimatedRef<Animated.ScrollView | Animated.FlatList<any>>();

  // list offset we track
  const contentOffsetY = useSharedValue(0);

  // gesture state
  const dragDeltaY = useSharedValue(0);
  const lastGestureDy = useSharedValue(0);

  // --- Layout / styles -----------------------------------

  const onHeaderLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== measuredHeight) {
        setMeasuredHeight(h);
        headerHeight.value = h;
        console.log('[header] measured height =', h);
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

  // --- Header snapping ------------------------------------

  const snapHeader = (force?: 'collapse' | 'expand') => {
    'worklet';
    const h = headerHeight.value;
    if (h <= 0) return;

    let target: number;
    if (force === 'collapse') target = 1;
    else if (force === 'expand') target = 0;
    else target = headerProgress.value < 0.5 ? 0 : 1;

    runOnJS(jsLog)('[snapHeader]', { from: headerProgress.value, to: target });

    headerProgress.value = withTiming(target, { duration: 200 });
  };

  // --- Internal onScroll for list ------------------------

  const internalOnScroll = useAnimatedScrollHandler<NativeScrollEvent>({
    onBeginDrag: (e) => {
      runOnJS(jsLog)('[list] onBeginDrag', e.contentOffset.y);
    },
    onScroll: (event) => {
      contentOffsetY.value = event.contentOffset.y;
      runOnJS(jsLog)('[list] onScroll', {
        y: event.contentOffset.y,
        headerProgress: headerProgress.value,
      });
    },
    onEndDrag: () => {
      runOnJS(jsLog)('[list] onEndDrag', null);
    },
  });

  // --- Gestures ------------------------------------------

  // Pan that controls the header
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      dragDeltaY.value = 0;
      lastGestureDy.value = 0;
      runOnJS(jsLog)('[pan] onBegin', {
        headerProgress: headerProgress.value,
        offsetY: contentOffsetY.value,
      });
    })
    .onUpdate((event) => {
      'worklet';
      const h = headerHeight.value;
      if (h <= 0) {
        runOnJS(jsLog)('[pan] onUpdate - no header height', null);
        return;
      }

      const totalDy = -event.translationY; // up => positive
      let dy = totalDy - lastGestureDy.value;
      lastGestureDy.value = totalDy;

      if (dy === 0) return;

      dragDeltaY.value += dy;

      const collapsing = dy > 0;
      const expanding = dy < 0;
      const atTop = contentOffsetY.value <= TOP_EPSILON;

      runOnJS(jsLog)('[pan] onUpdate/raw', {
        translationY: event.translationY,
        totalDy,
        stepDy: dy,
        collapsing,
        expanding,
        atTop,
        headerProgress: headerProgress.value,
        contentOffsetY: contentOffsetY.value,
      });

      // If list is not at top and header fully collapsed/expanded, we let list handle it.
      if (!atTop && collapsing && headerProgress.value >= 1) {
        runOnJS(jsLog)('[pan] ignore - deep scroll, header collapsed', null);
        return;
      }
      if (!atTop && expanding && headerProgress.value <= 0) {
        runOnJS(jsLog)('[pan] ignore - deep scroll, header expanded', null);
        return;
      }

      // AT OR NEAR TOP: header can move
      // 1) Collapse
      if (collapsing && headerProgress.value < 1) {
        const remainingHeaderPx = (1 - headerProgress.value) * h;
        const useForHeader = Math.min(dy, remainingHeaderPx);
        if (useForHeader > 0) {
          headerProgress.value += useForHeader / h;
          dy -= useForHeader;

          runOnJS(jsLog)('[pan] collapse header', {
            useForHeader,
            newHeaderProgress: headerProgress.value,
            leftoverDy: dy,
          });

          // Keep list clamped near top while collapsing
          if (contentOffsetY.value > 0) {
            const newY = Math.max(0, contentOffsetY.value - useForHeader);
            contentOffsetY.value = newY;
            scrollTo(listRef, 0, newY, false);
          } else {
            scrollTo(listRef, 0, 0, false);
          }
        }
      }

     // 2) Expand
if (expanding && headerProgress.value > 0) {
  const remainingHeaderPx = headerProgress.value * h;
  const useForHeader = Math.max(dy, -remainingHeaderPx); // negative or 0
  if (useForHeader !== 0) {
    // useForHeader is negative (scrolling down)
    headerProgress.value += useForHeader / h;
    dy -= useForHeader;

    const beforeOffset = contentOffsetY.value;

    runOnJS(jsLog)('[pan] expand header', {
      useForHeader,
      newHeaderProgress: headerProgress.value,
      leftoverDy: dy,
      beforeOffset,
    });

    // Mirror behavior to collapsing, but in opposite direction:
    // while header is expanding, push list DOWN by the same amount
    // so the items appear stuck under the finger.

    if (beforeOffset > 0) {
      // We're not at the top yet: let the list move down by -useForHeader
      // (since useForHeader is negative, -useForHeader is positive)
      const newY = beforeOffset - useForHeader; // subtract negative => add
      contentOffsetY.value = newY;
      scrollTo(listRef, 0, newY, false);
    } else {
      // At or near top: clamp to 0 so we don't see jitter
      contentOffsetY.value = 0;
      scrollTo(listRef, 0, 0, false);
    }
  }
}
    })
    .onEnd(() => {
      'worklet';
      const delta = dragDeltaY.value;
      runOnJS(jsLog)('[pan] onEnd', {
        delta,
        headerProgress: headerProgress.value,
        offsetY: contentOffsetY.value,
      });

      if (delta > collapseThreshold) snapHeader('collapse');
      else if (delta < -expandThreshold) snapHeader('expand');
      else snapHeader();
    });

  // Native scroll gesture for the list so pan & scroll can run simultaneously
  const nativeScrollGesture = Gesture.Native();

  // Combine gestures: allow simultaneous recognition
  const composedGesture = Gesture.Simultaneous(panGesture, nativeScrollGesture);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={StyleSheet.absoluteFill}>
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

          {/* Content card + list */}
          {measuredHeight > 0 && (
            <Animated.View style={[styles.contentWrapper, contentWrapperStyle]}>
              {renderContent({
                listRef,
                internalOnScroll: internalOnScroll as any,
              })}
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