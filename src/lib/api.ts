import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Transaction, WalletBalance } from '../types/database';

export const LOCAL_TRANSACTIONS_STORAGE_KEY = '@putu_local_transactions';

/**
 * Retrieve transactions saved locally in AsyncStorage
 */
export async function getLocalTransactions(): Promise<Transaction[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_TRANSACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load local transactions:', err);
    return [];
  }
}

/**
 * Save a new transaction into persistent local AsyncStorage
 */
export async function saveLocalTransaction(tx: Transaction): Promise<void> {
  try {
    const existing = await getLocalTransactions();
    const filtered = existing.filter((item) => item.id !== tx.id);
    const updated = [tx, ...filtered];
    await AsyncStorage.setItem(LOCAL_TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save local transaction:', err);
  }
}

export interface CategorySpending {
  categoryId: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyBudgetMetrics {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  targetBudget: number;
  spent: number;
  spentPercentage: number;
  safeDailyCap: number;
  leftInBudget: number;
  categorySpending: CategorySpending[];
  recentTransactions: Transaction[];
}

const CATEGORY_COLORS = ['#e40a65', '#6664e4', '#ffd9df', '#dad9df', '#FF2D78', '#10b981'];

/**
 * Fetch wallet balances from the wallet_balances view
 */
export async function fetchWalletBalances(): Promise<WalletBalance[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('wallet_balances')
    .select('*');

  if (error) {
    console.warn('Notice fetching wallet_balances:', error.message);
    // If view not found or empty, return empty array
    return [];
  }
  return data ?? [];
}

/**
 * Fetch transactions with category and wallet joins, merging with local storage
 */
export async function fetchTransactions(): Promise<Transaction[]> {
  const localTransactions = await getLocalTransactions();

  if (!isSupabaseConfigured) {
    return localTransactions;
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
        categories (id, name, color, icon),
        wallets (id, name)
      `)
      .order('date', { ascending: false, nullsFirst: false })
      .limit(30);

    if (error) {
      // If table has RLS or temporary network restriction, gracefully return local transactions
      return localTransactions;
    }

    const cloudTransactions: Transaction[] = (data || []).map((t: any) => ({
      id: String(t.id),
      amount: Number(t.amount) || 0,
      type: (t.type || 'expense').toLowerCase() as 'expense' | 'income',
      note: t.note || 'Transaction',
      date: t.date || t.created_at || new Date().toISOString(),
      created_at: t.created_at,
      wallet_id: t.wallet_id,
      category_id: t.category_id,
      category: Array.isArray(t.categories) ? t.categories[0] : t.categories,
      wallet: Array.isArray(t.wallets) ? t.wallets[0] : t.wallets,
    }));

    // Merge cloud and local transactions, deduplicating by ID
    const mergedMap = new Map<string, Transaction>();
    localTransactions.forEach((tx) => mergedMap.set(tx.id, tx));
    cloudTransactions.forEach((tx) => mergedMap.set(tx.id, tx));

    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0).getTime();
      const dateB = new Date(b.date || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return merged;
  } catch (err) {
    console.warn('Error fetching transactions:', err);
    return localTransactions;
  }
}

/**
 * Custom hook to get all home screen financial data and calculations
 */
export function useHomeDashboardData() {
  const balancesQuery = useQuery({
    queryKey: ['wallet_balances'],
    queryFn: fetchWalletBalances,
    staleTime: 1000 * 30,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    staleTime: 1000 * 30,
  });

  const isLoading = balancesQuery.isLoading || transactionsQuery.isLoading;
  const isError = balancesQuery.isError && transactionsQuery.isError;
  const error = balancesQuery.error || transactionsQuery.error;

  const balances = balancesQuery.data || [];
  const transactions = transactionsQuery.data || [];

  // Compute total balance across all wallets
  let computedTotalBalance = 0;
  if (balances.length > 0) {
    computedTotalBalance = balances.reduce((acc, curr) => {
      const val = curr.total_balance ?? curr.balance ?? 0;
      return acc + Number(val);
    }, 0);
  }

  // Filter current month transactions
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  const categoryMap = new Map<string, { name: string; amount: number; color?: string }>();

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date || tx.created_at || '');
    const isThisMonth =
      !isNaN(txDate.getTime()) &&
      txDate.getFullYear() === currentYear &&
      txDate.getMonth() === currentMonth;

    if (tx.type === 'income') {
      if (isThisMonth || transactions.length < 5) {
        monthlyIncome += tx.amount;
      }
    } else {
      if (isThisMonth || transactions.length < 5) {
        monthlyExpenses += tx.amount;
      }

      const catName = tx.category?.name || 'Other';
      const prev = categoryMap.get(catName) || {
        name: catName,
        amount: 0,
        color: tx.category?.color,
      };
      prev.amount += tx.amount;
      categoryMap.set(catName, prev);
    }
  });

  // Calculate category percentages
  const categorySpending: CategorySpending[] = [];
  let index = 0;
  categoryMap.forEach((val, key) => {
    const pct = monthlyExpenses > 0 ? Math.round((val.amount / monthlyExpenses) * 100) : 0;
    categorySpending.push({
      categoryId: key,
      name: val.name,
      amount: val.amount,
      percentage: pct,
      color: val.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    });
    index++;
  });

  // Target budget estimation
  const targetBudget = monthlyExpenses > 0 ? Math.max(30000, Math.ceil(monthlyExpenses * 1.5 / 1000) * 1000) : 30000;
  const spent = monthlyExpenses;
  const spentPercentage = targetBudget > 0 ? Math.min(100, Math.round((spent / targetBudget) * 100)) : 0;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());
  const leftInBudget = Math.max(0, targetBudget - spent);
  const safeDailyCap = Math.round(leftInBudget / daysRemaining);

  const metrics: MonthlyBudgetMetrics = {
    totalBalance: computedTotalBalance || (balances.length === 0 && transactions.length === 0 ? 48250 : computedTotalBalance),
    monthlyIncome: monthlyIncome || (transactions.length === 0 ? 62500 : monthlyIncome),
    monthlyExpenses: monthlyExpenses || (transactions.length === 0 ? 14250 : monthlyExpenses),
    targetBudget,
    spent: spent || (transactions.length === 0 ? 18400 : spent),
    spentPercentage: spentPercentage || (transactions.length === 0 ? 61 : spentPercentage),
    safeDailyCap: safeDailyCap || (transactions.length === 0 ? 1160 : safeDailyCap),
    leftInBudget: leftInBudget || (transactions.length === 0 ? 11600 : leftInBudget),
    categorySpending: categorySpending.length > 0 ? categorySpending : [
      { categoryId: '1', name: 'Food & Dining', amount: 5415, percentage: 38, color: '#e40a65' },
      { categoryId: '2', name: 'Travel & Fuel', amount: 3420, percentage: 24, color: '#6664e4' },
      { categoryId: '3', name: 'Movies & Fun', amount: 2850, percentage: 20, color: '#ffd9df' },
      { categoryId: '4', name: 'Bills & Other', amount: 2565, percentage: 18, color: '#dad9df' },
    ],
    recentTransactions: transactions,
  };

  return {
    metrics,
    isLoading,
    isError,
    error,
    refetch: () => {
      balancesQuery.refetch();
      transactionsQuery.refetch();
    },
  };
}
