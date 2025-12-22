// HomeScreen.tsx
import HeaderScrollLayout from '@/components/header/reanimated-gesture-scroll-layout';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';



export default function ReanimatedHeader() {
  const data = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => `Item ${i + 1}`),
    []
  );

  const renderItem = ({ item }: { item: string }) => {
    return (
      <View style={styles.item}>
        <Text>{item}</Text>
    </View>)
  };

  return (
    <HeaderScrollLayout
      title="Header"
      subtitle="Scrollable content below"
      renderContent={({ listRef, internalOnScroll }) => (
        <Animated.FlatList
          ref={listRef}
          data={data}
          keyExtractor={item => item}
          renderItem={renderItem}
          scrollEventThrottle={16}
          onScroll={internalOnScroll}
          // normal momentum etc.
          contentContainerStyle={{ paddingBottom: 24 }}
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