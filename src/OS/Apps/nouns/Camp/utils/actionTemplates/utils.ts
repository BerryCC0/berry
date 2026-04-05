/**
 * Utility functions for parsing and formatting amounts
 * These are specific to proposal action encoding, not shared utilities
 */

/**
 * Convert a decimal string (ETH) to wei (bigint)
 */
export function parseEther(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed || trimmed === '0') return BigInt(0);

  const [whole, decimal = ''] = trimmed.split('.');
  const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18);

  return BigInt(whole + paddedDecimal);
}

/**
 * Convert a decimal string to token units (bigint) given decimals
 */
export function parseUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!trimmed || trimmed === '0') return BigInt(0);

  const [whole, decimal = ''] = trimmed.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);

  return BigInt(whole + paddedDecimal);
}

/**
 * Convert token units (bigint) back to decimal string given decimals
 */
export function formatUnits(value: bigint, decimals: number): string {
  const str = value.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const decimal = str.slice(-decimals).replace(/0+$/, '');

  return decimal ? `${whole}.${decimal}` : whole;
}
