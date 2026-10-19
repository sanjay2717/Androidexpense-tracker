import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Transaction, WalletBalance, Category } from '../types/database';

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
  targetBudget: number | null;
  spent: number;
  spentPercentage: number | null;
  safeDailyCap: number | null;
  leftInBudget: number | null;
  hasBudget: boolean;
  categorySpending: CategorySpending[];
  recentTransactions: Transaction[];
  wallets: WalletBalance[];
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
    return [];
  }
  return data ?? [];
}

/**
 * Fetch categories from Supabase categories table
 */
export async function fetchCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, color, icon, type, budget_limit');

  if (error) {
    console.warn('Error fetching categories from Supabase:', error.message);
    return [];
  }
  return data || [];
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
 * Hook to fetch wallet balances with automatic caching
 */
export function useWalletBalances() {
  return useQuery<WalletBalance[]>({
    queryKey: ['wallet_balances'],
    queryFn: fetchWalletBalances,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to fetch transactions with automatic caching
 */
export function useTransactions(limit?: number) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', limit],
    queryFn: fetchTransactions,
    staleTime: 1000 * 30,
  });
}

/**
 * Custom hook to get all home screen financial data and calculations
 */
export function useHomeDashboardData() {
  const balancesQuery = useWalletBalances();

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    staleTime: 1000 * 30,
  });

  const isLoading = balancesQuery.isLoading || transactionsQuery.isLoading || categoriesQuery.isLoading;
  const isError = balancesQuery.isError && transactionsQuery.isError;
  const error = balancesQuery.error || transactionsQuery.error;

  const balances = balancesQuery.data || [];
  const categories = categoriesQuery.data || [];
  const transactions = transactionsQuery.data || [];

  // Compute total balance across all wallets - zero data is 0
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
  const categoryMap = new Map<string, { id: string; name: string; amount: number; color?: string }>();

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date || tx.created_at || '');
    const isThisMonth =
      !isNaN(txDate.getTime()) &&
      txDate.getFullYear() === currentYear &&
      txDate.getMonth() === currentMonth;

    if (tx.type === 'income') {
      if (isThisMonth) {
        monthlyIncome += tx.amount;
      }
    } else {
      if (isThisMonth) {
        monthlyExpenses += tx.amount;
      }

      // Group by category from category join or find in loaded categories
      const catId = tx.category_id || tx.category?.id;
      const matchedCat = categories.find((c) => c.id === catId);
      const catName = matchedCat?.name || tx.category?.name || 'Uncategorized';
      const catColor = matchedCat?.color || tx.category?.color;

      const prev = categoryMap.get(catName) || {
        id: catId || catName,
        name: catName,
        amount: 0,
        color: catColor,
      };
      prev.amount += tx.amount;
      categoryMap.set(catName, prev);
    }
  });

  // Calculate category percentages
  const categorySpending: CategorySpending[] = [];
  let index = 0;
  categoryMap.forEach((val) => {
    const pct = monthlyExpenses > 0 ? Math.round((val.amount / monthlyExpenses) * 100) : 0;
    categorySpending.push({
      categoryId: val.id,
      name: val.name,
      amount: val.amount,
      percentage: pct,
      color: val.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    });
    index++;
  });

  // Sum real budget limits defined on categories table
  const totalCategoryBudget = categories.reduce((sum, cat) => {
    const limit = Number(cat.budget_limit) || 0;
    return sum + limit;
  }, 0);

  const hasBudget = totalCategoryBudget > 0;
  const targetBudget = hasBudget ? totalCategoryBudget : null;
  const spent = monthlyExpenses;
  const spentPercentage = hasBudget && targetBudget! > 0 ? Math.min(100, Math.round((spent / targetBudget!) * 100)) : null;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());
  const leftInBudget = hasBudget && targetBudget !== null ? Math.max(0, targetBudget - spent) : null;
  const safeDailyCap = hasBudget && leftInBudget !== null ? Math.round(leftInBudget / daysRemaining) : null;

  const metrics: MonthlyBudgetMetrics = {
    totalBalance: computedTotalBalance,
    monthlyIncome,
    monthlyExpenses,
    targetBudget,
    spent,
    spentPercentage,
    safeDailyCap,
    leftInBudget,
    hasBudget,
    categorySpending,
    recentTransactions: transactions,
    wallets: balances,
  };

  // Provide dataUpdatedAt timestamp from query
  const dataUpdatedAt = Math.max(
    balancesQuery.dataUpdatedAt || 0,
    transactionsQuery.dataUpdatedAt || 0
  );

  return {
    metrics,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    refetch: () => {
      balancesQuery.refetch();
      categoriesQuery.refetch();
      transactionsQuery.refetch();
    },
  };
}

