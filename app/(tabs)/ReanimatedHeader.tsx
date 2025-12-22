// HomeScreen.tsx
import HeaderScrollLayout from '@/components/header/reanimated-scroll-layout';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<string>
);

export default function ReanimatedHeader() {
  const { top } = useSafeAreaInsets();
  const data = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => `Item ${i + 1}`),
    []
  );

  return (
    <HeaderScrollLayout
      renderContent={({ onScroll }) => (
        <AnimatedFlatList
          data={data}
          keyExtractor={(item) => item}
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={false}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text>{item}</Text>
            </View>
          )}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  headerInner: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ff6347',
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
  item: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
});