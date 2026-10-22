import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

import {
  useReportData,
  MonthlyReportMetrics,
  CategoryOutflowItem,
  MonthBarItem,
  DaySpendingItem,
  ReportInsight,
  getNiceScale,
  buildMonotoneCubicPath,
  NiceScale,
  formatIndianCurrencyWorklet,
} from '../../src/lib/reportData';
import { DonutChart } from '../../src/components/DonutChart';
import { AppHeader } from '../../src/components/AppHeader';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrendingUpIcon,
  NorthEastIcon,
  SouthEastIcon,
  SparklesIcon,
  LightbulbIcon,
  CheckCircleIcon,
  CategoryIcon,
  ShareIcon,
  TuneIcon,
} from '../../src/components/Icons';
import { theme } from '../../src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - theme.spacing.margin * 2;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// -----------------------------------------------------------------------------
// 1. Grouped 6-Month Bar Chart Component (Kept mounted, updates props)
// -----------------------------------------------------------------------------
interface SixMonthBarChartProps {
  data: MonthBarItem[];
  onSelectMonth: (year: number, month: number) => void;
  growth: SharedValue<number>;
}

const SixMonthBarChart = memo(function SixMonthBarChart({
  data,
  onSelectMonth,
  growth,
}: SixMonthBarChartProps) {
  const chartHeight = 160;
  const chartWidth = 320;
  const barWidth = 14;
  const maxBarHeight = 110;
  const clusterWidth = 52;
  const startX = 10;

  // Compute maximum value for scaling using nice scale
  const maxVal = useMemo(() => {
    let m = 0;
    data.forEach((d) => {
      if (d.income > m) m = d.income;
      if (d.expenses > m) m = d.expenses;
    });
    return m > 0 ? getNiceScale(m).yMax : 1000;
  }, [data]);

  const formatGridVal = (v: number) => {
    if (v >= 100000) return `₹${(v / 1000).toFixed(0)}k`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
    return `₹${v}`;
  };

  const gridLevels = [
    { y: 20, val: maxVal },
    { y: 65, val: Math.round(maxVal * 0.6) },
    { y: 110, val: Math.round(maxVal * 0.25) },
  ];

  const animatedBarsStyle = useAnimatedStyle(() => ({
    opacity: growth.value,
    transform: [
      { scaleY: 0.3 + 0.7 * growth.value },
      { translateY: 6 * (1 - growth.value) },
    ],
  }));

  return (
    <Animated.View style={[styles.chartContainer, animatedBarsStyle]}>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Horizontal Reference Gridlines */}
        {gridLevels.map((lvl, idx) => (
          <G key={`grid-${idx}`}>
            <Line
              x1="0"
              y1={lvl.y}
              x2={chartWidth}
              y2={lvl.y}
              stroke="#E5E5EA"
              strokeDasharray="3, 3"
              strokeWidth="1"
            />
            <SvgText
              x={chartWidth}
              y={lvl.y - 4}
              fill="#8E8E93"
              fontSize="9"
              fontWeight="500"
              fontFamily="Inter"
              textAnchor="end"
            >
              {formatGridVal(lvl.val)}
            </SvgText>
          </G>
        ))}

        {/* 6 Month Clusters */}
        {data.map((item, idx) => {
          const clusterX = startX + idx * clusterWidth;
          const incomeHeight = maxVal > 0 ? Math.max(4, Math.round((item.income / maxVal) * maxBarHeight)) : 4;
          const expenseHeight = maxVal > 0 ? Math.max(4, Math.round((item.expenses / maxVal) * maxBarHeight)) : 4;

          const incomeY = 135 - incomeHeight;
          const expenseY = 135 - expenseHeight;

          return (
            <G
              key={`${item.year}-${item.month}`}
              transform={`translate(${clusterX}, 0)`}
              onPress={() => onSelectMonth(item.year, item.month)}
            >
              {/* Active Month Focus Aura */}
              {item.isCurrent && (
                <Rect
                  x="-4"
                  y="10"
                  width={barWidth * 2 + 10}
                  height="138"
                  rx="10"
                  fill={theme.colors.primaryDark}
                  fillOpacity="0.08"
                />
              )}

              {/* Income Bar */}
              <Rect
                x="0"
                y={incomeY}
                width={barWidth}
                height={incomeHeight}
                rx="4"
                fill={theme.colors.emerald}
                fillOpacity={item.isCurrent ? 1 : 0.85}
              />

              {/* Expense Bar */}
              <Rect
                x={barWidth + 2}
                y={expenseY}
                width={barWidth}
                height={expenseHeight}
                rx="4"
                fill={item.isCurrent ? theme.colors.primaryDark : theme.colors.primaryContainer}
                fillOpacity={item.isCurrent ? 1 : 0.8}
              />

              {/* Month Label Badge */}
              {item.isCurrent ? (
                <>
                  <Rect
                    x="2"
                    y="142"
                    width={barWidth * 2 + 2}
                    height="16"
                    rx="8"
                    fill={theme.colors.primaryDark}
                  />
                  <SvgText
                    x={barWidth + 3}
                    y="154"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="Inter"
                    textAnchor="middle"
                  >
                    {item.monthShort}
                  </SvgText>
                </>
              ) : (
                <SvgText
                  x={barWidth + 3}
                  y="154"
                  fill={theme.colors.secondary}
                  fontSize="10"
                  fontWeight="500"
                  fontFamily="Inter"
                  textAnchor="middle"
                >
                  {item.monthShort}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </Animated.View>
  );
});

// (Old CategoryDonutChart replaced with shared DonutChart component)

// -----------------------------------------------------------------------------
// 3. Category Inset List Row Component (Memoized)
// -----------------------------------------------------------------------------
const CategoryReportRow = memo(function CategoryReportRow({
  item,
}: {
  item: CategoryOutflowItem;
}) {
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(Math.max(2, Math.min(100, item.percentage)), {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [item.percentage]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  return (
    <View style={styles.catRowContainer}>
      <View style={styles.catRowHeader}>
        <View style={styles.catRowLeft}>
          <View style={[styles.catIconBox, { backgroundColor: item.color + '18' }]}>
            <CategoryIcon name={item.name} color={item.color} size={18} />
          </View>
          <View>
            <Text style={styles.catNameText} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.catShareText}>{item.percentage}% of outflow</Text>
          </View>
        </View>
        <Text style={styles.catAmountText}>₹{item.amount.toLocaleString('en-IN')}</Text>
      </View>

      {/* Thin Rounded Progress Bar */}
      <View style={styles.catProgressTrack}>
        <Animated.View
          style={[
            styles.catProgressFill,
            {
              backgroundColor: item.color,
            },
            animatedBarStyle,
          ]}
        />
      </View>
    </View>
  );
});

// -----------------------------------------------------------------------------
// 4. Daily Spending Area Curve & Sparse Bar Chart Component
// -----------------------------------------------------------------------------
interface DailySpendingChartProps {
  days: DaySpendingItem[];
  peakDay: MonthlyReportMetrics['peakDay'];
  selectedDate: Date;
  drawProgress: SharedValue<number>;
  reduceMotion: boolean;
}

const DailySpendingChart = memo(function DailySpendingChart({
  days,
  peakDay,
  selectedDate,
  drawProgress,
  reduceMotion,
}: DailySpendingChartProps) {
  const [mode, setMode] = useState<'daily' | 'cumulative'>('daily');

  const chartWidth = 320;
  const chartHeight = 136;
  const topY = 24;
  const baselineY = 114;
  const midY = (topY + baselineY) / 2; // 69
  const plotHeight = baselineY - topY; // 90
  const leftX = 36;
  const rightX = 312;
  const plotWidth = rightX - leftX; // 276

  // Detect current month vs past month
  const now = new Date();
  const isCurrentMonth =
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth();
  const today = now.getDate();

  const daysInMonth = useMemo(() => {
    return days.length > 0
      ? days.length
      : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  }, [days.length, selectedDate]);

  // For current month, plot only days up to today. Future days are not drawn as zeros.
  const plottedDays = useMemo(() => {
    return isCurrentMonth ? days.filter((d) => d.day <= today) : days;
  }, [days, isCurrentMonth, today]);

  // Daily Mode calculations
  const spendingDays = useMemo(() => {
    return plottedDays.filter((d) => d.amount > 0);
  }, [plottedDays]);

  const maxDaily = useMemo(() => {
    let m = 0;
    plottedDays.forEach((d) => {
      if (d.amount > m) m = d.amount;
    });
    return m;
  }, [plottedDays]);

  // Cumulative Mode calculations
  const cumData = useMemo(() => {
    let running = 0;
    const items = plottedDays.map((d) => {
      running += d.amount;
      return { day: d.day, amount: running, dateStr: d.dateStr };
    });
    return { items, total: running };
  }, [plottedDays]);

  // Scaling with NO fixed minimum floor
  const activeMax = mode === 'daily' ? maxDaily : cumData.total;
  const niceScale = useMemo(() => {
    return getNiceScale(activeMax);
  }, [activeMax]);

  const yMax = niceScale.yMax;

  // Day to X helper
  const getX = useCallback(
    (day: number) => {
      if (daysInMonth <= 1) return (leftX + rightX) / 2;
      return leftX + ((day - 1) / (daysInMonth - 1)) * plotWidth;
    },
    [daysInMonth, leftX, rightX, plotWidth]
  );

  // Path, Area & Marker calculation
  const { pathD, areaD, markerInfo, isSparseBars } = useMemo(() => {
    if (activeMax === 0 || plottedDays.length === 0) {
      return { pathD: '', areaD: '', markerInfo: null, isSparseBars: false };
    }

    if (mode === 'daily') {
      // Sparse rule: fewer than 4 days have spending -> draw rounded bars instead of spline
      if (spendingDays.length < 4) {
        let marker = null;
        if (peakDay && peakDay.amount > 0) {
          const cx = getX(peakDay.day);
          const barH = yMax > 0 ? (peakDay.amount / yMax) * plotHeight : 0;
          const cy = baselineY - barH;
          marker = {
            x: cx,
            y: cy,
            amount: peakDay.amount,
            label: `₹${peakDay.amount.toLocaleString('en-IN')}`,
          };
        }
        return { pathD: '', areaD: '', markerInfo: marker, isSparseBars: true };
      }

      // Spline mode (>= 4 spending days)
      const points = plottedDays.map((d) => {
        const x = getX(d.day);
        const normH = yMax > 0 ? (d.amount / yMax) * plotHeight : 0;
        const y = Math.min(baselineY, Math.max(topY, baselineY - normH));
        return { x, y, day: d.day, amount: d.amount };
      });

      const pD = buildMonotoneCubicPath(points);
      const aD = `${pD} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

      let marker = null;
      if (peakDay && peakDay.amount > 0) {
        const peakIdx = plottedDays.findIndex((d) => d.day === peakDay.day);
        if (peakIdx >= 0 && points[peakIdx]) {
          marker = {
            x: points[peakIdx].x,
            y: points[peakIdx].y,
            amount: peakDay.amount,
            label: `₹${peakDay.amount.toLocaleString('en-IN')}`,
          };
        }
      }

      return { pathD: pD, areaD: aD, markerInfo: marker, isSparseBars: false };
    } else {
      // Cumulative mode: draw running total line
      const points = cumData.items.map((d) => {
        const x = getX(d.day);
        const normH = yMax > 0 ? (d.amount / yMax) * plotHeight : 0;
        const y = Math.min(baselineY, Math.max(topY, baselineY - normH));
        return { x, y, day: d.day, amount: d.amount };
      });

      const pD = buildMonotoneCubicPath(points);
      const aD = `${pD} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

      const lastPoint = points[points.length - 1];
      const marker = lastPoint
        ? {
            x: lastPoint.x,
            y: lastPoint.y,
            amount: cumData.total,
            label: `₹${cumData.total.toLocaleString('en-IN')}`,
          }
        : null;

      return { pathD: pD, areaD: aD, markerInfo: marker, isSparseBars: false };
    }
  }, [
    activeMax,
    plottedDays,
    mode,
    spendingDays,
    cumData,
    peakDay,
    yMax,
    plotHeight,
    baselineY,
    topY,
    getX,
  ]);

  // X-axis intervals
  const xAxisTicks = useMemo(() => {
    const raw = [1, 8, 15, 22, daysInMonth];
    return Array.from(new Set(raw)).sort((a, b) => a - b);
  }, [daysInMonth]);

  // Animated area draw style
  const animatedDrawStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { width: '100%' };
    }
    const pct = Math.min(1, Math.max(0, drawProgress.value));
    return {
      width: `${pct * 100}%`,
    };
  });

  return (
    <View style={styles.dailyChartWrapper}>
      {/* Card Header with Segmented Control */}
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.cardTitle}>
            {mode === 'daily' ? 'Daily spending' : 'Cumulative spending'}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {mode === 'daily'
              ? peakDay
                ? `Peak on ${peakDay.dateStr} • ${peakDay.note || 'Highest Outflow'}`
                : 'Daily Cash Outflow'
              : `₹${cumData.total.toLocaleString('en-IN')} total MTD`}
          </Text>
        </View>

        {/* Small Segmented Control "Daily | Cumulative" */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'daily' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setMode('daily');
            }}
            activeOpacity={0.7}
            accessibilityLabel="Daily view"
          >
            <Text style={[styles.segmentText, mode === 'daily' && styles.segmentTextActive]}>
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'cumulative' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setMode('cumulative');
            }}
            activeOpacity={0.7}
            accessibilityLabel="Cumulative view"
          >
            <Text style={[styles.segmentText, mode === 'cumulative' && styles.segmentTextActive]}>
              Cumulative
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SVG Container: Gridlines + Baseline (Always visible) */}
      <View style={styles.dailySvgContainer}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <SvgLinearGradient id="pinkGradientArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.colors.primaryDark} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={theme.colors.primaryDark} stopOpacity="0.0" />
            </SvgLinearGradient>
          </Defs>

          {/* Gridlines and Nice Ticks */}
          {activeMax > 0 ? (
            <>
              {/* Top Gridline */}
              <Line
                x1={leftX}
                y1={topY}
                x2={rightX}
                y2={topY}
                stroke="#E5E5EA"
                strokeDasharray="3, 3"
                strokeWidth="1"
              />
              <SvgText
                x={leftX - 6}
                y={topY + 3}
                fill="#8E8E93"
                fontSize="9"
                fontWeight="500"
                fontFamily="Inter"
                textAnchor="end"
              >
                {niceScale.formattedTicks[2]}
              </SvgText>

              {/* Mid Gridline */}
              <Line
                x1={leftX}
                y1={midY}
                x2={rightX}
                y2={midY}
                stroke="#E5E5EA"
                strokeDasharray="3, 3"
                strokeWidth="1"
              />
              <SvgText
                x={leftX - 6}
                y={midY + 3}
                fill="#8E8E93"
                fontSize="9"
                fontWeight="500"
                fontFamily="Inter"
                textAnchor="end"
              >
                {niceScale.formattedTicks[1]}
              </SvgText>
            </>
          ) : null}

          {/* Baseline Gridline */}
          <Line
            x1={leftX}
            y1={baselineY}
            x2={rightX}
            y2={baselineY}
            stroke="#E5E5EA"
            strokeWidth="1"
          />
          <SvgText
            x={leftX - 6}
            y={baselineY + 3}
            fill="#8E8E93"
            fontSize="9"
            fontWeight="500"
            fontFamily="Inter"
            textAnchor="end"
          >
            {niceScale.formattedTicks[0] || '₹0'}
          </SvgText>

          {/* Empty Month / Zero Spending Label */}
          {activeMax === 0 && (
            <SvgText
              x={(leftX + rightX) / 2}
              y={midY + 4}
              fill="#8E8E93"
              fontSize="12"
              fontWeight="500"
              fontFamily="Inter"
              textAnchor="middle"
            >
              No spending yet
            </SvgText>
          )}
        </Svg>

        {/* Animated Drawing Overlay: Curve, Area, Bars, Peak Marker */}
        {activeMax > 0 && (
          <Animated.View style={[styles.dailyDrawOverlay, animatedDrawStyle]}>
            <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              <Defs>
                <SvgLinearGradient id="pinkGradientAreaOverlay" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={theme.colors.primaryDark} stopOpacity="0.25" />
                  <Stop offset="100%" stopColor={theme.colors.primaryDark} stopOpacity="0.0" />
                </SvgLinearGradient>
              </Defs>

              {/* Area & Spline if not sparse bars */}
              {!isSparseBars && (
                <>
                  {areaD ? <Path d={areaD} fill="url(#pinkGradientAreaOverlay)" /> : null}
                  {pathD ? (
                    <Path
                      d={pathD}
                      fill="none"
                      stroke={theme.colors.primaryDark}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  ) : null}
                </>
              )}

              {/* Sparse Rounded Bars (fewer than 4 spending days) */}
              {isSparseBars &&
                spendingDays.map((d) => {
                  const cx = getX(d.day);
                  const barW = 16;
                  const barH = yMax > 0 ? (d.amount / yMax) * plotHeight : 0;
                  const barY = baselineY - barH;
                  return (
                    <Rect
                      key={`sparse-bar-${d.day}`}
                      x={cx - barW / 2}
                      y={barY}
                      width={barW}
                      height={barH}
                      rx={6}
                      fill={theme.colors.primaryDark}
                    />
                  );
                })}

              {/* Peak Day / Latest Marker Pin & Callout */}
              {markerInfo && (
                <G>
                  {/* Pin Dot */}
                  <Circle
                    cx={markerInfo.x}
                    cy={markerInfo.y}
                    r="5"
                    fill="#FFFFFF"
                    stroke={theme.colors.primaryDark}
                    strokeWidth="2.5"
                  />
                  <Circle cx={markerInfo.x} cy={markerInfo.y} r="2" fill={theme.colors.primaryDark} />

                  {/* Floating Tag */}
                  {(() => {
                    const tagW = 64;
                    const tagH = 18;
                    const tagX = Math.max(leftX + tagW / 2, Math.min(rightX - tagW / 2, markerInfo.x));
                    const tagY = Math.max(2, markerInfo.y - 24);

                    return (
                      <G>
                        <Rect
                          x={tagX - tagW / 2}
                          y={tagY}
                          width={tagW}
                          height={tagH}
                          rx={9}
                          fill={theme.colors.onSurface}
                        />
                        <SvgText
                          x={tagX}
                          y={tagY + 12}
                          fill="#FFFFFF"
                          fontSize="9"
                          fontWeight="700"
                          fontFamily="Inter"
                          textAnchor="middle"
                        >
                          {markerInfo.label}
                        </SvgText>
                      </G>
                    );
                  })()}
                </G>
              )}
            </Svg>
          </Animated.View>
        )}
      </View>

      {/* X-Axis Date Intervals */}
      <View style={[styles.dailyLabelsRow, { paddingLeft: leftX - 4, paddingRight: chartWidth - rightX - 4 }]}>
        {xAxisTicks.map((tickDay) => {
          const isFuture = isCurrentMonth && tickDay > today;
          const isPeak = mode === 'daily' && peakDay && peakDay.day === tickDay;
          return (
            <Text
              key={`xaxis-day-${tickDay}`}
              style={[
                styles.dailyLabelText,
                isFuture && styles.dailyLabelFuture,
                isPeak && styles.peakLabelHighlight,
              ]}
            >
              {isPeak ? `Peak: Day ${tickDay}` : `Day ${tickDay}`}
            </Text>
          );
        })}
      </View>
    </View>
  );
});

