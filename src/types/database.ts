export type TransactionType = 'expense' | 'income';

export interface Wallet {
  id: string;
  name: string;
  user_id?: string;
  opening_balance?: number;
  color?: string;
  icon?: string;
  currency?: string;
  created_at?: string;
}

export interface WalletBalance {
  id?: string;
  wallet_id?: string;
  user_id?: string;
  name?: string;
  wallet_name?: string;
  balance?: number;
  total_balance?: number;
  opening_balance?: number;
  color?: string;
  icon?: string;
  currency?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  type?: TransactionType;
  budget_limit?: number | null;
}

export interface Transaction {
  id: string;
  wallet_id?: string;
  category_id?: string | null;
  amount: number;
  type: TransactionType;
  note?: string;
  date?: string;
  created_at?: string;
  category?: Category | null;
  wallet?: Wallet | null;
}
