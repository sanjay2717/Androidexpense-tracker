import React, { useEffect, useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

export const DonutChart = memo(function DonutChart({ data, totalAmount }: DonutChartProps) {
  const scale = useSharedValue(0.88);
  const opacity = useSharedValue(0);

  const hasData = data.length > 0 && totalAmount > 0;

  useEffect(() => {
    scale.value = withDelay(
      80,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.15)) })
    );
    opacity.value = withDelay(80, withTiming(1, { duration: 350 }));
  }, [totalAmount, data.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const size = 116;
  const center = size / 2; // 58
  const strokeWidth = 16;
  const radius = 46;
  const circumference = 2 * Math.PI * radius; // ~289.03

  // Precompute stroke dash arrays and offsets
  const slices = useMemo(() => {
    if (!hasData) return [];

    const active = data.filter((d) => d.amount > 0);
    if (active.length === 0) return [];

    let accumulatedPct = 0;
    return active.slice(0, 5).map((item, idx) => {
      const share = item.amount / totalAmount;
      const sliceLength = share * circumference;
      const offset = -(accumulatedPct * circumference);
      accumulatedPct += share;

      return {
        key: item.categoryId || `${item.name}-${idx}`,
        color: item.color || theme.colors.primary,
        dashArray: `${Math.max(1, sliceLength)} ${circumference}`,
        dashOffset: offset,
      };
    });
  }, [hasData, data, totalAmount, circumference]);

  const formattedTotal = useMemo(() => {
    if (totalAmount <= 0) return '₹0';
    return totalAmount >= 10000
      ? `₹${(totalAmount / 1000).toFixed(1)}k`
      : `₹${totalAmount.toLocaleString('en-IN')}`;
  }, [totalAmount]);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.svgRotate}>
          {/* Base background ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={theme.colors.surfaceContainerLow}
            strokeWidth={strokeWidth}
          />

          {/* Category Slices */}
          {slices.map((slice) => (
            <Circle
              key={slice.key}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              strokeLinecap="round"
            />
          ))}
        </Svg>

        {/* Center Total Callout */}
        <View style={styles.centerLabel}>
          <Text style={styles.centerSub}>TOTAL</Text>
          <Text style={styles.centerMain} numberOfLines={1}>
            {formattedTotal}
          </Text>
        </View>
      </View>

      {/* Legend Breakdown or Empty Hint */}
      <View style={styles.legend}>
        {hasData ? (
          data.slice(0, 4).map((item, idx) => (
            <View key={item.categoryId || `${item.name}-${idx}`} style={styles.legendRow}>
              <View style={styles.legendLeft}>
                <View style={[styles.dot, { backgroundColor: item.color || theme.colors.primary }]} />
                <Text style={styles.legendName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Text style={styles.legendPct}>{item.percentage}%</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyHintContainer}>
            <Text style={styles.emptyHintTitle}>No expenses recorded</Text>
            <Text style={styles.emptyHintSubtitle}>
              Tap '+' below to add an expense and see category distribution.
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
});

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
    position: 'relative',
  },
  svgRotate: {
    transform: [{ rotate: '-90deg' }],
  },
  centerLabel: {
    position: 'absolute',
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
  emptyHintContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emptyHintTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  emptyHintSubtitle: {
    fontSize: 11,
    color: theme.colors.secondary,
    lineHeight: 15,
  },
});
