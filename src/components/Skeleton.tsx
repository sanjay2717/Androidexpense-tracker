import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width={80} height={12} borderRadius={4} />
          <Skeleton width={120} height={18} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      {/* Hero Balance Card Skeleton */}
      <View style={styles.card}>
        <Skeleton width={100} height={14} borderRadius={6} />
        <Skeleton width={180} height={42} borderRadius={10} style={{ marginTop: 12, marginBottom: 16 }} />
        <Skeleton width="100%" height={64} borderRadius={16} />
      </View>

      {/* Budget Card Skeleton */}
      <View style={styles.card}>
        <Skeleton width={140} height={18} borderRadius={6} />
        <Skeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 14 }} />
        <Skeleton width="100%" height={24} borderRadius={6} style={{ marginTop: 10 }} />
      </View>

      {/* Donut Card Skeleton */}
      <View style={[styles.card, { height: 180 }]}>
        <Skeleton width={160} height={18} borderRadius={6} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          <Skeleton width={110} height={110} borderRadius={55} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Skeleton width="100%" height={16} borderRadius={6} style={{ marginBottom: 10 }} />
            <Skeleton width="90%" height={16} borderRadius={6} style={{ marginBottom: 10 }} />
            <Skeleton width="80%" height={16} borderRadius={6} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.margin,
    gap: theme.spacing.md,
  },
  skeleton: {
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
});
