import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './supabase';
import { Transaction, WalletBalance, Category, Goal } from '../types/database';


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
 * Fetch transactions with category, wallet joins, and is_adjustment flag directly from Supabase
 */
export async function fetchTransactions(): Promise<Transaction[]> {
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
        categories (id, name, color, icon),
        wallets (id, name)
      `)
      .order('date', { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) {
      console.warn('Error fetching transactions from Supabase:', error.message);
      return [];
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
      is_adjustment: Boolean(t.is_adjustment),
      category: Array.isArray(t.categories) ? t.categories[0] : t.categories,
      wallet: Array.isArray(t.wallets) ? t.wallets[0] : t.wallets,
    }));

    return cloudTransactions;
  } catch (err) {
    console.warn('Error fetching transactions:', err);
    return [];
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
    // EXCLUDE is_adjustment = true rows from all financial aggregates
    if (tx.is_adjustment) {
      return;
    }

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
  is_adjustment?: boolean;
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
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      const payload: any = {
        wallet_id: input.wallet_id,
        amount: input.amount,
        type: input.type,
        date: input.date,
        is_adjustment: input.is_adjustment ?? false,
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
          category_id,
          is_adjustment
        `)
        .single();

      if (error) {
        throw error;
      }
      return data;
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
        is_adjustment: newTxInput.is_adjustment ?? false,
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

/**
 * Query hook to fetch categories
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60,
  });
}

export interface UpdateCategoryBudgetInput {
  categoryId: string;
  budgetLimit: number | null;
}

/**
 * Mutation to set or clear a category budget limit
 */
export function useUpdateCategoryBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCategoryBudgetInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      const { data, error } = await supabase
        .from('categories')
        .update({ budget_limit: input.budgetLimit })
        .eq('id', input.categoryId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/**
 * Fetch goals from Supabase
 */
export async function fetchGoals(): Promise<Goal[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Notice fetching goals:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Query hook to fetch goals
 */
export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: fetchGoals,
    staleTime: 1000 * 30,
  });
}

export interface CreateGoalInput {
  name: string;
  target_amount: number;
  saved_amount?: number;
  target_date?: string | null;
  color?: string;
  icon?: string;
}

/**
 * Mutation to create a goal without user_id
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      const payload: any = {
        name: input.name.trim(),
        target_amount: input.target_amount,
        saved_amount: input.saved_amount ?? 0,
        target_date: input.target_date || null,
        color: input.color || '#FF2D78',
        icon: input.icon || 'flag',
      };

      const { data, error } = await supabase
        .from('goals')
        .insert([payload])
        .select('*')
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export interface UpdateGoalInput {
  id: string;
  name?: string;
  target_amount?: number;
  saved_amount?: number;
  target_date?: string | null;
  color?: string;
  icon?: string;
}

/**
 * Mutation to update an existing goal or increase saved_amount
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGoalInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.target_amount !== undefined) updateData.target_amount = input.target_amount;
      if (input.saved_amount !== undefined) updateData.saved_amount = input.saved_amount;
      if (input.target_date !== undefined) updateData.target_date = input.target_date;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.icon !== undefined) updateData.icon = input.icon;

      const { data, error } = await supabase
        .from('goals')
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
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

/**
 * Mutation to delete a goal
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) {
        throw error;
      }
      return goalId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

