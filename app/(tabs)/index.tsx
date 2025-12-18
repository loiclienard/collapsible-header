import React, { useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_HEADER_HEIGHT = 96;
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<string>
);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const HEADER_TOTAL_HEIGHT = BASE_HEADER_HEIGHT + insets.top;

  // 0 = fully visible; HEADER_TOTAL_HEIGHT = fully collapsed
  const headerOffset = useSharedValue(0);
  // Virtual scroll of the list (0 = top)
  const listScrollY = useSharedValue(0);
  const lastNativeY = useSharedValue(0);

  const data = useMemo(
    () => Array.from({ length: 60 }, (_, i) => `Item ${i + 1}`),
    []
  );

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -headerOffset.value }],
    paddingTop: insets.top,
  }));

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: (event) => {
      lastNativeY.value = event.contentOffset.y;
    },
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const dy = y - lastNativeY.value;
      lastNativeY.value = y;

      if (dy === 0) return;

      if (dy > 0) {
        // ===== SCROLLING DOWN =====
        // Collapse header first
        if (headerOffset.value < HEADER_TOTAL_HEIGHT) {
          const headerCanCollapse =
            HEADER_TOTAL_HEIGHT - headerOffset.value;
          const usedForHeader = Math.min(dy, headerCanCollapse);
          headerOffset.value += usedForHeader;

          const remaining = dy - usedForHeader;
          if (remaining > 0) {
            // Then scroll list, but don't allow negative (not relevant here, but keep consistent)
            listScrollY.value = Math.max(
              0,
              listScrollY.value + remaining
            );
          }
        } else {
          listScrollY.value = Math.max(0, listScrollY.value + dy);
        }
      } else {
        // ===== SCROLLING UP =====
        const absDy = -dy;

        // 1) Expand header first
        if (headerOffset.value > 0) {
          const headerCanExpand = headerOffset.value;
          const usedForHeaderUp = Math.min(headerCanExpand, absDy);
          headerOffset.value -= usedForHeaderUp;

          const remainingUp = absDy - usedForHeaderUp;
          if (remainingUp > 0) {
            // 2) Then move list up, but clamp at 0
            const listCanRewind = listScrollY.value;
            const usedForList = Math.min(listCanRewind, remainingUp);
            listScrollY.value = Math.max(
              0,
              listScrollY.value - usedForList
            );
            // Any leftover "up" beyond this is ignored, so you
            // can't go above the first item.
          }
        } else {
          // Header already fully expanded; only list moves up, clamped at 0
          const listCanRewind = listScrollY.value;
          const usedForList = Math.min(listCanRewind, absDy);
          listScrollY.value = Math.max(
            0,
            listScrollY.value - usedForList
          );
          // If listScrollY was already 0, nothing happens → no overscroll.
        }
      }
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.headerContainer,
          { height: HEADER_TOTAL_HEIGHT },
          headerStyle,
        ]}
      >
        <View style={styles.headerInner}>
          <Text style={styles.headerTitle}>Collapsible Header</Text>
          <Text style={styles.headerSubtitle}>
            Scroll down: collapse header, then list. Up: expand header first.
          </Text>
        </View>
      </Animated.View>

      {/* List (always fills space) */}
      <View style={styles.listWrapper}>
        <AnimatedFlatList
          data={data}
          keyExtractor={(item) => item}
          scrollEventThrottle={16}
          onScroll={onScroll}
          style={styles.list}
          // Header height as top padding so the first item appears below header
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: HEADER_TOTAL_HEIGHT },
          ]}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text>{item}</Text>
            </View>
          )}
          // Optional: disable bounce on iOS if you want absolutely no elastic overscroll
          bounces={false}
          alwaysBounceVertical={false}
        />
      </View>
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
  listWrapper: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
});