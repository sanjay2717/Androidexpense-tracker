import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './supabase';
import { fetchCategories } from './api';
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
      console.warn('Error fetching report transactions:', error.message);
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
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();

  // 6 months window start date: first day of month 5 months before selectedDate
  const startDateStr = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 5, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }, [selectedYear, selectedMonth]);

  const reportQuery = useQuery({
    queryKey: ['report-payload', startDateStr],
    queryFn: () => fetchReportPayload(startDateStr),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const metrics: MonthlyReportMetrics = useMemo(() => {
    const transactions = reportQuery.data?.transactions || [];
    const categories = reportQuery.data?.categories || [];
    return computeReportMetrics(transactions, categories, selectedDate);
  }, [reportQuery.data, selectedDate]);

  return {
    metrics,
    isLoading: reportQuery.isLoading,
    isError: reportQuery.isError,
    error: reportQuery.error,
    refetch: reportQuery.refetch,
  };
}
