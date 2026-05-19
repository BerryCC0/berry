/**
 * Shared render helpers for ActivityItem sub-components.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useTranslation } from '@/OS/lib/i18n';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { HoverPopover } from '../HoverPopover';
import { VoterHoverCard } from '../VoterHoverCard';
import { addressToAvatar } from '../../utils/addressAvatar';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

/** Render actor name with avatar (ENS avatar or deterministic pixel fallback) */
export function ActorName({
  avatar,
  address,
  name,
  onClick,
  onNavigate,
}: {
  avatar?: string | null;
  /** Ethereum address — used to generate a deterministic pixel avatar fallback */
  address?: string;
  name?: string;
  onClick?: () => void;
  /** When set (and `address` is present), wraps the name in a hover popover
   *  showing a mini voter profile. */
  onNavigate?: (path: string) => void;
}) {
  const fallback = useMemo(
    () => (address ? addressToAvatar(address) : null),
    [address],
  );

  const src = avatar || fallback;

  // If the ENS avatar URL fails to load, swap in the pixel fallback
  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallback && e.currentTarget.src !== fallback) {
        e.currentTarget.src = fallback;
      }
    },
    [fallback],
  );

  const inner = (
    <span className={styles.actorWrapper}>
      {src && <img src={src} alt="" className={styles.avatar} onError={handleError} />}
      <span className={styles.actor} onClick={onClick} role="button" tabIndex={0}>
        {name}
      </span>
    </span>
  );

  if (!onNavigate || !address) return inner;

  return (
    <HoverPopover
      content={<VoterHoverCard address={address} onNavigate={onNavigate} />}
    >
      {inner}
    </HoverPopover>
  );
}

/**
 * Wrap an inline voter trigger (typically a `<span>` with onClick) so it
 * shows the voter mini-card on hover. Renders children as-is when no
 * `onNavigate` or `address` is provided.
 */
export function VoterText({
  address,
  onNavigate,
  children,
}: {
  address?: string;
  onNavigate?: (path: string) => void;
  children: React.ReactNode;
}) {
  if (!onNavigate || !address) return <>{children}</>;
  return (
    <HoverPopover
      content={<VoterHoverCard address={address} onNavigate={onNavigate} />}
    >
      {children}
    </HoverPopover>
  );
}

/** Render reason content — handles reposts and replies specially */
export function ReasonContent({
  item,
  repostInfo,
  replyInfo,
  repostOriginalPosterEns,
  repostOriginalPosterAddress,
  replyOriginalPosterEns,
  replyOriginalPosterAddress,
  formatAddr,
}: Pick<
  ActivityContentProps,
  | 'item'
  | 'repostInfo'
  | 'replyInfo'
  | 'repostOriginalPosterEns'
  | 'repostOriginalPosterAddress'
  | 'replyOriginalPosterEns'
  | 'replyOriginalPosterAddress'
  | 'formatAddr'
>) {
  const { t } = useTranslation();

  if (!item.reason || !item.reason.trim()) return null;

  // Repost (+1 with quote)
  if (repostInfo) {
    const repostAuthorDisplay =
      repostOriginalPosterEns ||
      (repostOriginalPosterAddress
        ? formatAddr(repostOriginalPosterAddress, null)
        : null);

    return (
      <div className={styles.quotedReply}>
        {repostAuthorDisplay && (
          <div className={styles.quoteAttribution}>
            {t('camp.activity.reply.reposting')} {repostAuthorDisplay}
          </div>
        )}
        <MarkdownRenderer content={repostInfo.originalReason} className={styles.quotedText} />
      </div>
    );
  }

  // Reply — show reply body first, then quoted original
  if (replyInfo) {
    const originalPosterDisplay =
      replyOriginalPosterEns ||
      (replyOriginalPosterAddress
        ? formatAddr(replyOriginalPosterAddress, null)
        : replyInfo.targetAuthor);

    return (
      <div className={styles.replyContainer}>
        {replyInfo.replyBody && (
          <MarkdownRenderer content={replyInfo.replyBody} className={styles.reason} />
        )}
        <div className={styles.quotedReply}>
          <div className={styles.quoteAttribution}>
            {t('camp.activity.reply.replyingTo')} {originalPosterDisplay}
          </div>
          <MarkdownRenderer content={replyInfo.quotedText} className={styles.quotedText} />
        </div>
      </div>
    );
  }

  // Regular reason
  return <MarkdownRenderer content={item.reason} className={styles.reason} />;
}
