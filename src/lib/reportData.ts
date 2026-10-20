import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuth } from './auth';
import { fetchCategories, useCategories } from './api';
import { Transaction, Category } from '../types/database';
import { theme } from '../theme';

export interface CategoryOutflowItem {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface DaySpendingItem {
  day: number;
  amount: number;
  dateStr: string;
}

export interface PeakSpendingDay {
  day: number;
  amount: number;
  note?: string;
  dateStr: string;
}

export interface MonthBarItem {
  year: number;
  month: number; // 0-11
  monthShort: string;
  income: number;
  expenses: number;
  isCurrent: boolean;
}

export interface ReportInsight {
  id: string;
  icon: 'lightbulb' | 'trending_up' | 'verified';
  title: string;
  description: string;
  highlight?: string;
}

export interface NiceScale {
  yMax: number;
  step: number;
  ticks: number[];
  formattedTicks: string[];
}

/**
 * Clean 1/2/5 step nice scaling with NO fixed minimum floor.
 * E.g., max 60 gives ticks [0, 30, 60]; max 3800 gives ticks [0, 2000, 4000].
 */
export function getNiceScale(rawMax: number): NiceScale {
  if (rawMax <= 0) {
    return {
      yMax: 0,
      step: 0,
      ticks: [0],
      formattedTicks: ['₹0'],
    };
  }

  // Find clean step such that 2 * step >= rawMax
  const targetHalf = rawMax / 2;
  const exponent = Math.floor(Math.log10(targetHalf > 0 ? targetHalf : 1));
  const mults = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

  let bestStep = Infinity;
  let bestYMax = Infinity;

  for (let exp = exponent - 1; exp <= exponent + 2; exp++) {
    const base = Math.pow(10, exp);
    for (const c of mults) {
      const step = Math.round(c * base);
      const yMax = step * 2;
      if (yMax >= rawMax && yMax < bestYMax) {
        bestYMax = yMax;
        bestStep = step;
      }
    }
  }

  if (bestYMax === Infinity) {
    bestStep = Math.ceil(rawMax / 2);
    bestYMax = bestStep * 2;
  }

  const ticks = [0, bestStep, bestYMax];
  const formattedTicks = ticks.map(formatTickValue);

  return {
    yMax: bestYMax,
    step: bestStep,
    ticks,
    formattedTicks,
  };
}

export function formatTickValue(val: number): string {
  if (val === 0) return '₹0';
  if (val >= 100000) {
    const l = val / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`;
  }
  if (val >= 1000) {
    const k = val / 1000;
    return `₹${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `₹${val}`;
}

/**
 * Manual Indian number formatting worklet (e.g. 100000 -> 1,00,000; 1250 -> 1,250)
 * Operates purely on Hermes/JSC UI thread without Intl dependency.
 */
export function formatIndianCurrencyWorklet(val: number, prefix: string = '₹'): string {
  'worklet';
  const isNegative = val < 0;
  const absVal = Math.round(Math.abs(val));
  const s = String(absVal);
  const n = s.length;

  if (n <= 3) {
    return (isNegative ? '-' : '') + prefix + s;
  }

  const lastThree = s.substring(n - 3);
  let otherNumbers = s.substring(0, n - 3);
  let res = '';
  while (otherNumbers.length > 2) {
    res = ',' + otherNumbers.substring(otherNumbers.length - 2) + res;
    otherNumbers = otherNumbers.substring(0, otherNumbers.length - 2);
  }
  return (isNegative ? '-' : '') + prefix + otherNumbers + res + ',' + lastThree;
}

/**
 * Fritsch-Carlson Monotone Cubic Spline Interpolation
 * Guarantees the curve never overshoots or dips below zero between non-negative points.
 */
export function buildMonotoneCubicPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (n === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  // 1. Calculate secant slopes (delta)
  const deltas: number[] = new Array(n - 1);
  const dxs: number[] = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    dxs[i] = dx;
    deltas[i] = dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx;
  }

  // 2. Initialize tangents (m)
  const m: number[] = new Array(n);
  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (deltas[i - 1] + deltas[i]) / 2;
    }
  }

