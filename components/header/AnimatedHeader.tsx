// AnimatedHeader.tsx
import React from 'react';
import { StyleSheet, Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useHeaderOffset } from './HeaderOffsetContext';

const HEADER_MAX_HEIGHT = 160;
const HEADER_MIN_HEIGHT = 64;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export const HEADER_CONSTANTS = {
  HEADER_MAX_HEIGHT,
  HEADER_MIN_HEIGHT,
  HEADER_SCROLL_DISTANCE,
};

export default function AnimatedHeader(props: NativeStackHeaderProps) {
  const { route, options } = props;
  const insets = useSafeAreaInsets();
  const headerOffset = useHeaderOffset() ?? new Animated.Value(0);

  const title = options.title ?? route.name;

  const height = headerOffset.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT + insets.top, HEADER_MIN_HEIGHT + insets.top],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.container, { height, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Scroll: header moves first, content later
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#6200ee',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  content: {
    justifyContent: 'flex-end',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
});