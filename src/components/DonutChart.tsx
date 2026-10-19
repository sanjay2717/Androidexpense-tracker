import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { CategorySpending } from '../lib/api';
import { theme } from '../theme';

interface DonutChartProps {
  data: CategorySpending[];
  totalAmount: number;
}

export function DonutChart({ data, totalAmount }: DonutChartProps) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) })
    );
    opacity.value = withDelay(200, withTiming(1, { duration: 500 }));
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Format chart data for gifted-charts
  const pieData = data.length > 0
    ? data.map((item) => ({
        value: Math.max(1, item.amount),
        color: item.color,
      }))
    : [{ value: 1, color: theme.colors.surfaceContainerLow }];

  const formattedTotal =
    totalAmount >= 1000
      ? `₹${(totalAmount / 1000).toFixed(1)}k`
      : `₹${totalAmount}`;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.chartWrapper}>
        <PieChart
          donut
          data={pieData}
          radius={54}
          innerRadius={38}
          innerCircleColor={theme.colors.surfaceContainerLowest}
          isAnimated
          animationDuration={700}
          centerLabelComponent={() => (
            <View style={styles.centerLabel}>
              <Text style={styles.centerSub}>TOTAL</Text>
              <Text style={styles.centerMain} numberOfLines={1}>
                {formattedTotal}
              </Text>
            </View>
          )}
        />
      </View>

      {/* Legend Breakdown */}
      <View style={styles.legend}>
        {data.slice(0, 4).map((item) => (
          <View key={item.categoryId || item.name} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.legendName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <Text style={styles.legendPct}>{item.percentage}%</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  chartWrapper: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSub: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
  },
  centerMain: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.3,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 8,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.onSurface,
    flex: 1,
  },
  legendPct: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
});
