/**
 * Small formatters shared by Treasury activity tabs.
 * Kept inline to avoid pulling in heavy deps for what is essentially
 * string manipulation on serialized bigints.
 */

import { formatEther, formatUnits } from 'viem';

export function formatEthFromWei(wei: string, decimals = 4): string {
  try {
    const eth = parseFloat(formatEther(BigInt(wei)));
    return `${eth.toLocaleString('en-US', {
      minimumFractionDigits: Math.min(decimals, 2),
      maximumFractionDigits: decimals,
    })} Ξ`;
  } catch {
    return '0 Ξ';
  }
}

export function formatUsdcFromRaw(raw: string, decimals = 0): string {
  try {
    const usdc = parseFloat(formatUnits(BigInt(raw), 6));
    return `$${usdc.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  } catch {
    return '$0';
  }
}

export function shortenAddress(addr: string | null | undefined): string {
  if (!addr) return '';
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function displayAddress(addr: string, ens: string | null): string {
  return ens && ens.length > 0 ? ens : shortenAddress(addr);
}

const RELATIVE_DIVS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.345, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
];

const rtf = typeof Intl !== 'undefined'
  ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  : null;

export function formatRelativeTime(unixSeconds: string | number): string {
  const ts = typeof unixSeconds === 'string' ? parseInt(unixSeconds, 10) : unixSeconds;
  if (!Number.isFinite(ts) || ts === 0) return '';
  if (!rtf) return new Date(ts * 1000).toISOString().slice(0, 10);

  let diff = (ts * 1000 - Date.now()) / 1000;
  let unitIdx = 0;
  while (Math.abs(diff) >= RELATIVE_DIVS[unitIdx][0] && unitIdx < RELATIVE_DIVS.length - 1) {
    diff /= RELATIVE_DIVS[unitIdx][0];
    unitIdx += 1;
  }
  return rtf.format(Math.round(diff), RELATIVE_DIVS[unitIdx][1]);
}

export function formatAbsoluteDate(unixSeconds: string | number): string {
  const ts = typeof unixSeconds === 'string' ? parseInt(unixSeconds, 10) : unixSeconds;
  if (!Number.isFinite(ts) || ts === 0) return '';
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function etherscanTxUrl(hash: string): string {
  return `https://etherscan.io/tx/${hash}`;
}

export function etherscanAddrUrl(addr: string): string {
  return `https://etherscan.io/address/${addr}`;
}

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

export function tokenSymbolForAddress(addr: string): string {
  const lower = addr.toLowerCase();
  if (lower === USDC) return 'USDC';
  if (lower === WETH) return 'WETH';
  return shortenAddress(lower);
}

export function formatTokenAmount(addr: string, raw: string): string {
  const lower = addr.toLowerCase();
  if (lower === USDC) return formatUsdcFromRaw(raw, 2);
  if (lower === WETH) return formatEthFromWei(raw, 4);
  // Unknown — show raw bigint
  return raw;
}
