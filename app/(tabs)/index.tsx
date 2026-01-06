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
      renderContent={({ scrollableRef, onScroll }) => (
        <Animated.FlatList
          ref={scrollableRef}
          data={data}
          keyExtractor={item => item}
          renderItem={renderItem}
          scrollEventThrottle={16}
          onScroll={onScroll}
        />
  )}
/>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
});