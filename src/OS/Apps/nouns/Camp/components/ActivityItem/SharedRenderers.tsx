/**
 * Shared render helpers for ActivityItem sub-components.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useTranslation } from '@/OS/lib/i18n';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { addressToAvatar } from '../../utils/addressAvatar';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

/** Render actor name with avatar (ENS avatar or deterministic pixel fallback) */
export function ActorName({
  avatar,
  address,
  name,
  onClick,
}: {
  avatar?: string | null;
  /** Ethereum address — used to generate a deterministic pixel avatar fallback */
  address?: string;
  name?: string;
  onClick?: () => void;
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

  return (
    <span className={styles.actorWrapper}>
      {src && <img src={src} alt="" className={styles.avatar} onError={handleError} />}
      <span className={styles.actor} onClick={onClick} role="button" tabIndex={0}>
        {name}
      </span>
    </span>
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