// -----------------------------------------------------------------------------
// 5. Smart Insights Card Component
// -----------------------------------------------------------------------------
const InsightsSection = memo(function InsightsSection({
  insights,
}: {
  insights: ReportInsight[];
}) {
  return (
    <View style={styles.card}>
      <View style={styles.insightsHeader}>
        <View style={styles.insightsIconBox}>
          <SparklesIcon size={16} color={theme.colors.amber} />
        </View>
        <Text style={styles.cardTitle}>Putu Insights</Text>
      </View>

      <View style={styles.insightsList}>
        {insights.length > 0 ? (
          insights.map((item) => (
            <View key={item.id} style={styles.insightItem}>
              <View style={styles.insightIconWrap}>
                {item.icon === 'lightbulb' ? (
                  <LightbulbIcon size={18} color={theme.colors.amber} />
                ) : item.icon === 'trending_up' ? (
                  <TrendingUpIcon size={18} color={theme.colors.primaryDark} />
                ) : (
                  <CheckCircleIcon size={18} color={theme.colors.emeraldDark} />
                )}
              </View>
              <View style={styles.insightTextCol}>
                <Text style={styles.insightTitle}>{item.title}</Text>
                <Text style={styles.insightDesc}>{item.description}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.insightItem}>
            <View style={styles.insightIconWrap}>
              <CheckCircleIcon size={18} color={theme.colors.emeraldDark} />
            </View>
            <View style={styles.insightTextCol}>
              <Text style={styles.insightTitle}>All clear</Text>
              <Text style={styles.insightDesc}>
                Add transactions to generate smart spending insights and month-over-month comparisons.
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

// -----------------------------------------------------------------------------
// 6. Loading Skeleton Screen Component
// -----------------------------------------------------------------------------
function ReportSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonMonthBar} />
      <View style={styles.skeletonHeroCard} />
      <View style={styles.skeletonDualRow}>
        <View style={styles.skeletonHalfCard} />
        <View style={styles.skeletonHalfCard} />
      </View>
      <View style={styles.skeletonLargeCard} />
      <View style={styles.skeletonLargeCard} />
    </View>
  );
}

// -----------------------------------------------------------------------------
// 7. Main Report Tab Screen
// -----------------------------------------------------------------------------
export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State: Currently viewed month
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // React Query Report hook
  const { metrics, isLoading, isError, refetch } = useReportData(selectedDate);

  // Accessibility reduce motion state
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      sub.remove();
    };
  }, []);

  // Shared values for the 7 staggered sections:
  // 0: Month pill, 1: Hero card, 2: Dual cards, 3: 6-month chart, 4: Category card, 5: Daily chart, 6: Insights
  const s0 = useSharedValue(0);
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);
  const s3 = useSharedValue(0);
  const s4 = useSharedValue(0);
  const s5 = useSharedValue(0);
  const s6 = useSharedValue(0);

  // Chart growth shared values
  const barGrowth = useSharedValue(0);
  const drawProgress = useSharedValue(0);

  // Animated Count-Up Shared Value: driven from ONE shared progress value with Easing.bezier(0.16, 1, 0.3, 1)
  const countUpProgress = useSharedValue(0);

  // Cross-fade opacity on month switch
  const crossFadeOpacity = useSharedValue(1);

  // Staggered entrance worklet (70ms stagger, ~450ms each with spring)
  const runEntrance = useCallback(() => {
    // Reset section entrance values
    s0.value = 0;
    s1.value = 0;
    s2.value = 0;
    s3.value = 0;
    s4.value = 0;
    s5.value = 0;
    s6.value = 0;

    // Reset hero count-up progress
    countUpProgress.value = 0;

    // Reset chart growth values
    barGrowth.value = 0;
    drawProgress.value = 0;

    const sections = [s0, s1, s2, s3, s4, s5, s6];
    sections.forEach((s, idx) => {
      if (reduceMotion) {
        s.value = withDelay(
          idx * 70,
          withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) })
        );
      } else {
        s.value = withDelay(
          idx * 70,
          withSpring(1, { damping: 18, stiffness: 140 })
        );
      }
    });

    // Hero count-up starts with the entrance driven by ONE shared progress value
    if (reduceMotion) {
      countUpProgress.value = 1;
    } else {
      countUpProgress.value = withDelay(
        70,
        withTiming(1, { duration: 1100, easing: Easing.bezier(0.16, 1, 0.3, 1) })
      );
    }

    // Chart growth start with entrance (bars and area draw)
    if (reduceMotion) {
      barGrowth.value = 1;
      drawProgress.value = 1;
    } else {
      barGrowth.value = withDelay(
        210,
        withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) })
      );
      drawProgress.value = withDelay(
        350,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [
    reduceMotion,
    s0, s1, s2, s3, s4, s5, s6,
    countUpProgress,
    barGrowth, drawProgress,
  ]);

  // Replay entrance on every focus using useFocusEffect
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        runEntrance();
      }
    }, [isLoading, runEntrance])
  );

  // Trigger entrance when metrics update or finish loading
  useEffect(() => {
    if (!isLoading) {
      runEntrance();
    }
  }, [isLoading, metrics.year, metrics.month, metrics.totalExpenses, metrics.totalIncome]);

  const animatedSavingsProps = useAnimatedProps(() => {
    'worklet';
    const val = Math.round(metrics.netSavings * countUpProgress.value);
    const formatted = formatIndianCurrencyWorklet(val, '₹');
    return {
      text: formatted,
      defaultValue: formatted,
    } as any;
  });

  const animatedIncomeProps = useAnimatedProps(() => {
    'worklet';
    const val = Math.round(metrics.totalIncome * countUpProgress.value);
    const formatted = formatIndianCurrencyWorklet(val, '+₹');
    return {
      text: formatted,
      defaultValue: formatted,
    } as any;
  });

  const animatedExpenseProps = useAnimatedProps(() => {
    'worklet';
    const val = Math.round(metrics.totalExpenses * countUpProgress.value);
    const formatted = formatIndianCurrencyWorklet(val, '-₹');
    return {
      text: formatted,
      defaultValue: formatted,
    } as any;
  });

  // Animated styles for 7 staggered sections
  const animStyle0 = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, s0.value)),
    transform: [{ translateY: reduceMotion ? 0 : (1 - Math.min(1, s0.value)) * 16 }],
  }));
  const animStyle1 = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, s1.value)),
    transform: [{ translateY: reduceMotion ? 0 : (1 - Math.min(1, s1.value)) * 16 }],
  }));
  const animStyle2 = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, s2.value)),
    transform: [{ translateY: reduceMotion ? 0 : (1 - Math.min(1, s2.value)) * 16 }],
  }));
  const animStyle3 = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, s3.value)),
    transform: [{ translateY: reduceMotion ? 0 : (1 - Math.min(1, s3.value)) * 16 }],
  }));
  const animStyle4 = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, s4.value)),
    transform: [{ translateY: reduceMotion ? 0 : (1 - Math.min(1, s4.value)) * 16 }],
  }));
  const animStyle5 = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, s5.value)),
    transform: [{ translateY: reduceMotion ? 0 : (1 - Math.min(1, s5.value)) * 16 }],
  }));
  const animStyle6 = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, s6.value)),
    transform: [{ translateY: reduceMotion ? 0 : (1 - Math.min(1, s6.value)) * 16 }],
  }));

  const animatedCrossFadeStyle = useAnimatedStyle(() => ({
    opacity: crossFadeOpacity.value,
  }));

  // Trigger smooth cross-fade animation when switching months
  const triggerMonthTransition = useCallback(() => {
    crossFadeOpacity.value = 0.35;
    crossFadeOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    runEntrance();
  }, [crossFadeOpacity, runEntrance]);

  // Previous Month Handler
  const goToPrevMonth = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    triggerMonthTransition();
  }, [triggerMonthTransition]);

  // Next Month Handler (guards against future dates)
  const isCurrentRealMonth = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth()
    );
  }, [selectedDate]);

  const goToNextMonth = useCallback(() => {
    if (isCurrentRealMonth) return;
    Haptics.selectionAsync();
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    triggerMonthTransition();
  }, [isCurrentRealMonth, triggerMonthTransition]);

  // Direct select from 6-month bar chart
  const handleSelectBarMonth = useCallback(
    (year: number, month: number) => {
      if (year === selectedDate.getFullYear() && month === selectedDate.getMonth()) {
        return;
      }
      Haptics.selectionAsync();
      setSelectedDate(new Date(year, month, 1));
      triggerMonthTransition();
    },
    [selectedDate, triggerMonthTransition]
  );

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <View style={styles.root}>
      {/* Universal Inset AppHeader */}
      <AppHeader variant="tab" title="Report" />

      {/* 0. Month Selector Pill (Section 0) */}
      <Animated.View style={animStyle0}>
        <View style={styles.monthSelectorPill}>
          <TouchableOpacity
            style={styles.chevronBtn}
            onPress={goToPrevMonth}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Previous month"
          >
            <ChevronLeftIcon size={18} color={theme.colors.secondary} />
          </TouchableOpacity>

          <View style={styles.monthCenterRow}>
            <CalendarIcon size={16} color={theme.colors.primaryDark} />
            <Text style={styles.monthLabelText}>{metrics.label}</Text>
          </View>

          <TouchableOpacity
            style={[styles.chevronBtn, isCurrentRealMonth && styles.chevronDisabled]}
            onPress={goToNextMonth}
            disabled={isCurrentRealMonth}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Next month"
          >
            <ChevronRightIcon
              size={18}
              color={isCurrentRealMonth ? theme.colors.outlineVariant : theme.colors.secondary}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Vertical Scroll Area without pan conflict (Android system back works normally) */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ReportSkeleton />
        ) : isError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load report</Text>
            <Text style={styles.errorSubtitle}>
              Please check your network connection and try again.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[styles.mainContent, animatedCrossFadeStyle]}>
            {/* 1. Hero Net Savings Card (Section 1) */}
            <Animated.View style={animStyle1}>
              <View style={styles.heroCard}>
                <View style={styles.heroAmbientAura} />

                <View style={styles.heroTopRow}>
                  <View>
                    <Text style={styles.heroLabel}>Net Savings</Text>
                    <AnimatedTextInput
                      underlineColorAndroid="transparent"
                      editable={false}
                      style={[
                        styles.heroSavingsNumber,
                        metrics.netSavings < 0 && styles.heroSavingsNegative,
                      ]}
                      animatedProps={animatedSavingsProps}
                    />
                  </View>

                  {metrics.savingsDeltaPct !== null && (
                    <View
                      style={[
                        styles.heroDeltaBadge,
                        metrics.savingsDeltaPct >= 0
                          ? styles.heroDeltaBadgePositive
                          : styles.heroDeltaBadgeNegative,
                      ]}
                    >
                      <TrendingUpIcon
                        size={14}
                        color={
                          metrics.savingsDeltaPct >= 0
                            ? theme.colors.emeraldDark
                            : theme.colors.error
                        }
                      />
                      <Text
                        style={[
                          styles.heroDeltaText,
                          metrics.savingsDeltaPct >= 0
                            ? styles.heroDeltaTextPositive
                            : styles.heroDeltaTextNegative,
                        ]}
                      >
                        {metrics.savingsDeltaPct >= 0 ? '+' : ''}
                        {metrics.savingsDeltaPct.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>

                {/* Retained Income Progress Bar */}
                <View style={styles.retainedSection}>
                  <View style={styles.retainedRow}>
                    <Text style={styles.retainedLabel}>
                      {metrics.retainedPercentage}% of income retained
                    </Text>
                    <Text style={styles.targetLabel}>Target: 30%</Text>
                  </View>

                  <View style={styles.retainedTrack}>
                    <LinearGradient
                      colors={
                        metrics.netSavings < 0
                          ? [theme.colors.error, theme.colors.rose]
                          : [theme.colors.emerald, theme.colors.primaryDark, theme.colors.primaryContainer]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.retainedFill,
                        {
                          width: `${Math.max(2, Math.min(100, metrics.retainedPercentage))}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* 2. Income & Expense Dual Cards (Section 2) */}
            <Animated.View style={animStyle2}>
              <View style={styles.dualGrid}>
                {/* Income Card */}
                <View style={styles.halfCard}>
                  <View style={styles.halfCardHeader}>
                    <View style={styles.incomeIconCircle}>
                      <NorthEastIcon size={18} color={theme.colors.emeraldDark} />
                    </View>
                    {metrics.incomeDeltaPct !== null && (
                      <View style={styles.miniDeltaBadgeGreen}>
                        <Text style={styles.miniDeltaTextGreen}>
                          {metrics.incomeDeltaPct >= 0 ? '+' : ''}
                          {metrics.incomeDeltaPct.toFixed(0)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.halfCardBody}>
                    <Text style={styles.halfCardLabel}>Income</Text>
                    <AnimatedTextInput
                      underlineColorAndroid="transparent"
                      editable={false}
                      style={styles.halfCardAmount}
                      animatedProps={animatedIncomeProps}
                    />
                    <Text style={styles.halfCardSubtitle}>
                      {metrics.prevMonthIncome > 0
                        ? `vs ₹${(metrics.prevMonthIncome / 1000).toFixed(0)}k last mo`
                        : 'Total Inflow'}
                    </Text>
                  </View>
                </View>

                {/* Expenses Card */}
                <View style={styles.halfCard}>
                  <View style={styles.halfCardHeader}>
                    <View style={styles.expenseIconCircle}>
                      <SouthEastIcon size={18} color={theme.colors.primaryDark} />
                    </View>
                    <View style={styles.miniDeltaBadgeNeutral}>
                      <Text style={styles.miniDeltaTextNeutral}>
                        {metrics.expenseDiffVsLastMonth <= 0 ? 'Safe' : 'High'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.halfCardBody}>
                    <Text style={styles.halfCardLabel}>Expenses</Text>
                    <AnimatedTextInput
                      underlineColorAndroid="transparent"
                      editable={false}
                      style={styles.halfCardAmount}
                      animatedProps={animatedExpenseProps}
                    />
                    <Text style={styles.halfCardSubtitle}>
                      {metrics.expenseDiffVsLastMonth !== 0
                        ? `${metrics.expenseDiffVsLastMonth < 0 ? '-' : '+'}₹${Math.abs(Math.round(metrics.expenseDiffVsLastMonth)).toLocaleString('en-IN')} vs last mo`
                        : 'Total Outflow'}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* 3. Last 6 Months Grouped Bar Chart (Section 3 - Kept Mounted) */}
            <Animated.View style={animStyle3}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardTitle}>Last 6 Months</Text>
                    <Text style={styles.cardSubtitle}>Income vs Outflow trends</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={styles.legendDotGreen} />
                      <Text style={styles.legendText}>In</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={styles.legendDotPink} />
                      <Text style={styles.legendText}>Out</Text>
                    </View>
                  </View>
                </View>

                <SixMonthBarChart
                  data={metrics.sixMonthTrend}
                  onSelectMonth={handleSelectBarMonth}
                  growth={barGrowth}
                />
              </View>
            </Animated.View>

            {/* 4. Category Breakdown & Donut Chart (Section 4 - Kept Mounted) */}
            <Animated.View style={animStyle4}>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardTitle}>Where your money went</Text>
                    <Text style={styles.cardSubtitle}>
                      {metrics.categoryBreakdown.length}{' '}
                      {metrics.categoryBreakdown.length === 1 ? 'category' : 'categories'}
                    </Text>
                  </View>
                  <Text style={styles.cardHeaderAmount}>
                    ₹{metrics.totalExpenses.toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Donut Graphic */}
                <DonutChart
                  data={metrics.categoryBreakdown}
                  totalAmount={metrics.totalExpenses}
                  size={160}
                  strokeWidth={18}
                  showLegend={false}
                  centerSubtitle="Largest"
                  centerTitle={metrics.categoryBreakdown[0]?.name || 'None'}
                  centerTitleValue={
                    metrics.categoryBreakdown[0]
                      ? `${metrics.categoryBreakdown[0].percentage}%`
                      : '0%'
                  }
                />

                {/* Sorted Category Inset List or Empty Note */}
                {metrics.categoryBreakdown.length > 0 ? (
                  <View style={styles.categoryList}>
                    {metrics.categoryBreakdown.map((item) => (
                      <CategoryReportRow key={item.categoryId} item={item} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyCardHint}>No expense categories recorded this month.</Text>
                )}
              </View>
            </Animated.View>

            {/* 5. Daily Spending Area Curve (Section 5 - Kept Mounted) */}
            <Animated.View style={animStyle5}>
              <View style={styles.card}>
                <DailySpendingChart
                  days={metrics.dailySpending}
                  peakDay={metrics.peakDay}
                  selectedDate={selectedDate}
                  drawProgress={drawProgress}
                  reduceMotion={reduceMotion}
                />
              </View>
            </Animated.View>

            {/* 6. Smart Insights Section (Section 6 - Kept Mounted) */}
            <Animated.View style={animStyle6}>
              <InsightsSection insights={metrics.insights} />
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.7,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  monthSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.margin,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerLowest,
    ...theme.shadows.card,
  },
  chevronBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronDisabled: {
    opacity: 0.35,
  },
  monthCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthLabelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    letterSpacing: -0.2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 4,
    gap: theme.spacing.md,
  },
  mainContent: {
    gap: theme.spacing.md,
  },

  // Hero Net Savings Card
  heroCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  heroAmbientAura: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.primaryFixedDim,
    opacity: 0.22,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroSavingsNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -1,
    marginTop: 2,
    padding: 0,
  },
  heroSavingsNegative: {
    color: theme.colors.error,
  },
  heroDeltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
  },
  heroDeltaBadgePositive: {
    backgroundColor: theme.colors.emeraldLight,
  },
  heroDeltaBadgeNegative: {
    backgroundColor: theme.colors.roseLight,
  },
  heroDeltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroDeltaTextPositive: {
    color: theme.colors.emeraldDark,
  },
  heroDeltaTextNegative: {
    color: theme.colors.error,
  },
  retainedSection: {
    marginTop: 18,
  },
  retainedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  retainedLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  targetLabel: {
    fontSize: 13,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  retainedTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  retainedFill: {
    height: '100%',
    borderRadius: 5,
  },

  // Dual Cards Grid
  dualGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  halfCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  halfCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.emeraldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDeltaBadgeGreen: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: theme.colors.emeraldLight,
  },
  miniDeltaTextGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.emeraldDark,
  },
  miniDeltaBadgeNeutral: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainer,
  },
  miniDeltaTextNeutral: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  halfCardBody: {
    marginTop: 10,
  },
  halfCardLabel: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  halfCardAmount: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  halfCardSubtitle: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginTop: 3,
  },

  // Generic Card
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  cardSubtitle: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  cardHeaderAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.emerald,
  },
  legendDotPink: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryDark,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.secondary,
  },
  chartContainer: {
    width: '100%',
    paddingTop: 8,
  },

  // Donut Chart
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  donutSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterSub: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
  },
  donutCenterTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
    maxWidth: 90,
    textAlign: 'center',
  },
  donutCenterPct: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  categoryList: {
    gap: 12,
    marginTop: 6,
  },
  catRowContainer: {
    gap: 6,
  },
  catRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  catShareText: {
    fontSize: 12,
    color: theme.colors.secondary,
  },
  catAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  catProgressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceContainer,
    overflow: 'hidden',
  },
  catProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Daily Spending Chart
  dailyChartWrapper: {
    paddingTop: 4,
  },
  dailySvgContainer: {
    position: 'relative',
    width: '100%',
    height: 136,
  },
  dailyDrawOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 136,
    overflow: 'hidden',
  },
  dailyLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  dailyLabelText: {
    fontSize: 11,
    color: theme.colors.secondary,
    fontFamily: 'Inter',
  },
  dailyLabelFuture: {
    color: theme.colors.outlineVariant,
  },
  peakLabelHighlight: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  emptyCardHint: {
    fontSize: 13,
    color: theme.colors.secondary,
    textAlign: 'center',
    paddingVertical: 14,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 2,
    alignItems: 'center',
  },
  segmentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    ...theme.shadows.card,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.secondary,
    fontFamily: 'Inter',
  },
  segmentTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },

  // Insights Section
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  insightsIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsList: {
    gap: 10,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  insightTextCol: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  insightDesc: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },

  // Empty State Card
  emptyMonthCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  emptyAddBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryDark,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },

  // Error Card
  errorCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.error,
  },
  errorSubtitle: {
    fontSize: 13,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryDark,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.white,
  },

  // Skeletons
  skeletonContainer: {
    gap: 16,
  },
  skeletonMonthBar: {
    height: 44,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  skeletonHeroCard: {
    height: 140,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  skeletonDualRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonHalfCard: {
    flex: 1,
    height: 105,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  skeletonLargeCard: {
    height: 220,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
});
