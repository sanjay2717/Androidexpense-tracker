export type TransactionType = 'expense' | 'income';

export interface Wallet {
  id: string;
  name: string;
  currency?: string;
  created_at?: string;
}

export interface WalletBalance {
  id?: string;
  wallet_id?: string;
  name?: string;
  wallet_name?: string;
  balance?: number;
  total_balance?: number;
  currency?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  type?: TransactionType;
}

export interface Transaction {
  id: string;
  wallet_id?: string;
  category_id?: string;
  amount: number;
  type: TransactionType;
  note?: string;
  date?: string;
  created_at?: string;
  category?: Category | null;
  wallet?: Wallet | null;
}
