import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_HEADER_HEIGHT = 96;
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<string>
);

// CONFIGURABLE THRESHOLDS (in px of finger movement during one drag)
const COLLAPSE_THRESHOLD = 5; // scroll down by at least this
const EXPAND_THRESHOLD   = 5; // scroll up by at least this

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const HEADER_TOTAL_HEIGHT = BASE_HEADER_HEIGHT + insets.top;

  // 0 = fully visible; HEADER_TOTAL_HEIGHT = fully collapsed
  const headerOffset = useSharedValue(0);

  // Track scroll movement during the current drag
  const dragDeltaY = useSharedValue(0); // positive = down, negative = up
  const lastY = useSharedValue(0);

  const data = useMemo(
    () => Array.from({ length: 60 }, (_, i) => `Item ${i + 1}`),
    []
  );

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -headerOffset.value }],
    paddingTop: insets.top,
  }));

  const snapHeader = (force?: 'collapse' | 'expand') => {
    'worklet';
    let target: number;

    if (force === 'collapse') {
      target = HEADER_TOTAL_HEIGHT;
    } else if (force === 'expand') {
      target = 0;
    } else {
      // default behavior: use middle point
      const mid = HEADER_TOTAL_HEIGHT / 2;
      target = headerOffset.value < mid ? 0 : HEADER_TOTAL_HEIGHT;
    }

    headerOffset.value = withTiming(target, { duration: 180 });
  };

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: (event) => {
      lastY.value = event.contentOffset.y;
      dragDeltaY.value = 0; // reset per-gesture delta
    },

    onScroll: (event) => {
      const y = event.contentOffset.y;
      const dy = y - lastY.value;
      lastY.value = y;

      // accumulate drag distance for this gesture
      dragDeltaY.value += dy;

      // Move header with scroll
      headerOffset.value = Math.min(
        HEADER_TOTAL_HEIGHT,
        Math.max(0, headerOffset.value + dy)
      );
    },

    onEndDrag: () => {
      // Decide based on dragDeltaY
      const delta = dragDeltaY.value;

      if (delta >= COLLAPSE_THRESHOLD) {
        // user dragged down enough -> force collapse
        snapHeader('collapse');
      } else if (delta <= -EXPAND_THRESHOLD) {
        // user dragged up enough -> force expand
        snapHeader('expand');
      } else {
        // not enough movement -> fallback to midpoint logic
        snapHeader();
      }
    },

    onMomentumEnd: () => {
      // Optional: after a fling, you can also just rely on midpoint
      snapHeader();
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.headerContainer,
          { height: HEADER_TOTAL_HEIGHT },
          headerStyle,
        ]}
      >
        <View style={styles.headerInner}>
          <Text style={styles.headerTitle}>Snapping Header</Text>
          <Text style={styles.headerSubtitle}>
            Uses collapse/expand thresholds on release.
          </Text>
        </View>
      </Animated.View>

      <AnimatedFlatList
        data={data}
        keyExtractor={(item) => item}
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={{
          paddingTop: HEADER_TOTAL_HEIGHT,
          paddingBottom: 24,
        }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item}</Text>
          </View>
        )}
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: '#ff6347',
    zIndex: 10,
  },
  headerInner: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  headerSubtitle: {
    color: 'white',
    opacity: 0.8,
    marginTop: 4,
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
});