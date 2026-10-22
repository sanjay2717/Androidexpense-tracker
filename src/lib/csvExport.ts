import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Escapes a single cell for RFC 4180 CSV compliance:
 * - Prefixes cells starting with '=', '+', '-', or '@' with an apostrophe (') to neutralize spreadsheet formula injection.
 * - Wraps in double quotes and escapes existing double quotes (" -> "") if the cell contains commas, quotes, newlines, or was prefixed.
 */
export function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  let str = String(val);

  // Prevent formula injection in spreadsheet applications (Excel, Google Sheets, Calc)
  const startsWithFormula = /^[\=\+\-\@]/.test(str);
  if (startsWithFormula) {
    str = "'" + str;
  }

  // Wrap with quotes if string contains delimiter, quotes, line breaks, or formula prefix
  if (/[",\r\n]/.test(str) || startsWithFormula) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Exports all transactions of the authenticated user to a CSV file in the app cache
 * and opens the native system share sheet.
 */
export async function exportTransactionsToCsv(): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isSupabaseConfigured) {
    throw new Error('Database is not configured.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User session not found.');
  }

  // Fetch all user transactions ordered chronologically
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      type,
      note,
      date,
      created_at,
      is_adjustment,
      categories (name),
      wallets (name)
    `)
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch transactions for export.');
  }

  const transactions = data || [];

  const headers = ['date', 'type', 'amount', 'category', 'wallet', 'note', 'is_adjustment'];
  const headerRow = headers.join(',');

  const rows = transactions.map((tx: any) => {
    const date = tx.date || (tx.created_at ? tx.created_at.slice(0, 10) : '');
    const type = tx.type || 'expense';
    const amount = tx.amount ?? 0;
    const catName = Array.isArray(tx.categories)
      ? tx.categories[0]?.name
      : tx.categories?.name || 'Uncategorized';
    const walletName = Array.isArray(tx.wallets)
      ? tx.wallets[0]?.name
      : tx.wallets?.name || 'Default';
    const note = tx.note || '';
    const isAdjustment = Boolean(tx.is_adjustment);

    return [
      escapeCsvCell(date),
      escapeCsvCell(type),
      escapeCsvCell(amount),
      escapeCsvCell(catName),
      escapeCsvCell(walletName),
      escapeCsvCell(note),
      escapeCsvCell(isAdjustment),
    ].join(',');
  });

  const csvContent = [headerRow, ...rows].join('\r\n');

  const fileName = `putu_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not supported on this device.');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Putu Transactions',
    UTI: 'public.comma-separated-values-text',
  });

  return { success: true, count: transactions.length };
}
