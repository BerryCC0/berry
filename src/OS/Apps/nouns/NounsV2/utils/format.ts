import { formatEther } from 'viem';

export function fmtEth(wei: bigint | string | number | null | undefined, decimals = 4): string {
  if (wei == null) return '—';
  try {
    const value = typeof wei === 'bigint' ? wei : BigInt(String(wei));
    const eth = parseFloat(formatEther(value));
    if (eth === 0) return '0';
    if (eth < 0.0001) return '<0.0001';
    return eth.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  } catch {
    return '—';
  }
}

export function truncateAddr(addr?: string | null): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function fmtTimestamp(seconds: number | bigint | string): string {
  const n = typeof seconds === 'bigint' ? Number(seconds) : Number(seconds);
  if (!n) return '—';
  return new Date(n * 1000).toLocaleString();
}

export function fmtCountdown(endSeconds: number | bigint): string {
  const end = Number(endSeconds);
  const now = Math.floor(Date.now() / 1000);
  const remaining = end - now;
  if (remaining <= 0) return 'Ended';
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  if (h > 0) return `${h}h ${m}m ${String(s).padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function minNextBid(currentWei: bigint, incrementPct: number, reserveWei: bigint): bigint {
  if (currentWei === BigInt(0)) return reserveWei;
  return currentWei + (currentWei * BigInt(Math.max(1, incrementPct))) / BigInt(100);
}
