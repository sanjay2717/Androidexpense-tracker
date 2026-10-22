import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { theme } from '../theme';
import { formatIndianCurrencyWorklet } from '../lib/reportData';

export interface DonutChartItem {
  categoryId?: string;
  name: string;
  color?: string;
  amount: number;
  percentage?: number;
}

export interface DonutChartProps {
  data: DonutChartItem[];
  totalAmount: number;
  size?: number; // default 116 for Home, 160 for Report
  strokeWidth?: number; // default 16 for Home, 18 for Report
  showLegend?: boolean; // default true for Home, false for Report
  centerSubtitle?: string; // default 'TOTAL' or 'Largest'
  centerTitle?: string; // optional text override (e.g. category name)
  centerTitleValue?: string; // optional formatted value override (e.g. '34%')
}

export const DonutChart = memo(function DonutChart({
  data,
  totalAmount,
  size = 116,
  strokeWidth = 16,
  showLegend = true,
  centerSubtitle = 'TOTAL',
  centerTitle,
  centerTitleValue,
}: DonutChartProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pure geometry memoized on (data, totalAmount, size, strokeWidth)
  const { hasData, safeTotal, isSingleCategory, singleColor, segmentSlices, processedCategories, formattedTotal } =
    useMemo(() => {
      const validTotal = Number.isFinite(totalAmount) && totalAmount > 0 ? totalAmount : 0;

      const validCategories = (Array.isArray(data) ? data : [])
        .filter((d) => d && Number.isFinite(d.amount) && d.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      let categories: DonutChartItem[] = [];
      if (validTotal > 0 && validCategories.length > 0) {
        if (validCategories.length <= 5) {
          categories = validCategories;
        } else {
          const top5 = validCategories.slice(0, 5);
          const remainder = validCategories.slice(5);
          const othersAmount = remainder.reduce(
            (sum, item) => sum + (Number(item.amount) || 0),
            0
          );
          if (othersAmount > 0) {
            top5.push({
              categoryId: 'others-merged',
              name: 'Others',
              amount: othersAmount,
              color: theme.colors.outlineVariant,
            });
          }
          categories = top5;
        }
      }

      const withData = validTotal > 0 && categories.length > 0;
      const isSingle = categories.length === 1;
      const colorSingle = isSingle ? categories[0].color || theme.colors.primary : theme.colors.primary;
      const formatted = formatIndianCurrencyWorklet(validTotal, '₹');

      if (!withData || isSingle) {
        return {
          hasData: withData,
          safeTotal: validTotal,
          isSingleCategory: isSingle,
          singleColor: colorSingle,
          segmentSlices: [],
          processedCategories: categories,
          formattedTotal: formatted,
        };
      }

      // 2+ categories: compute slices with gap and dashoffset
      const activeTotal = categories.reduce((sum, item) => sum + item.amount, 0);
      const denominator = activeTotal > 0 ? activeTotal : validTotal;

      const GAP_DEGREES = 3;
      const gapPx = (GAP_DEGREES / 360) * circumference;

      let accumulatedOffset = 0;
      const slices = categories.map((item, idx) => {
        const share = item.amount / denominator;
        const rawSliceLength = share * circumference;

        const canApplyGap = categories.length > 1 && rawSliceLength > gapPx * 1.5;
        const drawnLength = canApplyGap
          ? Math.max(2, rawSliceLength - gapPx)
          : Math.max(1, Math.min(rawSliceLength, 2));

        const color = item.color || theme.colors.primary;
        const key = item.categoryId || `${item.name}-${idx}`;

        const sliceData = {
          key,
          color,
          dashArray: `${drawnLength.toFixed(2)} ${(circumference - drawnLength).toFixed(2)}`,
          dashOffset: -accumulatedOffset,
        };

        accumulatedOffset += rawSliceLength;
        return sliceData;
      });

      return {
        hasData: withData,
        safeTotal: validTotal,
        isSingleCategory: isSingle,
        singleColor: colorSingle,
        segmentSlices: slices,
        processedCategories: categories,
        formattedTotal: formatted,
      };
    }, [data, totalAmount, size, strokeWidth, circumference]);

  return (
    <View
      style={[
        styles.container,
        !showLegend && styles.containerCentered,
      ]}
    >
      {/* Fixed-Size Chart Container (Layout never jumps) */}
      <View style={[styles.chartWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Base gray background track ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={theme.colors.surfaceContainerHigh}
            strokeWidth={strokeWidth}
          />

          {/* Single Category 100%: full-circle stroke with no dasharray */}
          {isSingleCategory && (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={singleColor}
              strokeWidth={strokeWidth}
            />
          )}

          {/* Multiple Segments inside <G> rotated -90 degrees around center */}
          {!isSingleCategory && segmentSlices.length > 0 && (
            <G rotation="-90" origin={`${center}, ${center}`}>
              {segmentSlices.map((slice) => (
                <Circle
                  key={slice.key}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={slice.dashArray}
                  strokeDashoffset={slice.dashOffset}
                  strokeLinecap="round"
                />
              ))}
            </G>
          )}
        </Svg>

        {/* Center Label Overlay (Normal Text in absolutely positioned View) */}
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerSub} numberOfLines={1}>
            {centerSubtitle}
          </Text>

          {centerTitle ? (
            <Text
              style={[styles.centerMain, { maxWidth: size - strokeWidth * 2 - 8 }]}
              numberOfLines={1}
            >
              {centerTitle}
            </Text>
          ) : (
            <Text
              style={[styles.centerMain, { maxWidth: size - strokeWidth * 2 - 8 }]}
              numberOfLines={1}
            >
              {formattedTotal}
            </Text>
          )}

          {centerTitleValue ? (
            <Text style={styles.centerPct} numberOfLines={1}>
              {centerTitleValue}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Optional Legend Breakdown (Used on Home; Report uses its own list) */}
      {showLegend && (
        <View style={styles.legend}>
          {hasData ? (
            processedCategories.map((item, idx) => (
              <View key={item.categoryId || `${item.name}-${idx}`} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.dot, { backgroundColor: item.color || theme.colors.primary }]} />
                  <Text style={styles.legendName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <Text style={styles.legendPct}>
                  {(() => {
                    const pct = (item.amount / safeTotal) * 100;
                    if (item.amount <= 0) return '0%';
                    if (pct < 1) return '<1%';
                    return `${Math.round(pct)}%`;
                  })()}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyHintContainer}>
              <Text style={styles.emptyHintTitle}>No expenses recorded</Text>
              <Text style={styles.emptyHintSubtitle}>
                Record an expense to see your category breakdown.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  containerCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerSub: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  centerMain: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  centerPct: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginTop: 1,
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