export interface AddTransactionInput {
  wallet_id: string;
  category_id?: string | null;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  note?: string;
  category?: Category | null;
  wallet?: any;
}

/**
 * Mutation to insert a transaction with optimistic updates and query invalidations
 */
export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddTransactionInput) => {
      // 1. Always save to local AsyncStorage first so user never loses data offline
      const localTx: Transaction = {
        id: 'tx-' + Date.now().toString(),
        amount: input.amount,
        type: input.type,
        note: input.note || '',
        date: input.date,
        created_at: new Date().toISOString(),
        wallet_id: input.wallet_id,
        category_id: input.category_id,
        category: input.category,
        wallet: input.wallet,
      };
      await saveLocalTransaction(localTx);

      // 2. Insert into Supabase if configured. Do NOT send user_id (Postgres defaults it to auth.uid())
      if (isSupabaseConfigured) {
        const payload: any = {
          wallet_id: input.wallet_id,
          amount: input.amount,
          type: input.type,
          date: input.date,
        };
        if (input.category_id) {
          payload.category_id = input.category_id;
        }
        if (input.note && input.note.trim()) {
          payload.note = input.note.trim();
        }

        const { data, error } = await supabase
          .from('transactions')
          .insert([payload])
          .select(`
            id,
            amount,
            type,
            note,
            date,
            created_at,
            wallet_id,
            category_id
          `)
          .single();

        if (error) {
          throw error;
        }
        return data;
      }
      return localTx;
    },
    onMutate: async (newTxInput) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      await queryClient.cancelQueries({ queryKey: ['wallet_balances'] });

      // Snapshot previous transactions
      const previousTransactions = queryClient.getQueryData<Transaction[]>(['transactions']) || [];

      // Optimistic transaction
      const optimisticTx: Transaction = {
        id: 'temp-' + Date.now().toString(),
        amount: newTxInput.amount,
        type: newTxInput.type,
        note: newTxInput.note || '',
        date: newTxInput.date,
        created_at: new Date().toISOString(),
        wallet_id: newTxInput.wallet_id,
        category_id: newTxInput.category_id,
        category: newTxInput.category,
        wallet: newTxInput.wallet,
      };

      queryClient.setQueryData<Transaction[]>(['transactions'], (old = []) => [optimisticTx, ...old]);

      return { previousTransactions };
    },
    onError: async (_err, _newTx, context) => {
      // Roll back optimistic cache to previous transactions
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
    },
    onSettled: (_data, error) => {
      // Invalidate queries so Home dashboard updates with server truth if successful
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['wallet_balances'] });
      }
    },
  });
}

export interface CreateWalletInput {
  name: string;
  opening_balance?: number;
  color?: string;
  icon?: string;
}

/**
 * Mutation to create a wallet without user_id (database defaults user_id to auth.uid())
 */
export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWalletInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      const payload: any = {
        name: input.name.trim(),
        opening_balance: input.opening_balance ?? 0,
        color: input.color || '#4c4aca',
        icon: input.icon || 'account_balance',
      };

      const { data, error } = await supabase
        .from('wallets')
        .insert([payload])
        .select('*')
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet_balances'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export interface UpdateWalletInput {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
}

/**
 * Mutation to update an existing wallet's name, color, or icon
 */
export function useUpdateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWalletInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.color !== undefined) updateData.color = input.color;
      if (input.icon !== undefined) updateData.icon = input.icon;

      const { data, error } = await supabase
        .from('wallets')
        .update(updateData)
        .eq('id', input.id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet_balances'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/**
 * Mutation to delete a wallet (cascades transactions in DB)
 */
export function useDeleteWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletId: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', walletId);

      if (error) {
        throw error;
      }
      return walletId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet_balances'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