  // 3. Fritsch-Carlson adjustments
  for (let i = 0; i < n - 1; i++) {
    if (deltas[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / deltas[i];
      const beta = m[i + 1] / deltas[i];
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        m[i] = tau * alpha * deltas[i];
        m[i + 1] = tau * beta * deltas[i];
      }
    }
  }

  // 4. Construct SVG cubic Bezier path
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dxs[i] / 3;
    const cp1x = points[i].x + h;
    const cp1y = points[i].y + m[i] * h;
    const cp2x = points[i + 1].x - h;
    const cp2y = points[i + 1].y - m[i + 1] * h;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`;
  }

  return path;
}

export interface MonthlyReportMetrics {
  year: number;
  month: number;
  monthName: string;
  monthShort: string;
  label: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage (0 - 100)
  retainedPercentage: number;
  prevMonthIncome: number;
  prevMonthExpenses: number;
  prevMonthSavings: number;
  savingsDeltaPct: number | null;
  expenseDeltaPct: number | null;
  incomeDeltaPct: number | null;
  expenseDiffVsLastMonth: number;
  categoryBreakdown: CategoryOutflowItem[];
  dailySpending: DaySpendingItem[];
  peakDay: PeakSpendingDay | null;
  averageDailySpend: number;
  insights: ReportInsight[];
  sixMonthTrend: MonthBarItem[];
  transactionCount: number;
  hasData: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const PALETTE_FALLBACKS = [
  theme.colors.primary,
  theme.colors.tertiary,
  theme.colors.amber,
  theme.colors.blue,
  theme.colors.emerald,
  theme.colors.rose,
];

/**
 * Fetch transactions starting from a given date (e.g. 6 months ago)
 * Includes category and wallet relationships.
 */
export async function fetchReportTransactions(startDate: string): Promise<Transaction[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        note,
        date,
        created_at,
        wallet_id,
        category_id,
        is_adjustment,
        categories (id, name, color, icon)
      `)
      .gte('date', startDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (!error.message?.includes('permission denied')) {
        console.warn('Error fetching report transactions:', error.message);
      }
      return [];
    }

    return (data || []).map((t: any) => ({
      id: String(t.id),
      amount: Number(t.amount) || 0,
      type: (t.type || 'expense').toLowerCase() as 'expense' | 'income',
      note: t.note || '',
      date: t.date || t.created_at || new Date().toISOString(),
      created_at: t.created_at,
      wallet_id: t.wallet_id,
      category_id: t.category_id,
      is_adjustment: Boolean(t.is_adjustment),
      category: Array.isArray(t.categories) ? t.categories[0] : t.categories,
    }));
  } catch (err) {
    console.warn('Unexpected error fetching report transactions:', err);
    return [];
  }
}

/**
 * Pure calculation function for all monthly report metrics.
 * Strictly excludes is_adjustment = true from all totals and charts.
 */
