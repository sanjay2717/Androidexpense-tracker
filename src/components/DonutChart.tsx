import React, { useEffect, useMemo, memo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, AppState } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useIsFocused } from 'expo-router';
import { theme } from '../theme';
import { formatIndianCurrencyWorklet } from '../lib/reportData';

// Immutable Skia bundle resolved once at startup. Zero module-level mutable state.
interface SkiaBundle {
  Skia: any;
  Canvas: any;
  Path: any;
}

const SKIA: SkiaBundle | null = (() => {
  try {
    const skiaModule = require('@shopify/react-native-skia');
    if (
      skiaModule &&
      skiaModule.Skia &&
      skiaModule.Canvas &&
      skiaModule.Path &&
      typeof skiaModule.Skia.Path?.Circle === 'function' &&
      typeof skiaModule.Skia.PathBuilder?.Make === 'function'
    ) {
      return {
        Skia: skiaModule.Skia,
        Canvas: skiaModule.Canvas,
        Path: skiaModule.Path,
      };
    }
  } catch {
    // Skia not available, fall back to SVG
  }
  return null;
})();

const IS_SKIA_AVAILABLE = SKIA !== null;
const CanvasComponent = SKIA ? SKIA.Canvas : null;
const PathComponent = SKIA ? SKIA.Path : null;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const SWEEP_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const SWEEP_DURATION = 1100;

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
  const isFocused = useIsFocused();

  // Surface rebuild counter: remounts Canvas on focus/resume to restore lost Android hardware surfaces
  const [surfaceKey, setSurfaceKey] = useState(0);

  // Deterministic data signature to detect changes and restart sweep reliably
  const dataSignature = useMemo(() => {
    const list = data
      .map((d) => `${d.categoryId || d.name}:${Number(d.amount) || 0}:${d.color || ''}`)
      .join('|');
    return `${Number(totalAmount) || 0}_${list}`;
  }, [data, totalAmount]);

  // Per-instance Reanimated shared values
  const scale = useSharedValue(0.92);
  const containerOpacity = useSharedValue(0);
  const sweepProgress = useSharedValue(0);
  const centerLabelOpacity = useSharedValue(1);

  // Safe data filtering and NaN / zero guards
  const safeTotal = useMemo(() => {
    return Number.isFinite(totalAmount) && totalAmount > 0 ? totalAmount : 0;
  }, [totalAmount]);

  // Consolidate items beyond top 5 into an "Others" slice so slices and legend always total 100%
  const processedCategories = useMemo(() => {
    if (safeTotal <= 0 || !Array.isArray(data)) return [];
    const valid = data
      .filter((d) => Number.isFinite(d.amount) && d.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    if (valid.length <= 5) {
      return valid;
    }

    const top5 = valid.slice(0, 5);
    const remainder = valid.slice(5);
    const othersAmount = remainder.reduce((acc, item) => acc + item.amount, 0);

    if (othersAmount > 0) {
      top5.push({
        categoryId: 'others-merged',
        name: 'Others',
        amount: othersAmount,
        color: theme.colors.outlineVariant,
      });
    }

    return top5;
  }, [data, safeTotal]);

  const hasData = safeTotal > 0 && processedCategories.length > 0;

  // Animation controller
  const runSweepAnimation = useCallback(() => {
    sweepProgress.value = 0;
    centerLabelOpacity.value = 0.35;

    scale.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.back(1.15)),
    });
    containerOpacity.value = withTiming(1, { duration: 350 });
    centerLabelOpacity.value = withTiming(1, { duration: 450 });

    sweepProgress.value = withTiming(1, {
      duration: SWEEP_DURATION,
      easing: SWEEP_EASING,
    });
  }, [scale, containerOpacity, centerLabelOpacity, sweepProgress]);

  // Restart sweep when data signature changes
  useEffect(() => {
    runSweepAnimation();
  }, [dataSignature, runSweepAnimation]);

  // When screen regains focus, increment surfaceKey to remount Canvas (restoring Android surface) & replay sweep
  const prevFocusedRef = useRef(isFocused);
  useEffect(() => {
    if (isFocused && !prevFocusedRef.current) {
      setSurfaceKey((k) => k + 1);
      runSweepAnimation();
    }
    prevFocusedRef.current = isFocused;
  }, [isFocused, runSweepAnimation]);

  // AppState active listener: rebuild lost surface if app resumes from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isFocused) {
        setSurfaceKey((k) => k + 1);
        runSweepAnimation();
      }
    });
    return () => sub.remove();
  }, [isFocused, runSweepAnimation]);

  // Safeguard: if chart is focused, total > 0, and progress is 0 with no animation running, animate to 1
  useEffect(() => {
    if (isFocused && hasData && sweepProgress.value === 0) {
      sweepProgress.value = withTiming(1, {
        duration: SWEEP_DURATION,
        easing: SWEEP_EASING,
      });
    }
  }, [isFocused, hasData, sweepProgress]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: containerOpacity.value,
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: centerLabelOpacity.value,
  }));

  // Worklet-driven count-up for the center total number (Zero per-frame JS)
  const animatedCenterTotalProps = useAnimatedProps(() => {
    'worklet';
    const current = Math.round(sweepProgress.value * safeTotal);
    const formatted = formatIndianCurrencyWorklet(current, '₹');
    return {
      text: formatted,
      defaultValue: formatted,
    } as any;
  });

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Geometry computation for Skia (immutable API) and SVG
  const { isSingleCategory, singleColor, segmentSlices, skiaPaths, skiaBgPath } = useMemo(() => {
    // Immutable background circle using Skia.Path.Circle
    const bgPath = IS_SKIA_AVAILABLE && SKIA
      ? SKIA.Skia.Path.Circle(center, center, radius)
      : null;

    if (!hasData) {
      return {
        isSingleCategory: false,
        singleColor: theme.colors.primary,
        segmentSlices: [],
        skiaPaths: [],
        skiaBgPath: bgPath,
      };
    }

    // Exactly ONE category -> full circle, never an arc!
    if (processedCategories.length === 1) {
      const color = processedCategories[0].color || theme.colors.primary;
      const skiaSinglePath = IS_SKIA_AVAILABLE && SKIA
        ? SKIA.Skia.Path.Circle(center, center, radius)
        : null;

      return {
        isSingleCategory: true,
        singleColor: color,
        segmentSlices: [],
        skiaPaths: skiaSinglePath ? [{ key: 'single-full', path: skiaSinglePath, color }] : [],
        skiaBgPath: bgPath,
      };
    }

    // Multiple categories: sum active items
    const activeTotal = processedCategories.reduce((acc, item) => acc + item.amount, 0);
    const denominator = activeTotal > 0 ? activeTotal : safeTotal;

    const GAP_DEGREES = 3.5;
    const gapPx = (GAP_DEGREES / 360) * circumference;

    let accumulatedDegrees = -90; // Start at 12 o'clock
    let accumulatedPct = 0;

    const oval = IS_SKIA_AVAILABLE && SKIA
      ? SKIA.Skia.XYWHRect(center - radius, center - radius, radius * 2, radius * 2)
      : null;

    const skiaList: Array<{ key: string; path: any; color: string }> = [];

    const slices = processedCategories.map((item, idx) => {
      const share = item.amount / denominator;
      const rawDegrees = share * 360;
      const rawSliceLength = share * circumference;

      // Apply gap only between segments longer than the gap; clamp min sweep
      const canApplyGap = rawDegrees > GAP_DEGREES * 2;
      const sweepDegrees = canApplyGap ? rawDegrees - GAP_DEGREES : Math.max(2, rawDegrees);
      const drawnLength = canApplyGap ? rawSliceLength - gapPx : Math.max(3, rawSliceLength);

      const color = item.color || theme.colors.primary;
      const key = item.categoryId || `${item.name}-${idx}`;

      // Build immutable Skia path using Skia.PathBuilder.Make().addArc().build()
      if (IS_SKIA_AVAILABLE && SKIA && oval) {
        const builder = SKIA.Skia.PathBuilder.Make();
        builder.addArc(oval, accumulatedDegrees, sweepDegrees);
        const segPath = builder.build();
        skiaList.push({
          key,
          path: segPath,
          color,
        });
      }

      // Precompute SVG stroke dash arrays and offsets
      const offset = -(accumulatedPct * circumference);
      accumulatedPct += share;
      accumulatedDegrees += rawDegrees;

      return {
        key,
        color,
        dashArray: `${drawnLength.toFixed(1)} ${circumference.toFixed(1)}`,
        dashOffset: offset,
      };
    });

    return {
      isSingleCategory: false,
      singleColor: theme.colors.primary,
      segmentSlices: slices,
      skiaPaths: skiaList,
      skiaBgPath: bgPath,
    };
  }, [hasData, processedCategories, safeTotal, size, strokeWidth, center, radius, circumference]);

  return (
    <Animated.View
      style={[
        styles.container,
        !showLegend && styles.containerCentered,
        animatedContainerStyle,
      ]}
    >
      {/* Fixed-Size Chart Container (Layout never jumps) */}
      <View style={[styles.chartWrapper, { width: size, height: size }]}>
        {/* Render with Skia Canvas when available, otherwise rock-solid SVG */}
        {IS_SKIA_AVAILABLE && CanvasComponent && PathComponent ? (
          <CanvasComponent
            key={`donut-canvas-${surfaceKey}`}
            style={{ width: size, height: size }}
          >
            {/* Background Track Ring */}
            {skiaBgPath ? (
              <PathComponent
                path={skiaBgPath}
                style="stroke"
                strokeWidth={strokeWidth}
                color={theme.colors.surfaceContainerHigh}
              />
            ) : null}

            {/* Single Category Full Circle (Never an arc) */}
            {isSingleCategory && skiaPaths[0] ? (
              <PathComponent
                path={skiaPaths[0].path}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeCap="round"
                color={singleColor}
                start={0}
                end={sweepProgress}
              />
            ) : null}

            {/* Multiple Segmented Slices with UI-Thread Reanimated Trim */}
            {!isSingleCategory &&
              skiaPaths.map((seg) => (
                <PathComponent
                  key={seg.key}
                  path={seg.path}
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeCap="round"
                  color={seg.color}
                  start={0}
                  end={sweepProgress}
                />
              ))}
          </CanvasComponent>
        ) : (
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.svgRotate}>
            {/* Base background ring */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={theme.colors.surfaceContainerHigh}
              strokeWidth={strokeWidth}
            />

            {/* Single Category 100%: Full Circle without dasharray (Never collapses) */}
            {isSingleCategory && (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={singleColor}
                strokeWidth={strokeWidth}
              />
            )}

            {/* Multiple Segment Slices */}
            {!isSingleCategory &&
              segmentSlices.map((slice) => (
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
        )}

        {/* Center Label with Smooth Cross-Fade */}
        <Animated.View style={[styles.centerLabel, animatedLabelStyle]}>
          <Text style={styles.centerSub} numberOfLines={1}>
            {centerSubtitle}
          </Text>

          {centerTitle ? (
            <Text style={[styles.centerMain, { maxWidth: size - strokeWidth * 2 - 8 }]} numberOfLines={1}>
              {centerTitle}
            </Text>
          ) : (
            <AnimatedTextInput
              underlineColorAndroid="transparent"
              editable={false}
              style={[
                styles.centerMain,
                styles.animatedInputReset,
                { maxWidth: size - strokeWidth * 2 - 8 },
              ]}
              animatedProps={animatedCenterTotalProps}
            />
          )}

          {centerTitleValue ? (
            <Text style={styles.centerPct} numberOfLines={1}>
              {centerTitleValue}
            </Text>
          ) : null}
        </Animated.View>
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
                  {`${Math.round((item.amount / safeTotal) * 100)}%`}
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
  svgRotate: {
    transform: [{ rotate: '-90deg' }],
  },
  centerLabel: {
    position: 'absolute',
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
  animatedInputReset: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
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
