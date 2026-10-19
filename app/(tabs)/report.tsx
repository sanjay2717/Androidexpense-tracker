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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  Easing,
} from 'react-native-reanimated';

import {
  useReportData,
  MonthlyReportMetrics,
  CategoryOutflowItem,
  MonthBarItem,
  DaySpendingItem,
  ReportInsight,
} from '../../src/lib/reportData';
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
}

const SixMonthBarChart = memo(function SixMonthBarChart({
  data,
  onSelectMonth,
}: SixMonthBarChartProps) {
  const chartHeight = 160;
  const chartWidth = 320;
  const barWidth = 14;
  const maxBarHeight = 110;
  const clusterWidth = 52;
  const startX = 10;

  // Compute maximum value for scaling
  const maxVal = useMemo(() => {
    let m = 1000;
    data.forEach((d) => {
      if (d.income > m) m = d.income;
      if (d.expenses > m) m = d.expenses;
    });
    return Math.ceil(m / 1000) * 1000;
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

  return (
    <View style={styles.chartContainer}>
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
    </View>
  );
});

// -----------------------------------------------------------------------------
// 2. Category Donut Chart Component
// -----------------------------------------------------------------------------
interface CategoryDonutChartProps {
  categories: CategoryOutflowItem[];
  totalExpenses: number;
}

const CategoryDonutChart = memo(function CategoryDonutChart({
  categories,
  totalExpenses,
}: CategoryDonutChartProps) {
  const size = 160;
  const center = size / 2;
  const strokeWidth = 18;
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.42

  const topCategory = categories[0];

  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.15)) });
    opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
  }, [totalExpenses, categories.length]);

  const animatedDonutStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Precompute stroke dash offsets for each category slice
  const slices = useMemo(() => {
    if (totalExpenses <= 0 || categories.length === 0) {
      return [];
    }

    let accumulatedPct = 0;
    return categories.slice(0, 6).map((item) => {
      const sliceLength = (item.amount / totalExpenses) * circumference;
      const offset = -(accumulatedPct * circumference);
      accumulatedPct += item.amount / totalExpenses;
      return {
        ...item,
        dashArray: `${Math.max(2, sliceLength)} ${circumference}`,
        dashOffset: offset,
      };
    });
  }, [categories, totalExpenses, circumference]);

  return (
    <Animated.View style={[styles.donutWrapper, animatedDonutStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.donutSvg}>
        {/* Background track circle */}
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
            key={slice.categoryId}
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

      {/* Center Label */}
      <View style={styles.donutCenterLabel}>
        <Text style={styles.donutCenterSub}>Largest</Text>
        <Text style={styles.donutCenterTitle} numberOfLines={1}>
          {topCategory ? topCategory.name : 'None'}
        </Text>
        <Text style={styles.donutCenterPct}>
          {topCategory ? `${topCategory.percentage}%` : '0%'}
        </Text>
      </View>
    </Animated.View>
  );
});

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
// 4. Daily Spending Area Curve Component
// -----------------------------------------------------------------------------
interface DailySpendingChartProps {
  days: DaySpendingItem[];
  peakDay: MonthlyReportMetrics['peakDay'];
}