export function computeReportMetrics(
  transactions: Transaction[],
  categories: Category[],
  selectedDate: Date
): MonthlyReportMetrics {
  const targetYear = selectedDate.getFullYear();
  const targetMonth = selectedDate.getMonth();

  // Previous month date
  const prevDate = new Date(targetYear, targetMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();

  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  // 1. Filter out all adjustment rows
  const normalTx = transactions.filter((t) => !t.is_adjustment);

  // 2. Metrics for Selected Month
  let selectedIncome = 0;
  let selectedExpenses = 0;
  let txCountThisMonth = 0;

  const categorySpentMap: Record<string, number> = {};
  const dailySpentMap: Record<number, { amount: number; note?: string }> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    dailySpentMap[d] = { amount: 0 };
  }

  // 3. Metrics for Previous Month
  let prevIncome = 0;
  let prevExpenses = 0;

  // 4. Six Months Trend Setup (from 5 months ago up to target month)
  const sixMonthsBars: MonthBarItem[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(targetYear, targetMonth - i, 1);
    sixMonthsBars.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      monthShort: MONTH_SHORT[d.getMonth()],
      income: 0,
      expenses: 0,
      isCurrent: i === 0,
    });
  }

  // Process all transactions across the 6-month window
  normalTx.forEach((tx) => {
    const txDate = new Date(tx.date || tx.created_at || '');
    if (isNaN(txDate.getTime())) return;

    const y = txDate.getFullYear();
    const m = txDate.getMonth();
    const amt = Number(tx.amount) || 0;

    // Check if within selected month
    if (y === targetYear && m === targetMonth) {
      txCountThisMonth++;
      if (tx.type === 'income') {
        selectedIncome += amt;
      } else {
        selectedExpenses += amt;
        const catId = tx.category_id || (tx.category as any)?.id || 'uncategorized';
        categorySpentMap[catId] = (categorySpentMap[catId] || 0) + amt;

        const dayNum = txDate.getDate();
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          dailySpentMap[dayNum].amount += amt;
          if (!dailySpentMap[dayNum].note && tx.note) {
            dailySpentMap[dayNum].note = tx.note;
          }
        }
      }
    }

    // Check if within previous month
    if (y === prevYear && m === prevMonth) {
      if (tx.type === 'income') {
        prevIncome += amt;
      } else {
        prevExpenses += amt;
      }
    }

    // Aggregate into 6-month buckets
    const matchBar = sixMonthsBars.find((bar) => bar.year === y && bar.month === m);
    if (matchBar) {
      if (tx.type === 'income') {
        matchBar.income += amt;
      } else {
        matchBar.expenses += amt;
      }
    }
  });

  // Calculate net savings
  const netSavings = selectedIncome - selectedExpenses;
  const prevSavings = prevIncome - prevExpenses;

  // Savings rate guarded against divide-by-zero
  const savingsRate = selectedIncome > 0 ? (netSavings / selectedIncome) * 100 : 0;
  const retainedPercentage = selectedIncome > 0
    ? Math.max(0, Math.min(100, Math.round((netSavings / selectedIncome) * 100)))
    : 0;

  // Deltas vs last month
  const savingsDeltaPct = prevSavings !== 0
    ? ((netSavings - prevSavings) / Math.abs(prevSavings)) * 100
    : null;

  const expenseDeltaPct = prevExpenses > 0
    ? ((selectedExpenses - prevExpenses) / prevExpenses) * 100
    : null;

  const incomeDeltaPct = prevIncome > 0
    ? ((selectedIncome - prevIncome) / prevIncome) * 100
    : null;

  const expenseDiffVsLastMonth = selectedExpenses - prevExpenses;

  // Category breakdown list & sorted donut data
  const categoryMapById = new Map<string, Category>();
  categories.forEach((c) => categoryMapById.set(c.id, c));

  const categoryBreakdown: CategoryOutflowItem[] = Object.entries(categorySpentMap)
    .map(([catId, amount], idx) => {
      const found = categoryMapById.get(catId);
      const name = found?.name || 'General';
      const color = found?.color || PALETTE_FALLBACKS[idx % PALETTE_FALLBACKS.length];
      const percentage = selectedExpenses > 0 ? Math.round((amount / selectedExpenses) * 100) : 0;
      return {
        categoryId: catId,
        name,
        color,
        amount,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Daily spending curve and peak day
  const dailySpending: DaySpendingItem[] = [];
  let peakDay: PeakSpendingDay | null = null;
  let maxDaySpend = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const item = dailySpentMap[d];
    const dateStr = `${MONTH_SHORT[targetMonth]} ${d}`;
    dailySpending.push({
      day: d,
      amount: item.amount,
      dateStr,
    });

    if (item.amount > maxDaySpend) {
      maxDaySpend = item.amount;
      peakDay = {
        day: d,
        amount: item.amount,
        note: item.note,
        dateStr,
      };
    }
  }

  const averageDailySpend = daysInMonth > 0 ? Math.round(selectedExpenses / daysInMonth) : 0;

  // Compute 2-3 strictly real-data insights
  const insights: ReportInsight[] = [];
  if (selectedExpenses > 0 && categoryBreakdown.length > 0) {
    const topCat = categoryBreakdown[0];
    insights.push({
      id: 'top-category',
      icon: 'lightbulb',
      title: 'Top spending category',
      description: `${topCat.name} was your largest outflow, representing ${topCat.percentage}% of all expenses this month.`,
      highlight: `₹${topCat.amount.toLocaleString('en-IN')}`,
    });
  }

  if (prevExpenses > 0 && selectedExpenses > 0) {
    if (expenseDiffVsLastMonth < 0) {
      insights.push({
        id: 'expense-drop',
        icon: 'verified',
        title: 'Spending reduced',
        description: `You spent ₹${Math.abs(expenseDiffVsLastMonth).toLocaleString('en-IN')} (${Math.abs(Math.round(expenseDeltaPct || 0))}%) less than in ${MONTH_SHORT[prevMonth]}.`,
      });
    } else if (expenseDiffVsLastMonth > 0) {
      insights.push({
        id: 'expense-increase',
        icon: 'trending_up',
        title: 'Outflow higher',
        description: `Your spending rose by ₹${expenseDiffVsLastMonth.toLocaleString('en-IN')} (${Math.round(expenseDeltaPct || 0)}%) compared to ${MONTH_SHORT[prevMonth]}.`,
      });
    }
  }

  if (selectedExpenses > 0) {
    insights.push({
      id: 'burn-rate',
      icon: 'verified',
      title: 'Daily burn rate',
      description: `You averaged ₹${averageDailySpend.toLocaleString('en-IN')}/day across ${daysInMonth} days in ${MONTH_SHORT[targetMonth]}.`,
      highlight: `₹${averageDailySpend.toLocaleString('en-IN')}/day`,
    });
  }

  const hasData = txCountThisMonth > 0;

  return {
    year: targetYear,
    month: targetMonth,
    monthName: MONTH_NAMES[targetMonth],
    monthShort: MONTH_SHORT[targetMonth],
    label: `${MONTH_NAMES[targetMonth]} ${targetYear}`,
    totalIncome: selectedIncome,
    totalExpenses: selectedExpenses,
    netSavings,
    savingsRate,
    retainedPercentage,
    prevMonthIncome: prevIncome,
    prevMonthExpenses: prevExpenses,
    prevMonthSavings: prevSavings,
    savingsDeltaPct,
    expenseDeltaPct,
    incomeDeltaPct,
    expenseDiffVsLastMonth,
    categoryBreakdown,
    dailySpending,
    peakDay,
    averageDailySpend,
    insights,
    sixMonthTrend: sixMonthsBars,
    transactionCount: txCountThisMonth,
    hasData,
  };
}

/**
 * Fetch combined payload for report: 6-month transactions + all categories
 * Executes in a single Promise.all network request.
 */
export async function fetchReportPayload(startDate: string): Promise<{
  transactions: Transaction[];
  categories: Category[];
}> {
  const [transactions, categories] = await Promise.all([
    fetchReportTransactions(startDate),
    fetchCategories(),
  ]);
  return { transactions, categories };
}

/**
 * Custom React Query hook for the Report Screen.
 * Executes ONE single query for the 6-month window + categories.
 * Memoizes all computed metrics cleanly client-side.
 */
export function useReportData(selectedDate: Date) {
  const { user } = useAuth();
  const userId = user?.id;

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();

  // 6 months window start date: first day of month 5 months before selectedDate
  const startDateStr = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 5, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }, [selectedYear, selectedMonth]);

  const categoriesQuery = useCategories();

  const transactionsQuery = useQuery<Transaction[]>({
    queryKey: ['transactions', 'report', userId, startDateStr],
    queryFn: () => fetchReportTransactions(startDateStr),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });

  const metrics: MonthlyReportMetrics = useMemo(() => {
    const transactions = transactionsQuery.data || [];
    const categories = categoriesQuery.data || [];
    return computeReportMetrics(transactions, categories, selectedDate);
  }, [transactionsQuery.data, categoriesQuery.data, selectedDate]);

  return {
    metrics,
    isLoading: transactionsQuery.isLoading || categoriesQuery.isLoading,
    isError: transactionsQuery.isError || categoriesQuery.isError,
    error: transactionsQuery.error || categoriesQuery.error,
    refetch: () => {
      transactionsQuery.refetch();
      categoriesQuery.refetch();
    },
  };
}
