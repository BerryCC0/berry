/**
 * VoterLink
 * Standard wrapper for any inline reference to a voter address. Renders
 * the provided children as the trigger, attaches a hover popover showing
 * a mini voter profile, and (when `onNavigate` is provided) navigates to
 * the voter's Camp profile on click.
 *
 * Usage:
 *   <VoterLink address={voter} onNavigate={onNavigate}>
 *     <AddressWithENS address={voter} />
 *   </VoterLink>
 *
 * Falls back to rendering children unwrapped when `onNavigate` is omitted.
 */

'use client';

import { useCallback, type ReactNode } from 'react';
import { HoverPopover } from './HoverPopover';
import { VoterHoverCard } from './VoterHoverCard';
import styles from './VoterLink.module.css';

interface VoterLinkProps {
  address: string;
  /** When provided, click navigates to `voter/<address>` and hover shows the popover. */
  onNavigate?: (path: string) => void;
  children: ReactNode;
  className?: string;
}

export function VoterLink({
  address,
  onNavigate,
  children,
  className,
}: VoterLinkProps) {
  const handleClick = useCallback(() => {
    onNavigate?.(`voter/${address}`);
  }, [onNavigate, address]);

  // No navigation handler → render children as-is so non-Camp contexts
  // don't get a dead link.
  if (!onNavigate) {
    return <>{children}</>;
  }

  return (
    <HoverPopover
      content={<VoterHoverCard address={address} onNavigate={onNavigate} />}
    >
      <button
        type="button"
        className={`${styles.linkButton} ${className || ''}`}
        onClick={handleClick}
      >
        {children}
      </button>
    </HoverPopover>
  );
}
