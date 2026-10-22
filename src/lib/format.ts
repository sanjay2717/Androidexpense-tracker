/**
 * Central money formatting utility for Putu.
 * Ensures the sign is placed strictly BEFORE the currency symbol everywhere.
 * Examples:
 *   formatMoney(500, { showPositiveSign: true }) => "+₹500.00"
 *   formatMoney(-10140)                          => "-₹10,140.00"
 *   formatMoney(500)                             => "₹500.00"
 *   formatMoney(0)                               => "₹0.00"
 */

export interface FormatMoneyOptions {
  /**
   * When true, prepends a '+' sign for positive amounts (e.g., "+₹500.00").
   * Default: false
   */
  showPositiveSign?: boolean;
  /**
   * Number of fractional decimal digits.
   * Default: 2
   */
  decimals?: number;
}

export function formatMoney(
  amount: number | string | null | undefined,
  options: FormatMoneyOptions = {}
): string {
  const { showPositiveSign = false, decimals = 2 } = options;
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0)) || 0;
  const isNegative = num < 0;
  const isPositive = num > 0;
  const absVal = Math.abs(num);

  const formattedNum = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (isNegative) {
    return `-₹${formattedNum}`;
  }
  if (isPositive && showPositiveSign) {
    return `+₹${formattedNum}`;
  }
  return `₹${formattedNum}`;
}