const DailySpendingChart = memo(function DailySpendingChart({
  days,
  peakDay,
}: DailySpendingChartProps) {
  const chartWidth = 320;
  const chartHeight = 120;
  const baselineY = 112;

  const maxDaily = useMemo(() => {
    let m = 0;
    days.forEach((d) => {
      if (d.amount > m) m = d.amount;
    });
    // Dynamically scale curve so the peak day in the month reaches ~80% of chart height.
    // Adds 25% breathing room above the peak so floating badge tag never clips.
    return m > 0 ? m * 1.25 : 100;
  }, [days]);

  // Construct smooth SVG path coordinates
  const { pathD, areaD, peakCoords } = useMemo(() => {
    if (days.length === 0) {
      return { pathD: '', areaD: '', peakCoords: null };
    }

    const stepX = chartWidth / Math.max(1, days.length - 1);
    const points = days.map((d, i) => {
      const x = i * stepX;
      const normalizedHeight = maxDaily > 0 ? (d.amount / maxDaily) * 82 : 0;
      const y = Math.min(baselineY, Math.max(18, baselineY - normalizedHeight));
      return { x, y, day: d.day, amount: d.amount };
    });

    // Build Catmull-Rom or cubic Bezier path
    let p = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      let cp1x = p1.x + (p2.x - p0.x) / 6;
      let cp1y = p1.y + (p2.y - p0.y) / 6;
      let cp2x = p2.x - (p3.x - p1.x) / 6;
      let cp2y = p2.y - (p3.y - p1.y) / 6;

      // Prevent control points from dipping below baseline on zero days
      cp1y = Math.min(baselineY, Math.max(16, cp1y));
      cp2y = Math.min(baselineY, Math.max(16, cp2y));

      p += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const a = `${p} L ${chartWidth} ${baselineY} L 0 ${baselineY} Z`;

    let peak = null;
    if (peakDay && peakDay.amount > 0) {
      const peakIndex = days.findIndex((d) => d.day === peakDay.day);
      if (peakIndex >= 0 && points[peakIndex]) {
        peak = {
          x: points[peakIndex].x,
          y: points[peakIndex].y,
        };
      }
    }

    return { pathD: p, areaD: a, peakCoords: peak };
  }, [days, peakDay, maxDaily, baselineY, chartWidth]);

  return (
    <View style={styles.dailyChartWrapper}>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <Defs>
          <SvgLinearGradient id="pinkGradientArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.colors.primaryDark} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={theme.colors.primaryDark} stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>

        {/* Gradient Area Fill */}
        {areaD ? <Path d={areaD} fill="url(#pinkGradientArea)" /> : null}

        {/* Top Smooth Line */}
        {pathD ? (
          <Path
            d={pathD}
            fill="none"
            stroke={theme.colors.primaryDark}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : null}

        {/* Peak Day Marker Pin */}
        {peakCoords && (
          <G transform={`translate(${peakCoords.x}, ${peakCoords.y})`}>
            {/* Outer Ring */}
            <Circle cx="0" cy="0" r="5.5" fill="#FFFFFF" stroke={theme.colors.primaryDark} strokeWidth="2.5" />
            <Circle cx="0" cy="0" r="2.5" fill={theme.colors.primaryDark} />

            {/* Floating Tag */}
            <G transform="translate(0, -22)">
              <Rect
                x="-30"
                y="-10"
                width="60"
                height="18"
                rx="9"
                fill={theme.colors.onSurface}
              />
              <SvgText
                x="0"
                y="3"
                fill="#FFFFFF"
                fontSize="9"
                fontWeight="700"
                fontFamily="Inter"
                textAnchor="middle"
              >
                ₹{peakDay?.amount.toLocaleString('en-IN')}
              </SvgText>
            </G>
          </G>
        )}
      </Svg>

      {/* X-Axis Date Intervals */}
      <View style={styles.dailyLabelsRow}>
        <Text style={styles.dailyLabelText}>Day 1</Text>
        <Text style={styles.dailyLabelText}>Day 8</Text>
        <Text style={styles.dailyLabelText}>Day 15</Text>
        <Text style={[styles.dailyLabelText, styles.peakLabelHighlight]}>
          {peakDay ? `Peak: Day ${peakDay.day}` : 'Day 22'}
        </Text>
        <Text style={styles.dailyLabelText}>Day {days.length}</Text>
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
  if (insights.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.insightsHeader}>
        <View style={styles.insightsIconBox}>
          <SparklesIcon size={16} color={theme.colors.amber} />
        </View>
        <Text style={styles.cardTitle}>Putu Insights</Text>
      </View>

      <View style={styles.insightsList}>
        {insights.map((item) => (
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
        ))}
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

  // Reanimated values for smooth entrance and cross-fade on month change
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(12);

  // Animated Count-Up Shared Values
  const savingsProgress = useSharedValue(0);
  const incomeProgress = useSharedValue(0);
  const expenseProgress = useSharedValue(0);

  // Entrance and data update animations (UI thread)
  useEffect(() => {
    if (!isLoading) {
      contentOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
      contentTranslateY.value = withSpring(0, { damping: 20, stiffness: 180 });

      savingsProgress.value = withTiming(metrics.netSavings, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
      incomeProgress.value = withTiming(metrics.totalIncome, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
      expenseProgress.value = withTiming(metrics.totalExpenses, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isLoading, metrics.netSavings, metrics.totalIncome, metrics.totalExpenses]);

  const animatedSavingsProps = useAnimatedProps(() => {
    'worklet';
    const val = Math.round(savingsProgress.value);
    const sign = val < 0 ? '-' : '';
    const formatted = `${sign}₹${Math.abs(val).toLocaleString('en-IN')}`;
    return {
      text: formatted,
      defaultValue: formatted,
    } as any;
  });

  const animatedIncomeProps = useAnimatedProps(() => {
    'worklet';
    const val = Math.round(incomeProgress.value);
    const formatted = `+₹${Math.max(0, val).toLocaleString('en-IN')}`;
    return {
      text: formatted,
      defaultValue: formatted,
    } as any;
  });

  const animatedExpenseProps = useAnimatedProps(() => {
    'worklet';
    const val = Math.round(expenseProgress.value);
    const formatted = `-₹${Math.max(0, val).toLocaleString('en-IN')}`;
    return {
      text: formatted,
      defaultValue: formatted,
    } as any;
  });

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  // Trigger smooth cross-fade animation when switching months
  const triggerMonthTransition = useCallback(() => {
    contentOpacity.value = 0.3;
    contentTranslateY.value = 8;
    contentOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  }, []);

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
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Pinned Top Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCaption}>Analytics</Text>
          <Text style={styles.headerTitle}>Report</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleShare}
            activeOpacity={0.7}
            accessibilityLabel="Export report"
          >
            <ShareIcon size={18} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Selector Pill */}
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

      {/* Vertical Scroll Area without pan conflict */}
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
            <Animated.View style={[styles.mainContent, animatedContentStyle]}>
              {/* 1. Hero Net Savings Card */}
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

              {/* 2. Income & Expense Dual Cards */}
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

              {/* If month has zero transactions, show friendly empty card */}
              {!metrics.hasData ? (
                <View style={styles.emptyMonthCard}>
                  <View style={styles.emptyIconCircle}>
                    <CalendarIcon size={32} color={theme.colors.primaryDark} />
                  </View>
                  <Text style={styles.emptyTitle}>No transactions in {metrics.label}</Text>
                  <Text style={styles.emptySubtitle}>
                    Record expenses or income to unlock monthly analytics, category breakdowns, and trend charts.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => router.push('/add' as any)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emptyAddBtnText}>+ Add Transaction</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* 3. Last 6 Months Grouped Bar Chart */}
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
                    />
                  </View>

                  {/* 4. Category Breakdown & Donut Chart */}
                  {metrics.categoryBreakdown.length > 0 && (
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
                      <CategoryDonutChart
                        categories={metrics.categoryBreakdown}
                        totalExpenses={metrics.totalExpenses}
                      />

                      {/* Sorted Category Inset List */}
                      <View style={styles.categoryList}>
                        {metrics.categoryBreakdown.map((item) => (
                          <CategoryReportRow key={item.categoryId} item={item} />
                        ))}
                      </View>
                    </View>
                  )}

                  {/* 5. Daily Spending Area Curve */}
                  {metrics.totalExpenses > 0 && (
                    <View style={styles.card}>
                      <View style={styles.cardHeaderRow}>
                        <View>
                          <Text style={styles.cardTitle}>Daily spending</Text>
                          <Text style={styles.cardSubtitle}>
                            {metrics.peakDay
                              ? `Peak on ${metrics.peakDay.dateStr} • ${metrics.peakDay.note || 'Highest Outflow'}`
                              : 'Daily Cash Outflow'}
                          </Text>
                        </View>
                        <View style={styles.daysCountBadge}>
                          <Text style={styles.daysCountText}>
                            {metrics.dailySpending.length} Days
                          </Text>
                        </View>
                      </View>

                      <DailySpendingChart
                        days={metrics.dailySpending}
                        peakDay={metrics.peakDay}
                      />
                    </View>
                  )}

                  {/* 6. Smart Insights Section */}
                  <InsightsSection insights={metrics.insights} />
                </>
              )}
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
    paddingTop: 10,
  },
  dailyLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  dailyLabelText: {
    fontSize: 11,
    color: theme.colors.secondary,
  },
  peakLabelHighlight: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  daysCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryFixed,
  },
  daysCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
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
