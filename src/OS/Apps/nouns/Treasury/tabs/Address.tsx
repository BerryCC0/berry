/**
 * Address — render an Ethereum address with best-available ENS resolution.
 *
 * Resolution order:
 *   1. `fallbackEns` prop (server-side hint from ponder_live.ens_names JOIN)
 *   2. Client-side `useENS` lookup (cache → DB → HTTP fallback)
 *   3. Shortened address
 *
 * When a server hint is provided, we skip the client-side lookup entirely
 * (pass null to useENS) to save requests — the server data comes from the
 * same source ultimately.
 */

'use client';

import { useENS } from '@/OS/hooks/useENS';
import { shortenAddress, etherscanAddrUrl } from './utils';

interface AddressProps {
  address: string;
  /** Server-resolved ENS hint. If provided, skips client-side lookup. */
  fallbackEns?: string | null;
  className?: string;
  /** Render as plain span instead of an Etherscan link. */
  noLink?: boolean;
  /** Force-show the full address instead of shortening when no ENS found. */
  full?: boolean;
}

export function Address({ address, fallbackEns, className, noLink, full }: AddressProps) {
  // Skip the client lookup when we already have a server hint
  const { name } = useENS(fallbackEns ? null : address);
  const display = fallbackEns || name || (full ? address : shortenAddress(address));

  if (noLink) {
    return (
      <span className={className} title={address}>
        {display}
      </span>
    );
  }

  return (
    <a
      className={className}
      href={etherscanAddrUrl(address)}
      target="_blank"
      rel="noreferrer"
      title={address}
    >
      {display}
    </a>
  );
}
