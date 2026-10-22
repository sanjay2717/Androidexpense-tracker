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

export function WalletSkeleton() {
  return (
    <View style={styles.container}>
      {/* Title & total balance skeleton */}
      <View style={{ marginBottom: 16 }}>
        <Skeleton width={140} height={32} borderRadius={8} />
        <Skeleton width={180} height={18} borderRadius={6} style={{ marginTop: 8 }} />
      </View>

      {/* Wallet Carousel Card Skeleton */}
      <View style={[styles.card, { height: 184, backgroundColor: theme.colors.surfaceContainerLow }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Skeleton width={40} height={40} borderRadius={12} />
            <View>
              <Skeleton width={110} height={16} borderRadius={4} />
              <Skeleton width={70} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          </View>
          <Skeleton width={60} height={22} borderRadius={11} />
        </View>

        <View style={{ marginTop: 36 }}>
          <Skeleton width={100} height={12} borderRadius={4} />
          <Skeleton width={160} height={32} borderRadius={8} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Action buttons skeleton */}
      <View style={{ flexDirection: 'row', gap: 12, marginVertical: 12 }}>
        <Skeleton width="48%" height={48} borderRadius={24} />
        <Skeleton width="48%" height={48} borderRadius={24} />
      </View>

      {/* Recent activity skeleton */}
      <View style={[styles.card, { minHeight: 200 }]}>
        <Skeleton width={140} height={20} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={{ gap: 14 }}>
          <Skeleton width="100%" height={44} borderRadius={12} />
          <Skeleton width="100%" height={44} borderRadius={12} />
          <Skeleton width="100%" height={44} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function PlanningSkeleton() {
  return (
    <View style={styles.container}>
      {/* Title & Segmented pill skeleton */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Skeleton width={120} height={32} borderRadius={8} />
        <Skeleton width={96} height={36} borderRadius={18} />
      </View>
      <Skeleton width="100%" height={40} borderRadius={14} style={{ marginTop: 8 }} />

      {/* Summary card skeleton */}
      <View style={[styles.card, { marginTop: 6 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Skeleton width={100} height={14} borderRadius={4} />
            <Skeleton width={140} height={32} borderRadius={8} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={70} height={24} borderRadius={12} />
        </View>
        <Skeleton width="100%" height={10} borderRadius={5} style={{ marginTop: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Skeleton width={90} height={12} borderRadius={4} />
          <Skeleton width={110} height={12} borderRadius={4} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Skeleton width="48%" height={56} borderRadius={14} />
          <Skeleton width="48%" height={56} borderRadius={14} />
        </View>
      </View>

      {/* Section List skeleton */}
      <View style={[styles.card, { marginTop: 6 }]}>
        <Skeleton width={140} height={18} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={{ gap: 14 }}>
          <Skeleton width="100%" height={52} borderRadius={12} />
          <Skeleton width="100%" height={52} borderRadius={12} />
          <Skeleton width="100%" height={52} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function TransactionsSkeleton() {
  return (
    <View style={{ paddingHorizontal: theme.spacing.margin, gap: 12, paddingTop: 8 }}>
      {/* Search Input Skeleton */}
      <Skeleton width="100%" height={48} borderRadius={16} />

      {/* Chips Row Skeleton */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width={56} height={32} borderRadius={16} />
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={72} height={32} borderRadius={16} />
        <Skeleton width={96} height={32} borderRadius={16} />
      </View>

      {/* Summary Strip Skeleton */}
      <Skeleton width="100%" height={42} borderRadius={21} style={{ marginTop: 4 }} />

      {/* Day Group 1 */}
      <View style={{ marginTop: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
          <Skeleton width={60} height={14} borderRadius={4} />
          <Skeleton width={50} height={14} borderRadius={4} />
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="60%" height={16} borderRadius={4} />
              <Skeleton width="40%" height={12} borderRadius={4} />
            </View>
            <Skeleton width={64} height={18} borderRadius={4} />
          </View>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.surfaceContainer, marginVertical: 12, marginLeft: 56 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="50%" height={16} borderRadius={4} />
              <Skeleton width="35%" height={12} borderRadius={4} />
            </View>
            <Skeleton width={56} height={18} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Day Group 2 */}
      <View style={{ marginTop: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
          <Skeleton width={80} height={14} borderRadius={4} />
          <Skeleton width={60} height={14} borderRadius={4} />
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="55%" height={16} borderRadius={4} />
              <Skeleton width="45%" height={12} borderRadius={4} />
            </View>
            <Skeleton width={70} height={18} borderRadius={4} />
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
