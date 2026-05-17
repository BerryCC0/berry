'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useTreasuryStreams } from '@/app/lib/nouns/hooks';
import { Select, type SelectOption } from '@/OS/Primitives/Select/Select';
import { COMMON_TOKENS } from '../../utils/actionTemplates/constants';

interface StreamSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function tokenMeta(address: string): { symbol: string; decimals: number } {
  const lower = address.toLowerCase();
  const match = COMMON_TOKENS.find((t) => t.address.toLowerCase() === lower);
  return match
    ? { symbol: match.symbol, decimals: match.decimals }
    : { symbol: shortAddr(address), decimals: 18 };
}

function formatAmount(raw: string, decimals: number): string {
  try {
    const n = Number(formatUnits(BigInt(raw), decimals));
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    if (n >= 1) return n.toFixed(2);
    return n.toPrecision(2);
  } catch {
    return raw;
  }
}

export function StreamSelect({ value, onChange, disabled }: StreamSelectProps) {
  const { data, isLoading, error } = useTreasuryStreams();

  const options = useMemo<SelectOption[]>(() => {
    if (!data?.streams) return [];
    // Only active streams are meaningfully cancellable. A pending stream can
    // still be cancelled, but a complete one returns nothing — hide it.
    const cancellable = data.streams.filter(
      (s) => s.status === 'active' || s.status === 'pending',
    );
    return cancellable.map((s) => {
      const { symbol, decimals } = tokenMeta(s.tokenAddress);
      const total = formatAmount(s.tokenAmountRaw, decimals);
      const claimed =
        s.claimedRaw != null ? formatAmount(s.claimedRaw, decimals) : null;
      const recipient = s.recipientEns || shortAddr(s.recipient);
      const progress = claimed ? `${claimed}/${total} ${symbol}` : `${total} ${symbol}`;
      const statusTag = s.status === 'pending' ? ' (pending)' : '';
      return {
        value: s.streamAddress,
        label: `${recipient} • ${progress}${statusTag}`,
        description: s.streamAddress,
      };
    });
  }, [data]);

  // If the current value points to a stream not in our list (e.g. a complete
  // stream, or a hand-pasted address from an edited proposal), inject it so
  // the dropdown still shows the selection rather than appearing empty.
  const optionsWithSelection = useMemo<SelectOption[]>(() => {
    if (!value) return options;
    const has = options.some((o) => o.value.toLowerCase() === value.toLowerCase());
    if (has) return options;
    return [
      { value, label: shortAddr(value), description: value },
      ...options,
    ];
  }, [options, value]);

  if (isLoading) {
    return <div style={{ fontSize: 11, opacity: 0.6 }}>Loading streams…</div>;
  }

  if (error) {
    return (
      <div style={{ fontSize: 11, color: 'var(--berry-error, #b00)' }}>
        Failed to load streams. Use a custom transaction to cancel by address.
      </div>
    );
  }

  if (options.length === 0 && !value) {
    return <div style={{ fontSize: 11, opacity: 0.6 }}>No active streams found.</div>;
  }

  return (
    <Select
      options={optionsWithSelection}
      value={value}
      onChange={onChange}
      placeholder="Select a stream to cancel…"
      disabled={disabled}
    />
  );
}
