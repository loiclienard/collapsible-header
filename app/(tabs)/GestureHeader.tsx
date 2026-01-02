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


  return (
    <HeaderScrollLayout
      renderContent={({ scrollableRef, onScroll }) => (
        <Animated.ScrollView
          ref={scrollableRef}
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          {data.map((item) => (
            <View key={item} style={styles.item}>
              <Text>{item}</Text>
            </View>
          ))}
        </Animated.ScrollView>
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